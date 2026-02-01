/**
 * Tests for useScheduler hook
 */

import { renderHook, act } from '@testing-library/react';
import { useScheduler } from './use-scheduler';

// Mock scheduler store
const mockStore = {
  tasks: [],
  executions: [],
  statistics: { total: 0, active: 0, paused: 0, completed: 0 },
  selectedTaskId: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  autoRefreshInterval: 0,
  initialize: jest.fn(),
  refreshAll: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  pauseTask: jest.fn(),
  resumeTask: jest.fn(),
  runTaskNow: jest.fn(),
  selectTask: jest.fn(),
  setFilter: jest.fn(),
  clearFilter: jest.fn(),
  setError: jest.fn(),
  loadRecentExecutions: jest.fn(),
  loadUpcomingTasks: jest.fn(),
  cleanupOldExecutions: jest.fn(),
};

jest.mock('@/stores/scheduler', () => ({
  useSchedulerStore: jest.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  }),
  selectTasks: (state: typeof mockStore) => state.tasks,
  selectExecutions: (state: typeof mockStore) => state.executions,
  selectStatistics: (state: typeof mockStore) => state.statistics,
  selectSelectedTaskId: (state: typeof mockStore) => state.selectedTaskId,
  selectSelectedTask: () => null,
  selectActiveTasks: () => [],
  selectUpcomingTasks: () => [],
  selectIsLoading: (state: typeof mockStore) => state.isLoading,
  selectError: (state: typeof mockStore) => state.error,
  selectIsInitialized: (state: typeof mockStore) => state.isInitialized,
}));

describe('useScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.isInitialized = false;
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useScheduler());

      expect(result.current.tasks).toEqual([]);
      expect(result.current.executions).toEqual([]);
      expect(result.current.statistics).toEqual({ total: 0, active: 0, paused: 0, completed: 0 });
      expect(result.current.selectedTaskId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should initialize on mount when not initialized', () => {
      renderHook(() => useScheduler());

      expect(mockStore.initialize).toHaveBeenCalled();
    });

    it('should not initialize twice', () => {
      mockStore.isInitialized = true;
      renderHook(() => useScheduler());

      expect(mockStore.initialize).not.toHaveBeenCalled();
    });
  });

  describe('createTask', () => {
    it('should call store createTask', async () => {
      const input = {
        name: 'Test Task',
        type: 'chat' as const,
        schedule: { type: 'once' as const, executeAt: new Date() },
        config: {},
      };
      mockStore.createTask.mockResolvedValue({ id: 'task-1', ...input });

      const { result } = renderHook(() => useScheduler());

      await act(async () => {
        await result.current.createTask(input);
      });

      expect(mockStore.createTask).toHaveBeenCalledWith(input);
    });
  });

  describe('updateTask', () => {
    it('should call store updateTask', async () => {
      const input = { name: 'Updated Task' };
      mockStore.updateTask.mockResolvedValue({ id: 'task-1', ...input });

      const { result } = renderHook(() => useScheduler());

      await act(async () => {
        await result.current.updateTask('task-1', input);
      });

      expect(mockStore.updateTask).toHaveBeenCalledWith('task-1', input);
    });
  });

  describe('deleteTask', () => {
    it('should call store deleteTask', async () => {
      mockStore.deleteTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScheduler());

      await act(async () => {
        await result.current.deleteTask('task-1');
      });

      expect(mockStore.deleteTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('pauseTask', () => {
    it('should call store pauseTask', async () => {
      mockStore.pauseTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScheduler());

      await act(async () => {
        await result.current.pauseTask('task-1');
      });

      expect(mockStore.pauseTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('resumeTask', () => {
    it('should call store resumeTask', async () => {
      mockStore.resumeTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScheduler());

      await act(async () => {
        await result.current.resumeTask('task-1');
      });

      expect(mockStore.resumeTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('runTaskNow', () => {
    it('should call store runTaskNow', async () => {
      mockStore.runTaskNow.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScheduler());

      await act(async () => {
        await result.current.runTaskNow('task-1');
      });

      expect(mockStore.runTaskNow).toHaveBeenCalledWith('task-1');
    });
  });

  describe('selectTask', () => {
    it('should call store selectTask with taskId', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.selectTask('task-1');
      });

      expect(mockStore.selectTask).toHaveBeenCalledWith('task-1');
    });

    it('should call store selectTask with null', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.selectTask(null);
      });

      expect(mockStore.selectTask).toHaveBeenCalledWith(null);
    });
  });

  describe('setFilter', () => {
    it('should call store setFilter', () => {
      const filter = { status: 'active' as const };

      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.setFilter(filter);
      });

      expect(mockStore.setFilter).toHaveBeenCalledWith(filter);
    });
  });

  describe('clearFilter', () => {
    it('should call store clearFilter', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.clearFilter();
      });

      expect(mockStore.clearFilter).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should call store refreshAll', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.refresh();
      });

      expect(mockStore.refreshAll).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should call store setError with null', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.clearError();
      });

      expect(mockStore.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('loadRecentExecutions', () => {
    it('should call store loadRecentExecutions', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.loadRecentExecutions(10);
      });

      expect(mockStore.loadRecentExecutions).toHaveBeenCalledWith(10);
    });

    it('should call store loadRecentExecutions without limit', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.loadRecentExecutions();
      });

      expect(mockStore.loadRecentExecutions).toHaveBeenCalledWith(undefined);
    });
  });

  describe('loadUpcomingTasks', () => {
    it('should call store loadUpcomingTasks', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.loadUpcomingTasks(5);
      });

      expect(mockStore.loadUpcomingTasks).toHaveBeenCalledWith(5);
    });
  });

  describe('cleanupOldExecutions', () => {
    it('should call store cleanupOldExecutions', () => {
      const { result } = renderHook(() => useScheduler());

      act(() => {
        result.current.cleanupOldExecutions(30);
      });

      expect(mockStore.cleanupOldExecutions).toHaveBeenCalledWith(30);
    });
  });
});
