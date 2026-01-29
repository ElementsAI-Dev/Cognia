/**
 * OpenRouter API-based pricing fetcher
 */

import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { ApiScraper } from './api-base.js'
import { success, info } from '../utils/logger.js'

export const openrouterConfig: ProviderConfig = {
  id: 'openrouter',
  name: 'OpenRouter',
  region: 'US',
  urls: ['https://openrouter.ai/api/v1/models'],
  currency: '$',
  unit: '$ / 1M tokens',
  type: 'api',
  locale: 'en-US',
}

interface OpenRouterModel {
  id: string
  name: string
  pricing: {
    prompt: string
    completion: string
  }
  context_length: number
}

interface OpenRouterResponse {
  data: OpenRouterModel[]
}

export class OpenRouterScraper extends ApiScraper {
  async fetchPricingData(): Promise<PricingCategory[]> {
    const response = await this.fetchJson<OpenRouterResponse>(this.config.urls[0])
    const models: ModelPricing[] = []

    info(`Found ${response.data.length} models from OpenRouter API`)

    for (const model of response.data) {
      const promptPrice = parseFloat(model.pricing.prompt) * 1000000
      const completionPrice = parseFloat(model.pricing.completion) * 1000000

      if (promptPrice > 0 || completionPrice > 0) {
        models.push({
          model: model.id,
          description: model.name,
          input: promptPrice.toFixed(4),
          output: completionPrice.toFixed(4),
          unit: '$ / 1M tokens',
          contextLength: model.context_length ? `${Math.round(model.context_length / 1000)}K` : undefined,
        })
      }
    }

    success(`Processed ${models.length} models with pricing`)

    // Categorize by provider prefix
    const providerMap = new Map<string, ModelPricing[]>()

    for (const model of models) {
      const provider = model.model.split('/')[0] || 'other'
      if (!providerMap.has(provider)) {
        providerMap.set(provider, [])
      }
      providerMap.get(provider)!.push(model)
    }

    // Convert to categories (top providers only)
    const categories: PricingCategory[] = []
    const topProviders = ['openai', 'anthropic', 'google', 'meta-llama', 'mistralai', 'deepseek', 'qwen', 'cohere']

    for (const provider of topProviders) {
      const providerModels = providerMap.get(provider)
      if (providerModels && providerModels.length > 0) {
        categories.push({
          category: provider.charAt(0).toUpperCase() + provider.slice(1),
          models: providerModels.slice(0, 10), // Limit to top 10 per provider
        })
      }
    }

    // Add "Other" category for remaining
    const otherModels: ModelPricing[] = []
    for (const [provider, models] of providerMap) {
      if (!topProviders.includes(provider)) {
        otherModels.push(...models.slice(0, 3))
      }
    }

    if (otherModels.length > 0) {
      categories.push({ category: 'Other Providers', models: otherModels.slice(0, 20) })
    }

    return categories
  }
}
