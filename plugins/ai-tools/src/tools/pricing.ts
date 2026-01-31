/**
 * AI Pricing Scraper Tool
 *
 * @description Agent-callable tool for scraping AI model pricing from various providers
 */

import { tool } from '@cognia/plugin-sdk';
import type { PluginContext, PluginToolContext, BrowserPage, TableData } from '@cognia/plugin-sdk';
import type {
  PricingToolParams,
  PricingToolResult,
  ProviderPricing,
  AllPricing,
  PricingCategory,
  ModelPricing,
  PricingProviderConfig,
} from '../types';
import {
  getPricingProvider,
  getPricingProvidersByRegion,
  getAllPricingProviders,
  listPricingProviderIds,
} from '../utils/providers';
import {
  savePricingData,
  loadPricingData,
  saveAllPricing,
  countModels,
  isCacheValid,
} from '../utils/output';
import { getConfigValue } from '../types/config';

/**
 * Get cache expiry from context config
 */
function getCacheExpiry(ctx: PluginContext): number {
  return getConfigValue(ctx.config, 'pricingCacheExpiry');
}

/**
 * Scrape pricing from a single provider
 */
async function scrapeProvider(
  ctx: PluginContext,
  config: PricingProviderConfig
): Promise<ProviderPricing | null> {
  if (!ctx.browser) {
    ctx.logger.error('Browser API not available');
    return null;
  }

  ctx.logger.info(`Scraping pricing from ${config.name}...`);

  try {
    const result = await ctx.browser.scrape<PricingCategory[]>(
      config.urls[0],
      async (page: BrowserPage) => {
        // Wait for content to load
        await page.waitForTimeout(2000);

        // Extract tables from the page
        const tables = await page.extractTables();

        if (tables.length === 0) {
          ctx.logger.warn(`No tables found on ${config.name}`);
          return [];
        }

        // Parse tables into categories
        const categories: PricingCategory[] = [];

        for (const table of tables) {
          const category = parseTable(table, config);
          if (category && category.models.length > 0) {
            categories.push(category);
          }
        }

        return categories;
      },
      {
        headless: true,
        timeout: 30000,
        waitUntil: 'networkidle',
      }
    );

    if (!result.success || !result.data) {
      ctx.logger.error(`Failed to scrape ${config.name}: ${result.error}`);
      return null;
    }

    const pricing: ProviderPricing = {
      scraped_at: new Date().toISOString(),
      source: config.urls[0],
      categories: result.data,
    };

    // Save to cache
    await savePricingData(ctx, config.id, pricing);

    return pricing;
  } catch (error) {
    ctx.logger.error(`Error scraping ${config.name}: ${error}`);
    return null;
  }
}

/**
 * Parse table data into pricing category
 */
function parseTable(table: TableData, config: PricingProviderConfig): PricingCategory | null {
  const { headers, rows } = table;

  if (headers.length === 0 || rows.length === 0) {
    return null;
  }

  // Find column indices
  const modelIdx = findColumnIndex(headers, ['model', 'name', '模型']);
  const inputIdx = findColumnIndex(headers, ['input', 'prompt', '输入']);
  const outputIdx = findColumnIndex(headers, ['output', 'completion', '输出']);
  const contextIdx = findColumnIndex(headers, ['context', 'max tokens', '上下文']);

  if (modelIdx === -1) {
    return null;
  }

  const models: ModelPricing[] = [];

  for (const row of rows) {
    const modelName = row[modelIdx]?.trim();
    if (!modelName) continue;

    const model: ModelPricing = {
      model: modelName,
      input: inputIdx !== -1 ? formatPrice(row[inputIdx], config.currency) : undefined,
      output: outputIdx !== -1 ? formatPrice(row[outputIdx], config.currency) : undefined,
      unit: config.unit,
      contextLength: contextIdx !== -1 ? row[contextIdx]?.trim() : undefined,
      free: isFreeTier(row),
    };

    models.push(model);
  }

  return {
    category: 'Models',
    models,
  };
}

/**
 * Find column index by possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const name of possibleNames) {
    const idx = lowerHeaders.findIndex((h) => h.includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }

  return -1;
}

/**
 * Format price string
 */
function formatPrice(value: string | undefined, currency: string): string | undefined {
  if (!value) return undefined;

  const cleaned = value.trim();
  if (!cleaned) return undefined;

  // If already has currency symbol, return as-is
  if (cleaned.includes('$') || cleaned.includes('¥')) {
    return cleaned;
  }

  // Extract number and add currency
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    return `${currency}${match[0]}`;
  }

  return cleaned;
}

/**
 * Check if row indicates free tier
 */
function isFreeTier(row: string[]): boolean {
  const text = row.join(' ').toLowerCase();
  return text.includes('free') || text.includes('免费') || text === '0' || text === '$0';
}

/**
 * Create the pricing tool definition
 */
export function createPricingTool(ctx: PluginContext) {
  return tool<PricingToolParams>({
    name: 'ai_pricing_scraper',
    description: `Scrape AI model pricing from various providers.
    
Supported providers:
- US: OpenAI, Anthropic, Google, Mistral, Cohere, Groq, Together, Fireworks
- CN: DeepSeek, Zhipu, Moonshot, Baichuan, Qwen, MiniMax, SiliconFlow

Parameters:
- provider: Specific provider ID to scrape (optional)
- region: Filter by region 'US' or 'CN' (optional)
- all: Scrape all providers (default: false)
- export: Export format 'json' or 'csv' (optional)

Returns pricing data including model names, input/output costs, and context lengths.`,
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: `Provider ID to scrape. Available: ${listPricingProviderIds().join(', ')}`,
        },
        region: {
          type: 'string',
          enum: ['US', 'CN'],
          description: 'Filter providers by region',
        },
        all: {
          type: 'boolean',
          description: 'Scrape all providers',
        },
        export: {
          type: 'string',
          enum: ['json', 'csv'],
          description: 'Export format',
        },
      },
    },
    execute: async (params: PricingToolParams, toolCtx?: PluginToolContext): Promise<PricingToolResult> => {

      try {
        // Report progress if available
        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(0, 'Starting pricing scraper...');
        }

        // Single provider
        if (params.provider) {
          const config = getPricingProvider(params.provider);
          if (!config) {
            return {
              success: false,
              error: `Unknown provider: ${params.provider}. Available: ${listPricingProviderIds().join(', ')}`,
              timestamp: new Date().toISOString(),
            };
          }

          // Check cache first
          const cacheKey = `pricing-${params.provider}.json`;
          const outputDir = ctx.fs.getDataDir();
          const cachePath = `${outputDir}/${cacheKey}`;

          if (await isCacheValid(ctx, cachePath, getCacheExpiry(ctx))) {
            ctx.logger.info(`Using cached data for ${params.provider}`);
            const cached = await loadPricingData(ctx, params.provider);
            if (cached) {
              return {
                success: true,
                provider: cached,
                timestamp: new Date().toISOString(),
              };
            }
          }

          const data = await scrapeProvider(ctx, config);

          if (!data) {
            return {
              success: false,
              error: `Failed to scrape ${params.provider}`,
              timestamp: new Date().toISOString(),
            };
          }

          return {
            success: true,
            provider: data,
            timestamp: new Date().toISOString(),
          };
        }

        // Multiple providers
        const providers = params.all
          ? getAllPricingProviders()
          : params.region
            ? getPricingProvidersByRegion(params.region)
            : getAllPricingProviders();

        if (providers.length === 0) {
          return {
            success: false,
            error: 'No providers match the criteria',
            timestamp: new Date().toISOString(),
          };
        }

        const allData: AllPricing = {
          generated_at: new Date().toISOString(),
          total_models: 0,
          providers: [],
        };

        let completed = 0;
        for (const config of providers) {
          if (toolCtx?.reportProgress) {
            toolCtx.reportProgress(
              Math.round((completed / providers.length) * 100),
              `Scraping ${config.name}...`
            );
          }

          const data = await scrapeProvider(ctx, config);

          if (data && data.categories.length > 0) {
            const modelCount = countModels(data.categories);
            allData.providers.push({
              provider: config.name,
              region: config.region,
              scraped_at: data.scraped_at,
              source: data.source,
              model_count: modelCount,
              categories: data.categories,
            });
            allData.total_models += modelCount;
          }

          completed++;
        }

        // Save combined data
        await saveAllPricing(ctx, allData);

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(100, 'Pricing scrape complete');
        }

        return {
          success: true,
          data: allData,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        ctx.logger.error(`Pricing tool error: ${error}`);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        };
      }
    },
    category: 'ai-tools',
    requiresApproval: false,
  });
}
