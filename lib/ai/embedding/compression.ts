/**
 * Context Compression Utilities
 *
 * Implements compression strategies for managing chat context:
 * - summary: Summarize older messages using AI
 * - sliding-window: Keep only the most recent N messages
 * - selective: Keep important messages and summarize others
 * - hybrid: Combination of sliding window + summary
 */

import type { UIMessage } from '@/types/core/message';
import type {
  CompressionSettings,
  CompressionStrategy,
  CompressionResult,
  CompressionHistoryEntry,
  ContextState,
  SessionCompressionOverrides,
  MessageImportanceScore,
  ImportanceSignal,
  CompressionAIConfig,
  FrozenCompressionSummary,
  ProviderCacheProfile,
} from '@/types/system/compression';
import type { ProviderName } from '../core/client';
import { DEFAULT_COMPRESSION_SETTINGS } from '@/types/system/compression';
import { loggers } from '@/lib/logger';
import { getPluginEventHooks } from '@/lib/plugin';
import { getProviderCacheProfile, shouldPrioritizePrefixStability } from './provider-cache-profile';

const log = loggers.ai;
import { calculateTokenBreakdown, countTokens } from '@/hooks/chat/use-token-count';
import { nanoid } from 'nanoid';

/**
 * Merge global settings with per-session overrides
 */
export function mergeCompressionSettings(
  globalSettings: CompressionSettings,
  sessionOverrides?: SessionCompressionOverrides
): CompressionSettings {
  if (!sessionOverrides) return globalSettings;

  return {
    ...globalSettings,
    enabled: sessionOverrides.compressionEnabled ?? globalSettings.enabled,
    strategy: sessionOverrides.compressionStrategy ?? globalSettings.strategy,
    trigger: sessionOverrides.compressionTrigger ?? globalSettings.trigger,
    tokenThreshold: sessionOverrides.tokenThreshold ?? globalSettings.tokenThreshold,
    messageCountThreshold: sessionOverrides.messageCountThreshold ?? globalSettings.messageCountThreshold,
    preserveRecentMessages: sessionOverrides.preserveRecentMessages ?? globalSettings.preserveRecentMessages,
  };
}

/**
 * Calculate context state for compression decision making
 */
export function calculateContextState(
  messages: UIMessage[],
  maxTokens: number,
  provider?: string,
  model?: string
): ContextState {
  const breakdown = calculateTokenBreakdown(messages, { provider, model });
  const utilizationPercent = maxTokens > 0
    ? Math.round((breakdown.totalTokens / maxTokens) * 100)
    : 0;

  let status: 'healthy' | 'warning' | 'danger';
  if (utilizationPercent >= 90) {
    status = 'danger';
  } else if (utilizationPercent >= 70) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  // Determine if compression is recommended
  const compressionRecommended = utilizationPercent >= 70;

  // Recommend strategy based on context state
  let recommendedStrategy: CompressionStrategy | undefined;
  if (compressionRecommended) {
    if (utilizationPercent >= 90) {
      // Critical - use aggressive sliding window
      recommendedStrategy = 'sliding-window';
    } else if (messages.length > 50) {
      // Many messages - use hybrid
      recommendedStrategy = 'hybrid';
    } else {
      // Moderate - use summary
      recommendedStrategy = 'summary';
    }
  }

  return {
    totalTokens: breakdown.totalTokens,
    maxTokens,
    utilizationPercent,
    messageCount: messages.length,
    status,
    compressionRecommended,
    recommendedStrategy,
  };
}

/**
 * Check if compression should be triggered
 *
 * Dual-threshold system (when prefixStabilityMode is enabled):
 * - tokenThreshold (T_max, default 70%) = "water line" that triggers compression
 * - retainedThreshold (T_retained, default 40%) = "drain line" — compression target
 * This creates a buffer zone (30%) to reduce compression frequency,
 * which in turn reduces KV cache invalidation events.
 */
export function shouldTriggerCompression(
  settings: CompressionSettings,
  contextState: ContextState
): boolean {
  if (!settings.enabled) return false;
  if (settings.trigger === 'manual') return false;

  if (settings.trigger === 'token-threshold') {
    return contextState.utilizationPercent >= settings.tokenThreshold;
  }

  if (settings.trigger === 'message-count') {
    return contextState.messageCount >= settings.messageCountThreshold;
  }

  return false;
}

/**
 * Get the target utilization percentage after compression (the "drain line")
 * When prefixStabilityMode is enabled, uses retainedThreshold to create a buffer zone.
 * Otherwise, compresses just enough to get below the trigger threshold.
 */
export function getCompressionTargetPercent(settings: CompressionSettings): number {
  if (settings.prefixStabilityMode && settings.retainedThreshold > 0) {
    return settings.retainedThreshold;
  }
  // Fallback: compress to 10% below the trigger threshold
  return Math.max(10, settings.tokenThreshold - 10);
}

/**
 * Sliding window compression: Keep only the most recent messages
 */
export function applySlidingWindow(
  messages: UIMessage[],
  settings: CompressionSettings
): { filteredMessages: UIMessage[]; compressedIds: string[] } {
  const { preserveRecentMessages, preserveSystemMessages } = settings;

  // Get system messages if they should be preserved
  const systemMessages = preserveSystemMessages
    ? messages.filter(m => m.role === 'system')
    : [];

  // Get non-system messages
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  // Take only the most recent messages
  const recentMessages = nonSystemMessages.slice(-preserveRecentMessages);

  // Get compressed message IDs
  const recentIds = new Set(recentMessages.map(m => m.id));
  const systemIds = new Set(systemMessages.map(m => m.id));
  const compressedIds = messages
    .filter(m => !recentIds.has(m.id) && !systemIds.has(m.id))
    .map(m => m.id);

  // Combine system messages with recent messages
  const filteredMessages = [...systemMessages, ...recentMessages];

  return { filteredMessages, compressedIds };
}

/**
 * Score message importance using multi-signal analysis
 * Returns a score between 0-1 with contributing signals
 */
export function scoreMessageImportance(
  msg: UIMessage,
  index: number,
  totalMessages: number
): MessageImportanceScore {
  let score = 0;
  const signals: ImportanceSignal[] = [];
  const content = msg.content;
  const contentLower = content.toLowerCase();

  // === Role signals ===
  if (msg.role === 'system') {
    score += 0.5;
    signals.push('system');
  }
  // First user message often sets the task context
  if (msg.role === 'user' && index === 0) {
    score += 0.3;
  }
  // Last assistant message often contains the final answer/conclusion
  if (msg.role === 'assistant' && index === totalMessages - 1) {
    score += 0.2;
  }

  // === Content signals ===
  // Code blocks
  if (content.includes('```')) {
    score += 0.3;
    signals.push('code');
  }

  // URLs / links
  if (/https?:\/\/[^\s]+/.test(content)) {
    score += 0.1;
    signals.push('url');
  }

  // Error patterns
  if (
    /\b(error|exception|failed|crash|bug|fix|issue|problem)\b/i.test(contentLower) ||
    /\b(TypeError|SyntaxError|ReferenceError|Error:)\b/.test(content)
  ) {
    score += 0.25;
    signals.push('error');
  }

  // Decision/conclusion patterns
  if (
    /\b(decided|let'?s|agreed|will use|chosen|conclusion|solution|approach|plan)\b/i.test(contentLower) ||
    /\b(I'll|we'll|going to|should|recommend)\b/i.test(contentLower)
  ) {
    score += 0.2;
    signals.push('decision');
  }

  // Structured data (JSON-like)
  if (
    (content.includes('{') && content.includes('}') && content.length > 50) ||
    (content.includes('[') && content.includes(']') && /"\w+"/.test(content))
  ) {
    score += 0.15;
    signals.push('structured-data');
  }

  // Questions (user asking something important)
  if (msg.role === 'user' && /\?\s*$/.test(content.trim())) {
    score += 0.15;
    signals.push('question');
  }

  // === Interaction signals ===
  // Tool invocations
  const toolParts = msg.parts?.filter(p => p.type === 'tool-invocation') || [];
  if (toolParts.length > 0) {
    score += Math.min(0.3 * toolParts.length, 0.6);
    signals.push('tool-call');
  }

  // Artifact references
  if (
    contentLower.includes('artifact') ||
    contentLower.includes('<artifact') ||
    msg.parts?.some(p => p.type === 'a2ui')
  ) {
    score += 0.2;
    signals.push('artifact');
  }

  // === Recency signal ===
  // Exponential decay: newest messages get higher score
  if (totalMessages > 1) {
    const position = index / (totalMessages - 1); // 0 = oldest, 1 = newest
    const recencyBonus = 0.3 * Math.pow(position, 2);
    score += recencyBonus;
    if (recencyBonus > 0.1) {
      signals.push('recency');
    }
  }

  return {
    score: Math.min(1, Math.max(0, score)),
    signals,
  };
}

/**
 * Selective compression: Keep important messages based on importance scoring
 */
export function applySelectiveCompression(
  messages: UIMessage[],
  settings: CompressionSettings
): { filteredMessages: UIMessage[]; compressedIds: string[] } {
  const { preserveRecentMessages, preserveSystemMessages, importanceThreshold } = settings;
  const threshold = importanceThreshold ?? 0.4;

  // Score all messages
  const scored = messages.map((msg, index) => ({
    msg,
    score: scoreMessageImportance(msg, index, messages.length),
  }));

  // Separate by importance
  const importantMessages: UIMessage[] = [];
  const regularMessages: UIMessage[] = [];

  scored.forEach(({ msg, score }) => {
    // System messages always preserved if setting enabled
    if (msg.role === 'system' && preserveSystemMessages) {
      importantMessages.push(msg);
    } else if (score.score >= threshold) {
      importantMessages.push(msg);
    } else {
      regularMessages.push(msg);
    }
  });

  // Keep recent regular messages as fallback
  const recentRegular = regularMessages.slice(
    -Math.max(3, preserveRecentMessages - importantMessages.length)
  );

  // Combine and sort by original order
  const allIds = messages.map(m => m.id);
  const filteredMessages = [...importantMessages, ...recentRegular].sort(
    (a, b) => allIds.indexOf(a.id) - allIds.indexOf(b.id)
  );

  const filteredIds = new Set(filteredMessages.map(m => m.id));
  const compressedIds = messages.filter(m => !filteredIds.has(m.id)).map(m => m.id);

  return { filteredMessages, compressedIds };
}

/**
 * Generate a summary of messages using an enhanced extraction approach
 * This is a fallback when AI summarization is not available
 */
export function generateSimpleSummary(messages: UIMessage[]): string {
  if (messages.length === 0) return '';

  const keyPoints: string[] = [];
  const decisions: string[] = [];
  const toolCallSummaries: string[] = [];
  const codeLanguages = new Set<string>();

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    const content = msg.content.trim();

    // Skip very short messages
    if (content.length < 20) return;

    // Extract code block languages
    const codeBlockMatches = content.matchAll(/```(\w+)/g);
    for (const match of codeBlockMatches) {
      codeLanguages.add(match[1]);
    }

    // Extract tool call summaries from parts
    const toolParts = msg.parts?.filter(p => p.type === 'tool-invocation') || [];
    for (const part of toolParts) {
      if (part.type === 'tool-invocation') {
        toolCallSummaries.push(`${part.toolName}(${Object.keys(part.args).join(', ')}) → ${part.state}`);
      }
    }

    // Extract decisions/conclusions
    const lines = content.split('\n');
    for (const line of lines) {
      const lineLower = line.toLowerCase().trim();
      if (
        /\b(decided|let'?s|agreed|will use|chosen|conclusion|solution)\b/i.test(lineLower) &&
        line.trim().length > 15 && line.trim().length < 200
      ) {
        decisions.push(line.trim());
      }
    }

    // Extract key content for first, last, and scored-important messages
    const importance = scoreMessageImportance(msg, index, messages.length);
    if (index < 2 || index >= messages.length - 2 || importance.score >= 0.5) {
      // Extract up to 2 meaningful sentences
      const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.length > 15);
      const summary = sentences.slice(0, 2).join(' ');
      const truncated = summary.length > 200 ? summary.substring(0, 197) + '...' : summary;
      if (truncated) {
        keyPoints.push(`${role}: ${truncated}`);
      }
    }
  });

  // Build structured summary
  const parts: string[] = [`[Conversation Summary (${messages.length} messages)]`];

  if (decisions.length > 0) {
    parts.push(`\nKey Decisions:\n${decisions.slice(0, 5).map(d => `- ${d}`).join('\n')}`);
  }

  if (toolCallSummaries.length > 0) {
    parts.push(`\nTool Usage:\n${toolCallSummaries.slice(0, 8).map(t => `- ${t}`).join('\n')}`);
  }

  if (codeLanguages.size > 0) {
    parts.push(`\nLanguages: ${Array.from(codeLanguages).join(', ')}`);
  }

  if (keyPoints.length > 0) {
    parts.push(`\nConversation Flow:\n${keyPoints.join('\n')}`);
  }

  return parts.join('\n');
}

/**
 * Create a summary message from compressed messages
 */
export function createSummaryMessage(
  compressedMessages: UIMessage[],
  summaryText?: string,
  frozenSummaryDecision?: 'reused' | 'regenerated'
): UIMessage {
  const summary = summaryText || generateSimpleSummary(compressedMessages);
  const now = new Date();

  return {
    id: nanoid(),
    role: 'system',
    content: summary,
    createdAt: now,
    compressionState: {
      isSummary: true,
      summarizedMessageIds: compressedMessages.map(m => m.id),
      originalMessageCount: compressedMessages.length,
      originalTokenCount: compressedMessages.reduce((sum, m) => sum + countTokens(m.content), 0),
      compressedAt: now,
      strategyUsed: 'summary',
      ...(frozenSummaryDecision ? { frozenSummaryDecision } : {}),
    },
  };
}

/**
 * Hybrid compression: Sliding window for recent + summary for older
 */
export function applyHybridCompression(
  messages: UIMessage[],
  settings: CompressionSettings,
  _summaryGenerator?: (msgs: UIMessage[]) => Promise<string>
): { filteredMessages: UIMessage[]; compressedIds: string[]; needsSummary: boolean; messagesToSummarize: UIMessage[] } {
  const { preserveRecentMessages, preserveSystemMessages } = settings;

  // Separate system messages
  const systemMessages = preserveSystemMessages
    ? messages.filter(m => m.role === 'system')
    : [];
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  if (nonSystemMessages.length <= preserveRecentMessages) {
    // Not enough messages to compress
    return {
      filteredMessages: messages,
      compressedIds: [],
      needsSummary: false,
      messagesToSummarize: [],
    };
  }

  // Split into older and recent
  const splitIndex = nonSystemMessages.length - preserveRecentMessages;
  const olderMessages = nonSystemMessages.slice(0, splitIndex);
  const recentMessages = nonSystemMessages.slice(splitIndex);

  // Compressed IDs are the older messages
  const compressedIds = olderMessages.map(m => m.id);

  return {
    filteredMessages: [...systemMessages, ...recentMessages],
    compressedIds,
    needsSummary: olderMessages.length > 0,
    messagesToSummarize: olderMessages,
  };
}

/**
 * Compress large tool call results in messages
 * Preserves tool metadata (name, args, status) but truncates large result bodies
 */
export function compressToolCallResults(
  messages: UIMessage[],
  maxResultTokens: number = 500,
  preserveMetadata: boolean = true
): UIMessage[] {
  return messages.map(msg => {
    if (!msg.parts || msg.parts.length === 0) return msg;

    const hasLargeToolResults = msg.parts.some(p => {
      if (p.type !== 'tool-invocation') return false;
      const resultStr = typeof p.result === 'string' ? p.result : JSON.stringify(p.result ?? '');
      return countTokens(resultStr) > maxResultTokens;
    });

    if (!hasLargeToolResults) return msg;

    const compressedParts = msg.parts.map(p => {
      if (p.type !== 'tool-invocation') return p;

      const resultStr = typeof p.result === 'string' ? p.result : JSON.stringify(p.result ?? '');
      const resultTokens = countTokens(resultStr);

      if (resultTokens <= maxResultTokens) return p;

      // Truncate the result while preserving metadata
      const maxChars = maxResultTokens * 4; // rough token-to-char ratio
      let truncatedResult: string;

      if (preserveMetadata) {
        const argsKeys = Object.keys(p.args);
        const metaHeader = `[Tool: ${p.toolName}(${argsKeys.join(', ')}) → ${p.state}]`;
        const remaining = maxChars - metaHeader.length - 30;
        truncatedResult = `${metaHeader}\n${resultStr.substring(0, Math.max(100, remaining))}...\n[Truncated: ~${resultTokens} tokens → ~${maxResultTokens} tokens]`;
      } else {
        truncatedResult = `${resultStr.substring(0, maxChars)}...\n[Truncated: ~${resultTokens} tokens]`;
      }

      return {
        ...p,
        result: truncatedResult,
      };
    });

    // Also update the text content if it contains inline tool results
    return { ...msg, parts: compressedParts };
  });
}

/**
 * Compress artifact content in messages
 * Preserves artifact metadata (type, title, language) but truncates body content
 */
export function compressArtifactContent(messages: UIMessage[]): UIMessage[] {
  return messages.map(msg => {
    const content = msg.content;
    if (!content.includes('```') && !content.includes('<artifact')) return msg;

    // Compress code blocks longer than 20 lines
    let compressed = content.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (_match, lang: string, body: string) => {
        const lines = body.split('\n');
        if (lines.length <= 20) return _match;

        const preview = lines.slice(0, 10).join('\n');
        const langLabel = lang ? ` (${lang})` : '';
        return `\`\`\`${lang}\n${preview}\n// ... [${lines.length - 10} more lines${langLabel}]\n\`\`\``;
      }
    );

    // Compress artifact tags
    compressed = compressed.replace(
      /<artifact\s+([^>]*)>([\s\S]*?)<\/artifact>/g,
      (_match, attrs: string, body: string) => {
        if (body.length <= 500) return _match;
        const preview = body.substring(0, 200);
        return `<artifact ${attrs}>${preview}...\n[Truncated: ${body.length} chars]\n</artifact>`;
      }
    );

    if (compressed === content) return msg;
    return { ...msg, content: compressed };
  });
}

/**
 * Pre-process messages before summarization: compress tool results and artifacts
 */
export function preProcessForCompression(
  messages: UIMessage[],
  settings: CompressionSettings
): UIMessage[] {
  let processed = messages;

  // Compress large tool call results
  if (settings.preserveToolCallMetadata !== false) {
    processed = compressToolCallResults(
      processed,
      settings.maxToolResultTokens ?? 500,
      settings.preserveToolCallMetadata ?? true
    );
  }

  // Compress artifact content
  processed = compressArtifactContent(processed);

  return processed;
}

/**
 * Recursive compression: chunk messages, summarize each chunk, then summarize summaries
 * Best for very long conversations (100+ messages) where single-pass summary loses detail
 */
export async function applyRecursiveCompression(
  messages: UIMessage[],
  settings: CompressionSettings,
  summaryGenerator?: (msgs: UIMessage[]) => Promise<string>,
  maxRecursionDepth: number = 3
): Promise<{ filteredMessages: UIMessage[]; compressedIds: string[]; summaryText: string }> {
  const { preserveRecentMessages, preserveSystemMessages, recursiveChunkSize } = settings;
  const chunkSize = recursiveChunkSize ?? 20;

  // Separate system and non-system messages
  const systemMessages = preserveSystemMessages
    ? messages.filter(m => m.role === 'system')
    : [];
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  // Keep recent messages uncompressed
  if (nonSystemMessages.length <= preserveRecentMessages) {
    return {
      filteredMessages: messages,
      compressedIds: [],
      summaryText: '',
    };
  }

  const splitIndex = nonSystemMessages.length - preserveRecentMessages;
  const olderMessages = nonSystemMessages.slice(0, splitIndex);
  const recentMessages = nonSystemMessages.slice(splitIndex);
  const compressedIds = olderMessages.map(m => m.id);

  // Chunk older messages
  const chunks: UIMessage[][] = [];
  for (let i = 0; i < olderMessages.length; i += chunkSize) {
    chunks.push(olderMessages.slice(i, i + chunkSize));
  }

  // Summarize each chunk
  const summarize = summaryGenerator || ((msgs: UIMessage[]) => Promise.resolve(generateSimpleSummary(msgs)));
  const chunkSummaries: string[] = [];

  for (const chunk of chunks) {
    try {
      const summary = await summarize(chunk);
      chunkSummaries.push(summary);
    } catch {
      chunkSummaries.push(generateSimpleSummary(chunk));
    }
  }

  // Recursive merge: if combined summaries are still too long, summarize summaries
  let finalSummary = chunkSummaries.join('\n\n---\n\n');
  let depth = 0;

  while (depth < maxRecursionDepth) {
    const summaryTokens = countTokens(finalSummary);
    const targetTokens = settings.compressionModel?.maxSummaryTokens ?? 500;

    if (summaryTokens <= targetTokens * 2) break; // Close enough to target

    // Create synthetic messages from summaries for re-summarization
    const syntheticMsgs: UIMessage[] = chunkSummaries.map((s, i) => ({
      id: `recursive-${depth}-${i}`,
      role: 'assistant' as const,
      content: s,
      createdAt: new Date(),
    }));

    try {
      finalSummary = await summarize(syntheticMsgs);
    } catch {
      finalSummary = generateSimpleSummary(syntheticMsgs);
    }

    depth++;

    // Re-chunk for next level if needed
    if (depth < maxRecursionDepth) {
      chunkSummaries.length = 0;
      chunkSummaries.push(finalSummary);
    }
  }

  // Build result
        const summaryMessage = createSummaryMessage(olderMessages, finalSummary, 'regenerated');
  const filteredMessages = [...systemMessages, summaryMessage, ...recentMessages];

  return {
    filteredMessages,
    compressedIds,
    summaryText: finalSummary,
  };
}

/**
 * Create a summary generator from AI config
 * Uses generateAICompressionSummary when AI is available, falls back to simple summary
 */
async function createAISummaryGenerator(
  aiConfig: CompressionAIConfig,
  targetTokens?: number
): Promise<(msgs: UIMessage[]) => Promise<string>> {
  return async (msgs: UIMessage[]) => {
    const { generateAICompressionSummary } = await import('../generation/summarizer');
    return generateAICompressionSummary(
      msgs,
      {
        provider: aiConfig.provider as ProviderName,
        model: aiConfig.model,
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseURL,
      },
      targetTokens
    );
  };
}

/**
 * Apply compression to messages based on strategy
 * @param aiConfig - Optional AI config for AI-powered summarization
 */
export async function compressMessages(
  messages: UIMessage[],
  settings: CompressionSettings,
  summaryGenerator?: (msgs: UIMessage[]) => Promise<string>,
  aiConfig?: CompressionAIConfig
): Promise<CompressionResult> {
  // Pre-process: compress tool results and artifacts before counting tokens
  const preprocessed = preProcessForCompression(messages, settings);
  const tokensBefore = preprocessed.reduce((sum, m) => sum + countTokens(m.content), 0);

  // Build effective summary generator: explicit > AI config > simple fallback
  let effectiveGenerator = summaryGenerator;
  if (!effectiveGenerator && settings.useAISummarization && aiConfig) {
    const targetTokens = settings.compressionModel?.maxSummaryTokens ?? 500;
    effectiveGenerator = await createAISummaryGenerator(aiConfig, targetTokens);
  }

  try {
    let filteredMessages: UIMessage[];
    let compressedIds: string[];
    let summaryText: string | undefined;

    switch (settings.strategy) {
      case 'sliding-window': {
        const result = applySlidingWindow(preprocessed, settings);
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;
        break;
      }

      case 'selective': {
        const result = applySelectiveCompression(preprocessed, settings);
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;
        break;
      }

      case 'recursive': {
        const result = await applyRecursiveCompression(
          preprocessed,
          settings,
          effectiveGenerator
        );
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;
        summaryText = result.summaryText;
        break;
      }

      case 'summary': {
        // For summary strategy, summarize older messages
        const { preserveRecentMessages, preserveSystemMessages } = settings;
        const systemMessages = preserveSystemMessages
          ? preprocessed.filter(m => m.role === 'system')
          : [];
        const nonSystemMessages = preprocessed.filter(m => m.role !== 'system');

        if (nonSystemMessages.length <= preserveRecentMessages) {
          return {
            success: true,
            messagesCompressed: 0,
            tokensBefore,
            tokensAfter: tokensBefore,
            compressionRatio: 1,
            compressedMessageIds: [],
          };
        }

        const splitIndex = nonSystemMessages.length - preserveRecentMessages;
        const olderMessages = nonSystemMessages.slice(0, splitIndex);
        const recentMessages = nonSystemMessages.slice(splitIndex);

        // Generate summary
        if (effectiveGenerator) {
          try {
            summaryText = await effectiveGenerator(olderMessages);
          } catch (error) {
            log.warn('AI summarization failed, using simple summary', { error });
            summaryText = generateSimpleSummary(olderMessages);
          }
        } else {
          summaryText = generateSimpleSummary(olderMessages);
        }

        // Create summary message
        const summaryMessage = createSummaryMessage(olderMessages, summaryText);

        filteredMessages = [...systemMessages, summaryMessage, ...recentMessages];
        compressedIds = olderMessages.map(m => m.id);
        break;
      }

      case 'hybrid':
      default: {
        const result = applyHybridCompression(preprocessed, settings);
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;

        if (result.needsSummary && result.messagesToSummarize.length > 0) {
          // Generate summary for older messages
          if (effectiveGenerator) {
            try {
              summaryText = await effectiveGenerator(result.messagesToSummarize);
            } catch (error) {
              log.warn('AI summarization failed, using simple summary', { error });
              summaryText = generateSimpleSummary(result.messagesToSummarize);
            }
          } else {
            summaryText = generateSimpleSummary(result.messagesToSummarize);
          }

          // Insert summary message at the beginning (after system messages)
          const summaryMessage = createSummaryMessage(
            result.messagesToSummarize,
            summaryText,
            'regenerated'
          );
          const systemMessages = filteredMessages.filter(m => m.role === 'system');
          const nonSystemFiltered = filteredMessages.filter(m => m.role !== 'system');
          filteredMessages = [...systemMessages, summaryMessage, ...nonSystemFiltered];
        }
        break;
      }
    }

    const tokensAfter = filteredMessages.reduce((sum, m) => sum + countTokens(m.content), 0);
    const compressionRatio = tokensBefore > 0 ? tokensAfter / tokensBefore : 1;

    return {
      success: true,
      summaryText,
      messagesCompressed: compressedIds.length,
      tokensBefore,
      tokensAfter,
      compressionRatio,
      compressedMessageIds: compressedIds,
    };
  } catch (error) {
    return {
      success: false,
      messagesCompressed: 0,
      tokensBefore,
      tokensAfter: tokensBefore,
      compressionRatio: 1,
      compressedMessageIds: [],
      error: error instanceof Error ? error.message : 'Unknown compression error',
    };
  }
}

/**
 * Filter messages for context based on settings (without AI summarization)
 * This is the main entry point for simple message filtering
 */
export function filterMessagesForContext(
  messages: UIMessage[],
  settings: CompressionSettings,
  maxTokens?: number,
  provider?: string,
  model?: string,
  frozenSummary?: FrozenCompressionSummary
): UIMessage[] {
  if (!settings.enabled) return messages;

  return filterMessagesForContextSync(messages, settings, maxTokens, provider, model, frozenSummary);
}

/**
 * Synchronous filter implementation (internal)
 * Supports frozen summary reuse for prefix stability when prefixStabilityMode is enabled
 */
function filterMessagesForContextSync(
  messages: UIMessage[],
  settings: CompressionSettings,
  maxTokens?: number,
  provider?: string,
  model?: string,
  frozenSummary?: FrozenCompressionSummary
): UIMessage[] {
  if (!settings.enabled) return messages;

  // Calculate context state if max tokens provided
  if (maxTokens) {
    const contextState = calculateContextState(messages, maxTokens, provider, model);
    if (!shouldTriggerCompression(settings, contextState)) {
      return messages;
    }
  }

  // Determine if we should use prefix stability mode based on provider
  const usePrefixStability = settings.prefixStabilityMode &&
    provider && shouldPrioritizePrefixStability(provider as ProviderName);

  // Apply appropriate strategy
  switch (settings.strategy) {
    case 'sliding-window': {
      const result = applySlidingWindow(messages, settings);
      return result.filteredMessages;
    }

    case 'selective': {
      const result = applySelectiveCompression(messages, settings);
      return result.filteredMessages;
    }

    case 'recursive':
    case 'summary':
    case 'hybrid':
    default: {
      // For summary, recursive, and hybrid without AI, fall back to hybrid without summary
      const result = applyHybridCompression(messages, settings);
      if (result.needsSummary && result.messagesToSummarize.length > 0) {
        // Prefix stability: reuse frozen summary if available and still valid
        if (usePrefixStability && frozenSummary) {
          const frozenValid = isFrozenSummaryValid(frozenSummary, result.messagesToSummarize);
          if (frozenValid) {
            log.debug('Reusing frozen summary for prefix stability', {
              version: frozenSummary.version,
              summarizedCount: frozenSummary.summarizedMessageIds.length,
            });
            const frozenMessage = createSummaryMessageFromFrozen(frozenSummary);
            const systemMessages = result.filteredMessages.filter(m => m.role === 'system');
            const nonSystemFiltered = result.filteredMessages.filter(m => m.role !== 'system');
            return [...systemMessages, frozenMessage, ...nonSystemFiltered];
          }
        }

        // Generate new summary (will be frozen by the caller if prefix stability is active)
        const summaryMessage = createSummaryMessage(
          result.messagesToSummarize,
          undefined,
          'regenerated'
        );
        const systemMessages = result.filteredMessages.filter(m => m.role === 'system');
        const nonSystemFiltered = result.filteredMessages.filter(m => m.role !== 'system');
        return [...systemMessages, summaryMessage, ...nonSystemFiltered];
      }
      return result.filteredMessages;
    }
  }
}

/**
 * Async filter messages for context with plugin hook support
 * This version allows plugins to customize compression behavior
 */
export async function filterMessagesForContextAsync(
  messages: UIMessage[],
  settings: CompressionSettings,
  sessionId: string,
  maxTokens?: number,
  provider?: string,
  model?: string,
  frozenSummary?: FrozenCompressionSummary
): Promise<UIMessage[]> {
  if (!settings.enabled) return messages;

  // Calculate token count for hook context
  const tokenBreakdown = calculateTokenBreakdown(messages);
  const compressionRatio = maxTokens ? tokenBreakdown.totalTokens / maxTokens : 0;

  // ========== Pre-Compact Hook: PreCompact ==========
  // Allow plugins to customize context compression
  const preCompactResult = await getPluginEventHooks().dispatchPreCompact({
    sessionId,
    messageCount: messages.length,
    tokenCount: tokenBreakdown.totalTokens,
    compressionRatio,
  });

  // Skip compaction if hook requests it
  if (preCompactResult.skipCompaction) {
    log.info('Compression skipped by plugin hook');
    return messages;
  }

  // Apply custom strategy override if provided by hook
  const effectiveSettings = preCompactResult.customStrategy
    ? { ...settings, strategy: preCompactResult.customStrategy as CompressionStrategy }
    : settings;
  // ========== End Pre-Compact Hook ==========

  // Apply the sync filter (pass frozen summary for prefix stability)
  const filteredMessages = filterMessagesForContextSync(
    messages,
    effectiveSettings,
    maxTokens,
    provider,
    model,
    frozenSummary
  );

  // Inject plugin-provided context if any
  if (preCompactResult.contextToInject && filteredMessages.length > 0) {
    // Find the first user message index to insert context before
    const firstUserIndex = filteredMessages.findIndex(m => m.role === 'user');
    if (firstUserIndex > 0) {
      const contextMessage: UIMessage = {
        id: `plugin-context-${Date.now()}`,
        role: 'system',
        content: `## Context Preserved by Plugin\n${preCompactResult.contextToInject}`,
        createdAt: new Date(),
      };
      filteredMessages.splice(firstUserIndex, 0, contextMessage);
    }
  }

  return filteredMessages;
}

/**
 * Create compression history entry for undo support
 */
export function createCompressionHistoryEntry(
  sessionId: string,
  strategy: CompressionStrategy,
  compressedMessages: UIMessage[],
  summaryMessageId: string,
  tokensBefore: number,
  tokensAfter: number
): CompressionHistoryEntry {
  return {
    id: nanoid(),
    sessionId,
    timestamp: new Date(),
    strategy,
    compressedMessages: compressedMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt || new Date(),
    })),
    summaryMessageId,
    tokensBefore,
    tokensAfter,
  };
}

/**
 * Get effective compression settings for a session
 */
export function getEffectiveCompressionSettings(
  globalSettings: CompressionSettings,
  sessionOverrides?: SessionCompressionOverrides
): CompressionSettings {
  return mergeCompressionSettings(globalSettings, sessionOverrides);
}

// ========== Frozen Summary Functions (Prefix Stability) ==========

/**
 * Check if a frozen summary is still valid for the messages being summarized
 * A frozen summary is valid if all the messages it covers are a subset of
 * the messages that need to be summarized (i.e., no new messages need summarizing
 * beyond what the frozen summary already covers, or the frozen summary covers
 * messages that are still being discarded).
 */
export function isFrozenSummaryValid(
  frozenSummary: FrozenCompressionSummary,
  messagesToSummarize: UIMessage[]
): boolean {
  if (!frozenSummary.summaryText || frozenSummary.summarizedMessageIds.length === 0) {
    return false;
  }

  // The frozen summary is valid if the messages it summarized are a subset of
  // (or equal to) the messages that currently need summarizing.
  // This means the frozen summary still covers the right messages.
  const frozenIds = new Set(frozenSummary.summarizedMessageIds);
  const currentIds = new Set(messagesToSummarize.map(m => m.id));

  // Check: every ID in the frozen summary should be in the current set
  // (messages haven't been deleted or changed)
  for (const id of frozenIds) {
    if (!currentIds.has(id)) {
      return false; // A message the frozen summary covers no longer exists
    }
  }

  // If there are new messages to summarize beyond what frozen covers,
  // the frozen summary needs updating (not fully valid for reuse as-is)
  // But if frozen covers all or more, it's valid
  return frozenIds.size >= currentIds.size;
}

/**
 * Create a UIMessage from a frozen summary for injection into the message list
 */
export function createSummaryMessageFromFrozen(
  frozenSummary: FrozenCompressionSummary
): UIMessage {
  return {
    id: `frozen-summary-v${frozenSummary.version}`,
    role: 'system',
    content: frozenSummary.summaryText,
    createdAt: frozenSummary.frozenAt,
    compressionState: {
      isSummary: true,
      summarizedMessageIds: frozenSummary.summarizedMessageIds,
      originalMessageCount: frozenSummary.summarizedMessageIds.length,
      originalTokenCount: frozenSummary.originalTokenCount,
      compressedAt: frozenSummary.frozenAt,
      strategyUsed: 'hybrid',
      frozenSummaryDecision: 'reused',
    },
  };
}

/**
 * Create a new frozen summary from compressed messages
 * This is called after generating a summary to persist it for future reuse
 */
export function createFrozenSummary(
  summaryText: string,
  summarizedMessages: UIMessage[],
  previousVersion?: number
): FrozenCompressionSummary {
  const originalTokenCount = summarizedMessages.reduce(
    (sum, m) => sum + countTokens(m.content), 0
  );

  return {
    summaryText,
    frozenAt: new Date(),
    summarizedMessageIds: summarizedMessages.map(m => m.id),
    originalTokenCount,
    summaryTokenCount: countTokens(summaryText),
    version: (previousVersion ?? 0) + 1,
  };
}

/**
 * Get the provider cache profile for compression decisions
 * Re-exported for convenience from provider-cache-profile module
 */
export function getProviderCacheInfo(provider: string): ProviderCacheProfile {
  return getProviderCacheProfile(provider as ProviderName);
}

export { DEFAULT_COMPRESSION_SETTINGS };
