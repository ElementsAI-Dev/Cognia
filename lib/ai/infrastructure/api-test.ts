/**
 * API Connection Testing - Test provider API connections
 */

import { invoke } from '@tauri-apps/api/core';
import { proxyFetch } from '@/lib/network/proxy-fetch';

export interface ApiTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  model_info?: string;
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
      return testOllamaConnection(baseUrl || 'http://localhost:11434');
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
