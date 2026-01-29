/**
 * Mistral AI pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const mistralConfig: ProviderConfig = {
  id: 'mistral',
  name: 'Mistral AI',
  region: 'US',
  urls: ['https://mistral.ai/technology/#pricing', 'https://docs.mistral.ai/getting-started/models/models_overview/'],
  currency: '$',
  unit: '$ / 1M tokens',
  type: 'scraper',
  locale: 'en-US',
}

export class MistralScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ').toLowerCase()
      const modelPatterns = [
        /(mistral-large[^\s|,]*)/i,
        /(mistral-small[^\s|,]*)/i,
        /(ministral[^\s|,]*)/i,
        /(codestral[^\s|,]*)/i,
        /(pixtral[^\s|,]*)/i,
      ]

      let modelName: string | null = null
      for (const pattern of modelPatterns) {
        const match = rowText.match(pattern)
        if (match) {
          modelName = match[1]
          break
        }
      }

      if (!modelName) continue

      const priceMatches = rowText.match(/\$\s*([\d.]+)/g)
      if (priceMatches && priceMatches.length >= 2) {
        const input = priceMatches[0].replace('$', '').trim()
        const output = priceMatches[1].replace('$', '').trim()
        if (!models.find((m) => m.model === modelName)) {
          models.push({ model: modelName, input, output, unit: this.config.unit })
        }
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'mistral-large-latest', input: '2', output: '6', unit: '$ / 1M tokens', description: 'Flagship' },
      { model: 'mistral-small-latest', input: '0.2', output: '0.6', unit: '$ / 1M tokens', description: 'Cost-efficient' },
      { model: 'codestral-latest', input: '0.3', output: '0.9', unit: '$ / 1M tokens', description: 'Code' },
      { model: 'pixtral-large-latest', input: '2', output: '6', unit: '$ / 1M tokens', description: 'Vision' },
      { model: 'ministral-8b-latest', input: '0.1', output: '0.1', unit: '$ / 1M tokens', description: 'Edge 8B' },
      { model: 'ministral-3b-latest', input: '0.04', output: '0.04', unit: '$ / 1M tokens', description: 'Edge 3B' },
      { model: 'open-mistral-nemo', input: '0.15', output: '0.15', unit: '$ / 1M tokens', description: 'Open' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const large = models.filter((m) => m.model.includes('large'))
    const small = models.filter((m) => m.model.includes('small') || m.model.includes('ministral'))
    const code = models.filter((m) => m.model.includes('codestral'))
    const vision = models.filter((m) => m.model.includes('pixtral'))
    const other = models.filter(
      (m) =>
        !m.model.includes('large') &&
        !m.model.includes('small') &&
        !m.model.includes('ministral') &&
        !m.model.includes('codestral') &&
        !m.model.includes('pixtral')
    )

    const categories: PricingCategory[] = []
    if (large.length > 0) categories.push({ category: 'Mistral Large', models: large })
    if (small.length > 0) categories.push({ category: 'Mistral Small/Ministral', models: small })
    if (code.length > 0) categories.push({ category: 'Codestral', models: code })
    if (vision.length > 0) categories.push({ category: 'Pixtral Vision', models: vision })
    if (other.length > 0) categories.push({ category: 'Other', models: other })

    return categories
  }
}
