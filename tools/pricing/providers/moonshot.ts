/**
 * Moonshot (Kimi) pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'
import { debug, success } from '../utils/logger.js'

export const moonshotConfig: ProviderConfig = {
  id: 'moonshot',
  name: 'Moonshot (Kimi)',
  region: 'CN',
  urls: ['https://platform.moonshot.cn/docs/pricing/chat'],
  currency: '¥',
  unit: '¥ / 1M tokens',
  type: 'scraper',
  locale: 'zh-CN',
}

export class MoonshotScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      debug(`Row: ${rowText.substring(0, 100)}`)

      const modelMatch = rowText.match(/(moonshot-v\d+-\d+k(?:-vision-preview)?|kimi-k\d+[^\s|]*)/i)
      if (!modelMatch) continue

      const modelName = modelMatch[1].toLowerCase().replace('推荐', '')
      const priceCells = row.cells.filter((c) => c.includes('￥') || c.includes('¥'))
      const prices: string[] = []

      for (const cell of priceCells) {
        const match = cell.match(/[￥¥]\s*([\d.]+)/)
        if (match) prices.push(match[1])
      }

      let inputPrice: string | undefined
      let outputPrice: string | undefined

      if (prices.length >= 3) {
        inputPrice = prices[1]
        outputPrice = prices[2]
      } else if (prices.length >= 2) {
        inputPrice = prices[0]
        outputPrice = prices[1]
      }

      if (inputPrice && outputPrice && !models.find((m) => m.model === modelName)) {
        const model: ModelPricing = {
          model: modelName,
          input: inputPrice,
          output: outputPrice,
          unit: this.config.unit,
        }

        const ctxMatch = modelName.match(/(\d+)k/i)
        if (ctxMatch) model.contextLength = ctxMatch[1] + 'K'

        models.push(model)
        success(`Added: ${modelName} - ¥${inputPrice}/${outputPrice}`)
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'kimi-k2.5', input: '4', output: '21', unit: '¥ / 1M tokens' },
      { model: 'moonshot-v1-8k', input: '2', output: '10', unit: '¥ / 1M tokens', contextLength: '8K' },
      { model: 'moonshot-v1-32k', input: '5', output: '20', unit: '¥ / 1M tokens', contextLength: '32K' },
      { model: 'moonshot-v1-128k', input: '10', output: '30', unit: '¥ / 1M tokens', contextLength: '128K' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const kimiModels = models.filter((m) => m.model.includes('kimi'))
    const moonshotModels = models.filter((m) => m.model.includes('moonshot'))

    const categories: PricingCategory[] = []
    if (kimiModels.length > 0) categories.push({ category: 'Kimi Models', models: kimiModels })
    if (moonshotModels.length > 0) categories.push({ category: 'Moonshot Models', models: moonshotModels })

    return categories
  }
}
