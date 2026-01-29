/**
 * AI Provider type definitions
 */

export type ProviderType = 'cloud' | 'local';

export type ProviderName =
  // Cloud providers
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'xai'
  | 'togetherai'
  | 'openrouter'
  | 'cohere'
  | 'fireworks'
  | 'cerebras'
  | 'sambanova'
  // Local providers
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'llamafile'
  | 'vllm'
  | 'localai'
  | 'jan'
  | 'textgenwebui'
  | 'koboldcpp'
  | 'tabbyapi'
  // Proxy/Aggregator providers
  | 'cliproxyapi'
  // Auto router
  | 'auto';

export interface ModelConfig {
  id: string;
  name: string;
  contextLength: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
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
  // OAuth support
  supportsOAuth?: boolean;
  oauthConfig?: OAuthConfig;
  // Provider metadata
  description?: string;
  website?: string;
  dashboardUrl?: string;
  docsUrl?: string;
  category?: 'flagship' | 'aggregator' | 'specialized' | 'local' | 'enterprise';
}

// OAuth configuration for providers that support it
export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId?: string;
  scope?: string;
  pkceRequired?: boolean;
  callbackPath: string;
}

// API Key rotation strategies
export type ApiKeyRotationStrategy = 'round-robin' | 'random' | 'least-used';

// API Key usage statistics
export interface ApiKeyUsageStats {
  usageCount: number;
  lastUsed: number;
  errorCount: number;
  lastError?: string;
}

export interface UserProviderSettings {
  providerId: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel: string;
  enabled: boolean;
  // Multi-API Key support
  apiKeys?: string[];
  apiKeyRotationEnabled?: boolean;
  apiKeyRotationStrategy?: ApiKeyRotationStrategy;
  apiKeyUsageStats?: Record<string, ApiKeyUsageStats>;
  currentKeyIndex?: number;
  // OAuth state
  oauthConnected?: boolean;
  oauthExpiresAt?: number;
  // Health monitoring
  lastHealthCheck?: number;
  healthStatus?: 'healthy' | 'degraded' | 'error' | 'unknown';
  quotaUsed?: number;
  quotaLimit?: number;
  rateLimitRemaining?: number;
  // OpenRouter-specific settings
  openRouterSettings?: OpenRouterExtendedSettings;
  // CLIProxyAPI-specific settings
  cliProxyAPISettings?: CLIProxyAPIExtendedSettings;
}

// CLIProxyAPI-specific extended settings
export interface CLIProxyAPIExtendedSettings {
  // Server configuration
  host?: string;
  port?: number;
  // Management API
  managementKey?: string;
  allowRemoteManagement?: boolean;
  // Routing strategy
  routingStrategy?: 'round-robin' | 'fill-first';
  // Request retry settings
  requestRetry?: number;
  maxRetryInterval?: number;
  // Quota exceeded behavior
  quotaExceededSwitchProject?: boolean;
  quotaExceededSwitchPreviewModel?: boolean;
  // Streaming settings
  streamingKeepaliveSeconds?: number;
  streamingBootstrapRetries?: number;
  // WebUI settings
  webUIEnabled?: boolean;
  webUILastOpened?: number;
  // Usage statistics
  usageStatisticsEnabled?: boolean;
  // Connection status
  lastHealthCheck?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'error';
  serverVersion?: string;
  // Available models from server
  availableModels?: string[];
  modelsLastFetched?: number;
}

// OpenRouter-specific extended settings
export interface OpenRouterExtendedSettings {
  // Provisioning API key for key management
  provisioningApiKey?: string;
  // BYOK (Bring Your Own Key) configurations
  byokKeys?: BYOKKeyEntry[];
  // Provider ordering for fallback control
  providerOrdering?: {
    enabled: boolean;
    allowFallbacks: boolean;
    order: string[];
  };
  // Cached credits info
  credits?: number;
  creditsUsed?: number;
  creditsRemaining?: number;
  creditsLastFetched?: number;
  // Site attribution
  siteUrl?: string;
  siteName?: string;
}

// BYOK key entry for OpenRouter
export interface BYOKKeyEntry {
  id: string;
  provider: BYOKProvider;
  config: string; // JSON stringified config for complex providers
  alwaysUse: boolean;
  enabled: boolean;
  name?: string;
}

export type BYOKProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'bedrock'
  | 'vertex'
  | 'mistral'
  | 'cohere'
  | 'groq';

/**
 * API Protocol types for custom providers
 * - openai: OpenAI-compatible API (most common, used by many providers)
 * - anthropic: Anthropic Claude API format
 * - gemini: Google Gemini API format
 */
export type ApiProtocol = 'openai' | 'anthropic' | 'gemini';

export interface CustomProviderSettings {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  apiProtocol: ApiProtocol;
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
        supportsAudio: true,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 2.5, completionPer1M: 10 },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.15, completionPer1M: 0.6 },
      },
      {
        id: 'o1',
        name: 'o1',
        contextLength: 200000,
        supportsTools: false,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 15, completionPer1M: 60 },
      },
      {
        id: 'o1-mini',
        name: 'o1 Mini',
        contextLength: 128000,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
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
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 3, completionPer1M: 15 },
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 15, completionPer1M: 75 },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
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
        supportsAudio: true,
        supportsVideo: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 }, // Free during preview
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextLength: 2000000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 1.25, completionPer1M: 5 },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextLength: 1000000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: true,
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
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.14, completionPer1M: 0.28 },
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        contextLength: 64000,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
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
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.59, completionPer1M: 0.79 },
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextLength: 32768,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
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
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 2, completionPer1M: 6 },
      },
      {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        contextLength: 32000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
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
    category: 'local',
    description: 'Run models locally with easy model management',
    website: 'https://ollama.ai',
    docsUrl: 'https://github.com/ollama/ollama',
    models: [
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'qwen2.5',
        name: 'Qwen 2.5',
        contextLength: 32000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'mistral',
        name: 'Mistral',
        contextLength: 32000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Desktop app for running local LLMs with OpenAI-compatible API',
    website: 'https://lmstudio.ai',
    docsUrl: 'https://lmstudio.ai/docs',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  llamacpp: {
    id: 'llamacpp',
    name: 'llama.cpp Server',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'High-performance C++ inference server for GGUF models',
    website: 'https://github.com/ggerganov/llama.cpp',
    docsUrl: 'https://github.com/ggerganov/llama.cpp/blob/master/examples/server/README.md',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  llamafile: {
    id: 'llamafile',
    name: 'llamafile',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Single-file executable LLM with built-in server',
    website: 'https://github.com/Mozilla-Ocho/llamafile',
    docsUrl: 'https://github.com/Mozilla-Ocho/llamafile#readme',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: false,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  vllm: {
    id: 'vllm',
    name: 'vLLM',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'High-throughput GPU inference engine with PagedAttention',
    website: 'https://vllm.ai',
    docsUrl: 'https://docs.vllm.ai',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 32768,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  localai: {
    id: 'localai',
    name: 'LocalAI',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Self-hosted OpenAI alternative with multiple backends',
    website: 'https://localai.io',
    docsUrl: 'https://localai.io/docs',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  jan: {
    id: 'jan',
    name: 'Jan',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Open-source ChatGPT alternative with local-first design',
    website: 'https://jan.ai',
    docsUrl: 'https://jan.ai/docs',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  textgenwebui: {
    id: 'textgenwebui',
    name: 'Text Generation WebUI',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Gradio web UI with OpenAI-compatible API extension',
    website: 'https://github.com/oobabooga/text-generation-webui',
    docsUrl: 'https://github.com/oobabooga/text-generation-webui/wiki',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: false,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  koboldcpp: {
    id: 'koboldcpp',
    name: 'KoboldCpp',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Easy-to-use llama.cpp fork with web UI and API',
    website: 'https://github.com/LostRuins/koboldcpp',
    docsUrl: 'https://github.com/LostRuins/koboldcpp/wiki',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 8192,
        supportsTools: false,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  tabbyapi: {
    id: 'tabbyapi',
    name: 'TabbyAPI',
    type: 'local',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    category: 'local',
    description: 'Exllamav2 API server with OpenAI-compatible endpoints',
    website: 'https://github.com/theroyallab/tabbyAPI',
    docsUrl: 'https://github.com/theroyallab/tabbyAPI/wiki',
    models: [
      {
        id: 'local-model',
        name: 'Local Model',
        contextLength: 16384,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
  xai: {
    id: 'xai',
    name: 'xAI (Grok)',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'grok-3',
    models: [
      {
        id: 'grok-3',
        name: 'Grok 3',
        contextLength: 131072,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 3, completionPer1M: 15 },
      },
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        contextLength: 131072,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.3, completionPer1M: 0.5 },
      },
    ],
  },
  togetherai: {
    id: 'togetherai',
    name: 'Together AI',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    category: 'specialized',
    description: 'Fast inference for open source models',
    website: 'https://together.ai',
    dashboardUrl: 'https://api.together.xyz/settings/api-keys',
    docsUrl: 'https://docs.together.ai',
    models: [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        name: 'Llama 3.3 70B Turbo',
        contextLength: 131072,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.88, completionPer1M: 0.88 },
      },
      {
        id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
        name: 'Qwen 2.5 72B Turbo',
        contextLength: 32768,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 1.2, completionPer1M: 1.2 },
      },
      {
        id: 'deepseek-ai/DeepSeek-V3',
        name: 'DeepSeek V3',
        contextLength: 65536,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.5, completionPer1M: 0.5 },
      },
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'anthropic/claude-sonnet-4',
    category: 'aggregator',
    description: 'Access 200+ models through one API with OAuth login',
    website: 'https://openrouter.ai',
    dashboardUrl: 'https://openrouter.ai/keys',
    docsUrl: 'https://openrouter.ai/docs',
    supportsOAuth: true,
    oauthConfig: {
      authorizationUrl: 'https://openrouter.ai/auth',
      tokenUrl: 'https://openrouter.ai/api/v1/auth/keys',
      pkceRequired: true,
      callbackPath: '/api/oauth/openrouter/callback',
      scope: 'openid profile',
    },
    models: [
      {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 3, completionPer1M: 15 },
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 2.5, completionPer1M: 10 },
      },
      {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash (Free)',
        contextLength: 1000000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: true,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 },
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        contextLength: 131072,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.4, completionPer1M: 0.4 },
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        contextLength: 64000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.14, completionPer1M: 0.28 },
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        contextLength: 131072,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.35, completionPer1M: 0.4 },
      },
    ],
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'command-r-plus',
    category: 'enterprise',
    description: 'Enterprise AI with RAG and embeddings',
    website: 'https://cohere.com',
    dashboardUrl: 'https://dashboard.cohere.com/api-keys',
    docsUrl: 'https://docs.cohere.com',
    models: [
      {
        id: 'command-r-plus',
        name: 'Command R+',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 2.5, completionPer1M: 10 },
      },
      {
        id: 'command-r',
        name: 'Command R',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.15, completionPer1M: 0.6 },
      },
      {
        id: 'command-a-03-2025',
        name: 'Command A',
        contextLength: 256000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 2.5, completionPer1M: 10 },
      },
    ],
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    category: 'specialized',
    description: 'Ultra-fast inference with compound AI',
    website: 'https://fireworks.ai',
    dashboardUrl: 'https://fireworks.ai/account/api-keys',
    docsUrl: 'https://docs.fireworks.ai',
    models: [
      {
        id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        name: 'Llama 3.3 70B',
        contextLength: 131072,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.9, completionPer1M: 0.9 },
      },
      {
        id: 'accounts/fireworks/models/qwen2p5-72b-instruct',
        name: 'Qwen 2.5 72B',
        contextLength: 32768,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.9, completionPer1M: 0.9 },
      },
      {
        id: 'accounts/fireworks/models/deepseek-v3',
        name: 'DeepSeek V3',
        contextLength: 65536,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.9, completionPer1M: 0.9 },
      },
    ],
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'llama-3.3-70b',
    category: 'specialized',
    description: 'Fastest inference with custom AI chips',
    website: 'https://cerebras.ai',
    dashboardUrl: 'https://cloud.cerebras.ai/platform',
    docsUrl: 'https://inference-docs.cerebras.ai',
    models: [
      {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        contextLength: 8192,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.85, completionPer1M: 1.2 },
      },
      {
        id: 'llama-3.1-8b',
        name: 'Llama 3.1 8B',
        contextLength: 8192,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0.1, completionPer1M: 0.1 },
      },
    ],
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova',
    type: 'cloud',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    category: 'specialized',
    description: 'Enterprise AI with custom hardware',
    website: 'https://sambanova.ai',
    dashboardUrl: 'https://cloud.sambanova.ai/apis',
    docsUrl: 'https://docs.sambanova.ai',
    models: [
      {
        id: 'Meta-Llama-3.3-70B-Instruct',
        name: 'Llama 3.3 70B',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 }, // Free tier available
      },
      {
        id: 'DeepSeek-R1-Distill-Llama-70B',
        name: 'DeepSeek R1 Distill 70B',
        contextLength: 8192,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 },
      },
      {
        id: 'Qwen2.5-72B-Instruct',
        name: 'Qwen 2.5 72B',
        contextLength: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 },
      },
    ],
  },
  cliproxyapi: {
    id: 'cliproxyapi',
    name: 'CLIProxyAPI',
    type: 'local',
    apiKeyRequired: true,
    baseURLRequired: true,
    defaultModel: 'gemini-2.5-flash',
    category: 'aggregator',
    description: 'Self-hosted AI proxy aggregating multiple providers',
    website: 'https://help.router-for.me',
    dashboardUrl: 'http://localhost:8317/management.html',
    docsUrl: 'https://help.router-for.me/introduction/quick-start.html',
    models: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextLength: 1000000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: true,
        supportsStreaming: true,
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        contextLength: 2000000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: true,
        supportsStreaming: true,
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextLength: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        contextLength: 64000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
    ],
  },
};

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDERS[providerId];
}

// ============================================================================
// Provider Context Types (from provider-context.tsx)
// ============================================================================

// Provider health status
export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Provider metadata for context
export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  website?: string;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  maxTokens?: number;
  pricingUrl?: string;
  icon?: string;
}

// Provider health info
export interface ProviderHealth {
  status: ProviderHealthStatus;
  lastCheck: Date | null;
  latency?: number;
  errorRate?: number;
  lastError?: string;
}

// Provider with metadata and health
export interface EnhancedProvider {
  settings: UserProviderSettings;
  metadata: ProviderMetadata;
  health: ProviderHealth;
  isCustom: boolean;
}

export function getModelConfig(providerId: string, modelId: string): ModelConfig | undefined {
  const provider = PROVIDERS[providerId];
  return provider?.models.find((m) => m.id === modelId);
}
