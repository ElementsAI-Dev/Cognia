/**
 * Together AI pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const togetherConfig: ProviderConfig = {
  id: 'together',
  name: 'Together AI',
  region: 'US',
  urls: ['https://www.together.ai/pricing'],
  currency: '$',
  unit: '$ / 1M tokens',
  type: 'scraper',
  locale: 'en-US',
}

export class TogetherScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      const modelPatterns = [
        /(Llama[^\s|,]+)/i,
        /(Mixtral[^\s|,]+)/i,
        /(Qwen[^\s|,]+)/i,
        /(DeepSeek[^\s|,]+)/i,
        /(Gemma[^\s|,]+)/i,
      ]

      let modelName: string | null = null
      for (const pattern of modelPatterns) {
        const match = rowText.match(pattern)
        if (match) {
          modelName = match[1].toLowerCase()
          break
        }
      }

      if (!modelName) continue

      const priceMatches = rowText.match(/\$\s*([\d.]+)/g)
      if (priceMatches && priceMatches.length >= 1) {
        const input = priceMatches[0].replace('$', '').trim()
        const output = priceMatches.length >= 2 ? priceMatches[1].replace('$', '').trim() : input
        if (!models.find((m) => m.model === modelName)) {
          models.push({ model: modelName, input, output, unit: this.config.unit })
        }
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', input: '0.88', output: '0.88', unit: '$ / 1M tokens' },
      { model: 'meta-llama/Llama-3.1-405B-Instruct-Turbo', input: '3.5', output: '3.5', unit: '$ / 1M tokens' },
      { model: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', input: '0.88', output: '0.88', unit: '$ / 1M tokens' },
      { model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo', input: '0.18', output: '0.18', unit: '$ / 1M tokens' },
      { model: 'mistralai/Mixtral-8x22B-Instruct-v0.1', input: '1.2', output: '1.2', unit: '$ / 1M tokens' },
      { model: 'mistralai/Mixtral-8x7B-Instruct-v0.1', input: '0.6', output: '0.6', unit: '$ / 1M tokens' },
      { model: 'Qwen/Qwen2.5-72B-Instruct-Turbo', input: '1.2', output: '1.2', unit: '$ / 1M tokens' },
      { model: 'deepseek-ai/DeepSeek-V3', input: '1.25', output: '1.25', unit: '$ / 1M tokens' },
      { model: 'google/gemma-2-27b-it', input: '0.8', output: '0.8', unit: '$ / 1M tokens' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const llama = models.filter((m) => m.model.toLowerCase().includes('llama'))
    const mixtral = models.filter((m) => m.model.toLowerCase().includes('mixtral'))
    const qwen = models.filter((m) => m.model.toLowerCase().includes('qwen'))
    const deepseek = models.filter((m) => m.model.toLowerCase().includes('deepseek'))
    const gemma = models.filter((m) => m.model.toLowerCase().includes('gemma'))
    const other = models.filter(
      (m) =>
        !m.model.toLowerCase().includes('llama') &&
        !m.model.toLowerCase().includes('mixtral') &&
        !m.model.toLowerCase().includes('qwen') &&
        !m.model.toLowerCase().includes('deepseek') &&
        !m.model.toLowerCase().includes('gemma')
    )

    const categories: PricingCategory[] = []
    if (llama.length > 0) categories.push({ category: 'Llama Models', models: llama })
    if (mixtral.length > 0) categories.push({ category: 'Mixtral Models', models: mixtral })
    if (qwen.length > 0) categories.push({ category: 'Qwen Models', models: qwen })
    if (deepseek.length > 0) categories.push({ category: 'DeepSeek Models', models: deepseek })
    if (gemma.length > 0) categories.push({ category: 'Gemma Models', models: gemma })
    if (other.length > 0) categories.push({ category: 'Other', models: other })

    return categories
  }
}
