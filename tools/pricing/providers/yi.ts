/**
 * 01.AI (Yi/零一万物) pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const yiConfig: ProviderConfig = {
  id: 'yi',
  name: '01.AI (Yi/零一万物)',
  region: 'CN',
  urls: ['https://platform.lingyiwanwu.com/docs/api-reference'],
  currency: '¥',
  unit: '¥ / 1M tokens',
  type: 'scraper',
  locale: 'zh-CN',
}

export class YiScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      const modelMatch = rowText.match(/(yi-[^\s|,]+)/i)
      if (!modelMatch) continue

      const modelName = modelMatch[1].toLowerCase()
      const priceMatches = rowText.match(/(\d+\.?\d*)\s*元/g)

      if (priceMatches && priceMatches.length >= 2) {
        const input = priceMatches[0].replace(/[^\d.]/g, '')
        const output = priceMatches[1].replace(/[^\d.]/g, '')
        if (!models.find((m) => m.model === modelName)) {
          models.push({ model: modelName, input, output, unit: this.config.unit })
        }
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'yi-lightning', input: '0.99', output: '0.99', unit: '¥ / 1M tokens', description: '闪电版' },
      { model: 'yi-large', input: '20', output: '20', unit: '¥ / 1M tokens', description: '大型版' },
      { model: 'yi-large-turbo', input: '12', output: '12', unit: '¥ / 1M tokens', description: '大型高速版' },
      { model: 'yi-medium', input: '2.5', output: '2.5', unit: '¥ / 1M tokens', description: '中型版' },
      { model: 'yi-medium-200k', input: '12', output: '12', unit: '¥ / 1M tokens', description: '中型长文本' },
      { model: 'yi-vision', input: '6', output: '6', unit: '¥ / 1M tokens', description: '视觉版' },
      { model: 'yi-spark', input: '1', output: '1', unit: '¥ / 1M tokens', description: '轻量版' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const large = models.filter((m) => m.model.includes('large'))
    const medium = models.filter((m) => m.model.includes('medium'))
    const light = models.filter((m) => m.model.includes('lightning') || m.model.includes('spark'))
    const vision = models.filter((m) => m.model.includes('vision'))

    const categories: PricingCategory[] = []
    if (large.length > 0) categories.push({ category: 'Yi-Large', models: large })
    if (medium.length > 0) categories.push({ category: 'Yi-Medium', models: medium })
    if (light.length > 0) categories.push({ category: 'Yi-Light', models: light })
    if (vision.length > 0) categories.push({ category: 'Yi-Vision', models: vision })

    return categories
  }
}
