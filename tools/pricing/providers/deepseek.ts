/**
 * DeepSeek pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'
import { debug } from '../utils/logger.js'

export const deepseekConfig: ProviderConfig = {
  id: 'deepseek',
  name: 'DeepSeek',
  region: 'CN',
  urls: ['https://api-docs.deepseek.com/quick_start/pricing'],
  currency: '$',
  unit: '$ / 1M tokens',
  type: 'scraper',
  locale: 'en-US',
}

export class DeepSeekScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    const tableData = await page.evaluate(() => {
      const table = document.querySelector('table')
      if (!table) return null

      const rows: Array<{ label: string; values: string[] }> = []
      table.querySelectorAll('tr').forEach((tr) => {
        const cells = tr.querySelectorAll('th, td')
        if (cells.length >= 2) {
          const label = cells[0].textContent?.trim() || ''
          const values: string[] = []
          for (let i = 1; i < cells.length; i++) {
            values.push(cells[i].textContent?.trim() || '')
          }
          rows.push({ label, values })
        }
      })
      return rows
    })

    if (!tableData) return []

    debug(`Table data: ${JSON.stringify(tableData)}`)

    const models: ModelPricing[] = []
    const modelNames = tableData.find((r) => r.label === '模型')?.values || ['deepseek-chat', 'deepseek-reasoner']

    let inputPrices: string[] = []
    let outputPrices: string[] = []

    for (const row of tableData) {
      if (row.label.includes('输入') && row.label.includes('百万')) {
        inputPrices = row.values.map((v) => v.replace(/[^\d.]/g, ''))
      }
      if (row.label.includes('输出') && row.label.includes('百万')) {
        outputPrices = row.values.map((v) => v.replace(/[^\d.]/g, ''))
      }
    }

    for (let i = 0; i < modelNames.length; i++) {
      models.push({
        model: modelNames[i],
        input: inputPrices[i] || '0',
        output: outputPrices[i] || '0',
        unit: this.config.unit,
      })
    }

    return this.categorizeModels(models)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'deepseek-chat', input: '0.14', output: '0.28', unit: '$ / 1M tokens' },
      { model: 'deepseek-reasoner', input: '0.55', output: '2.19', unit: '$ / 1M tokens' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []
    return [{ category: 'DeepSeek Models', models }]
  }
}
