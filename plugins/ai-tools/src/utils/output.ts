/**
 * Output Utilities
 *
 * @description Utilities for saving and loading scraped data
 */

import type { PluginContext } from '@cognia/plugin-sdk';
import type {
  ProviderPricing,
  AllPricing,
  PricingCategory,
  StatusReport,
  RankingsData,
  AllLeaderboardsData,
  TimeRange,
} from '../types';

// =============================================================================
// PRICING OUTPUT
// =============================================================================

export async function savePricingData(
  ctx: PluginContext,
  providerId: string,
  data: ProviderPricing
): Promise<string> {
  const outputDir = ctx.fs.getDataDir();
  const filename = `pricing-${providerId}.json`;
  const filepath = `${outputDir}/${filename}`;

  await ctx.fs.mkdir(outputDir, true);
  await ctx.fs.writeJson(filepath, data, true);

  return filepath;
}

export async function loadPricingData(
  ctx: PluginContext,
  providerId: string
): Promise<ProviderPricing | null> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/pricing-${providerId}.json`;

  if (await ctx.fs.exists(filepath)) {
    return ctx.fs.readJson<ProviderPricing>(filepath);
  }

  return null;
}

export async function saveAllPricing(
  ctx: PluginContext,
  data: AllPricing
): Promise<string> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/all-pricing.json`;

  await ctx.fs.mkdir(outputDir, true);
  await ctx.fs.writeJson(filepath, data, true);

  return filepath;
}

export async function loadAllPricing(
  ctx: PluginContext
): Promise<AllPricing | null> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/all-pricing.json`;

  if (await ctx.fs.exists(filepath)) {
    return ctx.fs.readJson<AllPricing>(filepath);
  }

  return null;
}

export function countModels(categories: PricingCategory[]): number {
  return categories.reduce((sum, cat) => sum + cat.models.length, 0);
}

// =============================================================================
// STATUS OUTPUT
// =============================================================================

export async function saveStatusReport(
  ctx: PluginContext,
  report: StatusReport
): Promise<string> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/status-report.json`;

  await ctx.fs.mkdir(outputDir, true);
  await ctx.fs.writeJson(filepath, report, true);

  return filepath;
}

export async function loadStatusReport(
  ctx: PluginContext
): Promise<StatusReport | null> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/status-report.json`;

  if (await ctx.fs.exists(filepath)) {
    return ctx.fs.readJson<StatusReport>(filepath);
  }

  return null;
}

// =============================================================================
// RANKINGS OUTPUT
// =============================================================================

export async function saveRankingsData(
  ctx: PluginContext,
  data: RankingsData
): Promise<string> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/rankings-${data.timeRange}.json`;

  await ctx.fs.mkdir(outputDir, true);
  await ctx.fs.writeJson(filepath, data, true);

  return filepath;
}

export async function loadRankingsData(
  ctx: PluginContext,
  timeRange: TimeRange
): Promise<RankingsData | null> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/rankings-${timeRange}.json`;

  if (await ctx.fs.exists(filepath)) {
    return ctx.fs.readJson<RankingsData>(filepath);
  }

  return null;
}

// =============================================================================
// LMARENA OUTPUT
// =============================================================================

export async function saveLeaderboardData(
  ctx: PluginContext,
  data: AllLeaderboardsData
): Promise<string> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/lmarena-leaderboard.json`;

  await ctx.fs.mkdir(outputDir, true);
  await ctx.fs.writeJson(filepath, data, true);

  return filepath;
}

export async function loadLeaderboardData(
  ctx: PluginContext
): Promise<AllLeaderboardsData | null> {
  const outputDir = ctx.fs.getDataDir();
  const filepath = `${outputDir}/lmarena-leaderboard.json`;

  if (await ctx.fs.exists(filepath)) {
    return ctx.fs.readJson<AllLeaderboardsData>(filepath);
  }

  return null;
}

export function countUniqueModels(data: AllLeaderboardsData): number {
  const modelIds = new Set<string>();

  for (const category of Object.values(data.text)) {
    for (const entry of category.entries) {
      modelIds.add(entry.modelId);
    }
  }

  if (data.vision) {
    for (const category of Object.values(data.vision)) {
      for (const entry of category.entries) {
        modelIds.add(entry.modelId);
      }
    }
  }

  return modelIds.size;
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

export async function isCacheValid(
  ctx: PluginContext,
  filepath: string,
  maxAgeMs: number
): Promise<boolean> {
  if (!(await ctx.fs.exists(filepath))) {
    return false;
  }

  const stat = await ctx.fs.stat(filepath);
  if (!stat.modified) {
    return false;
  }

  const age = Date.now() - stat.modified.getTime();
  return age < maxAgeMs;
}

export async function clearCache(ctx: PluginContext): Promise<void> {
  const outputDir = ctx.fs.getDataDir();

  if (await ctx.fs.exists(outputDir)) {
    const entries = await ctx.fs.readDir(outputDir);

    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith('.json')) {
        await ctx.fs.remove(entry.path);
      }
    }
  }
}
