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
