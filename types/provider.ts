/**
 * AI Provider type definitions
 */

export type ProviderType = 'cloud' | 'local';

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'groq' | 'mistral' | 'ollama' | 'auto';

export interface ModelConfig {
  id: string;
  name: string;
  contextLength: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  pricing?: {
    promptPer1M: number;
    completionPer1M: number;
  };
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  apiKeyRequired: boolean;
  baseURLRequired: boolean;
  models: ModelConfig[];
  defaultModel: string;
}

export interface UserProviderSettings {
  providerId: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel: string;
  enabled: boolean;
}

export interface CustomProviderSettings {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  enabled: boolean;
}

// Provider definitions
export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 2.5, completionPer1M: 10 },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.15, completionPer1M: 0.6 },
      },
      {
        id: 'o1',
        name: 'o1',
        contextLength: 200000,
        supportsTools: false,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 15, completionPer1M: 60 },
      },
      {
        id: 'o1-mini',
        name: 'o1 Mini',
        contextLength: 128000,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 3, completionPer1M: 12 },
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 3, completionPer1M: 15 },
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 15, completionPer1M: 75 },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.8, completionPer1M: 4 },
      },
    ],
  },
  google: {
    id: 'google',
    name: 'Google AI',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'gemini-2.0-flash-exp',
    models: [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        contextLength: 1000000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 }, // Free during preview
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextLength: 2000000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 1.25, completionPer1M: 5 },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextLength: 1000000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.075, completionPer1M: 0.3 },
      },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'deepseek-chat',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        contextLength: 64000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.14, completionPer1M: 0.28 },
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        contextLength: 64000,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.55, completionPer1M: 2.19 },
      },
    ],
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.59, completionPer1M: 0.79 },
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextLength: 32768,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.24, completionPer1M: 0.24 },
      },
    ],
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'mistral-large-latest',
    models: [
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 2, completionPer1M: 6 },
      },
      {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        contextLength: 32000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.2, completionPer1M: 0.6 },
      },
    ],
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'llama3.2',
    models: [
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
      },
      {
        id: 'qwen2.5',
        name: 'Qwen 2.5',
        contextLength: 32000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
      },
      {
        id: 'mistral',
        name: 'Mistral',
        contextLength: 32000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
      },
    ],
  },
};

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDERS[providerId];
}

export function getModelConfig(
  providerId: string,
  modelId: string
): ModelConfig | undefined {
  const provider = PROVIDERS[providerId];
  return provider?.models.find((m) => m.id === modelId);
}
