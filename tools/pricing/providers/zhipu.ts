/**
 * Zhipu AI (智谱) pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'
import { success } from '../utils/logger.js'

export const zhipuConfig: ProviderConfig = {
  id: 'zhipu',
  name: 'Zhipu AI (智谱)',
  region: 'CN',
  urls: ['https://open.bigmodel.cn/pricing'],
  currency: '¥',
  unit: '¥ / 1M tokens',
  type: 'scraper',
  locale: 'zh-CN',
}

export class ZhipuScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableRows = await this.getTables(page)
    const models: ModelPricing[] = []

    for (const row of tableRows) {
      const rowText = row.cells.join(' ')
      const modelMatch = rowText.match(/(glm-[^\s|,]+|cogview[^\s|,]+|charglm[^\s|,]+|embedding[^\s|,]+)/i)
      if (!modelMatch) continue

      const modelName = modelMatch[1].toLowerCase()
      const isFree = rowText.includes('免费')
      const priceMatches = rowText.match(/(\d+\.?\d*)\s*元/g)

      if (isFree) {
        models.push({ model: modelName, input: '0', output: '0', unit: this.config.unit, free: true })
        success(`Added (free): ${modelName}`)
      } else if (priceMatches && priceMatches.length >= 1) {
        const input = priceMatches[0].replace(/[^\d.]/g, '')
        const output = priceMatches.length >= 2 ? priceMatches[1].replace(/[^\d.]/g, '') : input
        if (!models.find((m) => m.model === modelName)) {
          models.push({ model: modelName, input, output, unit: this.config.unit })
          success(`Added: ${modelName} - ¥${input}/${output}`)
        }
      }
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'glm-4-plus', input: '50', output: '50', unit: '¥ / 1M tokens' },
      { model: 'glm-4-0520', input: '100', output: '100', unit: '¥ / 1M tokens' },
      { model: 'glm-4-air', input: '1', output: '1', unit: '¥ / 1M tokens' },
      { model: 'glm-4-airx', input: '10', output: '10', unit: '¥ / 1M tokens' },
      { model: 'glm-4-long', input: '1', output: '1', unit: '¥ / 1M tokens' },
      { model: 'glm-4-flash', input: '0', output: '0', unit: '¥ / 1M tokens', free: true },
      { model: 'glm-4v-plus', input: '10', output: '10', unit: '¥ / 1M tokens' },
      { model: 'cogview-3-plus', input: '35', output: '0', unit: '¥ / image' },
      { model: 'embedding-3', input: '0.5', output: '0', unit: '¥ / 1M tokens' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const glm4Models = models.filter((m) => m.model.startsWith('glm-4'))
    const visionModels = models.filter((m) => m.model.includes('v') || m.model.includes('cogview'))
    const embeddingModels = models.filter((m) => m.model.includes('embedding'))
    const otherModels = models.filter(
      (m) => !m.model.startsWith('glm-4') && !m.model.includes('cogview') && !m.model.includes('embedding')
    )

    const categories: PricingCategory[] = []
    if (glm4Models.length > 0) categories.push({ category: 'GLM-4 Series', models: glm4Models })
    if (visionModels.length > 0) categories.push({ category: 'Vision & Image', models: visionModels })
    if (embeddingModels.length > 0) categories.push({ category: 'Embeddings', models: embeddingModels })
    if (otherModels.length > 0) categories.push({ category: 'Other', models: otherModels })

    return categories
  }
}
