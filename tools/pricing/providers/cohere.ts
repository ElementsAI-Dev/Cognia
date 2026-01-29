/**
 * Cohere pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const cohereConfig: ProviderConfig = {
  id: 'cohere',
  name: 'Cohere',
  region: 'US',
  urls: ['https://cohere.com/pricing'],
  currency: '$',
  unit: '$ / 1M tokens',
  type: 'scraper',
  locale: 'en-US',
}

export class CohereScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ').toLowerCase()
      const modelMatch = rowText.match(/(command[^\s|,]*|embed[^\s|,]*|rerank[^\s|,]*)/i)
      if (!modelMatch) continue

      const modelName = modelMatch[1]
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
      { model: 'command-r-plus', input: '2.5', output: '10', unit: '$ / 1M tokens', description: 'Flagship' },
      { model: 'command-r', input: '0.15', output: '0.6', unit: '$ / 1M tokens', description: 'Balanced' },
      { model: 'command-light', input: '0.3', output: '0.6', unit: '$ / 1M tokens', description: 'Light' },
      { model: 'command', input: '1', output: '2', unit: '$ / 1M tokens', description: 'Base' },
      { model: 'embed-english-v3.0', input: '0.1', output: '0', unit: '$ / 1M tokens', description: 'English embed' },
      { model: 'embed-multilingual-v3.0', input: '0.1', output: '0', unit: '$ / 1M tokens', description: 'Multilingual embed' },
      { model: 'rerank-english-v3.0', input: '2', output: '0', unit: '$ / 1M tokens', description: 'English rerank' },
      { model: 'rerank-multilingual-v3.0', input: '2', output: '0', unit: '$ / 1M tokens', description: 'Multilingual rerank' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const command = models.filter((m) => m.model.includes('command'))
    const embed = models.filter((m) => m.model.includes('embed'))
    const rerank = models.filter((m) => m.model.includes('rerank'))

    const categories: PricingCategory[] = []
    if (command.length > 0) categories.push({ category: 'Command Models', models: command })
    if (embed.length > 0) categories.push({ category: 'Embed Models', models: embed })
    if (rerank.length > 0) categories.push({ category: 'Rerank Models', models: rerank })

    return categories
  }
}
