/**
 * Scheduler Store
 * Zustand store for managing scheduler state in the UI
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ScheduledTask,
  TaskExecution,
  CreateScheduledTaskInput,
  UpdateScheduledTaskInput,
  TaskFilter,
  TaskStatistics,
  ScheduledTaskStatus,
} from '@/types/scheduler';
import { getTaskScheduler } from '@/lib/scheduler/task-scheduler';
import { schedulerDb } from '@/lib/scheduler/scheduler-db';
import { loggers } from '@/lib/logger';

const log = loggers.store;

// Scheduler system status
export type SchedulerStatus = 'idle' | 'running' | 'stopped';

interface SchedulerState {
  // Data
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  recentExecutions: TaskExecution[];
  upcomingTasks: ScheduledTask[];
  statistics: TaskStatistics | null;
  
  // UI State
  selectedTaskId: string | null;
  filter: TaskFilter;
  isLoading: boolean;
  error: string | null;
  
  // System State
  schedulerStatus: SchedulerStatus;
  
  // Settings
  isInitialized: boolean;
  autoRefreshInterval: number; // in seconds, 0 = disabled
}

interface SchedulerActions {
  // Task CRUD
  createTask: (input: CreateScheduledTaskInput) => Promise<ScheduledTask | null>;
  updateTask: (taskId: string, input: UpdateScheduledTaskInput) => Promise<ScheduledTask | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  
  // Task Actions
  pauseTask: (taskId: string) => Promise<boolean>;
  resumeTask: (taskId: string) => Promise<boolean>;
  runTaskNow: (taskId: string) => Promise<TaskExecution | null>;
  
  // Data Loading
  loadTasks: () => Promise<void>;
  loadTaskExecutions: (taskId: string) => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadRecentExecutions: (limit?: number) => Promise<void>;
  loadUpcomingTasks: (limit?: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Maintenance
  cleanupOldExecutions: (maxAgeDays?: number) => Promise<number>;
  
  // System Status
  setSchedulerStatus: (status: SchedulerStatus) => void;
  
  // UI Actions
  selectTask: (taskId: string | null) => void;
  setTasks: (tasks: ScheduledTask[]) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  clearFilter: () => void;
  clearSelection: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Initialization
  initialize: () => Promise<void>;
  
  // Reset
  reset: () => void;
}

type SchedulerStore = SchedulerState & SchedulerActions;

const initialState: SchedulerState = {
  tasks: [],
  executions: [],
  recentExecutions: [],
  upcomingTasks: [],
  statistics: null,
  selectedTaskId: null,
  filter: {},
  isLoading: false,
  error: null,
  schedulerStatus: 'idle',
  isInitialized: false,
  autoRefreshInterval: 60,
};

export const useSchedulerStore = create<SchedulerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== Task CRUD ==========

      createTask: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const scheduler = getTaskScheduler();
          const task = await scheduler.createTask(input);
          
          // Refresh tasks list
          await get().loadTasks();
          
          return task;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
          set({ error: errorMessage });
          log.error('SchedulerStore: Create task failed', error as Error);
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      updateTask: async (taskId, input) => {
        set({ isLoading: true, error: null });
        try {
          const scheduler = getTaskScheduler();
          const task = await scheduler.updateTask(taskId, input);
          
          if (task) {
            // Update local state
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
            }));
          }
          
          return task;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
          set({ error: errorMessage });
          log.error('SchedulerStore: Update task failed', error as Error);
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteTask: async (taskId) => {
        set({ isLoading: true, error: null });
        try {
          const scheduler = getTaskScheduler();
          const deleted = await scheduler.deleteTask(taskId);
          
          if (deleted) {
            set((state) => ({
              tasks: state.tasks.filter((t) => t.id !== taskId),
              selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
            }));
          }
          
          return deleted;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
          set({ error: errorMessage });
          log.error('SchedulerStore: Delete task failed', error as Error);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // ========== Task Actions ==========

      pauseTask: async (taskId) => {
        try {
          const scheduler = getTaskScheduler();
          const success = await scheduler.pauseTask(taskId);
          
          if (success) {
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === taskId ? { ...t, status: 'paused' as ScheduledTaskStatus } : t
              ),
            }));
          }
          
          return success;
        } catch (error) {
          log.error('SchedulerStore: Pause task failed', error as Error);
          return false;
        }
      },

      resumeTask: async (taskId) => {
        try {
          const scheduler = getTaskScheduler();
          const success = await scheduler.resumeTask(taskId);
          
          if (success) {
            // Reload task to get updated nextRunAt
            await get().loadTasks();
          }
          
          return success;
        } catch (error) {
          log.error('SchedulerStore: Resume task failed', error as Error);
          return false;
        }
      },

      runTaskNow: async (taskId) => {
        set({ isLoading: true, error: null });
        try {
          const scheduler = getTaskScheduler();
          const execution = await scheduler.runTaskNow(taskId);
          
          if (execution) {
            // Add execution to list if viewing this task
            const { selectedTaskId } = get();
            if (selectedTaskId === taskId) {
              set((state) => ({
                executions: [execution, ...state.executions],
              }));
            }
            
            // Refresh task to get updated stats
            await get().loadTasks();
          }
          
          return execution;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to run task';
          set({ error: errorMessage });
          log.error('SchedulerStore: Run task failed', error as Error);
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      // ========== Data Loading ==========

      loadTasks: async () => {
        try {
          const { filter } = get();
          let tasks: ScheduledTask[];
          
          if (Object.keys(filter).length > 0) {
            tasks = await schedulerDb.getFilteredTasks(filter);
          } else {
            tasks = await schedulerDb.getAllTasks();
          }
          
          // Sort by next run time
          tasks.sort((a, b) => {
            if (!a.nextRunAt) return 1;
            if (!b.nextRunAt) return -1;
            return a.nextRunAt.getTime() - b.nextRunAt.getTime();
          });
          
          set({ tasks });
        } catch (error) {
          log.error('SchedulerStore: Load tasks failed', error as Error);
          set({ error: 'Failed to load tasks' });
        }
      },

      loadTaskExecutions: async (taskId) => {
        try {
          const executions = await schedulerDb.getTaskExecutions(taskId, 50);
          set({ executions });
        } catch (error) {
          log.error('SchedulerStore: Load executions failed', error as Error);
        }
      },

      loadStatistics: async () => {
        try {
          const statistics = await schedulerDb.getStatistics();
          set({ statistics });
        } catch (error) {
          log.error('SchedulerStore: Load statistics failed', error as Error);
        }
      },

      loadRecentExecutions: async (limit = 50) => {
        try {
          const recentExecutions = await schedulerDb.getRecentExecutions(limit);
          set({ recentExecutions });
        } catch (error) {
          log.error('SchedulerStore: Load recent executions failed', error as Error);
        }
      },

      loadUpcomingTasks: async (limit = 10) => {
        try {
          const upcomingTasks = await schedulerDb.getUpcomingTasks(limit);
          set({ upcomingTasks });
        } catch (error) {
          log.error('SchedulerStore: Load upcoming tasks failed', error as Error);
        }
      },

      refreshAll: async () => {
        set({ isLoading: true });
        try {
          await Promise.all([
            get().loadTasks(),
            get().loadStatistics(),
          ]);
          
          const { selectedTaskId } = get();
          if (selectedTaskId) {
            await get().loadTaskExecutions(selectedTaskId);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      // ========== UI Actions ==========

      selectTask: (taskId) => {
        set({ selectedTaskId: taskId, executions: [] });
        if (taskId) {
          get().loadTaskExecutions(taskId);
        }
      },

      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }));
        get().loadTasks();
      },

      clearFilter: () => {
        set({ filter: {} });
        get().loadTasks();
      },

      setTasks: (tasks) => {
        set({ tasks });
      },

      clearSelection: () => {
        set({ selectedTaskId: null, executions: [] });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // ========== Maintenance ==========

      cleanupOldExecutions: async (maxAgeDays = 30) => {
        try {
          const deleted = await schedulerDb.cleanupOldExecutions(maxAgeDays);
          if (deleted > 0) {
            log.info(`SchedulerStore: Cleaned up ${deleted} old executions`);
            // Refresh recent executions after cleanup
            await get().loadRecentExecutions();
          }
          return deleted;
        } catch (error) {
          log.error('SchedulerStore: Cleanup old executions failed', error as Error);
          return 0;
        }
      },

      // ========== System Status ==========

      setSchedulerStatus: (status) => {
        set({ schedulerStatus: status });
      },

      // ========== Initialization ==========

      initialize: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true });
        try {
          // Initialize scheduler system
          const { initSchedulerSystem } = await import('@/lib/scheduler');
          await initSchedulerSystem();
          
          // Load initial data
          await get().refreshAll();
          
          set({ isInitialized: true });
        } catch (error) {
          log.error('SchedulerStore: Initialization failed', error as Error);
          set({ error: 'Failed to initialize scheduler' });
        } finally {
          set({ isLoading: false });
        }
      },

      // ========== Reset ==========

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-scheduler',
      partialize: (state) => ({
        autoRefreshInterval: state.autoRefreshInterval,
        filter: state.filter,
      }),
    }
  )
);

// ========== Selectors ==========

export const selectTasks = (state: SchedulerStore) => state.tasks;
export const selectExecutions = (state: SchedulerStore) => state.executions;
export const selectStatistics = (state: SchedulerStore) => state.statistics;
export const selectSelectedTaskId = (state: SchedulerStore) => state.selectedTaskId;
export const selectFilter = (state: SchedulerStore) => state.filter;
export const selectIsLoading = (state: SchedulerStore) => state.isLoading;
export const selectError = (state: SchedulerStore) => state.error;
export const selectIsInitialized = (state: SchedulerStore) => state.isInitialized;

export const selectSelectedTask = (state: SchedulerStore): ScheduledTask | undefined =>
  state.tasks.find((t) => t.id === state.selectedTaskId);

export const selectActiveTasks = (state: SchedulerStore): ScheduledTask[] =>
  state.tasks.filter((t) => t.status === 'active');

export const selectPausedTasks = (state: SchedulerStore): ScheduledTask[] =>
  state.tasks.filter((t) => t.status === 'paused');

export const selectUpcomingTasks = (state: SchedulerStore): ScheduledTask[] => {
  const now = new Date();
  return state.tasks
    .filter((t) => t.status === 'active' && t.nextRunAt && t.nextRunAt > now)
    .sort((a, b) => (a.nextRunAt?.getTime() || 0) - (b.nextRunAt?.getTime() || 0))
    .slice(0, 5);
};

export const selectRecentExecutions = (state: SchedulerStore): TaskExecution[] =>
  state.recentExecutions;

export const selectSchedulerStatus = (state: SchedulerStore): SchedulerStatus =>
  state.schedulerStatus;

export default useSchedulerStore;
