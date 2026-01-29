/**
 * Provider registry - central registration of all scrapers
 */

import type { ProviderConfig, ScraperOptions } from '../types.js'
import { BaseScraper } from './base.js'
import { ApiScraper } from './api-base.js'

// Import all providers
import { DeepSeekScraper, deepseekConfig } from './deepseek.js'
import { MoonshotScraper, moonshotConfig } from './moonshot.js'
import { ZhipuScraper, zhipuConfig } from './zhipu.js'
import { QwenScraper, qwenConfig } from './qwen.js'
import { BaiduScraper, baiduConfig } from './baidu.js'
import { MistralScraper, mistralConfig } from './mistral.js'
import { CohereScraper, cohereConfig } from './cohere.js'
import { GroqScraper, groqConfig } from './groq.js'
import { TogetherScraper, togetherConfig } from './together.js'
import { YiScraper, yiConfig } from './yi.js'
import { MiniMaxScraper, minimaxConfig } from './minimax.js'
import { SiliconFlowScraper, siliconflowConfig } from './siliconflow.js'
import { OpenRouterScraper, openrouterConfig } from './openrouter.js'

export interface ProviderEntry {
  config: ProviderConfig
  createScraper: (options?: ScraperOptions) => BaseScraper | ApiScraper
}

// Provider registry
export const providers: Map<string, ProviderEntry> = new Map([
  // US Providers
  ['openrouter', { config: openrouterConfig, createScraper: (opts) => new OpenRouterScraper(openrouterConfig, opts) }],
  ['mistral', { config: mistralConfig, createScraper: (opts) => new MistralScraper(mistralConfig, opts) }],
  ['cohere', { config: cohereConfig, createScraper: (opts) => new CohereScraper(cohereConfig, opts) }],
  ['groq', { config: groqConfig, createScraper: (opts) => new GroqScraper(groqConfig, opts) }],
  ['together', { config: togetherConfig, createScraper: (opts) => new TogetherScraper(togetherConfig, opts) }],

  // Chinese Providers
  ['deepseek', { config: deepseekConfig, createScraper: (opts) => new DeepSeekScraper(deepseekConfig, opts) }],
  ['moonshot', { config: moonshotConfig, createScraper: (opts) => new MoonshotScraper(moonshotConfig, opts) }],
  ['zhipu', { config: zhipuConfig, createScraper: (opts) => new ZhipuScraper(zhipuConfig, opts) }],
  ['qwen', { config: qwenConfig, createScraper: (opts) => new QwenScraper(qwenConfig, opts) }],
  ['baidu', { config: baiduConfig, createScraper: (opts) => new BaiduScraper(baiduConfig, opts) }],
  ['yi', { config: yiConfig, createScraper: (opts) => new YiScraper(yiConfig, opts) }],
  ['minimax', { config: minimaxConfig, createScraper: (opts) => new MiniMaxScraper(minimaxConfig, opts) }],
  ['siliconflow', { config: siliconflowConfig, createScraper: (opts) => new SiliconFlowScraper(siliconflowConfig, opts) }],
])

export function getProvider(id: string): ProviderEntry | undefined {
  return providers.get(id)
}

export function getAllProviders(): ProviderEntry[] {
  return Array.from(providers.values())
}

export function getProvidersByRegion(region: 'US' | 'CN'): ProviderEntry[] {
  return getAllProviders().filter((p) => p.config.region === region)
}

export function listProviderIds(): string[] {
  return Array.from(providers.keys())
}

export function listProviderConfigs(): ProviderConfig[] {
  return getAllProviders().map((p) => p.config)
}
