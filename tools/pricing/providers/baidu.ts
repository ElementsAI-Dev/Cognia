/**
 * Baidu ERNIE (文心一言) pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const baiduConfig: ProviderConfig = {
  id: 'baidu',
  name: 'Baidu ERNIE (文心一言)',
  region: 'CN',
  urls: ['https://cloud.baidu.com/doc/WENXINWORKSHOP/s/hlrk4akp7'],
  currency: '¥',
  unit: '¥ / 1K tokens',
  type: 'scraper',
  locale: 'zh-CN',
}

export class BaiduScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      const modelMatch = rowText.match(/(ernie[^\s|,]+)/i)
      if (!modelMatch) continue

      const modelName = modelMatch[1].toLowerCase()
      const isFree = rowText.includes('免费')
      const priceMatches = rowText.match(/(\d+\.?\d*)\s*元/g)

      if (isFree) {
        models.push({ model: modelName, input: '0', output: '0', unit: this.config.unit, free: true })
      } else if (priceMatches && priceMatches.length >= 1 && !models.find((m) => m.model === modelName)) {
        const input = priceMatches[0].replace(/[^\d.]/g, '')
        const output = priceMatches.length >= 2 ? priceMatches[1].replace(/[^\d.]/g, '') : input
        models.push({ model: modelName, input, output, unit: this.config.unit })
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'ernie-4.0-8k', input: '0.12', output: '0.12', unit: '¥ / 1K tokens', description: '文心4.0' },
      { model: 'ernie-4.0-turbo-8k', input: '0.02', output: '0.06', unit: '¥ / 1K tokens', description: 'Turbo' },
      { model: 'ernie-3.5-8k', input: '0.0008', output: '0.002', unit: '¥ / 1K tokens', description: '文心3.5' },
      { model: 'ernie-speed-8k', input: '0.0004', output: '0.0008', unit: '¥ / 1K tokens', description: '高速版' },
      { model: 'ernie-speed-128k', input: '0.0004', output: '0.0008', unit: '¥ / 1K tokens', description: '高速长文本' },
      { model: 'ernie-lite-8k', input: '0', output: '0', unit: '¥ / 1K tokens', description: '轻量版(免费)', free: true },
      { model: 'ernie-tiny-8k', input: '0', output: '0', unit: '¥ / 1K tokens', description: '极速版(免费)', free: true },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const ernie4 = models.filter((m) => m.model.includes('4'))
    const ernie3 = models.filter((m) => m.model.includes('3'))
    const speed = models.filter((m) => m.model.includes('speed'))
    const lite = models.filter((m) => m.model.includes('lite') || m.model.includes('tiny'))

    const categories: PricingCategory[] = []
    if (ernie4.length > 0) categories.push({ category: 'ERNIE 4.0', models: ernie4 })
    if (ernie3.length > 0) categories.push({ category: 'ERNIE 3.5', models: ernie3 })
    if (speed.length > 0) categories.push({ category: 'ERNIE Speed', models: speed })
    if (lite.length > 0) categories.push({ category: 'ERNIE Lite/Tiny (Free)', models: lite })

    return categories
  }
}
