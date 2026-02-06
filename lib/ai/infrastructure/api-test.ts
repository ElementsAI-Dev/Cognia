/**
 * API Connection Testing - Test provider API connections
 */

import { invoke } from '@tauri-apps/api/core';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import type { ApiProtocol } from '@/types/provider';

export interface ApiTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  model_info?: string;
}

// Local provider detection result
export interface LocalProviderDetectionResult {
  providerId: string;
  name: string;
  baseUrl: string;
  isRunning: boolean;
  models?: string[];
  version?: string;
}

// Default configurations for local providers
export const LOCAL_PROVIDER_TEST_CONFIGS: Record<string, { url: string; name: string; healthPath: string }> = {
  ollama: { url: 'http://localhost:11434', name: 'Ollama', healthPath: '/api/tags' },
  lmstudio: { url: 'http://localhost:1234', name: 'LM Studio', healthPath: '/v1/models' },
  llamacpp: { url: 'http://localhost:8080', name: 'llama.cpp', healthPath: '/health' },
  llamafile: { url: 'http://localhost:8080', name: 'llamafile', healthPath: '/health' },
  vllm: { url: 'http://localhost:8000', name: 'vLLM', healthPath: '/v1/models' },
  localai: { url: 'http://localhost:8080', name: 'LocalAI', healthPath: '/v1/models' },
  jan: { url: 'http://localhost:1337', name: 'Jan', healthPath: '/v1/models' },
  textgenwebui: { url: 'http://localhost:5000', name: 'Text Gen WebUI', healthPath: '/v1/models' },
  koboldcpp: { url: 'http://localhost:5001', name: 'KoboldCpp', healthPath: '/api/v1/model' },
  tabbyapi: { url: 'http://localhost:5000', name: 'TabbyAPI', healthPath: '/v1/models' },
};

export async function testCustomProviderConnectionByProtocol(
  baseUrl: string,
  apiKey: string,
  apiProtocol: ApiProtocol = 'openai'
): Promise<ApiTestResult> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const start = Date.now();

  try {
    let response: Response;

    if (apiProtocol === 'anthropic') {
      response = await proxyFetch(`${normalizedBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      const latency = Date.now() - start;
      const ok = response.ok || response.status === 400;
      return {
        success: ok,
        message: ok ? 'Connected successfully.' : `API error: ${response.status}`,
        latency_ms: latency,
      };
    }

    if (apiProtocol === 'gemini') {
      response = await proxyFetch(`${normalizedBaseUrl}/models?key=${apiKey}`);

      const latency = Date.now() - start;
      if (response.ok) {
        return { success: true, message: 'Connected successfully.', latency_ms: latency };
      }
      return {
        success: false,
        message: `API error: ${response.status}`,
        latency_ms: latency,
      };
    }

    response = await proxyFetch(`${normalizedBaseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const latency = Date.now() - start;
    if (response.ok) {
      return { success: true, message: 'Connected successfully.', latency_ms: latency };
    }
    return {
      success: false,
      message: `API error: ${response.status}`,
      latency_ms: latency,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check if running in Tauri environment
 */
function isInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Test OpenAI API connection
 */
export async function testOpenAIConnection(
  apiKey: string,
  baseUrl?: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_openai_connection', {
      apiKey,
      baseUrl,
    });
  }

  // Browser fallback - make direct API call
  try {
    const url = baseUrl || 'https://api.openai.com/v1';
    const start = Date.now();
    const response = await proxyFetch(`${url}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      const modelCount = data.data?.length || 0;
      return {
        success: true,
        message: `Connected successfully. ${modelCount} models available.`,
        latency_ms: latency,
        model_info: `${modelCount} models`,
      };
    } else {
      return {
        success: false,
        message: `API error: ${response.status}`,
        latency_ms: latency,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test Anthropic API connection
 */
export async function testAnthropicConnection(
  apiKey: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_anthropic_connection', { apiKey });
  }

  // Browser fallback - Anthropic requires server-side due to CORS
  return {
    success: apiKey.length > 20,
    message: apiKey.length > 20
      ? 'API key format valid. Full test requires desktop app.'
      : 'Invalid API key format',
    latency_ms: 0,
  };
}

/**
 * Test Google AI API connection
 */
export async function testGoogleConnection(
  apiKey: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_google_connection', { apiKey });
  }

  try {
    const start = Date.now();
    const response = await proxyFetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      const modelCount = data.models?.length || 0;
      return {
        success: true,
        message: `Connected successfully. ${modelCount} models available.`,
        latency_ms: latency,
        model_info: `${modelCount} models`,
      };
    } else {
      return {
        success: false,
        message: `API error: ${response.status}`,
        latency_ms: latency,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test DeepSeek API connection
 */
export async function testDeepSeekConnection(
  apiKey: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_deepseek_connection', { apiKey });
  }

  return {
    success: apiKey.length > 10,
    message: apiKey.length > 10
      ? 'API key format valid. Full test requires desktop app.'
      : 'Invalid API key format',
    latency_ms: 0,
  };
}

/**
 * Test Groq API connection
 */
export async function testGroqConnection(
  apiKey: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_groq_connection', { apiKey });
  }

  return {
    success: apiKey.length > 10,
    message: apiKey.length > 10
      ? 'API key format valid. Full test requires desktop app.'
      : 'Invalid API key format',
    latency_ms: 0,
  };
}

/**
 * Test Mistral API connection
 */
export async function testMistralConnection(
  apiKey: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_mistral_connection', { apiKey });
  }

  return {
    success: apiKey.length > 10,
    message: apiKey.length > 10
      ? 'API key format valid. Full test requires desktop app.'
      : 'Invalid API key format',
    latency_ms: 0,
  };
}

/**
 * Test Ollama connection
 */
export async function testOllamaConnection(
  baseUrl: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_ollama_connection', { baseUrl });
  }

  try {
    const url = baseUrl.endsWith('/v1')
      ? baseUrl.slice(0, -3)
      : baseUrl;
    const start = Date.now();
    const response = await proxyFetch(`${url}/api/tags`);
    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      const modelCount = data.models?.length || 0;
      return {
        success: true,
        message: `Connected successfully. ${modelCount} local models available.`,
        latency_ms: latency,
        model_info: `${modelCount} models`,
      };
    } else {
      return {
        success: false,
        message: `Connection failed: ${response.status}`,
        latency_ms: latency,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test local inference provider connection by URL (OpenAI-compatible)
 * Works for: LM Studio, llama.cpp, llamafile, vLLM, LocalAI, Jan, etc.
 */
export async function testLocalProviderConnectionByUrl(
  baseUrl: string,
  providerName: string = 'Local'
): Promise<ApiTestResult> {
  try {
    // Normalize the URL
    let url = baseUrl.trim().replace(/\/+$/, '');
    if (!url.endsWith('/v1')) {
      url = `${url}/v1`;
    }
    
    const start = Date.now();
    const response = await proxyFetch(`${url}/models`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      const modelCount = data.data?.length || 0;
      const modelList = data.data?.slice(0, 3).map((m: { id: string }) => m.id).join(', ');
      return {
        success: true,
        message: `${providerName} connected. ${modelCount} model(s)${modelList ? `: ${modelList}` : ''}.`,
        latency_ms: latency,
        model_info: `${modelCount} models`,
      };
    } else {
      return {
        success: false,
        message: `${providerName} connection failed: HTTP ${response.status}`,
        latency_ms: latency,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : `${providerName} connection failed`,
    };
  }
}

/**
 * Test custom OpenAI-compatible provider connection
 */
export async function testCustomProviderConnection(
  baseUrl: string,
  apiKey: string
): Promise<ApiTestResult> {
  if (isInTauri()) {
    return invoke<ApiTestResult>('test_custom_provider_connection', {
      baseUrl,
      apiKey,
    });
  }

  try {
    const url = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
    const start = Date.now();
    const response = await proxyFetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const latency = Date.now() - start;

    if (response.ok) {
      return {
        success: true,
        message: 'Connected successfully to custom provider.',
        latency_ms: latency,
        model_info: 'Custom provider available',
      };
    } else {
      return {
        success: false,
        message: `API error: ${response.status}`,
        latency_ms: latency,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test provider connection by provider ID
 */
export async function testProviderConnection(
  providerId: string,
  apiKey: string,
  baseUrl?: string
): Promise<ApiTestResult> {
  // Default base URLs for local providers
  const localProviderDefaults: Record<string, { url: string; name: string }> = {
    ollama: { url: 'http://localhost:11434', name: 'Ollama' },
    lmstudio: { url: 'http://localhost:1234', name: 'LM Studio' },
    llamacpp: { url: 'http://localhost:8080', name: 'llama.cpp' },
    llamafile: { url: 'http://localhost:8080', name: 'llamafile' },
    vllm: { url: 'http://localhost:8000', name: 'vLLM' },
    localai: { url: 'http://localhost:8080', name: 'LocalAI' },
    jan: { url: 'http://localhost:1337', name: 'Jan' },
    textgenwebui: { url: 'http://localhost:5000', name: 'Text Gen WebUI' },
    koboldcpp: { url: 'http://localhost:5001', name: 'KoboldCpp' },
    tabbyapi: { url: 'http://localhost:5000', name: 'TabbyAPI' },
  };

  switch (providerId) {
    case 'openai':
      return testOpenAIConnection(apiKey, baseUrl);
    case 'anthropic':
      return testAnthropicConnection(apiKey);
    case 'google':
      return testGoogleConnection(apiKey);
    case 'deepseek':
      return testDeepSeekConnection(apiKey);
    case 'groq':
      return testGroqConnection(apiKey);
    case 'mistral':
      return testMistralConnection(apiKey);
    case 'ollama':
      return testOllamaConnection(baseUrl || localProviderDefaults.ollama.url);
    // Local inference providers (OpenAI-compatible)
    case 'lmstudio':
    case 'llamacpp':
    case 'llamafile':
    case 'vllm':
    case 'localai':
    case 'jan':
    case 'textgenwebui':
    case 'koboldcpp':
    case 'tabbyapi': {
      const config = localProviderDefaults[providerId];
      return testLocalProviderConnectionByUrl(baseUrl || config.url, config.name);
    }
    default:
      if (baseUrl) {
        return testCustomProviderConnection(baseUrl, apiKey);
      }
      return {
        success: false,
        message: 'Unknown provider',
      };
  }
}

/**
 * Detect running local AI providers by checking their health endpoints
 * Returns list of detected providers with their status and available models
 */
export async function detectLocalProviders(
  providerIds?: string[]
): Promise<LocalProviderDetectionResult[]> {
  const providersToCheck = providerIds || Object.keys(LOCAL_PROVIDER_TEST_CONFIGS);
  const results: LocalProviderDetectionResult[] = [];
  
  // Check each provider in parallel with timeout
  const checkPromises = providersToCheck.map(async (providerId) => {
    const config = LOCAL_PROVIDER_TEST_CONFIGS[providerId];
    if (!config) return null;
    
    const result: LocalProviderDetectionResult = {
      providerId,
      name: config.name,
      baseUrl: config.url,
      isRunning: false,
    };
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`${config.url}${config.healthPath}`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        result.isRunning = true;
        
        // Try to parse models from response
        try {
          const data = await response.json();
          
          // Handle different response formats
          if (providerId === 'ollama' && data.models) {
            result.models = data.models.map((m: { name: string }) => m.name);
          } else if (data.data && Array.isArray(data.data)) {
            // OpenAI-compatible format
            result.models = data.data.map((m: { id: string }) => m.id);
          } else if (Array.isArray(data)) {
            result.models = data.map((m: { id?: string; name?: string }) => m.id || m.name || '');
          }
        } catch {
          // Couldn't parse models, but provider is running
        }
      }
    } catch {
      // Provider not running or unreachable
      result.isRunning = false;
    }
    
    return result;
  });
  
  const checkResults = await Promise.all(checkPromises);
  
  // Filter out nulls and add to results
  for (const result of checkResults) {
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Detect a single local provider
 */
export async function detectLocalProvider(
  providerId: string,
  customUrl?: string
): Promise<LocalProviderDetectionResult | null> {
  const config = LOCAL_PROVIDER_TEST_CONFIGS[providerId];
  if (!config && !customUrl) return null;
  
  const baseUrl = customUrl || config?.url || '';
  const healthPath = config?.healthPath || '/v1/models';
  
  const result: LocalProviderDetectionResult = {
    providerId,
    name: config?.name || providerId,
    baseUrl,
    isRunning: false,
  };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${baseUrl}${healthPath}`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      result.isRunning = true;
      
      try {
        const data = await response.json();
        
        if (providerId === 'ollama' && data.models) {
          result.models = data.models.map((m: { name: string }) => m.name);
        } else if (data.data && Array.isArray(data.data)) {
          result.models = data.data.map((m: { id: string }) => m.id);
        }
      } catch {
        // Couldn't parse models
      }
    }
  } catch {
    result.isRunning = false;
  }
  
  return result;
}
