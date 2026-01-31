/**
 * Provider Registry Utilities
 *
 * @description Shared provider configurations and registry utilities
 */

import type { PricingProviderConfig, StatusProviderConfig } from '../types';

// =============================================================================
// PRICING PROVIDERS
// =============================================================================

export const PRICING_PROVIDERS: PricingProviderConfig[] = [
  // US Providers
  {
    id: 'openai',
    name: 'OpenAI',
    region: 'US',
    urls: ['https://openai.com/api/pricing/'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    region: 'US',
    urls: ['https://www.anthropic.com/pricing'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'google',
    name: 'Google AI',
    region: 'US',
    urls: ['https://ai.google.dev/pricing'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    region: 'US',
    urls: ['https://mistral.ai/products/'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    region: 'US',
    urls: ['https://cohere.com/pricing'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'groq',
    name: 'Groq',
    region: 'US',
    urls: ['https://groq.com/pricing/'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'together',
    name: 'Together AI',
    region: 'US',
    urls: ['https://www.together.ai/pricing'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    region: 'US',
    urls: ['https://fireworks.ai/pricing'],
    currency: '$',
    unit: '/1M tokens',
    type: 'scraper',
  },
  // CN Providers
  {
    id: 'deepseek',
    name: 'DeepSeek',
    region: 'CN',
    urls: ['https://platform.deepseek.com/api-docs/pricing/'],
    currency: '¥',
    unit: '/1M tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI (智谱)',
    region: 'CN',
    urls: ['https://open.bigmodel.cn/pricing'],
    currency: '¥',
    unit: '/1K tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    region: 'CN',
    urls: ['https://platform.moonshot.cn/docs/pricing'],
    currency: '¥',
    unit: '/1M tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
  {
    id: 'baichuan',
    name: 'Baichuan (百川)',
    region: 'CN',
    urls: ['https://platform.baichuan-ai.com/price'],
    currency: '¥',
    unit: '/1K tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
  {
    id: 'qwen',
    name: 'Qwen (通义千问)',
    region: 'CN',
    urls: ['https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-qianwen-vl-plus-api'],
    currency: '¥',
    unit: '/1K tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    region: 'CN',
    urls: ['https://platform.minimaxi.com/document/Price'],
    currency: '¥',
    unit: '/1K tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    region: 'CN',
    urls: ['https://siliconflow.cn/pricing'],
    currency: '¥',
    unit: '/1M tokens',
    type: 'scraper',
    locale: 'zh-CN',
  },
];

// =============================================================================
// STATUS PROVIDERS
// =============================================================================

export const STATUS_PROVIDERS: StatusProviderConfig[] = [
  // US Providers
  {
    id: 'openai',
    name: 'OpenAI',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://api.openai.com/v1/models', type: 'api', method: 'GET' },
    ],
    statusPage: 'https://status.openai.com/',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://api.anthropic.com/v1/messages', type: 'health', method: 'HEAD' },
    ],
    statusPage: 'https://status.anthropic.com/',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'google',
    name: 'Google AI',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://generativelanguage.googleapis.com/v1beta/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'GOOGLE_API_KEY',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://api.mistral.ai/v1/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'MISTRAL_API_KEY',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://api.cohere.ai/v1/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'COHERE_API_KEY',
  },
  {
    id: 'groq',
    name: 'Groq',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://api.groq.com/openai/v1/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'GROQ_API_KEY',
  },
  {
    id: 'together',
    name: 'Together AI',
    region: 'US',
    endpoints: [
      { name: 'API Health', url: 'https://api.together.xyz/v1/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'TOGETHER_API_KEY',
  },
  // CN Providers
  {
    id: 'deepseek',
    name: 'DeepSeek',
    region: 'CN',
    endpoints: [
      { name: 'API Health', url: 'https://api.deepseek.com/v1/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI',
    region: 'CN',
    endpoints: [
      { name: 'API Health', url: 'https://open.bigmodel.cn/api/paas/v4/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'ZHIPU_API_KEY',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    region: 'CN',
    endpoints: [
      { name: 'API Health', url: 'https://api.moonshot.cn/v1/models', type: 'api', method: 'GET' },
    ],
    apiKeyEnv: 'MOONSHOT_API_KEY',
  },
  {
    id: 'qwen',
    name: 'Qwen (DashScope)',
    region: 'CN',
    endpoints: [
      { name: 'API Health', url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', type: 'health', method: 'HEAD' },
    ],
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
];

// =============================================================================
// REGISTRY FUNCTIONS
// =============================================================================

export function getPricingProvider(id: string): PricingProviderConfig | undefined {
  return PRICING_PROVIDERS.find((p) => p.id === id);
}

export function getPricingProvidersByRegion(region: 'US' | 'CN'): PricingProviderConfig[] {
  return PRICING_PROVIDERS.filter((p) => p.region === region);
}

export function getAllPricingProviders(): PricingProviderConfig[] {
  return [...PRICING_PROVIDERS];
}

export function listPricingProviderIds(): string[] {
  return PRICING_PROVIDERS.map((p) => p.id);
}

export function getStatusProvider(id: string): StatusProviderConfig | undefined {
  return STATUS_PROVIDERS.find((p) => p.id === id);
}

export function getStatusProvidersByRegion(region: 'US' | 'CN' | 'EU'): StatusProviderConfig[] {
  return STATUS_PROVIDERS.filter((p) => p.region === region);
}

export function getAllStatusProviders(): StatusProviderConfig[] {
  return [...STATUS_PROVIDERS];
}

export function listStatusProviderIds(): string[] {
  return STATUS_PROVIDERS.map((p) => p.id);
}

export function getRegionCounts(): { US: number; CN: number; EU: number } {
  return {
    US: STATUS_PROVIDERS.filter((p) => p.region === 'US').length,
    CN: STATUS_PROVIDERS.filter((p) => p.region === 'CN').length,
    EU: STATUS_PROVIDERS.filter((p) => p.region === 'EU').length,
  };
}
