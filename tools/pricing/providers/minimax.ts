/**
 * MiniMax pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const minimaxConfig: ProviderConfig = {
  id: 'minimax',
  name: 'MiniMax',
  region: 'CN',
  urls: ['https://platform.minimaxi.com/document/Price'],
  currency: '¥',
  unit: '¥ / 1M tokens',
  type: 'scraper',
  locale: 'zh-CN',
}

export class MiniMaxScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      const modelMatch = rowText.match(/(abab[^\s|,]+|minimax[^\s|,]+)/i)
      if (!modelMatch) continue

      const modelName = modelMatch[1].toLowerCase()
      const priceMatches = rowText.match(/(\d+\.?\d*)\s*元/g)

      if (priceMatches && priceMatches.length >= 1) {
        const input = priceMatches[0].replace(/[^\d.]/g, '')
        const output = priceMatches.length >= 2 ? priceMatches[1].replace(/[^\d.]/g, '') : input
        if (!models.find((m) => m.model === modelName)) {
          models.push({ model: modelName, input, output, unit: this.config.unit })
        }
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'abab6.5s-chat', input: '1', output: '1', unit: '¥ / 1M tokens', description: '标准对话' },
      { model: 'abab6.5g-chat', input: '5', output: '5', unit: '¥ / 1M tokens', description: '高级对话' },
      { model: 'abab6.5t-chat', input: '15', output: '15', unit: '¥ / 1M tokens', description: '专业对话' },
      { model: 'abab5.5s-chat', input: '0.5', output: '0.5', unit: '¥ / 1M tokens', description: '轻量对话' },
      { model: 'abab5.5-chat', input: '1', output: '1', unit: '¥ / 1M tokens', description: '基础对话' },
      { model: 'embo-01', input: '0.5', output: '0', unit: '¥ / 1M tokens', description: '向量模型' },
      { model: 'speech-01', input: '10', output: '0', unit: '¥ / 1M chars', description: '语音合成' },
      { model: 'speech-02', input: '25', output: '0', unit: '¥ / 1M chars', description: '高级语音' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const chat = models.filter((m) => m.model.includes('chat'))
    const embed = models.filter((m) => m.model.includes('embo'))
    const speech = models.filter((m) => m.model.includes('speech'))

    const categories: PricingCategory[] = []
    if (chat.length > 0) categories.push({ category: 'Chat Models', models: chat })
    if (embed.length > 0) categories.push({ category: 'Embeddings', models: embed })
    if (speech.length > 0) categories.push({ category: 'Speech', models: speech })

    return categories
  }
}
