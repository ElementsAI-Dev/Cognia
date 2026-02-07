/**
 * Arena Store - manages arena battles, preferences, and model ratings
 * Enhanced with Bradley-Terry model for statistical rating
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  ArenaBattle,
  ArenaContestant,
  ArenaContestantStatus,
  ArenaPreference,
  ArenaModelRating,
  ArenaStats,
  ArenaSettings,
  ArenaWinReason,
  ArenaBattleMode,
  ArenaHeadToHead,
  ArenaQualityIndicators,
} from '@/types/arena';
import {
  DEFAULT_ARENA_SETTINGS,
  DEFAULT_ELO_RATING,
  ELO_K_FACTOR,
} from '@/types/arena';
import type { ProviderName } from '@/types/provider';
import type { TaskCategory, TaskClassification } from '@/types/provider/auto-router';
import {
  computeBradleyTerryRatings,
  computeModelStats,
  computeHeadToHead,
  btScoreToRating,
  getRecommendedMatchup,
  type Matchup,
  type HeadToHead,
} from '@/lib/ai/arena/bradley-terry';
import {
  generateBootstrapSamples,
  computeBootstrapCI,
  computeRatingStability,
} from '@/lib/ai/arena/bootstrap';

/**
 * Get model identifier from provider and model
 */
function getModelId(provider: ProviderName, model: string): string {
  return `${provider}:${model}`;
}

/**
 * Parse model identifier to provider and model
 */
function parseModelId(modelId: string): { provider: ProviderName; model: string } {
  const [provider, ...modelParts] = modelId.split(':');
  return {
    provider: provider as ProviderName,
    model: modelParts.join(':'),
  };
}

/**
 * Calculate expected win probability using ELO formula
 */
function expectedWinProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO ratings after a match
 */
function calculateNewRatings(
  winnerRating: number,
  loserRating: number,
  kFactor: number = ELO_K_FACTOR
): { newWinnerRating: number; newLoserRating: number } {
  const expectedWin = expectedWinProbability(winnerRating, loserRating);
  const newWinnerRating = winnerRating + kFactor * (1 - expectedWin);
  const newLoserRating = loserRating + kFactor * (0 - (1 - expectedWin));
  return { newWinnerRating, newLoserRating };
}

function buildQualityIndicators(
  battle: ArenaBattle,
  settings: ArenaSettings
): ArenaQualityIndicators {
  const responseLengths = battle.contestants.map((c) => c.response?.length || 0);
  const avgResponseLength = responseLengths.length
    ? responseLengths.reduce((sum, length) => sum + length, 0) / responseLengths.length
    : 0;
  const viewingStartedAt = battle.viewingStartedAt
    ? new Date(battle.viewingStartedAt).getTime()
    : null;
  const viewingTimeMs = viewingStartedAt ? Math.max(0, Date.now() - viewingStartedAt) : 0;
  const allResponsesComplete = battle.contestants.every((c) => c.status === 'completed');
  const qualityScoreParts = [
    battle.prompt.length > 0,
    avgResponseLength > 0,
    !settings.enableAntiGaming || viewingTimeMs >= settings.minViewingTimeMs,
    allResponsesComplete,
  ];
  const qualityScore =
    qualityScoreParts.filter(Boolean).length / Math.max(qualityScoreParts.length, 1);

  return {
    promptLength: battle.prompt.length,
    avgResponseLength,
    viewingTimeMs,
    allResponsesComplete,
    qualityScore,
  };
}

/**
 * Convert preferences to matchups for BT calculation
 */
function preferencesToMatchups(preferences: ArenaPreference[]): Matchup[] {
  return preferences.map((p) => ({
    winner: p.winner,
    loser: p.loser,
    isTie: false,
  }));
}

interface ArenaState {
  // State
  battles: ArenaBattle[];
  activeBattleId: string | null;
  preferences: ArenaPreference[];
  modelRatings: ArenaModelRating[];
  settings: ArenaSettings;

  // Battle management
  createBattle: (
    prompt: string,
    contestants: Array<{ provider: ProviderName; model: string; displayName: string }>,
    options?: {
      sessionId?: string;
      systemPrompt?: string;
      mode?: ArenaBattleMode;
      conversationMode?: 'single' | 'multi';
      maxTurns?: number;
      taskClassification?: TaskClassification;
    }
  ) => ArenaBattle;
  getBattle: (battleId: string) => ArenaBattle | undefined;
  getActiveBattle: () => ArenaBattle | undefined;
  setActiveBattle: (battleId: string | null) => void;
  markBattleViewed: (battleId: string) => void;
  deleteBattle: (battleId: string) => void;
  clearBattleHistory: () => void;

  // Contestant management
  updateContestant: (
    battleId: string,
    contestantId: string,
    updates: Partial<ArenaContestant>
  ) => void;
  updateContestantStatus: (
    battleId: string,
    contestantId: string,
    status: ArenaContestantStatus
  ) => void;
  appendToContestantResponse: (
    battleId: string,
    contestantId: string,
    chunk: string
  ) => void;

  // Winner selection
  selectWinner: (
    battleId: string,
    winnerId: string,
    options?: { reason?: ArenaWinReason; notes?: string }
  ) => void;
  declareTie: (battleId: string, notes?: string) => void;
  declareBothBad: (battleId: string, notes?: string) => void;

  // Rating management
  getModelRating: (provider: ProviderName, model: string, category?: TaskCategory) => number;
  getAllModelRatings: () => ArenaModelRating[];
  resetModelRatings: () => void;

  // Preference management
  getPreferences: (options?: { category?: TaskCategory; limit?: number }) => ArenaPreference[];
  exportPreferences: () => ArenaPreference[];
  importPreferences: (preferences: ArenaPreference[]) => void;
  clearPreferences: () => void;

  // Statistics
  getStats: () => ArenaStats;
  getModelWinRate: (provider: ProviderName, model: string) => number;

  // Settings
  updateSettings: (updates: Partial<ArenaSettings>) => void;
  resetSettings: () => void;

  // Cleanup
  cleanupOldBattles: () => void;

  // Bradley-Terry ratings
  recalculateBTRatings: () => void;
  getBTRatings: () => ArenaModelRating[];
  getHeadToHead: () => ArenaHeadToHead[];
  getRecommendedMatchup: (excludeModels?: string[]) => { modelA: string; modelB: string; reason: string } | null;

  // Multi-turn support
  addTurnToContestant: (battleId: string, contestantId: string, message: { role: 'user' | 'assistant'; content: string }) => void;
  continueBattle: (battleId: string, userMessage: string) => void;

  // Anti-gaming
  canVote: (battleId?: string) => { allowed: boolean; reason?: 'rate-limit' | 'min-viewing-time' };
  recordVoteAttempt: () => void;
  voteHistory: { timestamp: number }[];

  // Data management
  clearAllData: () => void;
}

export const useArenaStore = create<ArenaState>()(
  persist(
    (set, get) => ({
      battles: [],
      activeBattleId: null,
      preferences: [],
      modelRatings: [],
      settings: DEFAULT_ARENA_SETTINGS,

      createBattle: (prompt, contestants, options) => {
        const settings = get().settings;
        const battle: ArenaBattle = {
          id: nanoid(),
          sessionId: options?.sessionId,
          prompt,
          systemPrompt: options?.systemPrompt,
          mode: options?.mode || settings.defaultMode,
          conversationMode: options?.conversationMode || settings.defaultConversationMode,
          maxTurns: options?.maxTurns || settings.defaultMaxTurns,
          currentTurn: 1,
          contestants: contestants.map((c) => ({
            id: nanoid(),
            provider: c.provider,
            model: c.model,
            displayName: c.displayName,
            response: '',
            messages: [],
            turnCount: 0,
            status: 'pending' as ArenaContestantStatus,
          })),
          taskClassification: options?.taskClassification,
          createdAt: new Date(),
        };

        set((state) => ({
          battles: [battle, ...state.battles],
          activeBattleId: battle.id,
        }));

        return battle;
      },

      getBattle: (battleId) => {
        return get().battles.find((b) => b.id === battleId);
      },

      getActiveBattle: () => {
        const { activeBattleId, battles } = get();
        if (!activeBattleId) return undefined;
        return battles.find((b) => b.id === activeBattleId);
      },

      setActiveBattle: (battleId) => {
        set({ activeBattleId: battleId });
      },

      markBattleViewed: (battleId) => {
        set((state) => ({
          battles: state.battles.map((battle) => {
            if (battle.id !== battleId || battle.viewingStartedAt) return battle;
            return { ...battle, viewingStartedAt: new Date() };
          }),
        }));
      },

      deleteBattle: (battleId) => {
        set((state) => ({
          battles: state.battles.filter((b) => b.id !== battleId),
          activeBattleId: state.activeBattleId === battleId ? null : state.activeBattleId,
        }));
      },

      clearBattleHistory: () => {
        set({ battles: [], activeBattleId: null });
      },

      updateContestant: (battleId, contestantId, updates) => {
        set((state) => ({
          battles: state.battles.map((battle) => {
            if (battle.id !== battleId) return battle;
            return {
              ...battle,
              contestants: battle.contestants.map((c) =>
                c.id === contestantId ? { ...c, ...updates } : c
              ),
            };
          }),
        }));
      },

      updateContestantStatus: (battleId, contestantId, status) => {
        const now = new Date();
        set((state) => ({
          battles: state.battles.map((battle) => {
            if (battle.id !== battleId) return battle;
            return {
              ...battle,
              contestants: battle.contestants.map((c) => {
                if (c.id !== contestantId) return c;
                const updates: Partial<ArenaContestant> = { status };
                if (status === 'streaming' && !c.startedAt) {
                  updates.startedAt = now;
                }
                if (status === 'completed' || status === 'error') {
                  updates.completedAt = now;
                  if (c.startedAt) {
                    updates.latencyMs = now.getTime() - new Date(c.startedAt).getTime();
                  }
                }
                return { ...c, ...updates };
              }),
            };
          }),
        }));
      },

      appendToContestantResponse: (battleId, contestantId, chunk) => {
        set((state) => ({
          battles: state.battles.map((battle) => {
            if (battle.id !== battleId) return battle;
            return {
              ...battle,
              contestants: battle.contestants.map((c) =>
                c.id === contestantId
                  ? { ...c, response: c.response + chunk, status: 'streaming' }
                  : c
              ),
            };
          }),
        }));
      },

      selectWinner: (battleId, winnerId, options) => {
        const battle = get().getBattle(battleId);
        if (!battle) return;
        const settings = get().settings;
        const voteCheck = get().canVote(battleId);
        if (!voteCheck.allowed) return;
        get().recordVoteAttempt();

        const winner = battle.contestants.find((c) => c.id === winnerId);
        if (!winner) return;

        // Find losers (all non-winners)
        const losers = battle.contestants.filter((c) => c.id !== winnerId);

        // Update battle
        const qualityIndicators = buildQualityIndicators(battle, settings);
        set((state) => ({
          battles: state.battles.map((b) =>
            b.id === battleId
              ? {
                  ...b,
                  winnerId,
                  winReason: options?.reason,
                  notes: options?.notes,
                  isTie: false,
                  completedAt: new Date(),
                  qualityIndicators,
                }
              : b
          ),
        }));

        // Record preferences and update ratings for each loser
        const category = battle.taskClassification?.category;

        for (const loser of losers) {
          // Create preference record
          const preference: ArenaPreference = {
            id: nanoid(),
            battleId,
            winner: getModelId(winner.provider, winner.model),
            loser: getModelId(loser.provider, loser.model),
            taskCategory: category,
            reason: options?.reason,
            timestamp: new Date(),
          };

          // Update ELO ratings
          const winnerModelId = getModelId(winner.provider, winner.model);
          const loserModelId = getModelId(loser.provider, loser.model);

          set((state) => {
            // Find or create winner rating
            let winnerRating = state.modelRatings.find((r) => r.modelId === winnerModelId);
            if (!winnerRating) {
              winnerRating = {
                modelId: winnerModelId,
                provider: winner.provider,
                model: winner.model,
                rating: DEFAULT_ELO_RATING,
                categoryRatings: {},
                totalBattles: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                updatedAt: new Date(),
              };
            }

            // Find or create loser rating
            let loserRating = state.modelRatings.find((r) => r.modelId === loserModelId);
            if (!loserRating) {
              loserRating = {
                modelId: loserModelId,
                provider: loser.provider,
                model: loser.model,
                rating: DEFAULT_ELO_RATING,
                categoryRatings: {},
                totalBattles: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                updatedAt: new Date(),
              };
            }

            // Calculate new overall ratings
            const { newWinnerRating, newLoserRating } = calculateNewRatings(
              winnerRating.rating,
              loserRating.rating
            );

            // Calculate new category ratings if category is available
            let newWinnerCategoryRating = winnerRating.rating;
            let newLoserCategoryRating = loserRating.rating;
            if (category) {
              const winnerCatRating = winnerRating.categoryRatings[category] || DEFAULT_ELO_RATING;
              const loserCatRating = loserRating.categoryRatings[category] || DEFAULT_ELO_RATING;
              const catResult = calculateNewRatings(winnerCatRating, loserCatRating);
              newWinnerCategoryRating = catResult.newWinnerRating;
              newLoserCategoryRating = catResult.newLoserRating;
            }

            // Update ratings in state
            const updatedRatings = state.modelRatings.filter(
              (r) => r.modelId !== winnerModelId && r.modelId !== loserModelId
            );

            updatedRatings.push({
              ...winnerRating,
              rating: newWinnerRating,
              categoryRatings: category
                ? { ...winnerRating.categoryRatings, [category]: newWinnerCategoryRating }
                : winnerRating.categoryRatings,
              totalBattles: winnerRating.totalBattles + 1,
              wins: winnerRating.wins + 1,
              updatedAt: new Date(),
            });

            updatedRatings.push({
              ...loserRating,
              rating: newLoserRating,
              categoryRatings: category
                ? { ...loserRating.categoryRatings, [category]: newLoserCategoryRating }
                : loserRating.categoryRatings,
              totalBattles: loserRating.totalBattles + 1,
              losses: loserRating.losses + 1,
              updatedAt: new Date(),
            });

            return {
              preferences: [preference, ...state.preferences],
              modelRatings: updatedRatings,
            };
          });
        }
      },

      declareTie: (battleId, notes) => {
        const battle = get().getBattle(battleId);
        if (!battle) return;
        const settings = get().settings;
        const voteCheck = get().canVote(battleId);
        if (!voteCheck.allowed) return;
        get().recordVoteAttempt();
        const qualityIndicators = buildQualityIndicators(battle, settings);

        set((state) => ({
          battles: state.battles.map((b) =>
            b.id === battleId
              ? {
                  ...b,
                  isTie: true,
                  notes,
                  completedAt: new Date(),
                  qualityIndicators,
                }
              : b
          ),
        }));

        // Update tie counts for all contestants
        for (const contestant of battle.contestants) {
          const modelId = getModelId(contestant.provider, contestant.model);

          set((state) => {
            const existing = state.modelRatings.find((r) => r.modelId === modelId);
            if (!existing) {
              return {
                modelRatings: [
                  ...state.modelRatings,
                  {
                    modelId,
                    provider: contestant.provider,
                    model: contestant.model,
                    rating: DEFAULT_ELO_RATING,
                    categoryRatings: {},
                    totalBattles: 1,
                    wins: 0,
                    losses: 0,
                    ties: 1,
                    updatedAt: new Date(),
                  },
                ],
              };
            }

            return {
              modelRatings: state.modelRatings.map((r) =>
                r.modelId === modelId
                  ? {
                      ...r,
                      totalBattles: r.totalBattles + 1,
                      ties: r.ties + 1,
                      updatedAt: new Date(),
                    }
                  : r
              ),
            };
          });
        }
      },

      declareBothBad: (battleId, notes) => {
        const battle = get().getBattle(battleId);
        if (!battle) return;
        const settings = get().settings;
        const voteCheck = get().canVote(battleId);
        if (!voteCheck.allowed) return;
        get().recordVoteAttempt();
        const qualityIndicators = buildQualityIndicators(battle, settings);

        const category = battle.taskClassification?.category;

        set((state) => ({
          battles: state.battles.map((b) =>
            b.id === battleId
              ? {
                  ...b,
                  isBothBad: true,
                  notes,
                  completedAt: new Date(),
                  qualityIndicators,
                }
              : b
          ),
        }));

        // Record as tie preferences for each pair (both bad = both lose = tie variant)
        const newPreferences: ArenaPreference[] = [];
        for (let i = 0; i < battle.contestants.length; i++) {
          for (let j = i + 1; j < battle.contestants.length; j++) {
            const a = battle.contestants[i];
            const b = battle.contestants[j];
            newPreferences.push({
              id: nanoid(),
              battleId,
              winner: getModelId(a.provider, a.model),
              loser: getModelId(b.provider, b.model),
              isTie: true,
              taskCategory: category,
              reason: 'both-bad' as ArenaWinReason,
              timestamp: new Date(),
            });
          }
        }

        if (newPreferences.length > 0) {
          set((state) => ({
            preferences: [...newPreferences, ...state.preferences],
          }));
        }

        // Update tie counts for all contestants
        for (const contestant of battle.contestants) {
          const modelId = getModelId(contestant.provider, contestant.model);

          set((state) => {
            const existing = state.modelRatings.find((r) => r.modelId === modelId);
            if (!existing) {
              return {
                modelRatings: [
                  ...state.modelRatings,
                  {
                    modelId,
                    provider: contestant.provider,
                    model: contestant.model,
                    rating: DEFAULT_ELO_RATING,
                    categoryRatings: {},
                    totalBattles: 1,
                    wins: 0,
                    losses: 0,
                    ties: 1,
                    updatedAt: new Date(),
                  },
                ],
              };
            }

            return {
              modelRatings: state.modelRatings.map((r) =>
                r.modelId === modelId
                  ? {
                      ...r,
                      totalBattles: r.totalBattles + 1,
                      ties: r.ties + 1,
                      updatedAt: new Date(),
                    }
                  : r
              ),
            };
          });
        }
      },

      getModelRating: (provider, model, category) => {
        const modelId = getModelId(provider, model);
        const rating = get().modelRatings.find((r) => r.modelId === modelId);
        if (!rating) return DEFAULT_ELO_RATING;
        if (category && rating.categoryRatings[category]) {
          return rating.categoryRatings[category]!;
        }
        return rating.rating;
      },

      getAllModelRatings: () => {
        return get().modelRatings.sort((a, b) => b.rating - a.rating);
      },

      resetModelRatings: () => {
        set({ modelRatings: [] });
      },

      getPreferences: (options) => {
        let prefs = get().preferences;
        if (options?.category) {
          prefs = prefs.filter((p) => p.taskCategory === options.category);
        }
        if (options?.limit) {
          prefs = prefs.slice(0, options.limit);
        }
        return prefs;
      },

      exportPreferences: () => {
        return get().preferences;
      },

      importPreferences: (preferences) => {
        set((state) => ({
          preferences: [...preferences, ...state.preferences],
        }));
      },

      clearPreferences: () => {
        set({ preferences: [] });
      },

      getStats: () => {
        const { battles, modelRatings } = get();
        const completed = battles.filter((b) => b.completedAt);
        const ties = battles.filter((b) => b.isTie);

        // Calculate model win rates
        const modelWinRates: ArenaStats['modelWinRates'] = {};
        for (const rating of modelRatings) {
          modelWinRates[rating.modelId] = {
            wins: rating.wins,
            losses: rating.losses,
            total: rating.totalBattles,
            winRate: rating.totalBattles > 0 ? rating.wins / rating.totalBattles : 0,
          };
        }

        // Calculate category distribution
        const categoryDistribution: Partial<Record<TaskCategory, number>> = {};
        for (const battle of completed) {
          const cat = battle.taskClassification?.category;
          if (cat) {
            categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
          }
        }

        // Calculate average battle duration
        let totalDuration = 0;
        let durationCount = 0;
        for (const battle of completed) {
          if (battle.completedAt && battle.createdAt) {
            totalDuration +=
              new Date(battle.completedAt).getTime() - new Date(battle.createdAt).getTime();
            durationCount++;
          }
        }

        // Get top models
        const topModels = modelRatings
          .sort((a, b) => b.totalBattles - a.totalBattles)
          .slice(0, 5)
          .map((r) => ({ modelId: r.modelId, count: r.totalBattles }));

        return {
          totalBattles: battles.length,
          completedBattles: completed.length,
          totalTies: ties.length,
          modelWinRates,
          categoryDistribution,
          avgBattleDuration: durationCount > 0 ? totalDuration / durationCount : 0,
          topModels,
        };
      },

      getModelWinRate: (provider, model) => {
        const modelId = getModelId(provider, model);
        const rating = get().modelRatings.find((r) => r.modelId === modelId);
        if (!rating || rating.totalBattles === 0) return 0;
        return rating.wins / rating.totalBattles;
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      resetSettings: () => {
        set({ settings: DEFAULT_ARENA_SETTINGS });
      },

      cleanupOldBattles: () => {
        const { settings, battles } = get();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - settings.historyRetentionDays);

        set({
          battles: battles.filter((b) => new Date(b.createdAt) > cutoff),
        });
      },

      // Bradley-Terry ratings
      voteHistory: [],

      recalculateBTRatings: () => {
        const { preferences, settings } = get();
        if (preferences.length === 0) return;

        const matchups = preferencesToMatchups(preferences);
        const btScores = computeBradleyTerryRatings(matchups);
        const stats = computeModelStats(matchups);

        // Generate bootstrap samples for confidence intervals
        const bootstrapSamples = generateBootstrapSamples(matchups.length, {
          numSamples: settings.bootstrapSamples,
        });

        // Compute bootstrap ratings for CI
        const bootstrapRatings = new Map<string, number[]>();
        for (const sampleIndices of bootstrapSamples) {
          const sampleMatchups = sampleIndices.map((i) => matchups[i]);
          const sampleScores = computeBradleyTerryRatings(sampleMatchups);
          for (const [modelId, score] of sampleScores) {
            if (!bootstrapRatings.has(modelId)) bootstrapRatings.set(modelId, []);
            bootstrapRatings.get(modelId)!.push(btScoreToRating(score));
          }
        }

        // Build new ratings
        const newRatings: ArenaModelRating[] = [];
        for (const [modelId, btScore] of btScores) {
          const { provider, model } = parseModelId(modelId);
          const modelStats = stats.get(modelId) || { wins: 0, losses: 0, ties: 0, total: 0 };
          const rating = btScoreToRating(btScore);

          // Compute CI
          const samples = bootstrapRatings.get(modelId) || [];
          const ci = samples.length > 0
            ? computeBootstrapCI(samples, 0.95)
            : { lower: rating - 50, upper: rating + 50 };

          const stability = computeRatingStability(ci.lower, ci.upper, modelStats.total);

          newRatings.push({
            modelId,
            provider,
            model,
            rating,
            btScore,
            ci95Lower: ci.lower,
            ci95Upper: ci.upper,
            categoryRatings: {},
            totalBattles: modelStats.total,
            wins: modelStats.wins,
            losses: modelStats.losses,
            ties: modelStats.ties,
            winRate: modelStats.total > 0 ? modelStats.wins / modelStats.total : 0,
            stabilityScore: stability,
            updatedAt: new Date(),
          });
        }

        set({ modelRatings: newRatings.sort((a, b) => b.rating - a.rating) });
      },

      getBTRatings: () => {
        return get().modelRatings;
      },

      getHeadToHead: (): ArenaHeadToHead[] => {
        const { preferences } = get();
        const matchups = preferencesToMatchups(preferences);
        const h2h = computeHeadToHead(matchups);
        return h2h.map((record: HeadToHead) => ({
          modelA: record.modelA,
          modelB: record.modelB,
          winsA: record.winsA,
          winsB: record.winsB,
          ties: record.ties,
          total: record.total,
          winRateA: record.winRateA,
        }));
      },

      getRecommendedMatchup: (excludeModels) => {
        const { modelRatings, preferences } = get();
        if (modelRatings.length < 2) return null;

        const matchups = preferencesToMatchups(preferences);
        const h2h = computeHeadToHead(matchups);

        const btRatings = modelRatings.map((r) => ({
          modelId: r.modelId,
          provider: r.provider,
          model: r.model,
          btScore: r.btScore || 0,
          rating: r.rating,
          ci95Lower: r.ci95Lower || r.rating - 50,
          ci95Upper: r.ci95Upper || r.rating + 50,
          totalBattles: r.totalBattles,
          wins: r.wins,
          losses: r.losses,
          ties: r.ties,
          winRate: r.winRate || 0,
        }));

        return getRecommendedMatchup(btRatings, h2h, excludeModels);
      },

      // Multi-turn support
      addTurnToContestant: (battleId, contestantId, message) => {
        set((state) => ({
          battles: state.battles.map((battle) => {
            if (battle.id !== battleId) return battle;
            return {
              ...battle,
              contestants: battle.contestants.map((c) => {
                if (c.id !== contestantId) return c;
                const newMessage = {
                  id: nanoid(),
                  ...message,
                  timestamp: new Date(),
                };
                return {
                  ...c,
                  messages: [...(c.messages || []), newMessage],
                  turnCount: (c.turnCount || 0) + (message.role === 'assistant' ? 1 : 0),
                };
              }),
            };
          }),
        }));
      },

      continueBattle: (battleId, userMessage) => {
        const battle = get().getBattle(battleId);
        if (!battle) return;

        // Check max turns limit
        if (battle.maxTurns && (battle.currentTurn || 1) >= battle.maxTurns) {
          return;
        }

        // Add user message to all contestants
        for (const contestant of battle.contestants) {
          get().addTurnToContestant(battleId, contestant.id, {
            role: 'user',
            content: userMessage,
          });
        }

        // Update battle turn count
        set((state) => ({
          battles: state.battles.map((b) =>
            b.id === battleId
              ? { ...b, currentTurn: (b.currentTurn || 1) + 1 }
              : b
          ),
        }));
      },

      // Anti-gaming
      canVote: (battleId) => {
        const { settings, voteHistory } = get();
        if (!settings.enableAntiGaming) {
          return { allowed: true };
        }

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentVotes = voteHistory.filter((v) => v.timestamp > oneHourAgo);

        if (recentVotes.length >= settings.maxVotesPerHour) {
          return {
            allowed: false,
            reason: 'rate-limit',
          };
        }

        if (battleId && settings.minViewingTimeMs > 0) {
          const battle = get().getBattle(battleId);
          if (battle?.viewingStartedAt) {
            const elapsed = Date.now() - new Date(battle.viewingStartedAt).getTime();
            if (elapsed < settings.minViewingTimeMs) {
              return { allowed: false, reason: 'min-viewing-time' };
            }
          }
        }

        return { allowed: true };
      },

      recordVoteAttempt: () => {
        set((state) => ({
          voteHistory: [
            ...state.voteHistory.filter((v) => v.timestamp > Date.now() - 60 * 60 * 1000),
            { timestamp: Date.now() },
          ],
        }));
      },

      clearAllData: () => {
        set({
          battles: [],
          activeBattleId: null,
          preferences: [],
          modelRatings: [],
          voteHistory: [],
        });
      },
    }),
    {
      name: 'cognia-arena',
      partialize: (state) => ({
        battles: state.battles,
        preferences: state.preferences,
        modelRatings: state.modelRatings,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state: ArenaState | undefined) => {
        if (state) {
          // Convert date strings back to Date objects
          state.battles = state.battles.map((b: ArenaBattle) => ({
            ...b,
            createdAt: new Date(b.createdAt),
            completedAt: b.completedAt ? new Date(b.completedAt) : undefined,
            contestants: b.contestants.map((c: ArenaContestant) => ({
              ...c,
              startedAt: c.startedAt ? new Date(c.startedAt) : undefined,
              completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
            })),
            viewingStartedAt: b.viewingStartedAt ? new Date(b.viewingStartedAt) : undefined,
          }));
          state.preferences = state.preferences.map((p: ArenaPreference) => ({
            ...p,
            timestamp: new Date(p.timestamp),
          }));
          state.modelRatings = state.modelRatings.map((r: ArenaModelRating) => ({
            ...r,
            updatedAt: new Date(r.updatedAt),
          }));
        }
      },
    }
  )
);

// Selectors
export const selectBattles = (state: ArenaState) => state.battles;
export const selectActiveBattle = (state: ArenaState) =>
  state.activeBattleId ? state.battles.find((b) => b.id === state.activeBattleId) : undefined;
export const selectSettings = (state: ArenaState) => state.settings;
export const selectModelRatings = (state: ArenaState) => state.modelRatings;
