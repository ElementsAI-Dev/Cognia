/**
 * Web-based AI completion provider
 *
 * Provides AI ghost text completion in non-Tauri (web) environments
 * by directly calling the user's configured AI provider via fetch.
 * Lightweight alternative to the native Rust completion service.
 */

import type { CompletionSuggestion, InputCompletionResult } from '@/types/input-completion';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { CompletionCache } from './completion-cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('web-completion');

/** Cache for web completion results to reduce redundant API calls */
const webCompletionCache = new CompletionCache<InputCompletionResult>({
  maxSize: 100,
  ttlMs: 3 * 60 * 1000, // 3 minutes
});

export interface WebCompletionConfig {
  provider: 'openai' | 'groq' | 'ollama' | 'custom';
  endpoint?: string;
  apiKey?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Recent conversation messages for context-aware completion */
  conversationContext?: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_CONFIG: WebCompletionConfig = {
  provider: 'ollama',
  modelId: 'qwen2.5-coder:0.5b',
  maxTokens: 64,
  temperature: 0.1,
  timeoutMs: 5000,
};

/** AbortController for the current request */
let currentController: AbortController | null = null;

/**
 * Cancel any in-flight completion request
 */
export function cancelWebCompletion(): void {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

/**
 * Clear the web completion cache (useful for testing and manual cache invalidation)
 */
export function clearWebCompletionCache(): void {
  webCompletionCache.clear();
}

/**
 * Trigger a web-based AI completion
 */
export async function triggerWebCompletion(
  text: string,
  config: Partial<WebCompletionConfig> = {}
): Promise<InputCompletionResult> {
  // Cancel previous request
  cancelWebCompletion();

  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Check cache first
  const cacheKey = CompletionCache.generateKey(text, cfg.modelId);
  const cached = webCompletionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  currentController = new AbortController();
  const { signal } = currentController;

  const startTime = Date.now();

  try {
    const result = await requestCompletion(text, cfg, signal);
    const latencyMs = Date.now() - startTime;

    const completionResult: InputCompletionResult = {
      suggestions: result ? [result] : [],
      latency_ms: latencyMs,
      model: cfg.modelId || 'unknown',
      cached: false,
    };

    // Cache successful results with suggestions
    if (completionResult.suggestions.length > 0) {
      webCompletionCache.set(cacheKey, completionResult);
    }

    return completionResult;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { suggestions: [], latency_ms: 0, model: cfg.modelId || 'unknown', cached: false };
    }
    logger.error('Web completion error', { error });
    return { suggestions: [], latency_ms: Date.now() - startTime, model: cfg.modelId || 'unknown', cached: false };
  } finally {
    currentController = null;
  }
}

async function requestCompletion(
  text: string,
  config: WebCompletionConfig,
  signal: AbortSignal
): Promise<CompletionSuggestion | null> {
  switch (config.provider) {
    case 'ollama':
      return requestOllamaCompletion(text, config, signal);
    case 'openai':
    case 'groq':
      return requestOpenAICompatibleCompletion(text, config, signal);
    case 'custom':
      return requestCustomCompletion(text, config, signal);
    default:
      return null;
  }
}

async function requestOllamaCompletion(
  text: string,
  config: WebCompletionConfig,
  signal: AbortSignal
): Promise<CompletionSuggestion | null> {
  const endpoint = config.endpoint || 'http://localhost:11434';
  const prompt = buildPrompt(text, config.conversationContext);

  const response = await proxyFetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.modelId || 'qwen2.5-coder:0.5b',
      prompt,
      stream: false,
      options: {
        temperature: config.temperature ?? 0.1,
        num_predict: config.maxTokens ?? 64,
        stop: ['\n\n', '```'],
      },
    }),
    signal,
  });

  if (!response.ok) return null;

  const data = await response.json();
  const completionText = (data.response || '').trim();

  if (!completionText) return null;

  return {
    id: `web-${Date.now()}`,
    text: completionText,
    display_text: completionText,
    confidence: 0.75,
    completion_type: completionText.includes('\n') ? 'Block' : 'Line',
  };
}

async function requestOpenAICompatibleCompletion(
  text: string,
  config: WebCompletionConfig,
  signal: AbortSignal
): Promise<CompletionSuggestion | null> {
  const endpoint = config.provider === 'groq'
    ? (config.endpoint || 'https://api.groq.com/openai/v1')
    : (config.endpoint || 'https://api.openai.com/v1');

  if (!config.apiKey) return null;

  const prompt = buildPrompt(text, config.conversationContext);

  const response = await proxyFetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelId || (config.provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: 'You are a text completion assistant. Complete the following text naturally. Only output the completion, nothing else. Do not repeat the input.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: config.maxTokens ?? 64,
      temperature: config.temperature ?? 0.1,
      stop: ['\n\n'],
    }),
    signal,
  });

  if (!response.ok) return null;

  const data = await response.json();
  const completionText = (data.choices?.[0]?.message?.content || '').trim();

  if (!completionText) return null;

  return {
    id: `web-${Date.now()}`,
    text: completionText,
    display_text: completionText,
    confidence: 0.8,
    completion_type: completionText.includes('\n') ? 'Block' : 'Line',
  };
}

async function requestCustomCompletion(
  text: string,
  config: WebCompletionConfig,
  signal: AbortSignal
): Promise<CompletionSuggestion | null> {
  if (!config.endpoint) return null;

  const prompt = buildPrompt(text, config.conversationContext);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await proxyFetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      max_tokens: config.maxTokens ?? 64,
      temperature: config.temperature ?? 0.1,
      ...(config.modelId ? { model: config.modelId } : {}),
    }),
    signal,
  });

  if (!response.ok) return null;

  const data = await response.json();
  const completionText = (
    data.response || data.text || data.choices?.[0]?.text || data.choices?.[0]?.message?.content || ''
  ).trim();

  if (!completionText) return null;

  return {
    id: `web-${Date.now()}`,
    text: completionText,
    display_text: completionText,
    confidence: 0.7,
    completion_type: completionText.includes('\n') ? 'Block' : 'Line',
  };
}

function buildPrompt(text: string, context?: ConversationMessage[]): string {
  // Detect if the text looks like code
  const isCodeLike = /[{}();=<>]|function |const |let |var |import |class |def |return /.test(text);

  let prompt = '';

  // Add conversation context if available (last 3 messages for brevity)
  if (context && context.length > 0) {
    const recentContext = context.slice(-3);
    prompt += 'Recent conversation context:\n';
    for (const msg of recentContext) {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.slice(0, 200)}\n`;
    }
    prompt += '\n';
  }

  if (isCodeLike) {
    prompt += `Complete the following code naturally. Only output the completion, nothing else:\n\n${text}`;
  } else {
    prompt += `Complete the following message naturally in the same language and tone. Only output the completion, nothing else:\n\n${text}`;
  }

  return prompt;
}
