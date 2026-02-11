/**
 * useScheduler Hook
 * Main hook for interacting with the scheduler system
 */

'use client';

import { useEffect, useRef } from 'react';
import {
  useSchedulerStore,
  selectTasks,
  selectExecutions,
  selectStatistics,
  selectSelectedTaskId,
  selectSelectedTask,
  selectActiveTasks,
  selectPausedTasks,
  selectUpcomingTasks,
  selectRecentExecutions,
  selectSchedulerStatus,
  selectFilter,
  selectIsLoading,
  selectError,
  selectIsInitialized,
} from '@/stores/scheduler';

export function useScheduler() {
  const store = useSchedulerStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Selectors
  const tasks = useSchedulerStore(selectTasks);
  const executions = useSchedulerStore(selectExecutions);
  const statistics = useSchedulerStore(selectStatistics);
  const selectedTaskId = useSchedulerStore(selectSelectedTaskId);
  const selectedTask = useSchedulerStore(selectSelectedTask);
  const activeTasks = useSchedulerStore(selectActiveTasks);
  const pausedTasks = useSchedulerStore(selectPausedTasks);
  const upcomingTasks = useSchedulerStore(selectUpcomingTasks);
  const recentExecutions = useSchedulerStore(selectRecentExecutions);
  const schedulerStatus = useSchedulerStore(selectSchedulerStatus);
  const filter = useSchedulerStore(selectFilter);
  const isLoading = useSchedulerStore(selectIsLoading);
  const error = useSchedulerStore(selectError);
  const isInitialized = useSchedulerStore(selectIsInitialized);

  // Initialize on mount — store handles deduplication of concurrent calls
  useEffect(() => {
    if (!isInitialized) {
      store.initialize();
    }
  }, [isInitialized, store]);

  // Auto-refresh with visibility-aware polling (PERF-3)
  useEffect(() => {
    if (!isInitialized || store.autoRefreshInterval <= 0) return;

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        store.refreshAll();
      }, store.autoRefreshInterval * 1000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh immediately when tab becomes visible, then restart polling
        store.refreshAll();
        startPolling();
      }
    };

    // Start polling only if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized, store, store.autoRefreshInterval]);

  return {
    // State
    tasks,
    executions,
    statistics,
    selectedTaskId,
    selectedTask,
    activeTasks,
    pausedTasks,
    upcomingTasks,
    recentExecutions,
    schedulerStatus,
    filter,
    isLoading,
    error,
    isInitialized,

    // Actions — store methods are stable references, no useCallback needed
    createTask: store.createTask,
    updateTask: store.updateTask,
    deleteTask: store.deleteTask,
    pauseTask: store.pauseTask,
    resumeTask: store.resumeTask,
    runTaskNow: store.runTaskNow,
    selectTask: store.selectTask,
    setFilter: store.setFilter,
    clearFilter: store.clearFilter,
    refresh: store.refreshAll,
    clearError: store.clearError,
    loadRecentExecutions: store.loadRecentExecutions,
    loadUpcomingTasks: store.loadUpcomingTasks,
    cleanupOldExecutions: store.cleanupOldExecutions,
    cancelPluginExecution: store.cancelPluginExecution,
    getActivePluginCount: store.getActivePluginCount,
    isPluginExecutionActive: store.isPluginExecutionActive,

    // Bulk Operations
    bulkPause: store.bulkPause,
    bulkResume: store.bulkResume,
    bulkDelete: store.bulkDelete,
  };
}

export default useScheduler;
