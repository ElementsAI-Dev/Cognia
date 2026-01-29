/**
 * Output utilities for saving pricing data
 */

import * as fs from 'fs'
import * as path from 'path'
import type { ProviderPricing, AllPricing, PricingCategory } from '../types.js'
import { success, info } from './logger.js'

const DEFAULT_OUTPUT_DIR = path.join(import.meta.dirname || __dirname, '../output')

export function ensureOutputDir(dir: string = DEFAULT_OUTPUT_DIR): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function saveProviderPricing(
  providerId: string,
  data: ProviderPricing,
  outputDir: string = DEFAULT_OUTPUT_DIR
): string {
  ensureOutputDir(outputDir)
  const filePath = path.join(outputDir, `${providerId}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  success(`Saved: ${filePath}`)
  return filePath
}

export function loadProviderPricing(providerId: string, outputDir: string = DEFAULT_OUTPUT_DIR): ProviderPricing | null {
  const filePath = path.join(outputDir, `${providerId}.json`)
  if (!fs.existsSync(filePath)) return null

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function saveAllPricing(data: AllPricing, outputDir: string = DEFAULT_OUTPUT_DIR): string {
  ensureOutputDir(outputDir)
  const filePath = path.join(outputDir, 'all.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  success(`Saved combined pricing: ${filePath}`)
  return filePath
}

export function countModels(categories: PricingCategory[]): number {
  return categories.reduce((sum, cat) => sum + cat.models.length, 0)
}

export function exportToCsv(data: AllPricing, outputDir: string = DEFAULT_OUTPUT_DIR): string {
  ensureOutputDir(outputDir)
  const filePath = path.join(outputDir, 'all.csv')

  const headers = ['Provider', 'Region', 'Category', 'Model', 'Input', 'Output', 'Unit', 'Context', 'Free']
  const rows: string[][] = [headers]

  for (const provider of data.providers) {
    for (const category of provider.categories) {
      for (const model of category.models) {
        rows.push([
          provider.provider,
          provider.region,
          category.category,
          model.model,
          model.input || '',
          model.output || '',
          model.unit,
          model.contextLength || '',
          model.free ? 'Yes' : 'No',
        ])
      }
    }
  }

  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
  fs.writeFileSync(filePath, csv)
  info(`Exported CSV: ${filePath}`)
  return filePath
}
