/**
 * Shared types for pricing scrapers
 */

export interface ModelPricing {
  model: string
  description?: string
  input?: string
  inputCached?: string
  output?: string
  unit: string
  contextLength?: string
  free?: boolean
}

export interface PricingCategory {
  category: string
  description?: string
  models: ModelPricing[]
}

export interface ProviderPricing {
  scraped_at: string
  source: string
  categories: PricingCategory[]
}

export interface ProviderConfig {
  id: string
  name: string
  region: 'US' | 'CN'
  urls: string[]
  currency: '$' | '¥'
  unit: string
  type: 'scraper' | 'api'
  locale?: string
}

export interface ScraperOptions {
  headless?: boolean
  timeout?: number
  screenshot?: boolean
  outputDir?: string
  verbose?: boolean
}

export interface ScraperResult {
  success: boolean
  provider: string
  data?: ProviderPricing
  error?: string
  screenshotPath?: string
}

export interface TableRow {
  cells: string[]
}

export interface AllPricing {
  generated_at: string
  total_models: number
  providers: Array<{
    provider: string
    region: 'US' | 'CN'
    scraped_at: string
    source: string
    model_count: number
    categories: PricingCategory[]
  }>
}
