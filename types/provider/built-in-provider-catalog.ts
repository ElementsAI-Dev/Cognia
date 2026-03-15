export type BuiltInProviderType = 'cloud' | 'local';
export type BuiltInProviderCategory =
  | 'flagship'
  | 'aggregator'
  | 'specialized'
  | 'local'
  | 'enterprise';
export type BuiltInProviderProtocol = 'openai' | 'anthropic' | 'gemini';
export type ProviderUseCase = 'coding';

export interface BuiltInProviderModelPricing {
  promptPer1M: number;
  completionPer1M: number;
}

export interface BuiltInProviderModelEntry {
  id: string;
  name: string;
  contextLength: number;
  maxOutputTokens?: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsStreaming: boolean;
  supportsReasoning?: boolean;
  supportsImageGeneration?: boolean;
  supportsEmbedding?: boolean;
  pricing?: BuiltInProviderModelPricing;
  recommendedFor?: ProviderUseCase[];
}

export interface BuiltInProviderCodingPackage {
  id: 'coding';
  label: string;
  defaultModel: string;
  modelIds: string[];
}

export interface BuiltInProviderOAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId?: string;
  scope?: string;
  pkceRequired?: boolean;
  callbackPath: string;
}

export interface BuiltInProviderCompatibilityRule {
  protocol: BuiltInProviderProtocol;
  baseURLs: string[];
  nameIncludes?: string[];
  modelPrefixes?: string[];
}

export interface BuiltInProviderCatalogEntry {
  id: string;
  name: string;
  type: BuiltInProviderType;
  protocol: BuiltInProviderProtocol;
  apiKeyRequired: boolean;
  baseURLRequired: boolean;
  defaultModel: string;
  defaultEnabled: boolean;
  defaultBaseURL?: string;
  defaultSettingsBaseURL?: string;
  placeholderApiKey?: string;
  category?: BuiltInProviderCategory;
  description?: string;
  website?: string;
  dashboardUrl?: string;
  docsUrl?: string;
  pricingUrl?: string;
  supportsOAuth?: boolean;
  oauthConfig?: BuiltInProviderOAuthConfig;
  models?: BuiltInProviderModelEntry[];
  codingPackage?: BuiltInProviderCodingPackage;
  compatibility?: BuiltInProviderCompatibilityRule;
}

export const BUILT_IN_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'groq',
  'mistral',
  'xai',
  'togetherai',
  'openrouter',
  'cohere',
  'fireworks',
  'cerebras',
  'sambanova',
  'zhipu',
  'minimax',
  'ollama',
  'lmstudio',
  'llamacpp',
  'llamafile',
  'vllm',
  'localai',
  'jan',
  'textgenwebui',
  'koboldcpp',
  'tabbyapi',
  'cliproxyapi',
] as const;

export type BuiltInProviderId = typeof BUILT_IN_PROVIDER_IDS[number];

const BUILT_IN_PROVIDER_ID_SET = new Set<string>(BUILT_IN_PROVIDER_IDS);

export function isBuiltInProviderId(providerId: string): providerId is BuiltInProviderId {
  return BUILT_IN_PROVIDER_ID_SET.has(providerId);
}

const CATALOG_ENTRIES: Record<BuiltInProviderId, BuiltInProviderCatalogEntry> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'gpt-4o',
    defaultEnabled: true,
    category: 'flagship',
    description: 'Leading AI research organization with GPT and reasoning models',
    website: 'https://openai.com',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    pricingUrl: 'https://openai.com/pricing',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    protocol: 'anthropic',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'claude-sonnet-4-20250514',
    defaultEnabled: true,
    category: 'flagship',
    description: 'Claude models focused on reasoning and safety',
    website: 'https://anthropic.com',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com',
    pricingUrl: 'https://console.anthropic.com/pricing',
  },
  google: {
    id: 'google',
    name: 'Google AI',
    type: 'cloud',
    protocol: 'gemini',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'gemini-2.0-flash-exp',
    defaultEnabled: true,
    category: 'flagship',
    description: 'Gemini models from Google DeepMind',
    website: 'https://ai.google.dev',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    pricingUrl: 'https://ai.google.dev/pricing',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'deepseek-chat',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.deepseek.com/v1',
    category: 'specialized',
    description: 'DeepSeek chat and reasoning models from a Chinese AI lab',
    website: 'https://deepseek.com',
    dashboardUrl: 'https://platform.deepseek.com/api_keys',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'llama-3.3-70b-versatile',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.groq.com/openai/v1',
    category: 'specialized',
    description: 'Ultra-fast inference for open models',
    website: 'https://groq.com',
    dashboardUrl: 'https://console.groq.com/keys',
    pricingUrl: 'https://groq.com/pricing',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'mistral-large-latest',
    defaultEnabled: false,
    category: 'specialized',
    description: 'European AI company with Mistral and Codestral models',
    website: 'https://mistral.ai',
    dashboardUrl: 'https://console.mistral.ai/api-keys/',
    docsUrl: 'https://docs.mistral.ai',
    pricingUrl: 'https://mistral.ai/pricing',
  },
  xai: {
    id: 'xai',
    name: 'xAI (Grok)',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'grok-3',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.x.ai/v1',
    category: 'flagship',
    description: 'Grok models from xAI',
    website: 'https://x.ai',
    dashboardUrl: 'https://console.x.ai/team/api-keys',
    pricingUrl: 'https://x.ai/pricing',
  },
  togetherai: {
    id: 'togetherai',
    name: 'Together AI',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.together.xyz/v1',
    category: 'aggregator',
    description: 'Inference platform for open-source models',
    website: 'https://together.ai',
    dashboardUrl: 'https://api.together.xyz/settings/api-keys',
    docsUrl: 'https://docs.together.ai',
    pricingUrl: 'https://together.ai/pricing',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'anthropic/claude-sonnet-4',
    defaultEnabled: false,
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    category: 'aggregator',
    description: 'Unified API across many AI model providers',
    website: 'https://openrouter.ai',
    dashboardUrl: 'https://openrouter.ai/keys',
    docsUrl: 'https://openrouter.ai/docs',
    pricingUrl: 'https://openrouter.ai/models',
    supportsOAuth: true,
    oauthConfig: {
      authorizationUrl: 'https://openrouter.ai/auth',
      tokenUrl: 'https://openrouter.ai/api/v1/auth/keys',
      pkceRequired: true,
      callbackPath: '/api/oauth/openrouter/callback',
      scope: 'openid profile',
    },
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'command-r-plus',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.cohere.com/compatibility/v1',
    category: 'enterprise',
    description: 'Enterprise AI with RAG and embeddings',
    website: 'https://cohere.com',
    dashboardUrl: 'https://dashboard.cohere.com/api-keys',
    docsUrl: 'https://docs.cohere.com',
    pricingUrl: 'https://cohere.com/pricing',
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.fireworks.ai/inference/v1',
    category: 'specialized',
    description: 'Fast compound AI inference',
    website: 'https://fireworks.ai',
    dashboardUrl: 'https://fireworks.ai/account/api-keys',
    docsUrl: 'https://docs.fireworks.ai',
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'llama-3.3-70b',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.cerebras.ai/v1',
    category: 'specialized',
    description: 'Inference backed by custom AI chips',
    website: 'https://cerebras.ai',
    dashboardUrl: 'https://cloud.cerebras.ai/platform',
    docsUrl: 'https://inference-docs.cerebras.ai',
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.sambanova.ai/v1',
    category: 'specialized',
    description: 'Enterprise AI with custom hardware acceleration',
    website: 'https://sambanova.ai',
    dashboardUrl: 'https://cloud.sambanova.ai/apis',
    docsUrl: 'https://docs.sambanova.ai',
  },
  zhipu: {
    id: 'zhipu',
    name: 'Zhipu AI (智谱清言)',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'glm-4-flash',
    defaultEnabled: false,
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
    category: 'specialized',
    description: 'GLM models with strong Chinese and coding-oriented options',
    website: 'https://open.bigmodel.cn',
    dashboardUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    docsUrl: 'https://open.bigmodel.cn/dev/howuse/introduction',
    models: [
      {
        id: 'glm-4-flash',
        name: 'GLM-4 Flash',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        pricing: { promptPer1M: 0, completionPer1M: 0 },
      },
      {
        id: 'glm-4-air',
        name: 'GLM-4 Air',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'glm-4.6',
        name: 'GLM-4.6',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        recommendedFor: ['coding'],
      },
    ],
    codingPackage: {
      id: 'coding',
      label: 'Coding',
      defaultModel: 'glm-4.6',
      modelIds: ['glm-4.6', 'glm-4-air', 'glm-4-plus'],
    },
    compatibility: {
      protocol: 'openai',
      baseURLs: ['https://open.bigmodel.cn/api/paas/v4'],
      nameIncludes: ['zhipu', 'glm', 'bigmodel', '智谱'],
      modelPrefixes: ['glm-'],
    },
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    type: 'cloud',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'abab6.5s-chat',
    defaultEnabled: false,
    defaultBaseURL: 'https://api.minimax.chat/v1',
    category: 'specialized',
    description: 'MiniMax chat models with affordable coding-oriented options',
    website: 'https://www.minimaxi.com',
    dashboardUrl: 'https://api.minimax.chat/',
    docsUrl: 'https://api.minimax.chat/document',
    models: [
      {
        id: 'abab6.5s-chat',
        name: 'abab6.5s-chat',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'abab6.5g-chat',
        name: 'abab6.5g-chat',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'abab5.5-chat',
        name: 'abab5.5-chat',
        contextLength: 64000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
      },
      {
        id: 'minimax-m2',
        name: 'MiniMax M2',
        contextLength: 128000,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsStreaming: true,
        recommendedFor: ['coding'],
      },
    ],
    codingPackage: {
      id: 'coding',
      label: 'Coding',
      defaultModel: 'minimax-m2',
      modelIds: ['minimax-m2', 'abab6.5s-chat', 'abab6.5g-chat'],
    },
    compatibility: {
      protocol: 'openai',
      baseURLs: ['https://api.minimax.chat/v1'],
      nameIncludes: ['minimax', 'abab'],
      modelPrefixes: ['abab', 'minimax-'],
    },
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'llama3.2',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:11434/v1',
    defaultSettingsBaseURL: 'http://localhost:11434',
    placeholderApiKey: 'ollama',
    category: 'local',
    description: 'Run open-source models locally',
    website: 'https://ollama.ai',
    docsUrl: 'https://github.com/ollama/ollama',
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:1234/v1',
    defaultSettingsBaseURL: 'http://localhost:1234',
    placeholderApiKey: 'lm-studio',
    category: 'local',
    description: 'Desktop app for running local LLMs',
    website: 'https://lmstudio.ai',
    docsUrl: 'https://lmstudio.ai/docs',
  },
  llamacpp: {
    id: 'llamacpp',
    name: 'llama.cpp',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:8080/v1',
    defaultSettingsBaseURL: 'http://localhost:8080',
    placeholderApiKey: 'llama-cpp',
    category: 'local',
    description: 'High-performance C++ inference server',
    website: 'https://github.com/ggerganov/llama.cpp',
  },
  llamafile: {
    id: 'llamafile',
    name: 'Llamafile',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:8080/v1',
    defaultSettingsBaseURL: 'http://localhost:8080',
    placeholderApiKey: 'llamafile',
    category: 'local',
    description: 'Single-file executable local LLM server',
    website: 'https://github.com/Mozilla-Ocho/llamafile',
  },
  vllm: {
    id: 'vllm',
    name: 'vLLM',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:8000/v1',
    defaultSettingsBaseURL: 'http://localhost:8000',
    placeholderApiKey: 'vllm',
    category: 'local',
    description: 'High-throughput GPU inference engine',
    website: 'https://docs.vllm.ai',
  },
  localai: {
    id: 'localai',
    name: 'LocalAI',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:8080/v1',
    defaultSettingsBaseURL: 'http://localhost:8080',
    placeholderApiKey: 'localai',
    category: 'local',
    description: 'Self-hosted OpenAI alternative',
    website: 'https://localai.io',
    docsUrl: 'https://localai.io/docs',
  },
  jan: {
    id: 'jan',
    name: 'Jan',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:1337/v1',
    defaultSettingsBaseURL: 'http://localhost:1337',
    placeholderApiKey: 'jan',
    category: 'local',
    description: 'Open-source ChatGPT alternative',
    website: 'https://jan.ai',
    docsUrl: 'https://jan.ai/docs',
  },
  textgenwebui: {
    id: 'textgenwebui',
    name: 'Text Generation WebUI',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:5000/v1',
    defaultSettingsBaseURL: 'http://localhost:5000',
    placeholderApiKey: 'textgen',
    category: 'local',
    description: 'Gradio UI with OpenAI-compatible API',
    website: 'https://github.com/oobabooga/text-generation-webui',
  },
  koboldcpp: {
    id: 'koboldcpp',
    name: 'KoboldCpp',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:5001/v1',
    defaultSettingsBaseURL: 'http://localhost:5001',
    placeholderApiKey: 'koboldcpp',
    category: 'local',
    description: 'Easy-to-use llama.cpp fork',
    website: 'https://github.com/LostRuins/koboldcpp',
  },
  tabbyapi: {
    id: 'tabbyapi',
    name: 'TabbyAPI',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: false,
    baseURLRequired: true,
    defaultModel: 'local-model',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:5000/v1',
    defaultSettingsBaseURL: 'http://localhost:5000',
    placeholderApiKey: 'tabbyapi',
    category: 'local',
    description: 'Exllamav2 API server',
    website: 'https://github.com/theroyallab/tabbyAPI',
  },
  cliproxyapi: {
    id: 'cliproxyapi',
    name: 'CLIProxyAPI',
    type: 'local',
    protocol: 'openai',
    apiKeyRequired: true,
    baseURLRequired: true,
    defaultModel: 'gemini-2.5-flash',
    defaultEnabled: false,
    defaultBaseURL: 'http://localhost:8317/v1',
    defaultSettingsBaseURL: 'http://localhost:8317',
    category: 'aggregator',
    description: 'Self-hosted AI proxy aggregating multiple providers',
    website: 'https://help.router-for.me',
    dashboardUrl: 'http://localhost:8317/management.html',
    docsUrl: 'https://help.router-for.me/introduction/quick-start.html',
  },
};

export function getBuiltInProviderCatalog(): BuiltInProviderCatalogEntry[] {
  return BUILT_IN_PROVIDER_IDS.map((providerId) => CATALOG_ENTRIES[providerId]);
}

export function getBuiltInProviderCatalogEntry(
  providerId: string
): BuiltInProviderCatalogEntry | undefined {
  return isBuiltInProviderId(providerId) ? CATALOG_ENTRIES[providerId] : undefined;
}

export function getBuiltInProviderDefaultModel(providerId: string): string | undefined {
  return getBuiltInProviderCatalogEntry(providerId)?.defaultModel;
}

export function getBuiltInProviderDefaultBaseURL(providerId: string): string | undefined {
  return getBuiltInProviderCatalogEntry(providerId)?.defaultBaseURL;
}

export function getBuiltInProviderSettingsBaseURL(providerId: string): string | undefined {
  const entry = getBuiltInProviderCatalogEntry(providerId);
  return entry?.defaultSettingsBaseURL || entry?.defaultBaseURL;
}

export function getBuiltInProviderProtocol(
  providerId: string
): BuiltInProviderProtocol | undefined {
  return getBuiltInProviderCatalogEntry(providerId)?.protocol;
}

export function getBuiltInProviderCodingPackage(
  providerId: string
): BuiltInProviderCodingPackage | undefined {
  return getBuiltInProviderCatalogEntry(providerId)?.codingPackage;
}

export function getBuiltInProviderPlaceholderApiKey(providerId: string): string | undefined {
  return getBuiltInProviderCatalogEntry(providerId)?.placeholderApiKey;
}

export function buildDefaultBuiltInProviderSettings(): Record<
  BuiltInProviderId,
  {
    providerId: BuiltInProviderId;
    apiKey?: string;
    baseURL?: string;
    defaultModel: string;
    enabled: boolean;
  }
> {
  return Object.fromEntries(
    BUILT_IN_PROVIDER_IDS.map((providerId) => {
      const entry = CATALOG_ENTRIES[providerId];
      return [
        providerId,
        {
          providerId,
          apiKey: entry.apiKeyRequired ? '' : undefined,
          baseURL: entry.baseURLRequired
            ? getBuiltInProviderSettingsBaseURL(providerId)
            : undefined,
          defaultModel: entry.defaultModel,
          enabled: entry.defaultEnabled,
        },
      ];
    })
  ) as Record<
    BuiltInProviderId,
    {
      providerId: BuiltInProviderId;
      apiKey?: string;
      baseURL?: string;
      defaultModel: string;
      enabled: boolean;
    }
  >;
}
