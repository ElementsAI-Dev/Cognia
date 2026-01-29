/**
 * Price parsing utilities
 */

import type { TableRow, ModelPricing } from '../types.js'

/**
 * Extract price value from text (handles $ and ¥)
 */
export function extractPrice(text: string): string | null {
  const match = text.match(/[$¥￥]\s*([\d.]+)/)
  return match ? match[1] : null
}

/**
 * Extract all prices from text
 */
export function extractAllPrices(text: string, currency: '$' | '¥' = '$'): string[] {
  const pattern = currency === '$' ? /\$\s*([\d.]+)/g : /[¥￥]\s*([\d.]+)/g
  const matches = text.matchAll(pattern)
  return Array.from(matches, (m) => m[1])
}

/**
 * Check if text indicates free tier
 */
export function isFree(text: string): boolean {
  return /免费|free|0\.00?$/i.test(text)
}

/**
 * Extract context length from text
 */
export function extractContextLength(text: string): string | null {
  // Match patterns like "128K", "128k", "128,000 tokens", "131072"
  const patterns = [
    /(\d+)[Kk]\b/, // 128K
    /([\d,]+)\s*tokens/i, // 128,000 tokens
    /context[:\s]*([\d,]+)/i, // context: 128000
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const value = match[1].replace(/,/g, '')
      if (value.length <= 3) return value + 'K'
      return value
    }
  }
  return null
}

/**
 * Parse table rows from page
 */
export function parseTableRows(
  rows: TableRow[],
  modelPattern: RegExp,
  options: {
    currency?: '$' | '¥'
    inputIndex?: number
    outputIndex?: number
  } = {}
): ModelPricing[] {
  const { currency = '$', inputIndex, outputIndex } = options
  const models: ModelPricing[] = []

  for (const row of rows) {
    const rowText = row.cells.join(' ')
    const modelMatch = rowText.match(modelPattern)
    if (!modelMatch) continue

    const modelName = modelMatch[1].toLowerCase().replace(/推荐$/, '')
    const prices = extractAllPrices(rowText, currency)

    let input: string | undefined
    let output: string | undefined

    if (inputIndex !== undefined && outputIndex !== undefined) {
      input = row.cells[inputIndex] ? extractPrice(row.cells[inputIndex]) || undefined : undefined
      output = row.cells[outputIndex] ? extractPrice(row.cells[outputIndex]) || undefined : undefined
    } else if (prices.length >= 2) {
      input = prices[0]
      output = prices[1]
    } else if (prices.length === 1) {
      input = prices[0]
      output = prices[0]
    }

    if (input || output || isFree(rowText)) {
      const model: ModelPricing = {
        model: modelName,
        input: isFree(rowText) ? '0' : input,
        output: isFree(rowText) ? '0' : output,
        unit: `${currency} / 1M tokens`,
        free: isFree(rowText),
      }

      const ctx = extractContextLength(rowText)
      if (ctx) model.contextLength = ctx

      if (!models.find((m) => m.model === model.model)) {
        models.push(model)
      }
    }
  }

  return models
}

/**
 * Parse pricing from raw text
 */
export function parseTextPricing(
  text: string,
  patterns: Array<{ regex: RegExp; name: string; description?: string }>,
  currency: '$' | '¥' = '$'
): ModelPricing[] {
  const models: ModelPricing[] = []

  for (const { regex, name, description } of patterns) {
    const match = regex.exec(text)
    if (match && match[1] && match[2]) {
      const input = parseFloat(match[1])
      const output = parseFloat(match[2])

      if (input >= 0 && input < 1000 && output >= 0 && output < 1000) {
        models.push({
          model: name,
          input: match[1],
          output: match[2],
          unit: `${currency} / 1M tokens`,
          description,
        })
      }
    }
  }

  return models
}
