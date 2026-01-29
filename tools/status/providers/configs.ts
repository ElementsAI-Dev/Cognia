/**
 * Provider configurations for status monitoring
 *
 * Each provider has:
 * - Health check endpoints (lightweight ping)
 * - API endpoints (if API key available)
 * - Status page URL (for reference)
 */

import type { ProviderConfig } from '../types.js'

// ============================================================================
// US Providers
// ============================================================================

export const openaiConfig: ProviderConfig = {
  id: 'openai',
  name: 'OpenAI',
  region: 'US',
  statusPage: 'https://status.openai.com',
  apiKeyEnv: 'OPENAI_API_KEY',
  endpoints: [
    {
      name: 'Status Page',
      url: 'https://status.openai.com/api/v2/status.json',
      type: 'status_page',
      method: 'GET',
      expectedStatus: [200],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60, tokensPerMinute: 90000 },
}

export const anthropicConfig: ProviderConfig = {
  id: 'anthropic',
  name: 'Anthropic',
  region: 'US',
  statusPage: 'https://status.anthropic.com',
  apiKeyEnv: 'ANTHROPIC_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.anthropic.com/v1/messages',
      type: 'api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
      expectedStatus: [200, 401, 400],
      timeout: 10000,
    },
    {
      name: 'Status Page',
      url: 'https://status.anthropic.com/api/v2/status.json',
      type: 'status_page',
      method: 'GET',
      expectedStatus: [200],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000 },
}

export const googleConfig: ProviderConfig = {
  id: 'google',
  name: 'Google AI',
  region: 'US',
  statusPage: 'https://status.cloud.google.com',
  apiKeyEnv: 'GOOGLE_API_KEY',
  endpoints: [
    {
      name: 'Gemini API',
      url: 'https://generativelanguage.googleapis.com/v1beta/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 400, 403],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const cohereConfig: ProviderConfig = {
  id: 'cohere',
  name: 'Cohere',
  region: 'US',
  statusPage: 'https://status.cohere.com',
  apiKeyEnv: 'COHERE_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.cohere.ai/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 100 },
}

export const mistralConfig: ProviderConfig = {
  id: 'mistral',
  name: 'Mistral AI',
  region: 'EU',
  statusPage: 'https://status.mistral.ai',
  apiKeyEnv: 'MISTRAL_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.mistral.ai/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 120 },
}

export const groqConfig: ProviderConfig = {
  id: 'groq',
  name: 'Groq',
  region: 'US',
  statusPage: 'https://status.groq.com',
  apiKeyEnv: 'GROQ_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.groq.com/openai/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 30 },
}

export const togetherConfig: ProviderConfig = {
  id: 'together',
  name: 'Together AI',
  region: 'US',
  statusPage: 'https://status.together.ai',
  apiKeyEnv: 'TOGETHER_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.together.xyz/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const openrouterConfig: ProviderConfig = {
  id: 'openrouter',
  name: 'OpenRouter',
  region: 'US',
  statusPage: 'https://status.openrouter.ai',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://openrouter.ai/api/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 200 },
}

export const perplexityConfig: ProviderConfig = {
  id: 'perplexity',
  name: 'Perplexity',
  region: 'US',
  apiKeyEnv: 'PERPLEXITY_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.perplexity.ai/chat/completions',
      type: 'api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: [200, 401, 400],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const fireworksConfig: ProviderConfig = {
  id: 'fireworks',
  name: 'Fireworks AI',
  region: 'US',
  apiKeyEnv: 'FIREWORKS_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.fireworks.ai/inference/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 600 },
}

export const replicateConfig: ProviderConfig = {
  id: 'replicate',
  name: 'Replicate',
  region: 'US',
  statusPage: 'https://status.replicate.com',
  apiKeyEnv: 'REPLICATE_API_TOKEN',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.replicate.com/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 10000,
    },
  ],
  rateLimit: { requestsPerMinute: 600 },
}

// ============================================================================
// Chinese Providers
// ============================================================================

export const deepseekConfig: ProviderConfig = {
  id: 'deepseek',
  name: 'DeepSeek',
  region: 'CN',
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.deepseek.com/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const zhipuConfig: ProviderConfig = {
  id: 'zhipu',
  name: 'Zhipu AI (GLM)',
  region: 'CN',
  apiKeyEnv: 'ZHIPU_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://open.bigmodel.cn/api/paas/v4/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 100 },
}

export const qwenConfig: ProviderConfig = {
  id: 'qwen',
  name: 'Alibaba Qwen',
  region: 'CN',
  apiKeyEnv: 'DASHSCOPE_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      type: 'api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: [200, 400, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const moonshotConfig: ProviderConfig = {
  id: 'moonshot',
  name: 'Moonshot (Kimi)',
  region: 'CN',
  apiKeyEnv: 'MOONSHOT_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.moonshot.cn/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const baiduConfig: ProviderConfig = {
  id: 'baidu',
  name: 'Baidu (Wenxin)',
  region: 'CN',
  apiKeyEnv: 'BAIDU_API_KEY',
  endpoints: [
    {
      name: 'API Gateway',
      url: 'https://aip.baidubce.com/oauth/2.0/token',
      type: 'health',
      method: 'GET',
      expectedStatus: [200, 400],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const yiConfig: ProviderConfig = {
  id: 'yi',
  name: '01.AI (Yi)',
  region: 'CN',
  apiKeyEnv: 'YI_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.lingyiwanwu.com/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 400, 401, 403],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const minimaxConfig: ProviderConfig = {
  id: 'minimax',
  name: 'MiniMax',
  region: 'CN',
  apiKeyEnv: 'MINIMAX_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
      type: 'api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: [200, 400, 401, 404],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const siliconflowConfig: ProviderConfig = {
  id: 'siliconflow',
  name: 'SiliconFlow',
  region: 'CN',
  apiKeyEnv: 'SILICONFLOW_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://api.siliconflow.cn/v1/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

export const doubaoConfig: ProviderConfig = {
  id: 'doubao',
  name: 'ByteDance Doubao',
  region: 'CN',
  apiKeyEnv: 'ARK_API_KEY',
  endpoints: [
    {
      name: 'API Health',
      url: 'https://ark.cn-beijing.volces.com/api/v3/models',
      type: 'api',
      method: 'GET',
      expectedStatus: [200, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 120 },
}

export const hunyuanConfig: ProviderConfig = {
  id: 'hunyuan',
  name: 'Tencent Hunyuan',
  region: 'CN',
  apiKeyEnv: 'HUNYUAN_SECRET_KEY',
  endpoints: [
    {
      name: 'API Gateway',
      url: 'https://hunyuan.tencentcloudapi.com',
      type: 'health',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: [200, 400, 401],
      timeout: 15000,
    },
  ],
  rateLimit: { requestsPerMinute: 60 },
}

// ============================================================================
// All Providers
// ============================================================================

export const allConfigs: ProviderConfig[] = [
  // US/EU Providers
  openaiConfig,
  anthropicConfig,
  googleConfig,
  cohereConfig,
  mistralConfig,
  groqConfig,
  togetherConfig,
  openrouterConfig,
  perplexityConfig,
  fireworksConfig,
  replicateConfig,
  // Chinese Providers
  deepseekConfig,
  zhipuConfig,
  qwenConfig,
  moonshotConfig,
  baiduConfig,
  yiConfig,
  minimaxConfig,
  siliconflowConfig,
  doubaoConfig,
  hunyuanConfig,
]
