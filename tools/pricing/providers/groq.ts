/**
 * Groq pricing scraper
 */

import type { Page } from 'playwright'
import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { BaseScraper } from './base.js'

export const groqConfig: ProviderConfig = {
  id: 'groq',
  name: 'Groq',
  region: 'US',
  urls: ['https://groq.com/pricing/'],
  currency: '$',
  unit: '$ / 1M tokens',
  type: 'scraper',
  locale: 'en-US',
}

export class GroqScraper extends BaseScraper {
  async extractPricingData(page: Page): Promise<PricingCategory[]> {
    // Extract from structured table - Groq now has a proper table layout
    const models = await page.evaluate(() => {
      const results: Array<{ model: string; input: string; output: string; context?: string }> = []
      const tables = document.querySelectorAll('table')

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr')
        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 4) {
            const modelCell = cells[0]?.textContent?.trim() || ''
            const inputCell = cells[2]?.textContent?.trim() || ''
            const outputCell = cells[3]?.textContent?.trim() || ''

            // Extract price from cell (e.g., "$0.075 (13.3M / $1)*" -> "0.075")
            const inputMatch = inputCell.match(/\$\s*([\d.]+)/)
            const outputMatch = outputCell.match(/\$\s*([\d.]+)/)

            if (modelCell && inputMatch) {
              // Extract context length if present (e.g., "128k")
              const ctxMatch = modelCell.match(/(\d+k)/i)
              results.push({
                model: modelCell.replace(/\s+\d+k/i, '').trim(),
                input: inputMatch[1],
                output: outputMatch ? outputMatch[1] : inputMatch[1],
                context: ctxMatch ? ctxMatch[1].toUpperCase() : undefined,
              })
            }
          }
        }
      }
      return results
    })

    const modelPricings: ModelPricing[] = models.map((m) => ({
      model: m.model,
      input: m.input,
      output: m.output,
      unit: this.config.unit,
      contextLength: m.context,
    }))

    return this.categorizeModels(modelPricings)
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'GPT OSS 20B', input: '0.075', output: '0.30', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'GPT OSS 120B', input: '0.15', output: '0.60', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'Llama 4 Scout (17Bx16E)', input: '0.11', output: '0.34', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'Llama 4 Maverick (17Bx128E)', input: '0.20', output: '0.60', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'Llama 3.3 70B Versatile', input: '0.59', output: '0.79', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'Qwen QwQ 32B', input: '0.29', output: '0.39', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'DeepSeek R1 Distill Llama 70B', input: '0.75', output: '0.99', unit: '$ / 1M tokens', contextLength: '128K' },
      { model: 'Whisper Large V3', input: '0.111', output: '0', unit: '$ / hour audio' },
      { model: 'Whisper Large V3 Turbo', input: '0.04', output: '0', unit: '$ / hour audio' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const modelLower = (m: ModelPricing) => m.model.toLowerCase()
    const llama = models.filter((m) => modelLower(m).includes('llama'))
    const gpt = models.filter((m) => modelLower(m).includes('gpt'))
    const qwen = models.filter((m) => modelLower(m).includes('qwen') || modelLower(m).includes('qwq'))
    const deepseek = models.filter((m) => modelLower(m).includes('deepseek'))
    const whisper = models.filter((m) => modelLower(m).includes('whisper'))
    const other = models.filter(
      (m) =>
        !modelLower(m).includes('llama') &&
        !modelLower(m).includes('gpt') &&
        !modelLower(m).includes('qwen') &&
        !modelLower(m).includes('qwq') &&
        !modelLower(m).includes('deepseek') &&
        !modelLower(m).includes('whisper')
    )

    const categories: PricingCategory[] = []
    if (llama.length > 0) categories.push({ category: 'Llama Models', models: llama })
    if (gpt.length > 0) categories.push({ category: 'GPT OSS Models', models: gpt })
    if (qwen.length > 0) categories.push({ category: 'Qwen Models', models: qwen })
    if (deepseek.length > 0) categories.push({ category: 'DeepSeek Models', models: deepseek })
    if (whisper.length > 0) categories.push({ category: 'Whisper (Audio)', models: whisper })
    if (other.length > 0) categories.push({ category: 'Other Models', models: other })

    return categories
  }
}
