/**
 * Search module exports
 */

export * from './providers';
export * from './search-service';
export * from './source-verification';
export * from './search-constants';
export * from './search-cache';
export * from './search-type-router';
export * from './search-provider-manager';
export { testProviderConnection as testProviderConnectionClient } from './provider-test';

export {
  searchWithTavily,
  extractContentWithTavily,
  getAnswerFromTavily,
} from './providers/tavily';

export {
  scrapePageWithPlaywright,
  scrapePagesWithPlaywright,
  fetchPageContent,
  smartFetchContent,
  searchAndScrapeWithBing,
  isPlaywrightAvailable,
  testPlaywrightConnection,
  type PlaywrightScraperOptions,
  type ScrapedPage,
  type PageMetadata,
  type PageImage,
  type PageLink,
  type BingScraperSearchOptions,
  type BingScraperSearchResult,
} from './providers/playwright-scraper';
