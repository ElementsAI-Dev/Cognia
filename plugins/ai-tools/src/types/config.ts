/**
 * Plugin Configuration Types
 *
 * @description Type definitions for AI Tools plugin configuration
 */

/**
 * AI Tools plugin configuration
 */
export interface AIToolsConfig {
  /** Default output directory for scraped data */
  defaultOutputDir: string;

  /** Default timeout for scraping operations (ms) */
  defaultTimeout: number;

  /** Run browser in headless mode */
  headlessMode: boolean;

  /** Take screenshots during scraping */
  enableScreenshots: boolean;

  /** Cache expiry time in milliseconds */
  cacheExpiry: number;

  /** Pricing data cache expiry in milliseconds */
  pricingCacheExpiry: number;

  /** Status check cache expiry in milliseconds */
  statusCacheExpiry: number;

  /** Rankings data cache expiry in milliseconds */
  rankingsCacheExpiry: number;

  /** List of provider IDs to enable (empty = all) */
  enabledProviders: string[];

  /** Default region for provider filtering */
  preferredRegion: 'US' | 'CN' | 'all';
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AIToolsConfig = {
  defaultOutputDir: 'ai-tools-output',
  defaultTimeout: 30000,
  headlessMode: true,
  enableScreenshots: false,
  cacheExpiry: 3600000,
  pricingCacheExpiry: 3600000,
  statusCacheExpiry: 300000,
  rankingsCacheExpiry: 1800000,
  enabledProviders: [],
  preferredRegion: 'all',
};

/**
 * Get config value with default fallback
 */
export function getConfigValue<K extends keyof AIToolsConfig>(
  config: Record<string, unknown>,
  key: K
): AIToolsConfig[K] {
  if (key in config) {
    return config[key] as AIToolsConfig[K];
  }
  return DEFAULT_CONFIG[key];
}

/**
 * Parse full config from context
 */
export function parseConfig(config: Record<string, unknown>): AIToolsConfig {
  return {
    defaultOutputDir: getConfigValue(config, 'defaultOutputDir'),
    defaultTimeout: getConfigValue(config, 'defaultTimeout'),
    headlessMode: getConfigValue(config, 'headlessMode'),
    enableScreenshots: getConfigValue(config, 'enableScreenshots'),
    cacheExpiry: getConfigValue(config, 'cacheExpiry'),
    pricingCacheExpiry: getConfigValue(config, 'pricingCacheExpiry'),
    statusCacheExpiry: getConfigValue(config, 'statusCacheExpiry'),
    rankingsCacheExpiry: getConfigValue(config, 'rankingsCacheExpiry'),
    enabledProviders: getConfigValue(config, 'enabledProviders'),
    preferredRegion: getConfigValue(config, 'preferredRegion'),
  };
}
