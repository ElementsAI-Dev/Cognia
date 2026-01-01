/**
 * OpenRouter API Service
 * Provides methods for key management, credits, models, and BYOK
 * https://openrouter.ai/docs
 */

import type {
  OpenRouterApiKey,
  OpenRouterApiKeyCreate,
  OpenRouterApiKeyUpdate,
  OpenRouterApiKeyResponse,
  OpenRouterApiKeyCreateResponse,
  OpenRouterCredits,
  OpenRouterModel,
  OpenRouterModelsResponse,
  ProviderOrderingConfig,
} from '@/types/openrouter';
import type { BYOKKeyEntry } from '@/types/provider';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// ============================================================================
// Error Handling
// ============================================================================

export class OpenRouterError extends Error {
  code: number;
  metadata?: Record<string, unknown>;

  constructor(message: string, code: number, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'OpenRouterError';
    this.code = code;
    this.metadata = metadata;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'OpenRouter API error';
    let errorCode = response.status;
    let metadata: Record<string, unknown> | undefined;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        errorCode = errorData.error.code || errorCode;
        metadata = errorData.error.metadata;
      }
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    throw new OpenRouterError(errorMessage, errorCode, metadata);
  }

  return response.json();
}

// ============================================================================
// API Key Management (Provisioning API)
// https://openrouter.ai/docs/guides/overview/auth/provisioning-api-keys
// ============================================================================

export async function listApiKeys(
  provisioningKey: string,
  offset = 0
): Promise<OpenRouterApiKey[]> {
  const url = new URL(`${OPENROUTER_BASE_URL}/keys`);
  if (offset > 0) {
    url.searchParams.set('offset', offset.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${provisioningKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await handleResponse<OpenRouterApiKeyResponse>(response);
  return data.data;
}

export async function createApiKey(
  provisioningKey: string,
  config: OpenRouterApiKeyCreate
): Promise<OpenRouterApiKeyCreateResponse['data']> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provisioningKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  const data = await handleResponse<OpenRouterApiKeyCreateResponse>(response);
  return data.data;
}

export async function getApiKey(
  provisioningKey: string,
  keyHash: string
): Promise<OpenRouterApiKey> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/keys/${keyHash}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${provisioningKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await handleResponse<{ data: OpenRouterApiKey }>(response);
  return data.data;
}

export async function updateApiKey(
  provisioningKey: string,
  keyHash: string,
  updates: OpenRouterApiKeyUpdate
): Promise<OpenRouterApiKey> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/keys/${keyHash}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${provisioningKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const data = await handleResponse<{ data: OpenRouterApiKey }>(response);
  return data.data;
}

export async function deleteApiKey(
  provisioningKey: string,
  keyHash: string
): Promise<void> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/keys/${keyHash}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${provisioningKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleResponse(response);
  }
}

// ============================================================================
// Credits & Usage
// ============================================================================

export async function getCredits(apiKey: string): Promise<OpenRouterCredits> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await handleResponse<{ data: OpenRouterCredits }>(response);
  return data.data;
}

// ============================================================================
// Models
// ============================================================================

export async function listModels(apiKey?: string): Promise<OpenRouterModel[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    method: 'GET',
    headers,
  });

  const data = await handleResponse<OpenRouterModelsResponse>(response);
  return data.data;
}

export async function getModel(modelId: string, apiKey?: string): Promise<OpenRouterModel | null> {
  const models = await listModels(apiKey);
  return models.find(m => m.id === modelId) || null;
}

// ============================================================================
// BYOK Helpers
// ============================================================================

export function buildProviderOrderingHeader(
  byokKeys: BYOKKeyEntry[],
  ordering?: ProviderOrderingConfig
): ProviderOrderingConfig | undefined {
  if (!ordering && byokKeys.length === 0) {
    return undefined;
  }

  // If user has BYOK keys, OpenRouter will automatically prioritize them
  // We just need to set the provider ordering if specified
  if (ordering) {
    return ordering;
  }

  return undefined;
}

export function getEnabledBYOKProviders(byokKeys: BYOKKeyEntry[]): string[] {
  return byokKeys
    .filter(k => k.enabled)
    .map(k => k.provider);
}

// ============================================================================
// Request Helpers
// ============================================================================

export interface OpenRouterRequestConfig {
  apiKey: string;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  providerOrdering?: ProviderOrderingConfig;
  siteUrl?: string;
  siteName?: string;
}

export function buildChatRequestHeaders(
  apiKey: string,
  siteUrl?: string,
  siteName?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Optional headers for app attribution
  // https://openrouter.ai/docs/api-reference/overview#headers
  if (siteUrl) {
    headers['HTTP-Referer'] = siteUrl;
  }
  if (siteName) {
    headers['X-Title'] = siteName;
  }

  return headers;
}

export function buildChatRequestBody(config: OpenRouterRequestConfig): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: config.messages,
  };

  if (config.temperature !== undefined) {
    body.temperature = config.temperature;
  }
  if (config.maxTokens !== undefined) {
    body.max_tokens = config.maxTokens;
  }
  if (config.topP !== undefined) {
    body.top_p = config.topP;
  }
  if (config.stream !== undefined) {
    body.stream = config.stream;
  }
  if (config.providerOrdering) {
    body.provider = config.providerOrdering;
  }

  return body;
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidOpenRouterKey(key: string): boolean {
  // OpenRouter keys start with "sk-or-" for OAuth keys
  // or can be other formats for provisioning keys
  return key.length > 10 && (key.startsWith('sk-or-') || key.startsWith('sk-'));
}

export function isProvisioningKey(key: string): boolean {
  // Provisioning keys have a specific format
  // They cannot be used for completions, only for key management
  return key.startsWith('sk-or-v1-');
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return '****';
  }
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

// ============================================================================
// Credit Formatting
// ============================================================================

export function formatCredits(credits: number): string {
  if (credits >= 1) {
    return `$${credits.toFixed(2)}`;
  }
  if (credits >= 0.01) {
    return `$${credits.toFixed(4)}`;
  }
  return `$${credits.toFixed(6)}`;
}

export function formatUsage(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// ============================================================================
// Model Helpers
// ============================================================================

export function parseModelPricing(model: OpenRouterModel): {
  promptPer1M: number;
  completionPer1M: number;
} {
  // OpenRouter returns pricing as string per token
  const promptPerToken = parseFloat(model.pricing.prompt) || 0;
  const completionPerToken = parseFloat(model.pricing.completion) || 0;

  return {
    promptPer1M: promptPerToken * 1_000_000,
    completionPer1M: completionPerToken * 1_000_000,
  };
}

export function isModelFree(model: OpenRouterModel): boolean {
  const { promptPer1M, completionPer1M } = parseModelPricing(model);
  return promptPer1M === 0 && completionPer1M === 0;
}

export function getModelProvider(modelId: string): string {
  // OpenRouter model IDs are formatted as "provider/model-name"
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

export function sortModelsByProvider(models: OpenRouterModel[]): OpenRouterModel[] {
  return [...models].sort((a, b) => {
    const providerA = getModelProvider(a.id);
    const providerB = getModelProvider(b.id);
    if (providerA !== providerB) {
      return providerA.localeCompare(providerB);
    }
    return a.name.localeCompare(b.name);
  });
}

export function groupModelsByProvider(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
  return models.reduce((acc, model) => {
    const provider = getModelProvider(model.id);
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);
}
