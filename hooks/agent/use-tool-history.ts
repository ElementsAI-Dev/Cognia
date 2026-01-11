/**
 * useToolHistory - React hook for tool call history management
 * 
 * Provides convenient access to tool history store with computed values,
 * memoized callbacks, and integration with the history optimizer.
 */

import { useCallback, useMemo } from 'react';
import { useToolHistoryStore, createToolId } from '@/stores';
import {
  getPromptSuggestions,
  getToolRecommendations,
  findSimilarSuccessfulCalls,
  scorePromptQuality,
  analyzeUsagePatterns,
} from '@/lib/ai/tools/history-optimizer';
import type {
  ToolCallRecord,
  ToolUsageStats,
  ToolType,
  ToolCallResultStatus,
  ToolHistoryFilter,
  PromptOptimizationSuggestion,
  ToolRecommendation,
} from '@/types/agent/tool-history';

export interface UseToolHistoryOptions {
  /** Limit for recent tools */
  recentLimit?: number;
  /** Limit for frequent tools */
  frequentLimit?: number;
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
}

export interface UseToolHistoryReturn {
  // State
  /** All history records */
  history: ToolCallRecord[];
  /** All usage stats */
  usageStats: Record<string, ToolUsageStats>;
  /** Is history enabled */
  isEnabled: boolean;
  /** History count */
  historyCount: number;

  // Computed
  /** Recently used tools */
  recentTools: ToolUsageStats[];
  /** Frequently used tools */
  frequentTools: ToolUsageStats[];
  /** Favorite tools */
  favorites: ToolUsageStats[];
  /** Pinned tools */
  pinnedTools: ToolUsageStats[];

  // Actions
  /** Record a new tool call */
  recordCall: (
    toolType: ToolType,
    toolName: string,
    prompt: string,
    options?: {
      serverId?: string;
      serverName?: string;
      skillId?: string;
      args?: Record<string, unknown>;
      sessionId?: string;
      chatId?: string;
    }
  ) => ToolCallRecord;
  
  /** Update a call's result */
  updateCallResult: (
    callId: string,
    result: ToolCallResultStatus,
    options?: {
      output?: string;
      errorMessage?: string;
      duration?: number;
    }
  ) => void;

  /** Toggle favorite status */
  toggleFavorite: (
    toolId: string,
    toolType: ToolType,
    toolName: string,
    serverId?: string,
    serverName?: string
  ) => void;

  /** Toggle pinned status */
  togglePinned: (toolId: string) => void;

  /** Delete a history record */
  deleteRecord: (id: string) => void;

  /** Clear all history */
  clearHistory: () => void;

  /** Get history with filters */
  getHistory: (filter?: ToolHistoryFilter) => ToolCallRecord[];

  /** Get stats for a specific tool */
  getStats: (toolId: string) => ToolUsageStats | undefined;

  // Optimization
  /** Get prompt suggestions for a tool */
  getSuggestions: (toolId: string, currentInput?: string) => PromptOptimizationSuggestion[];

  /** Get tool recommendations based on input */
  getRecommendations: (currentInput: string) => ToolRecommendation[];

  /** Score a prompt's quality for a tool */
  scorePrompt: (prompt: string, toolId: string) => {
    score: number;
    factors: Record<string, number>;
    suggestions: string[];
  };

  /** Find similar successful calls */
  findSimilar: (prompt: string, limit?: number) => Array<{
    record: ToolCallRecord;
    similarity: number;
  }>;

  /** Analyze usage patterns for a tool */
  analyzePatterns: (toolId: string) => ReturnType<typeof analyzeUsagePatterns>;

  // Helpers
  /** Create a tool ID */
  createId: typeof createToolId;

  /** Check if a tool is favorited */
  isFavorite: (toolId: string) => boolean;

  /** Check if a tool is pinned */
  isPinned: (toolId: string) => boolean;

  /** Get call count for a tool */
  getCallCount: (toolId: string) => number;

  /** Get success rate for a tool */
  getSuccessRate: (toolId: string) => number;
}

export function useToolHistory(
  options: UseToolHistoryOptions = {}
): UseToolHistoryReturn {
  const { recentLimit = 10, frequentLimit = 10 } = options;

  // Store selectors
  const history = useToolHistoryStore((state) => state.history);
  const usageStats = useToolHistoryStore((state) => state.usageStats);
  const settings = useToolHistoryStore((state) => state.settings);

  // Store actions
  const storeRecordCall = useToolHistoryStore((state) => state.recordToolCall);
  const storeUpdateResult = useToolHistoryStore((state) => state.updateToolCallResultStatus);
  const storeToggleFavorite = useToolHistoryStore((state) => state.toggleFavorite);
  const storeTogglePinned = useToolHistoryStore((state) => state.togglePinned);
  const storeDeleteRecord = useToolHistoryStore((state) => state.deleteRecord);
  const storeClearHistory = useToolHistoryStore((state) => state.clearHistory);
  const storeGetHistory = useToolHistoryStore((state) => state.getHistory);
  const storeGetStats = useToolHistoryStore((state) => state.getUsageStats);
  const storeGetRecentTools = useToolHistoryStore((state) => state.getRecentTools);
  const storeGetFrequentTools = useToolHistoryStore((state) => state.getFrequentTools);
  const storeGetFavorites = useToolHistoryStore((state) => state.getFavorites);
  const storeGetPinnedTools = useToolHistoryStore((state) => state.getPinnedTools);

  // Computed values
  const recentTools = useMemo(
    () => storeGetRecentTools(recentLimit),
    [storeGetRecentTools, recentLimit]
  );

  const frequentTools = useMemo(
    () => storeGetFrequentTools(frequentLimit),
    [storeGetFrequentTools, frequentLimit]
  );

  const favorites = useMemo(
    () => storeGetFavorites(),
    [storeGetFavorites]
  );

  const pinnedTools = useMemo(
    () => storeGetPinnedTools(),
    [storeGetPinnedTools]
  );

  // Actions
  const recordCall = useCallback(
    (
      toolType: ToolType,
      toolName: string,
      prompt: string,
      callOptions?: {
        serverId?: string;
        serverName?: string;
        skillId?: string;
        args?: Record<string, unknown>;
        sessionId?: string;
        chatId?: string;
      }
    ): ToolCallRecord => {
      const toolId = toolType === 'mcp' && callOptions?.serverId
        ? createToolId('mcp', toolName, callOptions.serverId)
        : createToolId(toolType, toolName);

      return storeRecordCall({
        toolId,
        toolType,
        toolName,
        prompt,
        result: 'pending',
        serverId: callOptions?.serverId,
        serverName: callOptions?.serverName,
        skillId: callOptions?.skillId,
        args: callOptions?.args,
        sessionId: callOptions?.sessionId,
        chatId: callOptions?.chatId,
      });
    },
    [storeRecordCall]
  );

  const updateCallResult = useCallback(
    (
      callId: string,
      result: ToolCallResultStatus,
      resultOptions?: {
        output?: string;
        errorMessage?: string;
        duration?: number;
      }
    ) => {
      storeUpdateResult(
        callId,
        result,
        resultOptions?.output,
        resultOptions?.errorMessage,
        resultOptions?.duration
      );
    },
    [storeUpdateResult]
  );

  // Optimization callbacks
  const getSuggestions = useCallback(
    (toolId: string, currentInput?: string): PromptOptimizationSuggestion[] => {
      const stats = usageStats[toolId];
      return getPromptSuggestions(toolId, currentInput || '', history, stats);
    },
    [history, usageStats]
  );

  const getRecommendations = useCallback(
    (currentInput: string): ToolRecommendation[] => {
      return getToolRecommendations(currentInput, history, usageStats);
    },
    [history, usageStats]
  );

  const scorePrompt = useCallback(
    (prompt: string, toolId: string) => {
      const stats = usageStats[toolId];
      return scorePromptQuality(prompt, toolId, history, stats);
    },
    [history, usageStats]
  );

  const findSimilar = useCallback(
    (prompt: string, limit: number = 5) => {
      return findSimilarSuccessfulCalls(prompt, history, 0.25, limit);
    },
    [history]
  );

  const analyzePatterns = useCallback(
    (toolId: string) => {
      return analyzeUsagePatterns(toolId, history);
    },
    [history]
  );

  // Helper callbacks
  const isFavorite = useCallback(
    (toolId: string): boolean => {
      return usageStats[toolId]?.isFavorite ?? false;
    },
    [usageStats]
  );

  const isPinned = useCallback(
    (toolId: string): boolean => {
      return usageStats[toolId]?.isPinned ?? false;
    },
    [usageStats]
  );

  const getCallCount = useCallback(
    (toolId: string): number => {
      return usageStats[toolId]?.totalCalls ?? 0;
    },
    [usageStats]
  );

  const getSuccessRate = useCallback(
    (toolId: string): number => {
      const stats = usageStats[toolId];
      if (!stats || stats.totalCalls === 0) return 0;
      return stats.successCalls / stats.totalCalls;
    },
    [usageStats]
  );

  return {
    // State
    history,
    usageStats,
    isEnabled: settings.enabled,
    historyCount: history.length,

    // Computed
    recentTools,
    frequentTools,
    favorites,
    pinnedTools,

    // Actions
    recordCall,
    updateCallResult,
    toggleFavorite: storeToggleFavorite,
    togglePinned: storeTogglePinned,
    deleteRecord: storeDeleteRecord,
    clearHistory: storeClearHistory,
    getHistory: storeGetHistory,
    getStats: storeGetStats,

    // Optimization
    getSuggestions,
    getRecommendations,
    scorePrompt,
    findSimilar,
    analyzePatterns,

    // Helpers
    createId: createToolId,
    isFavorite,
    isPinned,
    getCallCount,
    getSuccessRate,
  };
}

export default useToolHistory;
