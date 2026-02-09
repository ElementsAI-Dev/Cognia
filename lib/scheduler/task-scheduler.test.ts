/**
 * @jest-environment jsdom
 */

import {
  getTaskScheduler,
  initTaskScheduler,
  stopTaskScheduler,
  registerTaskExecutor,
  unregisterTaskExecutor,
  TaskSchedulerImpl,
} from './task-scheduler';
import type { ScheduledTask, CreateScheduledTaskInput } from '@/types/scheduler';

// Mock plugin lifecycle hooks
const mockDispatchOnScheduledTaskStart = jest.fn();
const mockDispatchOnScheduledTaskComplete = jest.fn();
const mockDispatchOnScheduledTaskError = jest.fn();
jest.mock('@/lib/plugin', () => ({
  getPluginLifecycleHooks: () => ({
    dispatchOnScheduledTaskStart: mockDispatchOnScheduledTaskStart,
    dispatchOnScheduledTaskComplete: mockDispatchOnScheduledTaskComplete,
    dispatchOnScheduledTaskError: mockDispatchOnScheduledTaskError,
  }),
}));

// Mock dependencies
jest.mock('./scheduler-db', () => ({
  schedulerDb: {
    getTasksByStatus: jest.fn().mockResolvedValue([]),
    createTask: jest.fn().mockResolvedValue(undefined),
    updateTask: jest.fn().mockResolvedValue(undefined),
    deleteTask: jest.fn().mockResolvedValue(true),
    getTask: jest.fn().mockResolvedValue(null),
    getAllTasks: jest.fn().mockResolvedValue([]),
    createExecution: jest.fn().mockResolvedValue(undefined),
    updateExecution: jest.fn().mockResolvedValue(undefined),
    getTaskExecutions: jest.fn().mockResolvedValue([]),
    cleanupOldExecutions: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('./notification-integration', () => ({
  notifyTaskEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./cron-parser', () => ({
  getNextCronTime: jest.fn().mockReturnValue(new Date(Date.now() + 60000)),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

import { schedulerDb } from './scheduler-db';

const mockSchedulerDb = schedulerDb as jest.Mocked<typeof schedulerDb>;

describe('TaskScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    stopTaskScheduler();
  });

  afterEach(() => {
    jest.useRealTimers();
    stopTaskScheduler();
  });

  describe('getTaskScheduler', () => {
    it('should return singleton instance', () => {
      const scheduler1 = getTaskScheduler();
      const scheduler2 = getTaskScheduler();
      expect(scheduler1).toBe(scheduler2);
    });
  });

  describe('initTaskScheduler', () => {
    it('should initialize scheduler', async () => {
      await initTaskScheduler();
      const status = getTaskScheduler().getStatus();
      expect(status.initialized).toBe(true);
    });

    it('should load active tasks', async () => {
      mockSchedulerDb.getTasksByStatus.mockResolvedValueOnce([]);
      await initTaskScheduler();
      expect(mockSchedulerDb.getTasksByStatus).toHaveBeenCalledWith('active');
    });
  });

  describe('stopTaskScheduler', () => {
    it('should stop scheduler', async () => {
      await initTaskScheduler();
      stopTaskScheduler();
      const status = getTaskScheduler().getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('registerTaskExecutor', () => {
    it('should register executor for task type', () => {
      const executor = jest.fn().mockResolvedValue({ success: true });
      registerTaskExecutor('test-type', executor);
      // Executor should be registered (verified indirectly through task execution)
    });
  });

  describe('unregisterTaskExecutor', () => {
    it('should unregister executor', () => {
      const executor = jest.fn();
      registerTaskExecutor('test-type', executor);
      unregisterTaskExecutor('test-type');
      // Executor should be unregistered
    });
  });

  describe('TaskSchedulerImpl', () => {
    let scheduler: TaskSchedulerImpl;

    beforeEach(async () => {
      scheduler = getTaskScheduler() as TaskSchedulerImpl;
      await scheduler.initialize();
    });

    describe('createTask', () => {
      it('should create a new task', async () => {
        const input: CreateScheduledTaskInput = {
          name: 'Test Task',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
        };

        const task = await scheduler.createTask(input);

        expect(task).toHaveProperty('id');
        expect(task.name).toBe('Test Task');
        expect(task.status).toBe('active');
        expect(mockSchedulerDb.createTask).toHaveBeenCalled();
      });

      it('should calculate next run time for interval triggers', async () => {
        const input: CreateScheduledTaskInput = {
          name: 'Interval Task',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
        };

        const task = await scheduler.createTask(input);
        expect(task.nextRunAt).toBeDefined();
      });

      it('should handle cron triggers', async () => {
        const input: CreateScheduledTaskInput = {
          name: 'Cron Task',
          type: 'test',
          trigger: { type: 'cron', cronExpression: '0 * * * *' },
        };

        const task = await scheduler.createTask(input);
        expect(task.trigger.type).toBe('cron');
      });
    });

    describe('updateTask', () => {
      it('should return null for non-existent task', async () => {
        mockSchedulerDb.getTask.mockResolvedValueOnce(null);
        const result = await scheduler.updateTask('non-existent', { name: 'Updated' });
        expect(result).toBeNull();
      });

      it('should update existing task', async () => {
        const existingTask: ScheduledTask = {
          id: 'task-1',
          name: 'Original',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 3, retryDelay: 1000, timeout: 30000, allowConcurrent: false, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: true },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(existingTask);

        const result = await scheduler.updateTask('task-1', { name: 'Updated' });

        expect(result?.name).toBe('Updated');
        expect(mockSchedulerDb.updateTask).toHaveBeenCalled();
      });
    });

    describe('deleteTask', () => {
      it('should delete task', async () => {
        mockSchedulerDb.deleteTask.mockResolvedValueOnce(true);
        const result = await scheduler.deleteTask('task-1');
        expect(result).toBe(true);
      });
    });

    describe('getTask', () => {
      it('should return task by ID', async () => {
        const task: ScheduledTask = {
          id: 'task-1',
          name: 'Test',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 3, retryDelay: 1000, timeout: 30000, allowConcurrent: false, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: true },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        const result = await scheduler.getTask('task-1');
        expect(result?.id).toBe('task-1');
      });
    });

    describe('getAllTasks', () => {
      it('should return all tasks', async () => {
        mockSchedulerDb.getAllTasks.mockResolvedValueOnce([]);
        const result = await scheduler.getAllTasks();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('pauseTask', () => {
      it('should return false for non-existent task', async () => {
        mockSchedulerDb.getTask.mockResolvedValueOnce(null);
        const result = await scheduler.pauseTask('non-existent');
        expect(result).toBe(false);
      });

      it('should pause existing task', async () => {
        const task: ScheduledTask = {
          id: 'task-1',
          name: 'Test',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 3, retryDelay: 1000, timeout: 30000, allowConcurrent: false, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: true },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        const result = await scheduler.pauseTask('task-1');
        expect(result).toBe(true);
        expect(mockSchedulerDb.updateTask).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'paused' })
        );
      });
    });

    describe('resumeTask', () => {
      it('should return false for non-existent task', async () => {
        mockSchedulerDb.getTask.mockResolvedValueOnce(null);
        const result = await scheduler.resumeTask('non-existent');
        expect(result).toBe(false);
      });

      it('should return false for non-paused task', async () => {
        const task: ScheduledTask = {
          id: 'task-1',
          name: 'Test',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 3, retryDelay: 1000, timeout: 30000, allowConcurrent: false, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: true },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        const result = await scheduler.resumeTask('task-1');
        expect(result).toBe(false);
      });
    });

    describe('runTaskNow', () => {
      it('should return null for non-existent task', async () => {
        mockSchedulerDb.getTask.mockResolvedValueOnce(null);
        const result = await scheduler.runTaskNow('non-existent');
        expect(result).toBeNull();
      });

      it('should execute task immediately', async () => {
        const executor = jest.fn().mockResolvedValue({ success: true });
        registerTaskExecutor('test', executor);

        const task: ScheduledTask = {
          id: 'task-1',
          name: 'Test',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 3, retryDelay: 1000, timeout: 30000, allowConcurrent: true, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: true },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        const result = await scheduler.runTaskNow('task-1');
        expect(result).toBeDefined();
        expect(executor).toHaveBeenCalled();
      });
    });

    describe('getTaskExecutions', () => {
      it('should return task executions', async () => {
        mockSchedulerDb.getTaskExecutions.mockResolvedValueOnce([]);
        const result = await scheduler.getTaskExecutions('task-1');
        expect(Array.isArray(result)).toBe(true);
      });

      it('should respect limit parameter', async () => {
        await scheduler.getTaskExecutions('task-1', 10);
        expect(mockSchedulerDb.getTaskExecutions).toHaveBeenCalledWith('task-1', 10);
      });
    });

    describe('getStatus', () => {
      it('should return scheduler status', () => {
        const status = scheduler.getStatus();
        expect(status).toHaveProperty('initialized');
        expect(status).toHaveProperty('scheduledCount');
        expect(status).toHaveProperty('runningCount');
      });
    });

    describe('triggerEventTask', () => {
      it('should trigger event-based tasks', async () => {
        const executor = jest.fn().mockResolvedValue({ success: true });
        registerTaskExecutor('test', executor);

        const eventTask: ScheduledTask = {
          id: 'event-task-1',
          name: 'Event Task',
          type: 'test',
          trigger: { type: 'event', eventType: 'test-event' },
          config: { maxRetries: 3, retryDelay: 1000, timeout: 30000, allowConcurrent: true, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: true },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getAllTasks.mockResolvedValueOnce([eventTask]);

        await scheduler.triggerEventTask('test-event');
        
        // Give time for async execution
        await jest.runAllTimersAsync();
        
        expect(executor).toHaveBeenCalled();
      });
    });

    describe('plugin hook dispatches', () => {
      it('should dispatch onScheduledTaskStart when task begins execution', async () => {
        const executor = jest.fn().mockResolvedValue({ success: true });
        registerTaskExecutor('test', executor);

        const task: ScheduledTask = {
          id: 'task-hook-1',
          name: 'Hook Test',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 0, retryDelay: 1000, timeout: 30000, allowConcurrent: true, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: false },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        await scheduler.runTaskNow('task-hook-1');

        expect(mockDispatchOnScheduledTaskStart).toHaveBeenCalledWith(
          'task-hook-1',
          expect.any(String)
        );
      });

      it('should dispatch onScheduledTaskComplete on successful execution', async () => {
        const executor = jest.fn().mockResolvedValue({ success: true, output: { result: 'done' } });
        registerTaskExecutor('test', executor);

        const task: ScheduledTask = {
          id: 'task-hook-2',
          name: 'Hook Complete',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 0, retryDelay: 1000, timeout: 30000, allowConcurrent: true, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: false },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        await scheduler.runTaskNow('task-hook-2');

        expect(mockDispatchOnScheduledTaskComplete).toHaveBeenCalledWith(
          'task-hook-2',
          expect.any(String),
          expect.objectContaining({ success: true })
        );
      });

      it('should dispatch onScheduledTaskError on failed execution', async () => {
        const executor = jest.fn().mockResolvedValue({ success: false, error: 'Task failed' });
        registerTaskExecutor('test', executor);

        const task: ScheduledTask = {
          id: 'task-hook-3',
          name: 'Hook Error',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 0, retryDelay: 1000, timeout: 30000, allowConcurrent: true, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: false },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        await scheduler.runTaskNow('task-hook-3');

        expect(mockDispatchOnScheduledTaskError).toHaveBeenCalledWith(
          'task-hook-3',
          expect.any(String),
          expect.any(Error)
        );
      });

      it('should dispatch onScheduledTaskError when executor throws', async () => {
        const executor = jest.fn().mockRejectedValue(new Error('Executor crash'));
        registerTaskExecutor('test', executor);

        const task: ScheduledTask = {
          id: 'task-hook-4',
          name: 'Hook Crash',
          type: 'test',
          trigger: { type: 'interval', intervalMs: 60000 },
          config: { maxRetries: 0, retryDelay: 1000, timeout: 30000, allowConcurrent: true, runMissedOnStartup: true },
          notification: { onStart: false, onComplete: false, onError: false },
          status: 'active',
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSchedulerDb.getTask.mockResolvedValueOnce(task);

        await scheduler.runTaskNow('task-hook-4');

        expect(mockDispatchOnScheduledTaskError).toHaveBeenCalledWith(
          'task-hook-4',
          expect.any(String),
          expect.any(Error)
        );
      });
    });
  });
});
