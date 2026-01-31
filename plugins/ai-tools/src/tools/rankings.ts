/**
 * OpenRouter Rankings Tool
 *
 * @description Agent-callable tool for scraping OpenRouter model rankings
 */

import { tool } from '@cognia/plugin-sdk';
import type { PluginContext, PluginToolContext, BrowserPage } from '@cognia/plugin-sdk';
import type {
  RankingsToolParams,
  RankingsToolResult,
  RankingsData,
  ModelRanking,
  MarketShareEntry,
  AppRanking,
  TimeRange,
} from '../types';
import { saveRankingsData, loadRankingsData, isCacheValid } from '../utils/output';
import { getConfigValue } from '../types/config';

const OPENROUTER_URL = 'https://openrouter.ai/rankings';

/**
 * Get cache expiry from context config
 */
function getCacheExpiry(ctx: PluginContext): number {
  return getConfigValue(ctx.config, 'rankingsCacheExpiry');
}

/**
 * Parse leaderboard data from page
 */
async function parseLeaderboard(page: BrowserPage): Promise<ModelRanking[]> {
  const models: ModelRanking[] = [];

  try {
    // Wait for leaderboard to load
    await page.waitForSelector('[data-testid="leaderboard"]', { timeout: 10000 });

    // Extract model rankings using evaluate
    const rankings = await page.evaluate<ModelRanking[]>(`
      (() => {
        const rows = document.querySelectorAll('[data-testid="leaderboard"] tr');
        const models = [];
        
        rows.forEach((row, index) => {
          if (index === 0) return; // Skip header
          
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return;
          
          const rankText = cells[0]?.textContent?.trim() || '';
          const modelLink = cells[1]?.querySelector('a');
          const modelName = modelLink?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
          const tokens = cells[2]?.textContent?.trim() || '';
          const change = cells[3]?.textContent?.trim() || '';
          
          if (modelName) {
            models.push({
              rank: parseInt(rankText) || index,
              modelId: modelName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              modelName: modelName,
              author: modelName.split('/')[0] || 'unknown',
              tokens: tokens,
              tokensRaw: parseFloat(tokens.replace(/[^0-9.]/g, '')) || 0,
              change: change,
              changePercent: parseFloat(change.replace(/[^0-9.-]/g, '')) || 0,
              changeDirection: change.includes('+') || change.includes('↑') ? 'up' 
                             : change.includes('-') || change.includes('↓') ? 'down' 
                             : 'unchanged',
              modelUrl: modelLink?.href || '',
              authorUrl: '',
            });
          }
        });
        
        return models;
      })()
    `);

    return rankings || [];
  } catch (error) {
    console.error('Failed to parse leaderboard:', error);
    return models;
  }
}

/**
 * Parse market share data from page
 */
async function parseMarketShare(page: BrowserPage): Promise<MarketShareEntry[]> {
  const entries: MarketShareEntry[] = [];

  try {
    const data = await page.evaluate<MarketShareEntry[]>(`
      (() => {
        const items = document.querySelectorAll('[data-testid="market-share"] li, .market-share-item');
        const entries = [];
        
        items.forEach((item, index) => {
          const author = item.querySelector('.author, [data-author]')?.textContent?.trim() || item.textContent?.split(' ')[0] || '';
          const percentage = item.querySelector('.percentage, [data-percentage]')?.textContent?.trim() || '';
          
          if (author) {
            entries.push({
              rank: index + 1,
              author: author,
              percentage: percentage,
              percentageRaw: parseFloat(percentage.replace(/[^0-9.]/g, '')) || 0,
              authorUrl: '',
            });
          }
        });
        
        return entries;
      })()
    `);

    return data || [];
  } catch {
    return entries;
  }
}

/**
 * Parse top apps data from page
 */
async function parseTopApps(page: BrowserPage): Promise<AppRanking[]> {
  const apps: AppRanking[] = [];

  try {
    const data = await page.evaluate<AppRanking[]>(`
      (() => {
        const items = document.querySelectorAll('[data-testid="top-apps"] .app-item, .top-apps-list li');
        const apps = [];
        
        items.forEach((item, index) => {
          const name = item.querySelector('.app-name, h3, h4')?.textContent?.trim() || '';
          const description = item.querySelector('.app-description, p')?.textContent?.trim() || '';
          const tokens = item.querySelector('.tokens, .usage')?.textContent?.trim() || '';
          const link = item.querySelector('a')?.href || '';
          
          if (name) {
            apps.push({
              rank: index + 1,
              name: name,
              description: description,
              tokens: tokens,
              tokensRaw: parseFloat(tokens.replace(/[^0-9.]/g, '')) || 0,
              url: link,
            });
          }
        });
        
        return apps;
      })()
    `);

    return data || [];
  } catch {
    return apps;
  }
}

/**
 * Scrape rankings data
 */
async function scrapeRankings(
  ctx: PluginContext,
  timeRange: TimeRange
): Promise<RankingsData | null> {
  if (!ctx.browser) {
    ctx.logger.error('Browser API not available');
    return null;
  }

  ctx.logger.info(`Scraping OpenRouter rankings (${timeRange})...`);

  try {
    const url = `${OPENROUTER_URL}?range=${timeRange}`;

    const result = await ctx.browser.scrape<RankingsData>(
      url,
      async (page: BrowserPage) => {
        // Wait for page to load
        await page.waitForTimeout(3000);

        // Parse all sections
        const leaderboard = await parseLeaderboard(page);
        const marketShare = await parseMarketShare(page);
        const topApps = await parseTopApps(page);

        return {
          scraped_at: new Date().toISOString(),
          source: url,
          timeRange,
          leaderboard,
          marketShare,
          topApps,
        };
      },
      {
        headless: true,
        timeout: 30000,
        waitUntil: 'networkidle',
      }
    );

    if (!result.success || !result.data) {
      ctx.logger.error(`Failed to scrape rankings: ${result.error}`);
      return null;
    }

    // Save to cache
    await saveRankingsData(ctx, result.data);

    return result.data;
  } catch (error) {
    ctx.logger.error(`Error scraping rankings: ${error}`);
    return null;
  }
}

/**
 * Create the rankings tool definition
 */
export function createRankingsTool(ctx: PluginContext) {
  return tool<RankingsToolParams>({
    name: 'openrouter_rankings',
    description: `Get model rankings and usage statistics from OpenRouter.
    
Data includes:
- LLM Leaderboard: Top models by token usage with change indicators
- Market Share: Token usage distribution by model author/provider
- Top Apps: Most popular applications using OpenRouter

Parameters:
- timeRange: 'week' (default), 'month', or 'all' for all-time rankings
- export: Export format 'json', 'csv', 'html', or 'markdown' (optional)

Returns ranking data with model names, token counts, and trend indicators.`,
    parameters: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          enum: ['week', 'month', 'all'],
          description: 'Time range for rankings (default: week)',
        },
        export: {
          type: 'string',
          enum: ['json', 'csv', 'html', 'markdown'],
          description: 'Export format',
        },
      },
    },
    execute: async (params: RankingsToolParams, toolCtx?: PluginToolContext): Promise<RankingsToolResult> => {
      try {
        const timeRange = params.timeRange || 'week';

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(0, `Fetching ${timeRange} rankings...`);
        }

        // Check cache first
        const outputDir = ctx.fs.getDataDir();
        const cachePath = `${outputDir}/rankings-${timeRange}.json`;

        if (await isCacheValid(ctx, cachePath, getCacheExpiry(ctx))) {
          ctx.logger.info(`Using cached rankings for ${timeRange}`);
          const cached = await loadRankingsData(ctx, timeRange);
          if (cached) {
            return {
              success: true,
              data: cached,
              timestamp: new Date().toISOString(),
            };
          }
        }

        // Scrape fresh data
        const data = await scrapeRankings(ctx, timeRange);

        if (!data) {
          return {
            success: false,
            error: 'Failed to scrape rankings',
            timestamp: new Date().toISOString(),
          };
        }

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(100, 'Rankings fetched successfully');
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        ctx.logger.error(`Rankings tool error: ${error}`);
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
