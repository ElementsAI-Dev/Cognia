/**
 * Alibaba Qwen (通义千问) pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const qwenConfig: ProviderConfig = {
  id: 'qwen',
  name: 'Alibaba Qwen (通义千问)',
  region: 'CN',
  urls: ['https://help.aliyun.com/zh/model-studio/billing/tongyi-qianwen-metering-billing'],
  currency: '¥',
  unit: '¥ / 1M tokens',
  type: 'scraper',
  locale: 'zh-CN',
}

export class QwenScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      const modelMatch = rowText.match(/(qwen[^\s|,]+|qwq[^\s|,]+|text-embedding[^\s|,]+)/i)
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
      { model: 'qwen-max', input: '20', output: '60', unit: '¥ / 1M tokens', description: '旗舰版' },
      { model: 'qwen-plus', input: '0.8', output: '2', unit: '¥ / 1M tokens', description: '增强版' },
      { model: 'qwen-turbo', input: '0.3', output: '0.6', unit: '¥ / 1M tokens', description: '高速版' },
      { model: 'qwen-long', input: '0.5', output: '2', unit: '¥ / 1M tokens', description: '长文本' },
      { model: 'qwen-vl-max', input: '20', output: '60', unit: '¥ / 1M tokens', description: '视觉旗舰' },
      { model: 'qwen-vl-plus', input: '8', output: '20', unit: '¥ / 1M tokens', description: '视觉增强' },
      { model: 'qwen-coder-turbo', input: '2', output: '6', unit: '¥ / 1M tokens', description: '代码高速' },
      { model: 'qwq-plus', input: '3', output: '12', unit: '¥ / 1M tokens', description: '推理模型' },
      { model: 'text-embedding-v3', input: '0.7', output: '0', unit: '¥ / 1M tokens', description: '向量模型' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const maxModels = models.filter((m) => m.model.includes('max'))
    const plusModels = models.filter((m) => m.model.includes('plus') && !m.model.includes('max'))
    const turboModels = models.filter((m) => m.model.includes('turbo'))
    const vlModels = models.filter((m) => m.model.includes('vl'))
    const embeddingModels = models.filter((m) => m.model.includes('embedding'))
    const otherModels = models.filter(
      (m) =>
        !m.model.includes('max') &&
        !m.model.includes('plus') &&
        !m.model.includes('turbo') &&
        !m.model.includes('vl') &&
        !m.model.includes('embedding')
    )

    const categories: PricingCategory[] = []
    if (maxModels.length > 0) categories.push({ category: 'Qwen-Max', models: maxModels })
    if (plusModels.length > 0) categories.push({ category: 'Qwen-Plus', models: plusModels })
    if (turboModels.length > 0) categories.push({ category: 'Qwen-Turbo', models: turboModels })
    if (vlModels.length > 0) categories.push({ category: 'Qwen-VL Vision', models: vlModels })
    if (embeddingModels.length > 0) categories.push({ category: 'Embeddings', models: embeddingModels })
    if (otherModels.length > 0) categories.push({ category: 'Other', models: otherModels })

    return categories
  }
}
