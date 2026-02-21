/**
 * System Scheduler Native API Tests
 */

// Mock the Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock isTauri
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => true),
}));

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/utils';
import {
  getSchedulerCapabilities,
  isSchedulerAvailable,
  isSchedulerElevated,
  createSystemTask,
  updateSystemTask,
  deleteSystemTask,
  getSystemTask,
  listSystemTasks,
  enableSystemTask,
  disableSystemTask,
  runSystemTaskNow,
  confirmSystemTask,
  cancelTaskConfirmation,
  getPendingConfirmations,
  validateSystemTask,
  createCronTrigger,
  createIntervalTrigger,
  createOnceTrigger,
  createBootTrigger,
  createLogonTrigger,
  createScriptAction,
  createCommandAction,
  createAppAction,
} from './system-scheduler';

describe('System Scheduler Native API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isTauri as jest.Mock).mockReturnValue(true);
  });

  describe('getSchedulerCapabilities', () => {
    it('should return capabilities from Tauri', async () => {
      const mockCapabilities = {
        os: 'windows',
        backend: 'Task Scheduler',
        available: true,
        can_elevate: true,
        supported_triggers: ['cron', 'interval', 'once'],
        max_tasks: 0,
      };

      (invoke as jest.Mock).mockResolvedValue(mockCapabilities);

      const result = await getSchedulerCapabilities();

      expect(invoke).toHaveBeenCalledWith('scheduler_get_capabilities');
      expect(result).toEqual(mockCapabilities);
    });

    it('should return unavailable capabilities when not in Tauri', async () => {
      (isTauri as jest.Mock).mockReturnValue(false);

      const result = await getSchedulerCapabilities();

      expect(invoke).not.toHaveBeenCalled();
      expect(result.available).toBe(false);
      expect(result.backend).toBe('none');
    });
  });

  describe('isSchedulerAvailable', () => {
    it('should return true when scheduler is available', async () => {
      (invoke as jest.Mock).mockResolvedValue(true);

      const result = await isSchedulerAvailable();

      expect(invoke).toHaveBeenCalledWith('scheduler_is_available');
      expect(result).toBe(true);
    });

    it('should return false when not in Tauri', async () => {
      (isTauri as jest.Mock).mockReturnValue(false);

      const result = await isSchedulerAvailable();

      expect(result).toBe(false);
    });
  });

  describe('isSchedulerElevated', () => {
    it('should return elevated status', async () => {
      (invoke as jest.Mock).mockResolvedValue(true);

      const result = await isSchedulerElevated();

      expect(invoke).toHaveBeenCalledWith('scheduler_is_elevated');
      expect(result).toBe(true);
    });
  });

  describe('createSystemTask', () => {
    const mockInput = {
      name: 'Test Task',
      trigger: { type: 'interval' as const, seconds: 3600 },
      action: {
        type: 'run_command' as const,
        command: 'echo',
        args: ['hello'],
      },
    };

    it('should create task successfully', async () => {
      const mockResponse = {
        status: 'success',
        task: {
          ...mockInput,
          id: 'test-id',
          status: 'enabled',
        },
      };

      (invoke as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createSystemTask(mockInput);

      expect(invoke).toHaveBeenCalledWith('scheduler_create_task', {
        input: mockInput,
        confirmed: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass confirmed flag', async () => {
      (invoke as jest.Mock).mockResolvedValue({ status: 'success', task: {} });

      await createSystemTask(mockInput, true);

      expect(invoke).toHaveBeenCalledWith('scheduler_create_task', {
        input: mockInput,
        confirmed: true,
      });
    });

    it('should return error when not in Tauri', async () => {
      (isTauri as jest.Mock).mockReturnValue(false);

      const result = await createSystemTask(mockInput);

      expect(result.status).toBe('error');
    });
  });

  describe('updateSystemTask', () => {
    it('should update task', async () => {
      const mockResponse = { status: 'success', task: { id: 'task-1' } };
      (invoke as jest.Mock).mockResolvedValue(mockResponse);

      const input = {
        name: 'Updated Task',
        trigger: { type: 'interval' as const, seconds: 7200 },
        action: { type: 'run_command' as const, command: 'test' },
      };

      const result = await updateSystemTask('task-1', input, false);

      expect(invoke).toHaveBeenCalledWith('scheduler_update_task', {
        taskId: 'task-1',
        input,
        confirmed: false,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteSystemTask', () => {
    it('should delete task', async () => {
      (invoke as jest.Mock).mockResolvedValue(true);

      const result = await deleteSystemTask('task-1');

      expect(invoke).toHaveBeenCalledWith('scheduler_delete_task', {
        taskId: 'task-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('getSystemTask', () => {
    it('should get task by id', async () => {
      const mockTask = { id: 'task-1', name: 'Test' };
      (invoke as jest.Mock).mockResolvedValue(mockTask);

      const result = await getSystemTask('task-1');

      expect(invoke).toHaveBeenCalledWith('scheduler_get_task', {
        taskId: 'task-1',
      });
      expect(result).toEqual(mockTask);
    });

    it('should return null when not in Tauri', async () => {
      (isTauri as jest.Mock).mockReturnValue(false);

      const result = await getSystemTask('task-1');

      expect(result).toBeNull();
    });
  });

  describe('listSystemTasks', () => {
    it('should list all tasks', async () => {
      const mockTasks = [{ id: 'task-1' }, { id: 'task-2' }];
      (invoke as jest.Mock).mockResolvedValue(mockTasks);

      const result = await listSystemTasks();

      expect(invoke).toHaveBeenCalledWith('scheduler_list_tasks');
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when not in Tauri', async () => {
      (isTauri as jest.Mock).mockReturnValue(false);

      const result = await listSystemTasks();

      expect(result).toEqual([]);
    });
  });

  describe('enableSystemTask', () => {
    it('should enable task', async () => {
      (invoke as jest.Mock).mockResolvedValue(true);

      const result = await enableSystemTask('task-1');

      expect(invoke).toHaveBeenCalledWith('scheduler_enable_task', {
        taskId: 'task-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('disableSystemTask', () => {
    it('should disable task', async () => {
      (invoke as jest.Mock).mockResolvedValue(true);

      const result = await disableSystemTask('task-1');

      expect(invoke).toHaveBeenCalledWith('scheduler_disable_task', {
        taskId: 'task-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('runSystemTaskNow', () => {
    it('should run task immediately', async () => {
      const mockResult = {
        success: true,
        exit_code: 0,
        stdout: 'output',
        duration_ms: 100,
      };
      (invoke as jest.Mock).mockResolvedValue(mockResult);

      const result = await runSystemTaskNow('task-1');

      expect(invoke).toHaveBeenCalledWith('scheduler_run_task_now', {
        taskId: 'task-1',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('confirm/cancel pending confirmations', () => {
    it('confirms by confirmation id', async () => {
      const confirmedTask = { id: 'task-confirmed', name: 'Confirmed Task' };
      (invoke as jest.Mock).mockResolvedValue(confirmedTask);

      const result = await confirmSystemTask('confirm-1');

      expect(invoke).toHaveBeenCalledWith('scheduler_confirm_task', {
        confirmationId: 'confirm-1',
      });
      expect(result).toEqual(confirmedTask);
    });

    it('cancels by confirmation id', async () => {
      (invoke as jest.Mock).mockResolvedValue(true);

      const result = await cancelTaskConfirmation('confirm-2');

      expect(invoke).toHaveBeenCalledWith('scheduler_cancel_confirmation', {
        confirmationId: 'confirm-2',
      });
      expect(result).toBe(true);
    });

    it('loads pending confirmation queue', async () => {
      const queue = [{ confirmation_id: 'confirm-3', operation: 'create' }];
      (invoke as jest.Mock).mockResolvedValue(queue);

      const result = await getPendingConfirmations();

      expect(invoke).toHaveBeenCalledWith('scheduler_get_pending_confirmations');
      expect(result).toEqual(queue);
    });
  });

  describe('validateSystemTask', () => {
    it('should validate task input', async () => {
      const mockValidation = {
        valid: true,
        errors: [],
        warnings: ['some warning'],
        risk_level: 'low',
        requires_admin: false,
      };
      (invoke as jest.Mock).mockResolvedValue(mockValidation);

      const input = {
        name: 'Test',
        trigger: { type: 'interval' as const, seconds: 60 },
        action: { type: 'run_command' as const, command: 'test' },
      };

      const result = await validateSystemTask(input);

      expect(invoke).toHaveBeenCalledWith('scheduler_validate_task', { input });
      expect(result).toEqual(mockValidation);
    });
  });

  describe('Helper functions', () => {
    describe('createCronTrigger', () => {
      it('should create cron trigger', () => {
        const trigger = createCronTrigger('0 * * * *', 'UTC');

        expect(trigger).toEqual({
          type: 'cron',
          expression: '0 * * * *',
          timezone: 'UTC',
        });
      });
    });

    describe('createIntervalTrigger', () => {
      it('should create interval trigger', () => {
        const trigger = createIntervalTrigger(3600);

        expect(trigger).toEqual({
          type: 'interval',
          seconds: 3600,
        });
      });
    });

    describe('createOnceTrigger', () => {
      it('should create once trigger with Date', () => {
        const date = new Date('2025-01-01T00:00:00Z');
        const trigger = createOnceTrigger(date);

        expect(trigger.type).toBe('once');
        expect(trigger.run_at).toBe(date.toISOString());
      });

      it('should create once trigger with string', () => {
        const trigger = createOnceTrigger('2025-01-01T00:00:00Z');

        expect(trigger).toEqual({
          type: 'once',
          run_at: '2025-01-01T00:00:00Z',
        });
      });
    });

    describe('createBootTrigger', () => {
      it('should create boot trigger', () => {
        const trigger = createBootTrigger(60);

        expect(trigger).toEqual({
          type: 'on_boot',
          delay_seconds: 60,
        });
      });

      it('should default to 0 delay', () => {
        const trigger = createBootTrigger();

        expect(trigger.delay_seconds).toBe(0);
      });
    });

    describe('createLogonTrigger', () => {
      it('should create logon trigger', () => {
        const trigger = createLogonTrigger('admin');

        expect(trigger).toEqual({
          type: 'on_logon',
          user: 'admin',
        });
      });
    });

    describe('createScriptAction', () => {
      it('should create script action with defaults', () => {
        const action = createScriptAction('python', 'print("hello")');

        expect(action.type).toBe('execute_script');
        expect(action.language).toBe('python');
        expect(action.code).toBe('print("hello")');
        expect(action.timeout_secs).toBe(300);
        expect(action.memory_mb).toBe(512);
        expect(action.use_sandbox).toBe(true);
      });

      it('should create script action with options', () => {
        const action = createScriptAction('javascript', 'console.log(1)', {
          timeout_secs: 60,
          memory_mb: 256,
          use_sandbox: false,
          args: ['--test'],
        });

        expect(action.timeout_secs).toBe(60);
        expect(action.memory_mb).toBe(256);
        expect(action.use_sandbox).toBe(false);
        expect(action.args).toEqual(['--test']);
      });
    });

    describe('createCommandAction', () => {
      it('should create command action', () => {
        const action = createCommandAction('echo', {
          args: ['hello', 'world'],
          working_dir: '/tmp',
        });

        expect(action).toEqual({
          type: 'run_command',
          command: 'echo',
          args: ['hello', 'world'],
          working_dir: '/tmp',
          env: {},
        });
      });
    });

    describe('createAppAction', () => {
      it('should create app action', () => {
        const action = createAppAction('/usr/bin/app', ['--flag']);

        expect(action).toEqual({
          type: 'launch_app',
          path: '/usr/bin/app',
          args: ['--flag'],
        });
      });
    });
  });
});
