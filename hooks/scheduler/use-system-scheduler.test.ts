/**
 * useSystemScheduler Hook Tests
 */

import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => true),
}));

jest.mock('@/lib/native/system-scheduler', () => ({
  getSchedulerCapabilities: jest.fn(),
  isSchedulerAvailable: jest.fn(),
  isSchedulerElevated: jest.fn(),
  listSystemTasks: jest.fn(),
  getPendingConfirmations: jest.fn(),
  createSystemTask: jest.fn(),
  updateSystemTask: jest.fn(),
  deleteSystemTask: jest.fn(),
  enableSystemTask: jest.fn(),
  disableSystemTask: jest.fn(),
  runSystemTaskNow: jest.fn(),
  confirmSystemTask: jest.fn(),
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
    description: 'desc',
    trigger: { type: 'interval', seconds: 3600 },
    action: { type: 'run_command', command: 'echo', args: ['hello'] },
    run_level: 'user',
    status: 'enabled',
    requires_admin: false,
    tags: [],
    metadata_state: 'full',
    created_at: '2025-01-01T00:00:00.000Z',
  };

  const mockConfirmation = {
    confirmation_id: 'confirm-1',
    task_id: 'legacy-confirm-1',
    target_task_id: 'task-1',
    operation: 'update',
    risk_level: 'high',
    requires_admin: true,
    warnings: ['requires elevated permissions'],
    details: {
      task_name: 'Test Task',
      action_summary: 'Run command',
      trigger_summary: 'Cron schedule',
    },
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2026-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isTauri as jest.Mock).mockReturnValue(true);
    (systemScheduler.getSchedulerCapabilities as jest.Mock).mockResolvedValue(mockCapabilities);
    (systemScheduler.isSchedulerAvailable as jest.Mock).mockResolvedValue(true);
    (systemScheduler.isSchedulerElevated as jest.Mock).mockResolvedValue(false);
    (systemScheduler.listSystemTasks as jest.Mock).mockResolvedValue([mockTask]);
    (systemScheduler.getPendingConfirmations as jest.Mock).mockResolvedValue([]);
  });

  it('loads capabilities, tasks, and pending confirmations on mount', async () => {
    const { result } = renderHook(() => useSystemScheduler());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(systemScheduler.getSchedulerCapabilities).toHaveBeenCalledTimes(1);
    expect(systemScheduler.isSchedulerAvailable).toHaveBeenCalledTimes(1);
    expect(systemScheduler.isSchedulerElevated).toHaveBeenCalledTimes(1);
    expect(systemScheduler.listSystemTasks).toHaveBeenCalledTimes(1);
    expect(systemScheduler.getPendingConfirmations).toHaveBeenCalledTimes(1);

    expect(result.current.capabilities).toEqual(mockCapabilities);
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.pendingConfirmations).toEqual([]);
  });

  it('does not initialize in non-tauri runtime', () => {
    (isTauri as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useSystemScheduler());

    expect(systemScheduler.getSchedulerCapabilities).not.toHaveBeenCalled();
    expect(result.current.capabilities).toBeNull();
  });

  it('refreshes pending queue from backend when confirmation is required', async () => {
    (systemScheduler.createSystemTask as jest.Mock).mockResolvedValue({
      status: 'confirmation_required',
      confirmation: mockConfirmation,
    });
    (systemScheduler.getPendingConfirmations as jest.Mock).mockResolvedValue([mockConfirmation]);

    const { result } = renderHook(() => useSystemScheduler());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createTask({
        name: 'Pending Task',
        trigger: { type: 'on_boot' },
        action: { type: 'run_command', command: 'echo hello' },
      });
    });

    expect(result.current.pendingConfirmation?.confirmation_id).toBe('confirm-1');
    expect(result.current.pendingConfirmations).toHaveLength(1);
  });

  it('confirms pending task by confirmation_id and refreshes state', async () => {
    (systemScheduler.getPendingConfirmations as jest.Mock).mockResolvedValue([mockConfirmation]);
    (systemScheduler.confirmSystemTask as jest.Mock).mockResolvedValue({
      ...mockTask,
      id: 'task-confirmed',
    });
    (systemScheduler.listSystemTasks as jest.Mock).mockResolvedValue([
      mockTask,
      { ...mockTask, id: 'task-confirmed', name: 'Confirmed Task' },
    ]);

    const { result } = renderHook(() => useSystemScheduler());
    await waitFor(() => expect(result.current.pendingConfirmation?.confirmation_id).toBe('confirm-1'));

    await act(async () => {
      await result.current.confirmPending();
    });

    expect(systemScheduler.confirmSystemTask).toHaveBeenCalledWith('confirm-1');
    expect(systemScheduler.getPendingConfirmations).toHaveBeenCalledTimes(2);
  });

  it('cancels pending task by confirmation_id', async () => {
    (systemScheduler.getPendingConfirmations as jest.Mock).mockResolvedValue([mockConfirmation]);
    (systemScheduler.cancelTaskConfirmation as jest.Mock).mockResolvedValue(true);
    (systemScheduler.getPendingConfirmations as jest.Mock)
      .mockResolvedValueOnce([mockConfirmation])
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSystemScheduler());
    await waitFor(() => expect(result.current.pendingConfirmation?.confirmation_id).toBe('confirm-1'));

    act(() => {
      result.current.cancelPending();
    });

    await waitFor(() => {
      expect(systemScheduler.cancelTaskConfirmation).toHaveBeenCalledWith('confirm-1');
      expect(result.current.pendingConfirmation).toBeNull();
      expect(result.current.pendingConfirmations).toHaveLength(0);
    });
  });
});

