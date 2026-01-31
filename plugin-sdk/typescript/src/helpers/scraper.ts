/**
 * Scraper Base Class and Utilities
 *
 * @description Provides base classes and utilities for building web scrapers as plugins.
 */

import type {
  BrowserPage,
  BrowserLaunchOptions,
  NavigationOptions,
  ScrapeResult,
  ScreenshotResult,
  TableData,
} from '../api/browser';
import type { PluginContext } from '../context/base';

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  /** Scraper unique identifier */
  id: string;
  /** Scraper display name */
  name: string;
  /** Description */
  description?: string;
  /** Target URLs */
  urls: string[];
  /** Region (for multi-region scrapers) */
  region?: string;
  /** Category */
  category?: string;
  /** Version */
  version?: string;
}

/**
 * Scraper options
 */
export interface ScraperOptions extends BrowserLaunchOptions, NavigationOptions {
  /** Take screenshot after scraping */
  screenshot?: boolean;
  /** Output directory for files */
  outputDir?: string;
  /** Verbose logging */
  verbose?: boolean;
  /** Retry count on failure */
  retries?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Rate limit delay between requests in ms */
  rateLimit?: number;
}

/**
 * Scraper state
 */
export interface ScraperState {
  /** Whether scraper is running */
  isRunning: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Current status message */
  status: string;
  /** Last error */
  lastError?: string;
  /** Last successful scrape timestamp */
  lastSuccess?: string;
}

/**
 * Scraper result with metadata
 */
export interface ScraperResult<T = unknown> extends ScrapeResult<T> {
  /** Scraper config */
  config: ScraperConfig;
  /** Screenshot if taken */
  screenshot?: ScreenshotResult;
  /** Output file path if saved */
  outputPath?: string;
}

/**
 * Provider registry entry
 */
export interface ProviderEntry<T = unknown> {
  /** Provider configuration */
  config: ScraperConfig;
  /** Create scraper instance */
  createScraper: (options: ScraperOptions) => BaseScraper<T>;
}

/**
 * Progress callback
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Abstract base class for scrapers
 *
 * @example
 * ```typescript
 * class PricingScraper extends BaseScraper<PricingData> {
 *   constructor(options: ScraperOptions) {
 *     super({
 *       id: 'pricing',
 *       name: 'Pricing Scraper',
 *       urls: ['https://example.com/pricing'],
 *     }, options);
 *   }
 *
 *   async scrape(page: BrowserPage): Promise<PricingData> {
 *     await page.waitForSelector('.pricing-table');
 *     const tables = await page.extractTables();
 *     return this.parseTable(tables[0]);
 *   }
 * }
 * ```
 */
export abstract class BaseScraper<T = unknown> {
  protected config: ScraperConfig;
  protected options: ScraperOptions;
  protected state: ScraperState;
  protected context?: PluginContext;
  protected onProgress?: ProgressCallback;

  constructor(config: ScraperConfig, options: ScraperOptions = {}) {
    this.config = config;
    this.options = {
      headless: true,
      timeout: 30000,
      screenshot: false,
      retries: 2,
      retryDelay: 1000,
      ...options,
    };
    this.state = {
      isRunning: false,
      progress: 0,
      status: 'idle',
    };
  }

  /**
   * Set plugin context
   */
  setContext(context: PluginContext): this {
    this.context = context;
    return this;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ProgressCallback): this {
    this.onProgress = callback;
    return this;
  }

  /**
   * Get scraper configuration
   */
  getConfig(): ScraperConfig {
    return this.config;
  }

  /**
   * Get current state
   */
  getState(): ScraperState {
    return { ...this.state };
  }

  /**
   * Update progress
   */
  protected updateProgress(progress: number, message: string): void {
    this.state.progress = progress;
    this.state.status = message;

    if (this.onProgress) {
      this.onProgress(progress, message);
    }

    if (this.options.verbose && this.context) {
      this.context.logger.debug(`[${this.config.id}] ${progress}% - ${message}`);
    }
  }

  /**
   * Log message
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.context) {
      this.context.logger[level](`[${this.config.id}] ${message}`);
    } else if (this.options.verbose) {
      console[level](`[${this.config.id}] ${message}`);
    }
  }

  /**
   * Abstract method to implement scraping logic
   */
  abstract scrape(page: BrowserPage): Promise<T>;

  /**
   * Run the scraper
   */
  async run(): Promise<ScraperResult<T>> {
    const startTime = Date.now();
    this.state.isRunning = true;
    this.state.lastError = undefined;

    try {
      this.updateProgress(0, 'Starting scraper...');

      if (!this.context?.browser) {
        throw new Error('Browser API not available. Please set plugin context.');
      }

      const result = await this.context.browser.scrape<T>(
        this.config.urls[0],
        async (page: BrowserPage) => {
          this.updateProgress(10, 'Page loaded, starting extraction...');
          return await this.scrape(page);
        },
        {
          headless: this.options.headless,
          timeout: this.options.timeout,
          waitUntil: this.options.waitUntil,
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Scraping failed');
      }

      this.updateProgress(100, 'Scraping complete');
      this.state.lastSuccess = new Date().toISOString();

      return {
        ...result,
        config: this.config,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state.lastError = errorMessage;
      this.log('error', `Scraping failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        url: this.config.urls[0],
        config: this.config,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.state.isRunning = false;
    }
  }

  /**
   * Run with retries
   */
  async runWithRetries(): Promise<ScraperResult<T>> {
    let lastResult: ScraperResult<T> | undefined;
    const retries = this.options.retries || 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        this.log('info', `Retry attempt ${attempt}/${retries}`);
        await this.delay(this.options.retryDelay || 1000);
      }

      lastResult = await this.run();

      if (lastResult.success) {
        return lastResult;
      }
    }

    return lastResult!;
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Provider registry for managing multiple scrapers
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry<PricingData>();
 *
 * registry.register({
 *   config: { id: 'openai', name: 'OpenAI', urls: ['...'] },
 *   createScraper: (opts) => new OpenAIPricingScraper(opts),
 * });
 *
 * const scraper = registry.get('openai').createScraper({ headless: true });
 * const result = await scraper.run();
 * ```
 */
export class ProviderRegistry<T = unknown> {
  private providers: Map<string, ProviderEntry<T>> = new Map();

  /**
   * Register a provider
   */
  register(entry: ProviderEntry<T>): this {
    this.providers.set(entry.config.id, entry);
    return this;
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  /**
   * Get a provider by ID
   */
  get(id: string): ProviderEntry<T> | undefined {
    return this.providers.get(id);
  }

  /**
   * Check if provider exists
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Get all providers
   */
  getAll(): ProviderEntry<T>[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all provider IDs
   */
  getIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get providers by region
   */
  getByRegion(region: string): ProviderEntry<T>[] {
    return this.getAll().filter((p) => p.config.region === region);
  }

  /**
   * Get providers by category
   */
  getByCategory(category: string): ProviderEntry<T>[] {
    return this.getAll().filter((p) => p.config.category === category);
  }

  /**
   * Get all configs
   */
  getConfigs(): ScraperConfig[] {
    return this.getAll().map((p) => p.config);
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }

  /**
   * Get provider count
   */
  get size(): number {
    return this.providers.size;
  }
}

/**
 * Utility to parse table data from HTML
 */
export function parseTableData(table: TableData): Record<string, string>[] {
  const { headers, rows } = table;

  if (headers.length === 0 || rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  });
}

/**
 * Utility to clean scraped text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * Utility to extract numbers from text
 */
export function extractNumber(text: string): number | null {
  const match = text.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return null;
}

/**
 * Utility to extract price from text
 */
export function extractPrice(text: string): { value: number; currency: string } | null {
  // Match various price formats: $1.00, ¥100, 1.00 USD, etc.
  const match = text.match(/([¥$€£])\s*([\d,]+\.?\d*)|(\d[\d,]*\.?\d*)\s*([A-Z]{3})/);

  if (match) {
    if (match[1] && match[2]) {
      return {
        currency: match[1],
        value: parseFloat(match[2].replace(/,/g, '')),
      };
    }
    if (match[3] && match[4]) {
      return {
        currency: match[4],
        value: parseFloat(match[3].replace(/,/g, '')),
      };
    }
  }

  return null;
}

/**
 * Utility to normalize model name
 */
export function normalizeModelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
