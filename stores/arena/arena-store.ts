/**
 * Arena Store - manages arena battles, preferences, and model ratings
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
} from '@/types/arena';
import {
  DEFAULT_ARENA_SETTINGS,
  DEFAULT_ELO_RATING,
  ELO_K_FACTOR,
} from '@/types/arena';
import type { ProviderName } from '@/types/provider';
import type { TaskCategory, TaskClassification } from '@/types/provider/auto-router';

/**
 * Get model identifier from provider and model
 */
function getModelId(provider: ProviderName, model: string): string {
  return `${provider}:${model}`;
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
      taskClassification?: TaskClassification;
    }
  ) => ArenaBattle;
  getBattle: (battleId: string) => ArenaBattle | undefined;
  getActiveBattle: () => ArenaBattle | undefined;
  setActiveBattle: (battleId: string | null) => void;
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
        const battle: ArenaBattle = {
          id: nanoid(),
          sessionId: options?.sessionId,
          prompt,
          systemPrompt: options?.systemPrompt,
          mode: options?.mode || get().settings.defaultMode,
          contestants: contestants.map((c) => ({
            id: nanoid(),
            provider: c.provider,
            model: c.model,
            displayName: c.displayName,
            response: '',
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

        const winner = battle.contestants.find((c) => c.id === winnerId);
        if (!winner) return;

        // Find losers (all non-winners)
        const losers = battle.contestants.filter((c) => c.id !== winnerId);

        // Update battle
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

        set((state) => ({
          battles: state.battles.map((b) =>
            b.id === battleId
              ? {
                  ...b,
                  isTie: true,
                  notes,
                  completedAt: new Date(),
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
    }),
    {
      name: 'cognia-arena',
      partialize: (state) => ({
        battles: state.battles,
        preferences: state.preferences,
        modelRatings: state.modelRatings,
        settings: state.settings,
      }),
      onRehydrate: () => (state) => {
        if (state) {
          // Convert date strings back to Date objects
          state.battles = state.battles.map((b) => ({
            ...b,
            createdAt: new Date(b.createdAt),
            completedAt: b.completedAt ? new Date(b.completedAt) : undefined,
            contestants: b.contestants.map((c) => ({
              ...c,
              startedAt: c.startedAt ? new Date(c.startedAt) : undefined,
              completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
            })),
          }));
          state.preferences = state.preferences.map((p) => ({
            ...p,
            timestamp: new Date(p.timestamp),
          }));
          state.modelRatings = state.modelRatings.map((r) => ({
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
