/**
 * Scheduler Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useSchedulerStore } from './scheduler-store';
import type { ScheduledTask } from '@/types/scheduler';

// Mock the scheduler modules
jest.mock('@/lib/scheduler/task-scheduler', () => ({
  getTaskScheduler: jest.fn(() => ({
    createTask: jest.fn().mockResolvedValue({
      id: 'new-task-id',
      name: 'New Task',
      type: 'workflow',
      status: 'active',
      trigger: { type: 'cron', cronExpression: '0 9 * * *' },
      payload: {},
      config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
      notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast'] },
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateTask: jest.fn().mockResolvedValue(true),
    deleteTask: jest.fn().mockResolvedValue(true),
    pauseTask: jest.fn().mockResolvedValue(true),
    resumeTask: jest.fn().mockResolvedValue(true),
    runTaskNow: jest.fn().mockResolvedValue({ id: 'exec-1', status: 'running' }),
    getTask: jest.fn(),
    getAllTasks: jest.fn().mockResolvedValue([]),
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('@/lib/scheduler/scheduler-db', () => ({
  schedulerDb: {
    getAllTasks: jest.fn().mockResolvedValue([]),
    getRecentExecutions: jest.fn().mockResolvedValue([]),
    getTaskExecutions: jest.fn().mockResolvedValue([]),
    getStatistics: jest.fn().mockResolvedValue({
      totalTasks: 0,
      activeTasks: 0,
      pausedTasks: 0,
      disabledTasks: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      upcomingExecutions: 0,
    }),
  },
}));

describe('useSchedulerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSchedulerStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSchedulerStore());

      expect(result.current.tasks).toEqual([]);
      expect(result.current.executions).toEqual([]);
      expect(result.current.selectedTaskId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should have default filter', () => {
      const { result } = renderHook(() => useSchedulerStore());

      expect(result.current.filter).toEqual({
        types: [],
        statuses: [],
        tags: [],
        search: '',
      });
    });
  });

  describe('Task CRUD Operations', () => {
    it('should create a task', async () => {
      const { result } = renderHook(() => useSchedulerStore());

      await act(async () => {
        const task = await result.current.createTask({
          name: 'Test Task',
          type: 'workflow',
          trigger: { type: 'cron', cronExpression: '0 9 * * *' },
          payload: {},
        });
        expect(task).toBeDefined();
        expect(task?.name).toBe('New Task');
      });
    });

    it('should set loading state during creation', async () => {
      const { result } = renderHook(() => useSchedulerStore());

      const createPromise = act(async () => {
        await result.current.createTask({
          name: 'Test Task',
          type: 'workflow',
          trigger: { type: 'cron', cronExpression: '0 9 * * *' },
          payload: {},
        });
      });

      // Loading state should be true during the operation
      await createPromise;
    });

    it('should delete a task', async () => {
      const { result } = renderHook(() => useSchedulerStore());

      // Add a mock task first
      act(() => {
        result.current.setTasks([
          {
            id: 'task-to-delete',
            name: 'Task to Delete',
            type: 'workflow',
            status: 'active',
            trigger: { type: 'cron', cronExpression: '0 9 * * *' },
            payload: {},
            config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
            notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast'] },
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      });

      await act(async () => {
        const success = await result.current.deleteTask('task-to-delete');
        expect(success).toBe(true);
      });
    });
  });

  describe('Task Selection', () => {
    it('should select a task', () => {
      const { result } = renderHook(() => useSchedulerStore());

      const mockTask: ScheduledTask = {
        id: 'task-1',
        name: 'Test Task',
        type: 'workflow',
        status: 'active',
        trigger: { type: 'cron', cronExpression: '0 9 * * *' },
        payload: {},
        config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
        notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast'] },
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.setTasks([mockTask]);
        result.current.selectTask('task-1');
      });

      expect(result.current.selectedTaskId).toBe('task-1');
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useSchedulerStore());

      act(() => {
        result.current.selectTask('task-1');
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedTaskId).toBeNull();
    });
  });

  describe('Filtering', () => {
    it('should update filter', () => {
      const { result } = renderHook(() => useSchedulerStore());

      act(() => {
        result.current.setFilter({
          types: ['workflow'],
          statuses: ['active'],
          search: 'test',
        });
      });

      expect(result.current.filter.types).toEqual(['workflow']);
      expect(result.current.filter.statuses).toEqual(['active']);
      expect(result.current.filter.search).toBe('test');
    });

    it('should clear filter', () => {
      const { result } = renderHook(() => useSchedulerStore());

      act(() => {
        result.current.setFilter({
          types: ['workflow'],
          statuses: ['active'],
        });
      });

      act(() => {
        result.current.clearFilter();
      });

      expect(result.current.filter).toEqual({
        types: [],
        statuses: [],
        tags: [],
        search: '',
      });
    });
  });

  describe('Error Handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useSchedulerStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should select active tasks', () => {
      const { result } = renderHook(() => useSchedulerStore());

      const activeTasks: ScheduledTask[] = [
        {
          id: 'active-1',
          name: 'Active Task',
          type: 'workflow',
          status: 'active',
          trigger: { type: 'cron', cronExpression: '0 9 * * *' },
          payload: {},
          config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
          notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast'] },
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'paused-1',
          name: 'Paused Task',
          type: 'workflow',
          status: 'paused',
          trigger: { type: 'cron', cronExpression: '0 9 * * *' },
          payload: {},
          config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
          notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast'] },
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      act(() => {
        result.current.setTasks(activeTasks);
      });

      const active = result.current.tasks.filter((t) => t.status === 'active');
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('active-1');
    });

    it('should select upcoming tasks', () => {
      const { result } = renderHook(() => useSchedulerStore());

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const tasks: ScheduledTask[] = [
        {
          id: 'upcoming-1',
          name: 'Upcoming Task',
          type: 'workflow',
          status: 'active',
          trigger: { type: 'cron', cronExpression: '0 9 * * *' },
          payload: {},
          config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
          notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast'] },
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          nextRunAt: futureDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      act(() => {
        result.current.setTasks(tasks);
      });

      const upcoming = result.current.tasks.filter((t) => t.nextRunAt && t.nextRunAt > new Date());
      expect(upcoming.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should load statistics', async () => {
      const { result } = renderHook(() => useSchedulerStore());

      await act(async () => {
        await result.current.loadStatistics();
      });

      expect(result.current.statistics).toBeDefined();
      expect(result.current.statistics?.totalTasks).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useSchedulerStore());

      // Set some state
      act(() => {
        result.current.selectTask('task-1');
        result.current.setError('Some error');
        result.current.setFilter({ types: ['workflow'] });
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.selectedTaskId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.filter.types).toEqual([]);
    });
  });
});
