/**
 * Bradley-Terry Model Implementation
 * Maximum Likelihood Estimation for pairwise comparison ranking
 * Based on LMSYS Chatbot Arena methodology
 */

import type { ProviderName } from '@/types/provider';

/**
 * Matchup result from a battle
 */
export interface Matchup {
  winner: string;
  loser: string;
  isTie?: boolean;
}

/**
 * Model rating with Bradley-Terry score
 */
export interface BTModelRating {
  modelId: string;
  provider: ProviderName;
  model: string;
  /** Bradley-Terry strength parameter (log scale) */
  btScore: number;
  /** Converted to ELO-like scale for display */
  rating: number;
  /** 95% confidence interval lower bound */
  ci95Lower: number;
  /** 95% confidence interval upper bound */
  ci95Upper: number;
  /** Total battles */
  totalBattles: number;
  /** Wins */
  wins: number;
  /** Losses */
  losses: number;
  /** Ties */
  ties: number;
  /** Win rate */
  winRate: number;
}

/**
 * Head-to-head record between two models
 */
export interface HeadToHead {
  modelA: string;
  modelB: string;
  winsA: number;
  winsB: number;
  ties: number;
  total: number;
  winRateA: number;
}

/**
 * Default rating parameters
 */
export const BT_BASE_RATING = 1500;
export const BT_SCALE_FACTOR = 400; // Convert BT to ELO-like scale
export const BT_CONVERGENCE_THRESHOLD = 1e-6;
export const BT_MAX_ITERATIONS = 100;

/**
 * Get model identifier from provider and model
 */
export function getModelId(provider: ProviderName, model: string): string {
  return `${provider}:${model}`;
}

/**
 * Parse model identifier to provider and model
 */
export function parseModelId(modelId: string): { provider: ProviderName; model: string } {
  const [provider, ...modelParts] = modelId.split(':');
  return {
    provider: provider as ProviderName,
    model: modelParts.join(':'),
  };
}

/**
 * Convert Bradley-Terry score to ELO-like rating
 * BT score is in log-odds scale, convert to 1500-based scale
 */
export function btScoreToRating(btScore: number): number {
  return BT_BASE_RATING + (btScore * BT_SCALE_FACTOR) / Math.log(10);
}

/**
 * Convert ELO-like rating to Bradley-Terry score
 */
export function ratingToBtScore(rating: number): number {
  return ((rating - BT_BASE_RATING) * Math.log(10)) / BT_SCALE_FACTOR;
}

/**
 * Calculate win probability using Bradley-Terry model
 * P(A beats B) = exp(score_A) / (exp(score_A) + exp(score_B))
 */
export function btWinProbability(scoreA: number, scoreB: number): number {
  const diff = scoreA - scoreB;
  // Use sigmoid to avoid overflow
  if (diff > 20) return 1;
  if (diff < -20) return 0;
  return 1 / (1 + Math.exp(-diff));
}

/**
 * Aggregate matchups into win/loss matrix
 */
export function aggregateMatchups(matchups: Matchup[]): Map<string, Map<string, { wins: number; losses: number; ties: number }>> {
  const matrix = new Map<string, Map<string, { wins: number; losses: number; ties: number }>>();

  for (const matchup of matchups) {
    const { winner, loser, isTie } = matchup;

    // Initialize entries
    if (!matrix.has(winner)) matrix.set(winner, new Map());
    if (!matrix.has(loser)) matrix.set(loser, new Map());

    const winnerRow = matrix.get(winner)!;
    const loserRow = matrix.get(loser)!;

    if (!winnerRow.has(loser)) winnerRow.set(loser, { wins: 0, losses: 0, ties: 0 });
    if (!loserRow.has(winner)) loserRow.set(winner, { wins: 0, losses: 0, ties: 0 });

    if (isTie) {
      winnerRow.get(loser)!.ties += 1;
      loserRow.get(winner)!.ties += 1;
    } else {
      winnerRow.get(loser)!.wins += 1;
      loserRow.get(winner)!.losses += 1;
    }
  }

  return matrix;
}

/**
 * Compute Bradley-Terry ratings using Maximum Likelihood Estimation
 * Uses iterative algorithm with MM (Minorization-Maximization)
 */
export function computeBradleyTerryRatings(
  matchups: Matchup[],
  options?: {
    tieWeight?: number; // How to count ties (default 0.5 = half win)
    maxIterations?: number;
    convergenceThreshold?: number;
  }
): Map<string, number> {
  const {
    tieWeight = 0.5,
    maxIterations = BT_MAX_ITERATIONS,
    convergenceThreshold = BT_CONVERGENCE_THRESHOLD,
  } = options || {};

  // Get unique models
  const models = new Set<string>();
  for (const m of matchups) {
    models.add(m.winner);
    models.add(m.loser);
  }
  const modelList = Array.from(models);

  if (modelList.length < 2) {
    // Not enough models for comparison
    const result = new Map<string, number>();
    for (const model of modelList) {
      result.set(model, 0);
    }
    return result;
  }

  // Initialize scores to 0 (all models equal)
  const scores = new Map<string, number>();
  for (const model of modelList) {
    scores.set(model, 0);
  }

  // Count wins and total games for each pair
  const wins = new Map<string, Map<string, number>>();
  const totalGames = new Map<string, Map<string, number>>();

  for (const model of modelList) {
    wins.set(model, new Map());
    totalGames.set(model, new Map());
  }

  for (const matchup of matchups) {
    const { winner, loser, isTie } = matchup;

    // Initialize if needed
    if (!wins.get(winner)!.has(loser)) wins.get(winner)!.set(loser, 0);
    if (!wins.get(loser)!.has(winner)) wins.get(loser)!.set(winner, 0);
    if (!totalGames.get(winner)!.has(loser)) totalGames.get(winner)!.set(loser, 0);
    if (!totalGames.get(loser)!.has(winner)) totalGames.get(loser)!.set(winner, 0);

    if (isTie) {
      // Ties count as partial wins for both
      wins.get(winner)!.set(loser, wins.get(winner)!.get(loser)! + tieWeight);
      wins.get(loser)!.set(winner, wins.get(loser)!.get(winner)! + tieWeight);
    } else {
      wins.get(winner)!.set(loser, wins.get(winner)!.get(loser)! + 1);
    }
    totalGames.get(winner)!.set(loser, totalGames.get(winner)!.get(loser)! + 1);
    totalGames.get(loser)!.set(winner, totalGames.get(loser)!.get(winner)! + 1);
  }

  // MM algorithm iteration
  for (let iter = 0; iter < maxIterations; iter++) {
    const newScores = new Map<string, number>();
    let maxChange = 0;

    for (const i of modelList) {
      let numerator = 0;
      let denominator = 0;

      for (const j of modelList) {
        if (i === j) continue;

        const nij = totalGames.get(i)!.get(j) || 0;
        if (nij === 0) continue;

        const wij = wins.get(i)!.get(j) || 0;
        const pi = Math.exp(scores.get(i)!);
        const pj = Math.exp(scores.get(j)!);

        numerator += wij;
        denominator += nij * pj / (pi + pj);
      }

      // Update score
      const newScore = denominator > 0 ? Math.log(numerator / denominator) : 0;
      newScores.set(i, newScore);

      const change = Math.abs(newScore - scores.get(i)!);
      maxChange = Math.max(maxChange, change);
    }

    // Normalize scores (set mean to 0)
    const mean = Array.from(newScores.values()).reduce((a, b) => a + b, 0) / newScores.size;
    for (const [model, score] of newScores) {
      scores.set(model, score - mean);
    }

    // Check convergence
    if (maxChange < convergenceThreshold) {
      break;
    }
  }

  return scores;
}

/**
 * Compute model statistics from matchups
 */
export function computeModelStats(matchups: Matchup[]): Map<string, { wins: number; losses: number; ties: number; total: number }> {
  const stats = new Map<string, { wins: number; losses: number; ties: number; total: number }>();

  for (const matchup of matchups) {
    const { winner, loser, isTie } = matchup;

    if (!stats.has(winner)) stats.set(winner, { wins: 0, losses: 0, ties: 0, total: 0 });
    if (!stats.has(loser)) stats.set(loser, { wins: 0, losses: 0, ties: 0, total: 0 });

    if (isTie) {
      stats.get(winner)!.ties += 1;
      stats.get(loser)!.ties += 1;
    } else {
      stats.get(winner)!.wins += 1;
      stats.get(loser)!.losses += 1;
    }
    stats.get(winner)!.total += 1;
    stats.get(loser)!.total += 1;
  }

  return stats;
}

/**
 * Compute head-to-head records for all model pairs
 */
export function computeHeadToHead(matchups: Matchup[]): HeadToHead[] {
  const pairMap = new Map<string, HeadToHead>();

  for (const matchup of matchups) {
    const { winner, loser, isTie } = matchup;

    // Create canonical key (alphabetically sorted)
    const [modelA, modelB] = [winner, loser].sort();
    const key = `${modelA}:${modelB}`;

    if (!pairMap.has(key)) {
      pairMap.set(key, {
        modelA,
        modelB,
        winsA: 0,
        winsB: 0,
        ties: 0,
        total: 0,
        winRateA: 0,
      });
    }

    const record = pairMap.get(key)!;

    if (isTie) {
      record.ties += 1;
    } else if (winner === modelA) {
      record.winsA += 1;
    } else {
      record.winsB += 1;
    }
    record.total += 1;
    record.winRateA = record.total > 0 ? (record.winsA + record.ties * 0.5) / record.total : 0;
  }

  return Array.from(pairMap.values());
}

/**
 * Get full BTModelRating objects from matchups
 */
export function computeFullRatings(
  matchups: Matchup[],
  bootstrapSamples?: number[][]
): BTModelRating[] {
  if (matchups.length === 0) return [];

  const btScores = computeBradleyTerryRatings(matchups);
  const stats = computeModelStats(matchups);

  // Compute confidence intervals if bootstrap samples provided
  const ciMap = new Map<string, { lower: number; upper: number }>();

  if (bootstrapSamples && bootstrapSamples.length > 0) {
    const bootstrapRatings = new Map<string, number[]>();

    for (const sampleIndices of bootstrapSamples) {
      const sampleMatchups = sampleIndices.map((i) => matchups[i]);
      const sampleScores = computeBradleyTerryRatings(sampleMatchups);

      for (const [modelId, score] of sampleScores) {
        if (!bootstrapRatings.has(modelId)) bootstrapRatings.set(modelId, []);
        bootstrapRatings.get(modelId)!.push(btScoreToRating(score));
      }
    }

    // Compute 95% CI
    for (const [modelId, ratings] of bootstrapRatings) {
      ratings.sort((a, b) => a - b);
      const lowerIdx = Math.floor(ratings.length * 0.025);
      const upperIdx = Math.floor(ratings.length * 0.975);
      ciMap.set(modelId, {
        lower: ratings[lowerIdx] || BT_BASE_RATING,
        upper: ratings[upperIdx] || BT_BASE_RATING,
      });
    }
  }

  const ratings: BTModelRating[] = [];

  for (const [modelId, btScore] of btScores) {
    const { provider, model } = parseModelId(modelId);
    const modelStats = stats.get(modelId) || { wins: 0, losses: 0, ties: 0, total: 0 };
    const rating = btScoreToRating(btScore);
    const ci = ciMap.get(modelId) || { lower: rating - 50, upper: rating + 50 };

    ratings.push({
      modelId,
      provider,
      model,
      btScore,
      rating,
      ci95Lower: ci.lower,
      ci95Upper: ci.upper,
      totalBattles: modelStats.total,
      wins: modelStats.wins,
      losses: modelStats.losses,
      ties: modelStats.ties,
      winRate: modelStats.total > 0 ? modelStats.wins / modelStats.total : 0,
    });
  }

  // Sort by rating descending
  ratings.sort((a, b) => b.rating - a.rating);

  return ratings;
}

/**
 * Predict win probability between two models
 */
export function predictWinProbability(
  ratings: BTModelRating[],
  modelA: string,
  modelB: string
): number {
  const ratingA = ratings.find((r) => r.modelId === modelA);
  const ratingB = ratings.find((r) => r.modelId === modelB);

  if (!ratingA || !ratingB) return 0.5;

  return btWinProbability(ratingA.btScore, ratingB.btScore);
}

/**
 * Get recommended matchup for most informative battle
 * Prioritizes uncertain matchups (similar ratings with few games)
 */
export function getRecommendedMatchup(
  ratings: BTModelRating[],
  headToHead: HeadToHead[],
  excludeModels?: string[]
): { modelA: string; modelB: string; reason: string } | null {
  const availableModels = ratings.filter(
    (r) => !excludeModels?.includes(r.modelId) && r.totalBattles > 0
  );

  if (availableModels.length < 2) return null;

  // Find pair with highest uncertainty
  let bestPair: { modelA: string; modelB: string; score: number } | null = null;

  for (let i = 0; i < availableModels.length; i++) {
    for (let j = i + 1; j < availableModels.length; j++) {
      const a = availableModels[i];
      const b = availableModels[j];

      // Check current head-to-head
      const h2h = headToHead.find(
        (h) =>
          (h.modelA === a.modelId && h.modelB === b.modelId) ||
          (h.modelA === b.modelId && h.modelB === a.modelId)
      );

      const gamesPlayed = h2h?.total || 0;

      // Score: prefer similar ratings with few games
      const ratingDiff = Math.abs(a.rating - b.rating);
      const uncertainty = (a.ci95Upper - a.ci95Lower + b.ci95Upper - b.ci95Lower) / 2;

      // Higher score = more informative matchup
      const score = uncertainty / (1 + ratingDiff / 100) / (1 + gamesPlayed);

      if (!bestPair || score > bestPair.score) {
        bestPair = { modelA: a.modelId, modelB: b.modelId, score };
      }
    }
  }

  if (!bestPair) return null;

  return {
    modelA: bestPair.modelA,
    modelB: bestPair.modelB,
    reason: 'Uncertain matchup - similar ratings with few direct comparisons',
  };
}
