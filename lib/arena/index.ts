/**
 * Arena library exports
 */

export { WIN_REASONS, CATEGORY_IDS } from './constants';
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
