/**
 * Arena library exports
 */

export { WIN_REASONS, CATEGORY_IDS, ARENA_KNOWN_MODELS } from './constants';
export type { ArenaModelPresetEntry } from './constants';
export { formatBattleDate, formatBattleDuration } from './format';
export {
  getWinRateColor,
  getWinRateText,
  getRankBadgeClass,
  getProviderColor,
} from './color';
export { computeWordDiff, computeSimilarity } from './diff';
export {
  computeArenaStats,
  buildWinRateMatrix,
  computeEstimatedCost,
} from './stats';
export type {
  ComputedArenaStats,
  WinRateMatrixEntry,
  MatrixModelInfo,
} from './stats';
export {
  getModelId,
  parseModelId,
  expectedWinProbability,
  calculateNewRatings,
  buildQualityIndicators,
  preferencesToMatchups,
} from './rating';
export { exportLeaderboardData } from './export';
