/**
 * useScheduler Hook
 * Main hook for interacting with the scheduler system
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
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
import type {
  CreateScheduledTaskInput,
  UpdateScheduledTaskInput,
  TaskFilter,
} from '@/types/scheduler';

export function useScheduler() {
  const store = useSchedulerStore();
  const initRef = useRef(false);

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

  // Initialize on mount
  useEffect(() => {
    if (!initRef.current && !isInitialized) {
      initRef.current = true;
      store.initialize();
    }
  }, [isInitialized, store]);

  // Auto-refresh
  useEffect(() => {
    if (!isInitialized || store.autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      store.refreshAll();
    }, store.autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isInitialized, store, store.autoRefreshInterval]);

  // Actions
  const createTask = useCallback(
    async (input: CreateScheduledTaskInput) => {
      return store.createTask(input);
    },
    [store]
  );

  const updateTask = useCallback(
    async (taskId: string, input: UpdateScheduledTaskInput) => {
      return store.updateTask(taskId, input);
    },
    [store]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      return store.deleteTask(taskId);
    },
    [store]
  );

  const pauseTask = useCallback(
    async (taskId: string) => {
      return store.pauseTask(taskId);
    },
    [store]
  );

  const resumeTask = useCallback(
    async (taskId: string) => {
      return store.resumeTask(taskId);
    },
    [store]
  );

  const runTaskNow = useCallback(
    async (taskId: string) => {
      return store.runTaskNow(taskId);
    },
    [store]
  );

  const selectTask = useCallback(
    (taskId: string | null) => {
      store.selectTask(taskId);
    },
    [store]
  );

  const setFilter = useCallback(
    (filter: Partial<TaskFilter>) => {
      store.setFilter(filter);
    },
    [store]
  );

  const clearFilter = useCallback(() => {
    store.clearFilter();
  }, [store]);

  const refresh = useCallback(() => {
    store.refreshAll();
  }, [store]);

  const clearError = useCallback(() => {
    store.setError(null);
  }, [store]);

  const loadRecentExecutions = useCallback(
    (limit?: number) => store.loadRecentExecutions(limit),
    [store]
  );

  const loadUpcomingTasks = useCallback(
    (limit?: number) => store.loadUpcomingTasks(limit),
    [store]
  );

  const cleanupOldExecutions = useCallback(
    (maxAgeDays?: number) => store.cleanupOldExecutions(maxAgeDays),
    [store]
  );

  const cancelPluginExecution = useCallback(
    (executionId: string) => store.cancelPluginExecution(executionId),
    [store]
  );

  const getActivePluginCount = useCallback(
    () => store.getActivePluginCount(),
    [store]
  );

  const isPluginExecutionActive = useCallback(
    (executionId: string) => store.isPluginExecutionActive(executionId),
    [store]
  );

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

    // Actions
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
    runTaskNow,
    selectTask,
    setFilter,
    clearFilter,
    refresh,
    clearError,
    loadRecentExecutions,
    loadUpcomingTasks,
    cleanupOldExecutions,
    cancelPluginExecution,
    getActivePluginCount,
    isPluginExecutionActive,
  };
}

export default useScheduler;
