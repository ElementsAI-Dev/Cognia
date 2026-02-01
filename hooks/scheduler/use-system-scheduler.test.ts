/**
 * useSystemScheduler Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => true),
}));

jest.mock('@/lib/native/system-scheduler', () => ({
  getSchedulerCapabilities: jest.fn(),
  isSchedulerAvailable: jest.fn(),
  isSchedulerElevated: jest.fn(),
  listSystemTasks: jest.fn(),
  createSystemTask: jest.fn(),
  updateSystemTask: jest.fn(),
  deleteSystemTask: jest.fn(),
  enableSystemTask: jest.fn(),
  disableSystemTask: jest.fn(),
  runSystemTaskNow: jest.fn(),
  cancelTaskConfirmation: jest.fn(),
  validateSystemTask: jest.fn(),
  requestSchedulerElevation: jest.fn(),
}));

import { isTauri } from '@/lib/utils';
import * as systemScheduler from '@/lib/native/system-scheduler';
import { useSystemScheduler } from './use-system-scheduler';

describe('useSystemScheduler', () => {
  const mockCapabilities = {
    os: 'windows',
    backend: 'Task Scheduler',
    available: true,
    can_elevate: true,
    supported_triggers: ['cron', 'interval', 'once'],
    max_tasks: 0,
  };

  const mockTask = {
    id: 'task-1',
    name: 'Test Task',
    status: 'enabled',
    trigger: { type: 'interval', seconds: 3600 },
    action: { type: 'run_command', command: 'echo', args: ['hello'] },
    created_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isTauri as jest.Mock).mockReturnValue(true);
    (systemScheduler.getSchedulerCapabilities as jest.Mock).mockResolvedValue(mockCapabilities);
    (systemScheduler.isSchedulerAvailable as jest.Mock).mockResolvedValue(true);
    (systemScheduler.isSchedulerElevated as jest.Mock).mockResolvedValue(false);
    (systemScheduler.listSystemTasks as jest.Mock).mockResolvedValue([mockTask]);
  });

  describe('initialization', () => {
    it('should load capabilities and tasks on mount', async () => {
      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(systemScheduler.getSchedulerCapabilities).toHaveBeenCalled();
      expect(systemScheduler.isSchedulerAvailable).toHaveBeenCalled();
      expect(systemScheduler.isSchedulerElevated).toHaveBeenCalled();
      expect(systemScheduler.listSystemTasks).toHaveBeenCalled();

      expect(result.current.capabilities).toEqual(mockCapabilities);
      expect(result.current.isAvailable).toBe(true);
      expect(result.current.tasks).toHaveLength(1);
    });

    it('should not load when not in Tauri', async () => {
      (isTauri as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useSystemScheduler());

      expect(systemScheduler.getSchedulerCapabilities).not.toHaveBeenCalled();
      expect(result.current.capabilities).toBeNull();
    });

    it('should handle initialization errors', async () => {
      (systemScheduler.getSchedulerCapabilities as jest.Mock).mockRejectedValue(
        new Error('Failed to load')
      );

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load');
      });
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const newTask = { ...mockTask, id: 'task-2', name: 'New Task' };
      (systemScheduler.createSystemTask as jest.Mock).mockResolvedValue({
        status: 'success',
        task: newTask,
      });

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      const input = {
        name: 'New Task',
        trigger: { type: 'interval' as const, seconds: 3600 },
        action: { type: 'run_command' as const, command: 'test' },
      };

      await act(async () => {
        await result.current.createTask(input);
      });

      expect(systemScheduler.createSystemTask).toHaveBeenCalledWith(input, false);
      expect(result.current.tasks).toHaveLength(2);
    });

    it('should handle confirmation required response', async () => {
      const confirmation = {
        task_id: 'pending-1',
        operation: 'create',
        details: { name: 'Test', risk_level: 'high' },
      };
      (systemScheduler.createSystemTask as jest.Mock).mockResolvedValue({
        status: 'confirmation_required',
        confirmation,
      });

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.createTask({
          name: 'Test',
          trigger: { type: 'on_boot' },
          action: { type: 'run_command', command: 'test' },
        });
      });

      expect(result.current.pendingConfirmation).toEqual(confirmation);
    });

    it('should pass confirmed flag when confirming', async () => {
      (systemScheduler.createSystemTask as jest.Mock).mockResolvedValue({
        status: 'success',
        task: mockTask,
      });

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      const input = {
        name: 'Test',
        trigger: { type: 'interval' as const, seconds: 60 },
        action: { type: 'run_command' as const, command: 'test' },
      };

      await act(async () => {
        await result.current.createTask(input, true);
      });

      expect(systemScheduler.createSystemTask).toHaveBeenCalledWith(input, true);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updatedTask = { ...mockTask, name: 'Updated Task' };
      (systemScheduler.updateSystemTask as jest.Mock).mockResolvedValue({
        status: 'success',
        task: updatedTask,
      });

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      const input = {
        name: 'Updated Task',
        trigger: { type: 'interval' as const, seconds: 7200 },
        action: { type: 'run_command' as const, command: 'updated' },
      };

      await act(async () => {
        await result.current.updateTask('task-1', input);
      });

      expect(systemScheduler.updateSystemTask).toHaveBeenCalledWith('task-1', input, false);
      expect(result.current.tasks[0].name).toBe('Updated Task');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      (systemScheduler.deleteSystemTask as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.tasks).toHaveLength(1);

      await act(async () => {
        const deleted = await result.current.deleteTask('task-1');
        expect(deleted).toBe(true);
      });

      expect(result.current.tasks).toHaveLength(0);
    });

    it('should handle delete failure', async () => {
      (systemScheduler.deleteSystemTask as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const deleted = await result.current.deleteTask('task-1');
        expect(deleted).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(1);
    });
  });

  describe('enableTask', () => {
    it('should enable task', async () => {
      (systemScheduler.enableSystemTask as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const enabled = await result.current.enableTask('task-1');
        expect(enabled).toBe(true);
      });

      expect(result.current.tasks[0].status).toBe('enabled');
    });
  });

  describe('disableTask', () => {
    it('should disable task', async () => {
      (systemScheduler.disableSystemTask as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const disabled = await result.current.disableTask('task-1');
        expect(disabled).toBe(true);
      });

      expect(result.current.tasks[0].status).toBe('disabled');
    });
  });

  describe('runTaskNow', () => {
    it('should run task immediately', async () => {
      const runResult = {
        success: true,
        exit_code: 0,
        stdout: 'output',
        duration_ms: 100,
      };
      (systemScheduler.runSystemTaskNow as jest.Mock).mockResolvedValue(runResult);

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let execResult;
      await act(async () => {
        execResult = await result.current.runTaskNow('task-1');
      });

      expect(execResult).toEqual(runResult);
      expect(result.current.tasks[0].last_result).toEqual(runResult);
    });

    it('should handle run failure', async () => {
      (systemScheduler.runSystemTaskNow as jest.Mock).mockRejectedValue(
        new Error('Execution failed')
      );

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let execResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        execResult = await result.current.runTaskNow('task-1');
      });

      expect(execResult?.success).toBe(false);
      expect(execResult?.error).toBe('Execution failed');
    });
  });

  describe('cancelPending', () => {
    it('should cancel pending confirmation', async () => {
      const confirmation = {
        task_id: 'pending-1',
        operation: 'create',
        details: {},
      };
      (systemScheduler.createSystemTask as jest.Mock).mockResolvedValue({
        status: 'confirmation_required',
        confirmation,
      });

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.createTask({
          name: 'Test',
          trigger: { type: 'on_boot' },
          action: { type: 'run_command', command: 'test' },
        });
      });

      expect(result.current.pendingConfirmation).not.toBeNull();

      act(() => {
        result.current.cancelPending();
      });

      expect(systemScheduler.cancelTaskConfirmation).toHaveBeenCalledWith('pending-1');
      expect(result.current.pendingConfirmation).toBeNull();
    });
  });

  describe('validateTask', () => {
    it('should validate task input', async () => {
      const validation = {
        valid: true,
        errors: [],
        warnings: [],
        risk_level: 'low',
        requires_admin: false,
      };
      (systemScheduler.validateSystemTask as jest.Mock).mockResolvedValue(validation);

      const { result } = renderHook(() => useSystemScheduler());

      const input = {
        name: 'Test',
        trigger: { type: 'interval' as const, seconds: 60 },
        action: { type: 'run_command' as const, command: 'test' },
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateTask(input);
      });

      expect(validationResult).toEqual(validation);
    });
  });

  describe('requestElevation', () => {
    it('should request admin elevation', async () => {
      (systemScheduler.requestSchedulerElevation as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useSystemScheduler());

      let elevated;
      await act(async () => {
        elevated = await result.current.requestElevation();
      });

      expect(elevated).toBe(true);
    });

    it('should handle elevation failure', async () => {
      (systemScheduler.requestSchedulerElevation as jest.Mock).mockRejectedValue(
        new Error('Elevation denied')
      );

      const { result } = renderHook(() => useSystemScheduler());

      let elevated;
      await act(async () => {
        elevated = await result.current.requestElevation();
      });

      expect(elevated).toBe(false);
      expect(result.current.error).toBe('Elevation denied');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      (systemScheduler.getSchedulerCapabilities as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refresh all data', async () => {
      const { result } = renderHook(() => useSystemScheduler());

      await waitFor(() => expect(result.current.loading).toBe(false));

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(systemScheduler.getSchedulerCapabilities).toHaveBeenCalled();
      expect(systemScheduler.isSchedulerAvailable).toHaveBeenCalled();
      expect(systemScheduler.isSchedulerElevated).toHaveBeenCalled();
      expect(systemScheduler.listSystemTasks).toHaveBeenCalled();
    });
  });
});
