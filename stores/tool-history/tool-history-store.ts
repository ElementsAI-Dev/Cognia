/**
 * Tool History Store - Zustand state management for tool/skill call history
 * 
 * Tracks tool usage, provides analytics, and enables history-based optimization
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  ToolCallRecord,
  ToolUsageStats,
  ToolType,
  ToolCallResultStatus,
  ToolHistoryFilter,
  ToolHistorySettings,
  FrequentPrompt,
  PromptOptimizationSuggestion,
  ToolRecommendation,
  ToolSortOption,
} from '@/types/agent/tool-history';
import {
  DEFAULT_TOOL_HISTORY_SETTINGS,
  createToolId,
  truncatePrompt,
} from '@/types/agent/tool-history';

interface ToolHistoryState {
  // State
  history: ToolCallRecord[];
  usageStats: Record<string, ToolUsageStats>;
  settings: ToolHistorySettings;
  isLoading: boolean;
  error: string | null;

  // Record Management
  recordToolCall: (record: Omit<ToolCallRecord, 'id' | 'calledAt'>) => ToolCallRecord;
  updateToolCallResultStatus: (
    callId: string,
    result: ToolCallResultStatus,
    output?: string,
    errorMessage?: string,
    duration?: number
  ) => void;
  deleteRecord: (id: string) => void;
  clearHistory: () => void;
  cleanupOldRecords: () => void;

  // Query
  getHistory: (filter?: ToolHistoryFilter) => ToolCallRecord[];
  getToolHistory: (toolId: string, limit?: number) => ToolCallRecord[];
  getRecentCalls: (limit?: number) => ToolCallRecord[];
  getUsageStats: (toolId: string) => ToolUsageStats | undefined;
  getAllStats: () => ToolUsageStats[];

  // Favorites & Pinning
  toggleFavorite: (toolId: string, toolType: ToolType, toolName: string, serverId?: string, serverName?: string) => void;
  togglePinned: (toolId: string) => void;
  setDisplayOrder: (toolId: string, order: number) => void;
  getFavorites: () => ToolUsageStats[];
  getPinnedTools: () => ToolUsageStats[];

  // Recommendations & Suggestions
  getRecentTools: (limit?: number) => ToolUsageStats[];
  getFrequentTools: (limit?: number) => ToolUsageStats[];
  getSortedTools: (sortOption: ToolSortOption) => ToolUsageStats[];
  getPromptSuggestions: (toolId: string, currentInput?: string) => PromptOptimizationSuggestion[];
  getToolRecommendations: (currentInput: string, limit?: number) => ToolRecommendation[];

  // Settings
  updateSettings: (updates: Partial<ToolHistorySettings>) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Calculate success rate from stats
 */
function calculateSuccessRate(stats: ToolUsageStats): number {
  if (stats.totalCalls === 0) return 0;
  return stats.successCalls / stats.totalCalls;
}

/**
 * Extract frequent prompts from history
 */
function extractFrequentPrompts(
  history: ToolCallRecord[],
  limit: number = 5
): FrequentPrompt[] {
  const promptMap = new Map<string, { count: number; lastUsedAt: Date; successCount: number }>();

  for (const record of history) {
    const promptKey = truncatePrompt(record.prompt, 100);
    const existing = promptMap.get(promptKey);
    
    if (existing) {
      existing.count++;
      if (record.calledAt > existing.lastUsedAt) {
        existing.lastUsedAt = record.calledAt;
      }
      if (record.result === 'success') {
        existing.successCount++;
      }
    } else {
      promptMap.set(promptKey, {
        count: 1,
        lastUsedAt: record.calledAt,
        successCount: record.result === 'success' ? 1 : 0,
      });
    }
  }

  return Array.from(promptMap.entries())
    .map(([prompt, data]) => ({
      prompt,
      count: data.count,
      lastUsedAt: data.lastUsedAt,
      successRate: data.count > 0 ? data.successCount / data.count : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Simple text similarity (Jaccard index on words)
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

const initialState = {
  history: [] as ToolCallRecord[],
  usageStats: {} as Record<string, ToolUsageStats>,
  settings: { ...DEFAULT_TOOL_HISTORY_SETTINGS },
  isLoading: false,
  error: null as string | null,
};

export const useToolHistoryStore = create<ToolHistoryState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Record a new tool call
      recordToolCall: (record) => {
        const { settings } = get();
        if (!settings.enabled) {
          return { ...record, id: nanoid(), calledAt: new Date() } as ToolCallRecord;
        }

        const newRecord: ToolCallRecord = {
          ...record,
          id: nanoid(),
          calledAt: new Date(),
          promptSummary: truncatePrompt(record.prompt),
        };

        set((state) => {
          // Add to history
          const newHistory = [newRecord, ...state.history];
          
          // Trim if exceeds max
          if (newHistory.length > settings.maxRecords) {
            newHistory.splice(settings.maxRecords);
          }

          // Update usage stats
          const toolId = record.toolId;
          const existingStats = state.usageStats[toolId];
          
          const updatedStats: ToolUsageStats = existingStats
            ? {
                ...existingStats,
                totalCalls: existingStats.totalCalls + 1,
                lastUsedAt: newRecord.calledAt,
              }
            : {
                toolId,
                toolType: record.toolType,
                toolName: record.toolName,
                serverId: record.serverId,
                serverName: record.serverName,
                totalCalls: 1,
                successCalls: 0,
                errorCalls: 0,
                lastUsedAt: newRecord.calledAt,
                avgDuration: 0,
                frequentPrompts: [],
                isFavorite: false,
                isPinned: false,
              };

          return {
            history: newHistory,
            usageStats: { ...state.usageStats, [toolId]: updatedStats },
          };
        });

        return newRecord;
      },

      // Update a call's result
      updateToolCallResultStatus: (callId, result, output, errorMessage, duration) => {
        set((state) => {
          const recordIndex = state.history.findIndex(r => r.id === callId);
          if (recordIndex === -1) return state;

          const record = state.history[recordIndex];
          const updatedRecord: ToolCallRecord = {
            ...record,
            result,
            output: output ? truncatePrompt(output, 500) : undefined,
            errorMessage,
            duration,
          };

          const newHistory = [...state.history];
          newHistory[recordIndex] = updatedRecord;

          // Update stats
          const toolId = record.toolId;
          const stats = state.usageStats[toolId];
          if (!stats) return { history: newHistory };

          const toolHistory = newHistory.filter(r => r.toolId === toolId);
          const successCount = toolHistory.filter(r => r.result === 'success').length;
          const errorCount = toolHistory.filter(r => r.result === 'error').length;
          const durations = toolHistory.filter(r => r.duration).map(r => r.duration!);
          const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

          const updatedStats: ToolUsageStats = {
            ...stats,
            successCalls: successCount,
            errorCalls: errorCount,
            avgDuration,
            frequentPrompts: extractFrequentPrompts(toolHistory),
          };

          return {
            history: newHistory,
            usageStats: { ...state.usageStats, [toolId]: updatedStats },
          };
        });
      },

      // Delete a record
      deleteRecord: (id) => {
        set((state) => ({
          history: state.history.filter(r => r.id !== id),
        }));
      },

      // Clear all history
      clearHistory: () => {
        set({ history: [] });
      },

      // Cleanup old records based on retention settings
      cleanupOldRecords: () => {
        const { settings } = get();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);

        set((state) => ({
          history: state.history.filter(r => r.calledAt >= cutoffDate),
        }));
      },

      // Query history with filters
      getHistory: (filter) => {
        let records = [...get().history];

        if (filter) {
          if (filter.toolType) {
            records = records.filter(r => r.toolType === filter.toolType);
          }
          if (filter.toolId) {
            records = records.filter(r => r.toolId === filter.toolId);
          }
          if (filter.serverId) {
            records = records.filter(r => r.serverId === filter.serverId);
          }
          if (filter.result) {
            records = records.filter(r => r.result === filter.result);
          }
          if (filter.fromDate) {
            records = records.filter(r => r.calledAt >= filter.fromDate!);
          }
          if (filter.toDate) {
            records = records.filter(r => r.calledAt <= filter.toDate!);
          }
          if (filter.sessionId) {
            records = records.filter(r => r.sessionId === filter.sessionId);
          }
          if (filter.chatId) {
            records = records.filter(r => r.chatId === filter.chatId);
          }
          if (filter.searchQuery) {
            const query = filter.searchQuery.toLowerCase();
            records = records.filter(r =>
              r.prompt.toLowerCase().includes(query) ||
              r.toolName.toLowerCase().includes(query)
            );
          }
          if (filter.offset) {
            records = records.slice(filter.offset);
          }
          if (filter.limit) {
            records = records.slice(0, filter.limit);
          }
        }

        return records;
      },

      // Get history for a specific tool
      getToolHistory: (toolId, limit = 50) => {
        return get().history
          .filter(r => r.toolId === toolId)
          .slice(0, limit);
      },

      // Get recent calls
      getRecentCalls: (limit = 20) => {
        return get().history.slice(0, limit);
      },

      // Get usage stats for a tool
      getUsageStats: (toolId) => {
        return get().usageStats[toolId];
      },

      // Get all stats
      getAllStats: () => {
        return Object.values(get().usageStats);
      },

      // Toggle favorite
      toggleFavorite: (toolId, toolType, toolName, serverId, serverName) => {
        set((state) => {
          const existing = state.usageStats[toolId];
          const updated: ToolUsageStats = existing
            ? { ...existing, isFavorite: !existing.isFavorite }
            : {
                toolId,
                toolType,
                toolName,
                serverId,
                serverName,
                totalCalls: 0,
                successCalls: 0,
                errorCalls: 0,
                avgDuration: 0,
                frequentPrompts: [],
                isFavorite: true,
                isPinned: false,
              };

          return {
            usageStats: { ...state.usageStats, [toolId]: updated },
          };
        });
      },

      // Toggle pinned
      togglePinned: (toolId) => {
        set((state) => {
          const existing = state.usageStats[toolId];
          if (!existing) return state;

          return {
            usageStats: {
              ...state.usageStats,
              [toolId]: { ...existing, isPinned: !existing.isPinned },
            },
          };
        });
      },

      // Set display order
      setDisplayOrder: (toolId, order) => {
        set((state) => {
          const existing = state.usageStats[toolId];
          if (!existing) return state;

          return {
            usageStats: {
              ...state.usageStats,
              [toolId]: { ...existing, displayOrder: order },
            },
          };
        });
      },

      // Get favorites
      getFavorites: () => {
        return Object.values(get().usageStats).filter(s => s.isFavorite);
      },

      // Get pinned tools
      getPinnedTools: () => {
        return Object.values(get().usageStats)
          .filter(s => s.isPinned)
          .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      },

      // Get recently used tools
      getRecentTools: (limit = 10) => {
        return Object.values(get().usageStats)
          .filter(s => s.lastUsedAt)
          .sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0))
          .slice(0, limit);
      },

      // Get frequently used tools
      getFrequentTools: (limit = 10) => {
        return Object.values(get().usageStats)
          .sort((a, b) => b.totalCalls - a.totalCalls)
          .slice(0, limit);
      },

      // Get sorted tools
      getSortedTools: (sortOption) => {
        const stats = Object.values(get().usageStats);

        switch (sortOption) {
          case 'recent':
            return stats.sort((a, b) => 
              (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0)
            );
          case 'frequent':
            return stats.sort((a, b) => b.totalCalls - a.totalCalls);
          case 'alphabetical':
            return stats.sort((a, b) => a.toolName.localeCompare(b.toolName));
          case 'success_rate':
            return stats.sort((a, b) => 
              calculateSuccessRate(b) - calculateSuccessRate(a)
            );
          case 'custom':
            return stats.sort((a, b) => {
              // Pinned first
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              // Then favorites
              if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
              // Then by display order
              if (a.displayOrder !== b.displayOrder) {
                return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
              }
              // Finally by frequency
              return b.totalCalls - a.totalCalls;
            });
          default:
            return stats;
        }
      },

      // Get prompt suggestions for a tool
      getPromptSuggestions: (toolId, currentInput) => {
        const { history, usageStats } = get();
        const suggestions: PromptOptimizationSuggestion[] = [];

        // Get tool history
        const toolHistory = history.filter(r => r.toolId === toolId);
        if (toolHistory.length === 0) return [];

        // Get successful calls
        const successfulCalls = toolHistory.filter(r => r.result === 'success');

        // Suggestion 1: Most frequent successful prompts
        const stats = usageStats[toolId];
        if (stats?.frequentPrompts) {
          for (const fp of stats.frequentPrompts.slice(0, 3)) {
            if (fp.successRate >= 0.7) {
              suggestions.push({
                toolId,
                suggestedPrompt: fp.prompt,
                confidence: Math.min(fp.successRate, 0.95),
                basedOnCalls: fp.count,
                successRate: fp.successRate,
                reason: 'frequent',
              });
            }
          }
        }

        // Suggestion 2: Similar prompts to current input
        if (currentInput && currentInput.length > 10) {
          for (const record of successfulCalls.slice(0, 20)) {
            const similarity = textSimilarity(currentInput, record.prompt);
            if (similarity >= 0.3) {
              suggestions.push({
                toolId,
                suggestedPrompt: record.prompt,
                confidence: similarity,
                basedOnCalls: 1,
                successRate: 1,
                reason: 'similar',
              });
            }
          }
        }

        // Suggestion 3: Most recent successful prompt
        if (successfulCalls.length > 0) {
          const recent = successfulCalls[0];
          suggestions.push({
            toolId,
            suggestedPrompt: recent.prompt,
            confidence: 0.6,
            basedOnCalls: 1,
            successRate: 1,
            reason: 'recent',
          });
        }

        // Deduplicate and sort by confidence
        const seen = new Set<string>();
        return suggestions
          .filter(s => {
            const key = s.suggestedPrompt.slice(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);
      },

      // Get tool recommendations based on current input
      getToolRecommendations: (currentInput, limit = 5) => {
        const { history, usageStats } = get();
        const recommendations: ToolRecommendation[] = [];

        if (!currentInput || currentInput.length < 5) {
          // Return most frequent tools if no input
          return get().getFrequentTools(limit).map(s => ({
            toolId: s.toolId,
            toolType: s.toolType,
            toolName: s.toolName,
            serverId: s.serverId,
            serverName: s.serverName,
            score: 0.5,
            reason: 'frequent' as const,
          }));
        }

        // Find tools with similar prompts
        const toolScores = new Map<string, { score: number; samplePrompt?: string }>();

        for (const record of history.slice(0, 100)) {
          const similarity = textSimilarity(currentInput, record.prompt);
          if (similarity >= 0.2) {
            const existing = toolScores.get(record.toolId);
            if (!existing || existing.score < similarity) {
              toolScores.set(record.toolId, {
                score: similarity,
                samplePrompt: record.prompt,
              });
            }
          }
        }

        // Build recommendations
        for (const [toolId, data] of toolScores.entries()) {
          const stats = usageStats[toolId];
          if (stats) {
            recommendations.push({
              toolId,
              toolType: stats.toolType,
              toolName: stats.toolName,
              serverId: stats.serverId,
              serverName: stats.serverName,
              score: data.score,
              reason: 'similar_prompt',
              samplePrompt: data.samplePrompt,
            });
          }
        }

        return recommendations
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      },

      // Update settings
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'cognia-tool-history-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        history: state.history,
        usageStats: state.usageStats,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects
        if (state) {
          state.history = state.history.map(r => ({
            ...r,
            calledAt: new Date(r.calledAt),
          }));
          
          for (const stats of Object.values(state.usageStats)) {
            if (stats.lastUsedAt) {
              stats.lastUsedAt = new Date(stats.lastUsedAt);
            }
            for (const fp of stats.frequentPrompts) {
              fp.lastUsedAt = new Date(fp.lastUsedAt);
            }
          }
        }
      },
    }
  )
);

// Selectors
export const selectHistory = (state: ToolHistoryState) => state.history;
export const selectUsageStats = (state: ToolHistoryState) => state.usageStats;
export const selectSettings = (state: ToolHistoryState) => state.settings;
export const selectIsLoading = (state: ToolHistoryState) => state.isLoading;
export const selectError = (state: ToolHistoryState) => state.error;

// Utility: Create tool ID helper (re-export)
export { createToolId };
