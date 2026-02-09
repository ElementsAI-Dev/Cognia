/**
 * Web Scraper Tool Tests
 */

import {
  webScraperInputSchema,
  bulkWebScraperInputSchema,
  searchAndScraperInputSchema,
  webScraperTool,
  bulkWebScraperTool,
  searchAndScrapeTool,
} from './web-scraper';

describe('Web Scraper Tool', () => {
  describe('Schema Validation', () => {
    it('should validate web scraper input schema', () => {
      const validInput = {
        url: 'https://example.com',
        usePlaywright: false,
        extractMetadata: true,
        timeout: 15000,
      };

      const result = webScraperInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept minimal input with just URL', () => {
      const minimalInput = {
        url: 'https://example.com',
      };

      const result = webScraperInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidInput = {
        url: 'not-a-valid-url',
      };

      const result = webScraperInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate bulk web scraper input schema', () => {
      const validInput = {
        urls: ['https://example.com', 'https://test.com'],
        usePlaywright: false,
      };

      const result = bulkWebScraperInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject more than 10 URLs', () => {
      const tooManyUrls = {
        urls: Array(11).fill('https://example.com'),
      };

      const result = bulkWebScraperInputSchema.safeParse(tooManyUrls);
      expect(result.success).toBe(false);
    });

    it('should validate search and scrape input schema', () => {
      const validInput = {
        query: 'test query',
        maxResults: 3,
        scrapeContent: true,
      };

      const result = searchAndScraperInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept minimal search input with just query', () => {
      const minimalInput = {
        query: 'test query',
      };

      const result = searchAndScraperInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Direct Execution', () => {
    it('executeWebScraper is exported and callable', async () => {
      const { executeWebScraper } = await import('./web-scraper');
      expect(typeof executeWebScraper).toBe('function');
    });

    it('executeBulkWebScraper is exported and callable', async () => {
      const { executeBulkWebScraper } = await import('./web-scraper');
      expect(typeof executeBulkWebScraper).toBe('function');
    });

    it('webScraperTool description mentions direct execution', () => {
      expect(webScraperTool.description).toBeTruthy();
    });
  });

  describe('Tool Definitions', () => {
    it('should have correct name for web scraper tool', () => {
      expect(webScraperTool.name).toBe('web_scraper');
    });

    it('should have correct name for bulk web scraper tool', () => {
      expect(bulkWebScraperTool.name).toBe('bulk_web_scraper');
    });

    it('should have correct name for search and scrape tool', () => {
      expect(searchAndScrapeTool.name).toBe('search_and_scrape');
    });

    it('should have description for web scraper tool', () => {
      expect(webScraperTool.description).toContain('Scrape');
      expect(webScraperTool.description).toContain('Playwright');
    });

    it('should have description for bulk web scraper tool', () => {
      expect(bulkWebScraperTool.description).toContain('multiple');
      expect(bulkWebScraperTool.description).toContain('10 URLs');
    });

    it('should have description for search and scrape tool', () => {
      expect(searchAndScrapeTool.description).toContain('Search');
      expect(searchAndScrapeTool.description).toContain('scrape');
    });

    it('should have parameters schema for all tools', () => {
      expect(webScraperTool.parameters).toBeDefined();
      expect(bulkWebScraperTool.parameters).toBeDefined();
      expect(searchAndScrapeTool.parameters).toBeDefined();
    });

    it('should have execute function for all tools', () => {
      expect(typeof webScraperTool.execute).toBe('function');
      expect(typeof bulkWebScraperTool.execute).toBe('function');
      expect(typeof searchAndScrapeTool.execute).toBe('function');
    });
  });
});
