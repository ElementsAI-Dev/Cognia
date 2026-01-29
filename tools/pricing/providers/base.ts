/**
 * Base class for web scraping providers
 */

import type { Page } from 'playwright'
import type { ProviderConfig, ProviderPricing, PricingCategory, ModelPricing, ScraperOptions } from '../types.js'
import {
  launchBrowser,
  createPage,
  closeBrowser,
  navigateAndWait,
  extractTables,
  extractRawText,
  takeScreenshot,
} from '../utils/browser.js'
import { saveProviderPricing, countModels } from '../utils/output.js'
import { success, error, info, table, progress } from '../utils/logger.js'
import * as path from 'path'

export abstract class BaseScraper {
  protected config: ProviderConfig
  protected options: ScraperOptions

  constructor(config: ProviderConfig, options: ScraperOptions = {}) {
    this.config = config
    this.options = {
      headless: true,
      timeout: 30000,
      screenshot: true,
      ...options,
    }
  }

  /**
   * Extract pricing data from page - must be implemented by each provider
   */
  abstract extractPricingData(page: Page): Promise<PricingCategory[]>

  /**
   * Get fallback pricing data when scraping fails
   */
  getFallbackData(): ModelPricing[] {
    return []
  }

  /**
   * Categorize models into categories
   */
  abstract categorizeModels(models: ModelPricing[]): PricingCategory[]

  /**
   * Main scrape method
   */
  async scrape(): Promise<ProviderPricing> {
    progress(`Scraping ${this.config.name}...`)

    try {
      await launchBrowser(this.options)
      const page = await createPage(this.config.locale || 'en-US')

      let categories: PricingCategory[] = []
      let successUrl = ''

      for (const url of this.config.urls) {
        const navigated = await navigateAndWait(page, url, {
          timeout: this.options.timeout,
        })

        if (!navigated) continue

        // Take screenshot
        if (this.options.screenshot) {
          const screenshotPath = path.join(
            this.options.outputDir || path.join(import.meta.dirname || __dirname, '../output'),
            `${this.config.id}-screenshot.png`
          )
          await takeScreenshot(page, screenshotPath)
        }

        // Extract pricing
        info('Extracting pricing data...')
        categories = await this.extractPricingData(page)

        if (categories.length > 0) {
          successUrl = url
          break
        }
      }

      // Use fallback if no data found
      if (categories.length === 0) {
        const fallback = this.getFallbackData()
        if (fallback.length > 0) {
          info('Using fallback pricing data...')
          categories = this.categorizeModels(fallback)
        }
      }

      const modelCount = countModels(categories)
      if (modelCount > 0) {
        success(`${this.config.name}: ${modelCount} models in ${categories.length} categories`)
      } else {
        error(`${this.config.name}: No models found`)
      }

      return {
        scraped_at: new Date().toISOString(),
        source: successUrl || this.config.urls[0],
        categories,
      }
    } finally {
      await closeBrowser()
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
   * Helper: Extract tables from page
   */
  protected async getTables(page: Page) {
    const rows = await extractTables(page)
    table(`Table rows found: ${rows.length}`)
    return rows
  }

  /**
   * Helper: Extract raw text from page
   */
  protected async getRawText(page: Page) {
    const text = await extractRawText(page)
    info(`Page text length: ${text.length}`)
    return text
  }
}
