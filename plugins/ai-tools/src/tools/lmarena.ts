/**
 * LMArena Leaderboard Tool
 *
 * @description Agent-callable tool for fetching LMArena (Chatbot Arena) leaderboard data
 */

import { tool } from '@cognia/plugin-sdk';
import type { PluginContext, PluginToolContext } from '@cognia/plugin-sdk';
import type {
  LMArenaToolParams,
  LMArenaToolResult,
  AllLeaderboardsData,
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardCategory,
  ModelMetadata,
} from '../types';
import { saveLeaderboardData, loadLeaderboardData, isCacheValid } from '../utils/output';
import { getConfigValue } from '../types/config';

// Data sources
const LMARENA_HISTORY_URL = 'https://raw.githubusercontent.com/nakasyou/lmarena-history/main/latest.json';
const ARENA_CATALOG_URL = 'https://raw.githubusercontent.com/lmarena/arena-catalog/main/model_catalog.json';

/**
 * Get cache expiry from context config
 */
function getCacheExpiry(ctx: PluginContext): number {
  return getConfigValue(ctx.config, 'cacheExpiry');
}

interface HistoryLatest {
  text: {
    [category: string]: {
      [modelId: string]: number;
    };
  };
  vision?: {
    [category: string]: {
      [modelId: string]: number;
    };
  };
}

interface CatalogEntry {
  name: string;
  model_api_key: string;
  input_token_price: string;
  output_token_price: string;
  organization: string;
  license: string;
  price_source?: string;
  model_source?: string;
}

/**
 * Fetch leaderboard data from lmarena-history repository
 */
async function fetchLeaderboardData(ctx: PluginContext): Promise<HistoryLatest | null> {
  try {
    ctx.logger.info('Fetching leaderboard data from lmarena-history...');

    const response = await ctx.network.get<HistoryLatest>(LMARENA_HISTORY_URL, {
      timeout: 30000,
    });

    if (!response.ok || !response.data) {
      ctx.logger.error(`Failed to fetch leaderboard: ${response.status}`);
      return null;
    }

    return response.data;
  } catch (error) {
    ctx.logger.error(`Error fetching leaderboard: ${error}`);
    return null;
  }
}

/**
 * Fetch model metadata from arena-catalog repository
 */
async function fetchModelMetadata(ctx: PluginContext): Promise<ModelMetadata[]> {
  try {
    ctx.logger.info('Fetching model metadata from arena-catalog...');

    const response = await ctx.network.get<CatalogEntry[]>(ARENA_CATALOG_URL, {
      timeout: 30000,
    });

    if (!response.ok || !response.data) {
      ctx.logger.warn('Failed to fetch model metadata');
      return [];
    }

    return response.data.map((entry: CatalogEntry) => ({
      name: entry.name,
      modelApiKey: entry.model_api_key,
      inputTokenPrice: entry.input_token_price,
      outputTokenPrice: entry.output_token_price,
      organization: entry.organization,
      license: entry.license,
      priceSource: entry.price_source,
      modelSource: entry.model_source,
    }));
  } catch (error) {
    ctx.logger.warn(`Error fetching model metadata: ${error}`);
    return [];
  }
}

/**
 * Parse scores into leaderboard entries
 */
function parseScores(
  scores: { [modelId: string]: number },
  _category: LeaderboardCategory,
  metadata: ModelMetadata[]
): LeaderboardEntry[] {
  const metadataMap = new Map(metadata.map((m) => [m.modelApiKey, m]));

  // Sort by score descending
  const sortedModels = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([modelId, score], index) => {
      const meta = metadataMap.get(modelId);

      return {
        rank: index + 1,
        modelId,
        modelName: meta?.name || modelId,
        score: Math.round(score),
        organization: meta?.organization,
        license: meta?.license,
        inputPrice: meta?.inputTokenPrice ? parseFloat(meta.inputTokenPrice) : undefined,
        outputPrice: meta?.outputTokenPrice ? parseFloat(meta.outputTokenPrice) : undefined,
      };
    });

  return sortedModels;
}

/**
 * Process raw data into structured leaderboard data
 */
function processLeaderboardData(
  raw: HistoryLatest,
  metadata: ModelMetadata[]
): AllLeaderboardsData {
  const textLeaderboards: { [category: string]: LeaderboardData } = {};

  // Process text arena
  for (const [category, scores] of Object.entries(raw.text)) {
    const entries = parseScores(scores, category as LeaderboardCategory, metadata);

    textLeaderboards[category] = {
      scrapedAt: new Date().toISOString(),
      source: LMARENA_HISTORY_URL,
      category: category as LeaderboardCategory,
      arenaType: 'text',
      entries,
      totalModels: entries.length,
    };
  }

  // Process vision arena if present
  let visionLeaderboards: { [category: string]: LeaderboardData } | undefined;
  if (raw.vision) {
    visionLeaderboards = {};
    for (const [category, scores] of Object.entries(raw.vision)) {
      const entries = parseScores(scores, category as LeaderboardCategory, metadata);

      visionLeaderboards[category] = {
        scrapedAt: new Date().toISOString(),
        source: LMARENA_HISTORY_URL,
        category: category as LeaderboardCategory,
        arenaType: 'vision',
        entries,
        totalModels: entries.length,
      };
    }
  }

  return {
    scrapedAt: new Date().toISOString(),
    sources: [LMARENA_HISTORY_URL, ARENA_CATALOG_URL],
    text: textLeaderboards,
    vision: visionLeaderboards,
    metadata,
  };
}

/**
 * Create the LMArena tool definition
 */
export function createLMArenaTool(ctx: PluginContext) {
  return tool<LMArenaToolParams>({
    name: 'lmarena_leaderboard',
    description: `Get LMArena (Chatbot Arena) model leaderboard and ELO ratings.
    
Data includes:
- ELO scores for 100+ models across multiple categories
- Categories: overall, coding, math, creative_writing, hard_prompt, etc.
- Language-specific rankings: english, chinese, japanese, korean, etc.
- Model metadata: organization, license, pricing (when available)

Parameters:
- category: Specific category to fetch (default: all categories)
  Available: overall, overall_style_control, coding, hard_prompt, math, 
             creative_writing, if_eval, long_user, english, chinese, 
             japanese, korean, spanish, french, german, portuguese, russian
- includeHistory: Include historical data (default: false)
- max: Maximum number of models to return per category (default: all)

Returns ELO scores with model rankings, organizations, and pricing info.`,
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [
            'overall', 'overall_style_control', 'coding', 'hard_prompt', 'math',
            'creative_writing', 'if_eval', 'long_user', 'english', 'chinese',
            'japanese', 'korean', 'spanish', 'french', 'german', 'portuguese', 'russian',
          ],
          description: 'Leaderboard category to fetch',
        },
        includeHistory: {
          type: 'boolean',
          description: 'Include historical data (larger response)',
        },
        max: {
          type: 'integer',
          description: 'Maximum models to return per category',
          minimum: 1,
          maximum: 200,
        },
      },
    },
    execute: async (params: LMArenaToolParams, toolCtx?: PluginToolContext): Promise<LMArenaToolResult> => {
      try {
        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(0, 'Fetching LMArena leaderboard...');
        }

        // Check cache first
        const outputDir = ctx.fs.getDataDir();
        const cachePath = `${outputDir}/lmarena-leaderboard.json`;

        if (await isCacheValid(ctx, cachePath, getCacheExpiry(ctx))) {
          ctx.logger.info('Using cached leaderboard data');
          const cached = await loadLeaderboardData(ctx);
          if (cached) {
            // Filter by category if specified
            if (params.category) {
              const categoryData = cached.text[params.category];
              if (!categoryData) {
                return {
                  success: false,
                  error: `Category not found: ${params.category}`,
                  timestamp: new Date().toISOString(),
                };
              }

              // Apply max limit
              if (params.max && categoryData.entries.length > params.max) {
                categoryData.entries = categoryData.entries.slice(0, params.max);
              }

              return {
                success: true,
                category: categoryData,
                timestamp: new Date().toISOString(),
              };
            }

            return {
              success: true,
              data: cached,
              timestamp: new Date().toISOString(),
            };
          }
        }

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(20, 'Fetching leaderboard data...');
        }

        // Fetch fresh data
        const [rawData, metadata] = await Promise.all([
          fetchLeaderboardData(ctx),
          fetchModelMetadata(ctx),
        ]);

        if (!rawData) {
          return {
            success: false,
            error: 'Failed to fetch leaderboard data',
            timestamp: new Date().toISOString(),
          };
        }

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(60, 'Processing leaderboard data...');
        }

        // Process data
        const data = processLeaderboardData(rawData, metadata);

        // Save to cache
        await saveLeaderboardData(ctx, data);

        if (toolCtx?.reportProgress) {
          toolCtx.reportProgress(100, 'Leaderboard fetched successfully');
        }

        // Filter by category if specified
        if (params.category) {
          const categoryData = data.text[params.category];
          if (!categoryData) {
            return {
              success: false,
              error: `Category not found: ${params.category}`,
              timestamp: new Date().toISOString(),
            };
          }

          // Apply max limit
          if (params.max && categoryData.entries.length > params.max) {
            categoryData.entries = categoryData.entries.slice(0, params.max);
          }

          return {
            success: true,
            category: categoryData,
            timestamp: new Date().toISOString(),
          };
        }

        // Apply max limit to all categories
        if (params.max) {
          for (const category of Object.values(data.text)) {
            if (category.entries.length > params.max) {
              category.entries = category.entries.slice(0, params.max);
            }
          }
          if (data.vision) {
            for (const category of Object.values(data.vision)) {
              if (category.entries.length > params.max) {
                category.entries = category.entries.slice(0, params.max);
              }
            }
          }
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        ctx.logger.error(`LMArena tool error: ${error}`);
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
