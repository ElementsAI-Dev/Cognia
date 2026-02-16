/**
 * Arena statistics computation - aggregate battle and heatmap matrix calculations
 */

import type {
  ArenaBattle,
  ArenaModelRating,
  ArenaHeadToHead,
  ModelUsageStats,
  CategoryStats,
} from '@/types/arena';

/**
 * Computed arena statistics result
 */
export interface ComputedArenaStats {
  totalBattles: number;
  completedCount: number;
  tieCount: number;
  bothBadCount: number;
  decisiveCount: number;
  avgResponseTime: number;
  modelStats: ModelUsageStats[];
  categoryStats: CategoryStats[];
  blindModeCount: number;
  blindModePercent: number;
  multiTurnCount: number;
  uniqueModelCount: number;
  topRating: ArenaModelRating | null;
}

/**
 * Compute aggregate statistics from battles and ratings
 */
export function computeArenaStats(battles: ArenaBattle[], ratings: ArenaModelRating[]): ComputedArenaStats {
  const totalBattles = battles.length;
  let completedCount = 0;
  let tieCount = 0;
  let bothBadCount = 0;
  let decisiveCount = 0;
  let blindModeCount = 0;
  let multiTurnCount = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;

  const modelUsage = new Map<string, { battleCount: number; winCount: number; provider: string; model: string; displayName: string }>();
  const categoryCounts = new Map<string, number>();
  const uniqueModels = new Set<string>();

  // Single pass over all battles
  for (const battle of battles) {
    const isCompleted = !!(battle.winnerId || battle.isTie || battle.isBothBad);

    if (isCompleted) {
      completedCount++;
      if (battle.isTie) tieCount++;
      if (battle.isBothBad) bothBadCount++;
      if (battle.winnerId && !battle.isTie && !battle.isBothBad) decisiveCount++;

      if (battle.completedAt && battle.createdAt) {
        totalResponseTime += new Date(battle.completedAt).getTime() - new Date(battle.createdAt).getTime();
        responseTimeCount++;
      }
    }

    if (battle.mode === 'blind') blindModeCount++;
    if (battle.conversationMode === 'multi') multiTurnCount++;

    const cat = battle.taskClassification?.category || 'uncategorized';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

    for (const c of battle.contestants) {
      const key = `${c.provider}:${c.model}`;
      uniqueModels.add(key);
      const existing = modelUsage.get(key) || { battleCount: 0, winCount: 0, provider: c.provider, model: c.model, displayName: c.displayName };
      existing.battleCount++;
      if (battle.winnerId === c.id) {
        existing.winCount++;
      }
      modelUsage.set(key, existing);
    }
  }

  const avgResponseTime = responseTimeCount > 0
    ? Math.round(totalResponseTime / responseTimeCount / 1000)
    : 0;

  const blindModePercent = totalBattles > 0 ? Math.round((blindModeCount / totalBattles) * 100) : 0;

  const modelStats: ModelUsageStats[] = Array.from(modelUsage.entries())
    .map(([modelId, stats]) => ({
      modelId,
      ...stats,
      winRate: stats.battleCount > 0 ? stats.winCount / stats.battleCount : 0,
    }))
    .sort((a, b) => b.battleCount - a.battleCount);

  const categoryStats: CategoryStats[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalBattles > 0 ? Math.round((count / totalBattles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalBattles,
    completedCount,
    tieCount,
    bothBadCount,
    decisiveCount,
    avgResponseTime,
    modelStats,
    categoryStats,
    blindModeCount,
    blindModePercent,
    multiTurnCount,
    uniqueModelCount: uniqueModels.size,
    topRating: ratings.length > 0 ? ratings[0] : null,
  };
}

/**
 * Win rate matrix entry for heatmap
 */
export interface WinRateMatrixEntry {
  winRate: number;
  games: number;
}

/**
 * Model info for matrix display
 */
export interface MatrixModelInfo {
  id: string;
  name: string;
  provider: string;
  rating: number;
}

/**
 * Build win rate matrix for heatmap visualization
 */
export function buildWinRateMatrix(
  topModels: MatrixModelInfo[],
  headToHead: ArenaHeadToHead[]
): Record<string, Record<string, WinRateMatrixEntry>> {
  const result: Record<string, Record<string, WinRateMatrixEntry>> = {};

  for (const model of topModels) {
    result[model.id] = {};
    for (const other of topModels) {
      if (model.id === other.id) {
        result[model.id][other.id] = { winRate: 0.5, games: 0 };
      } else {
        // Find head-to-head record
        const h2h = headToHead.find(
          (h: ArenaHeadToHead) =>
            (h.modelA === model.id && h.modelB === other.id) ||
            (h.modelA === other.id && h.modelB === model.id)
        );

        if (h2h) {
          // Calculate win rate from model's perspective
          const isModelA = h2h.modelA === model.id;
          const winRate = isModelA ? h2h.winRateA : 1 - h2h.winRateA;
          result[model.id][other.id] = { winRate, games: h2h.total };
        } else {
          result[model.id][other.id] = { winRate: 0.5, games: 0 };
        }
      }
    }
  }

  return result;
}

/**
 * Approximate token pricing per 1M tokens (USD)
 * Used for cost estimation in arena battles
 */
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  'openai:gpt-4o': { input: 2.5, output: 10 },
  'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai:o1': { input: 15, output: 60 },
  'anthropic:claude-sonnet-4-20250514': { input: 3, output: 15 },
  'anthropic:claude-opus-4-20250514': { input: 15, output: 75 },
  'anthropic:claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'google:gemini-2.0-flash-exp': { input: 0.1, output: 0.4 },
  'google:gemini-1.5-pro': { input: 1.25, output: 5 },
  'deepseek:deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek:deepseek-reasoner': { input: 0.55, output: 2.19 },
  'groq:llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'mistral:mistral-large-latest': { input: 2, output: 6 },
  'xai:grok-3': { input: 3, output: 15 },
};

/**
 * Compute estimated cost for a model based on token usage
 * @param provider Provider name
 * @param model Model name
 * @param inputTokens Number of input (prompt) tokens
 * @param outputTokens Number of output (completion) tokens
 * @returns Estimated cost in USD, or undefined if pricing is unknown
 */
export function computeEstimatedCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number | undefined {
  const key = `${provider}:${model}`;
  const pricing = TOKEN_PRICING[key];
  if (!pricing) return undefined;

  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
