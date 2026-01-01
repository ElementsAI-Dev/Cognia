/**
 * Search module exports
 */

export * from './providers';
export * from './search-service';

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
