/**
 * Base class for API-based providers (no browser needed)
 */

import type { ProviderConfig, ProviderPricing, PricingCategory, ScraperOptions } from '../types.js'
import { saveProviderPricing, countModels } from '../utils/output.js'
import { success, error, info, progress } from '../utils/logger.js'

export abstract class ApiScraper {
  protected config: ProviderConfig
  protected options: ScraperOptions

  constructor(config: ProviderConfig, options: ScraperOptions = {}) {
    this.config = config
    this.options = options
  }

  /**
   * Fetch pricing data from API - must be implemented by each provider
   */
  abstract fetchPricingData(): Promise<PricingCategory[]>

  /**
   * Main scrape method (uses fetch instead of browser)
   */
  async scrape(): Promise<ProviderPricing> {
    progress(`Fetching ${this.config.name} pricing from API...`)

    try {
      const categories = await this.fetchPricingData()

      const modelCount = countModels(categories)
      if (modelCount > 0) {
        success(`${this.config.name}: ${modelCount} models in ${categories.length} categories`)
      } else {
        error(`${this.config.name}: No models found`)
      }

      return {
        scraped_at: new Date().toISOString(),
        source: this.config.urls[0],
        categories,
      }
    } catch (e) {
      error(`Failed to fetch ${this.config.name}: ${e}`)
      return {
        scraped_at: new Date().toISOString(),
        source: this.config.urls[0],
        categories: [],
      }
    }
  }

  /**
   * Scrape and save to file
   */
  async scrapeAndSave(): Promise<string> {
    const data = await this.scrape()
    return saveProviderPricing(this.config.id, data, this.options.outputDir)
  }

  /**
   * Helper: Fetch JSON from URL
   */
  protected async fetchJson<T>(url: string): Promise<T> {
    info(`Fetching: ${url}`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }
}
