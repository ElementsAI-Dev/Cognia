/**
 * Tests for Process Store
 */

import { act } from '@testing-library/react';
import {
  useProcessStore,
  selectProcesses,
  selectIsLoading,
  selectTrackedPids,
  selectTrackedByAgent,
  DEFAULT_PROCESS_CONFIG,
  type TrackedProcess,
} from './process-store';
import type { ProcessInfo } from '@/lib/native/process';

describe('useProcessStore', () => {
  beforeEach(() => {
    act(() => {
      useProcessStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useProcessStore.getState();
      expect(state.processes).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastRefresh).toBeNull();
      expect(state.trackedProcesses.size).toBe(0);
      expect(state.autoRefresh).toBe(true);
      expect(state.autoRefreshInterval).toBe(5000);
      expect(state.config).toEqual(DEFAULT_PROCESS_CONFIG);
      expect(state.configLoading).toBe(false);
    });
  });

  describe('process list management', () => {
    it('should set processes', () => {
      const mockProcesses: ProcessInfo[] = [
        { pid: 1234, name: 'node.exe', cpuPercent: 5.2, memoryBytes: 1024000, status: 'running' },
        { pid: 5678, name: 'code.exe', cpuPercent: 2.1, memoryBytes: 512000, status: 'running' },
      ];

      act(() => {
        useProcessStore.getState().setProcesses(mockProcesses);
      });

      const state = useProcessStore.getState();
      expect(state.processes).toEqual(mockProcesses);
      expect(state.lastRefresh).toBeInstanceOf(Date);
      expect(state.error).toBeNull();
    });

    it('should clear error when setting processes', () => {
      act(() => {
        useProcessStore.getState().setError('Previous error');
        useProcessStore.getState().setProcesses([]);
      });

      expect(useProcessStore.getState().error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      act(() => {
        useProcessStore.getState().setLoading(true);
      });

      expect(useProcessStore.getState().isLoading).toBe(true);

      act(() => {
        useProcessStore.getState().setLoading(false);
      });

      expect(useProcessStore.getState().isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error and clear loading', () => {
      act(() => {
        useProcessStore.getState().setLoading(true);
        useProcessStore.getState().setError('Failed to fetch processes');
      });

      const state = useProcessStore.getState();
      expect(state.error).toBe('Failed to fetch processes');
      expect(state.isLoading).toBe(false);
    });

    it('should clear error', () => {
      act(() => {
        useProcessStore.getState().setError('Some error');
        useProcessStore.getState().setError(null);
      });

      expect(useProcessStore.getState().error).toBeNull();
    });
  });

  describe('tracked processes', () => {
    const mockTrackedProcess: TrackedProcess = {
      pid: 1234,
      agentId: 'agent-1',
      agentName: 'Test Agent',
      startedAt: new Date(),
      program: 'node',
    };

    it('should track a process', () => {
      act(() => {
        useProcessStore.getState().trackProcess(mockTrackedProcess);
      });

      const state = useProcessStore.getState();
      expect(state.trackedProcesses.size).toBe(1);
      expect(state.trackedProcesses.get(1234)).toEqual(mockTrackedProcess);
    });

    it('should untrack a process', () => {
      act(() => {
        useProcessStore.getState().trackProcess(mockTrackedProcess);
        useProcessStore.getState().untrackProcess(1234);
      });

      expect(useProcessStore.getState().trackedProcesses.size).toBe(0);
    });

    it('should track multiple processes', () => {
      const process2: TrackedProcess = {
        pid: 5678,
        agentId: 'agent-1',
        agentName: 'Test Agent',
        startedAt: new Date(),
        program: 'python',
      };

      act(() => {
        useProcessStore.getState().trackProcess(mockTrackedProcess);
        useProcessStore.getState().trackProcess(process2);
      });

      expect(useProcessStore.getState().trackedProcesses.size).toBe(2);
    });

    it('should clear all tracked processes', () => {
      act(() => {
        useProcessStore.getState().trackProcess(mockTrackedProcess);
        useProcessStore.getState().trackProcess({
          ...mockTrackedProcess,
          pid: 5678,
        });
        useProcessStore.getState().clearTracked();
      });

      expect(useProcessStore.getState().trackedProcesses.size).toBe(0);
    });

    it('should update existing tracked process', () => {
      const updatedProcess: TrackedProcess = {
        ...mockTrackedProcess,
        agentName: 'Updated Agent',
      };

      act(() => {
        useProcessStore.getState().trackProcess(mockTrackedProcess);
        useProcessStore.getState().trackProcess(updatedProcess);
      });

      const state = useProcessStore.getState();
      expect(state.trackedProcesses.size).toBe(1);
      expect(state.trackedProcesses.get(1234)?.agentName).toBe('Updated Agent');
    });
  });

  describe('auto refresh settings', () => {
    it('should set auto refresh enabled', () => {
      act(() => {
        useProcessStore.getState().setAutoRefresh(false);
      });

      expect(useProcessStore.getState().autoRefresh).toBe(false);

      act(() => {
        useProcessStore.getState().setAutoRefresh(true);
      });

      expect(useProcessStore.getState().autoRefresh).toBe(true);
    });

    it('should set auto refresh interval', () => {
      act(() => {
        useProcessStore.getState().setAutoRefreshInterval(10000);
      });

      expect(useProcessStore.getState().autoRefreshInterval).toBe(10000);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useProcessStore.getState().setProcesses([
          { pid: 1, name: 'test', cpuPercent: 1, memoryBytes: 1000, status: 'running' },
        ]);
        useProcessStore.getState().setLoading(true);
        useProcessStore.getState().setError('error');
        useProcessStore.getState().trackProcess({
          pid: 1,
          startedAt: new Date(),
          program: 'test',
        });
        useProcessStore.getState().setAutoRefresh(false);
        useProcessStore.getState().reset();
      });

      const state = useProcessStore.getState();
      expect(state.processes).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.trackedProcesses.size).toBe(0);
      expect(state.autoRefresh).toBe(true);
    });
  });

  describe('config management', () => {
    it('should have correct default config', () => {
      expect(DEFAULT_PROCESS_CONFIG).toEqual({
        enabled: false,
        allowedPrograms: [],
        deniedPrograms: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'reboot'],
        allowTerminateAny: false,
        onlyTerminateOwn: true,
        maxTrackedProcesses: 100,
        defaultTimeoutSecs: 30,
      });
    });

    it('should set config', () => {
      const newConfig = {
        ...DEFAULT_PROCESS_CONFIG,
        enabled: true,
        allowedPrograms: ['python', 'node'],
      };

      act(() => {
        useProcessStore.getState().setConfig(newConfig);
      });

      const state = useProcessStore.getState();
      expect(state.config).toEqual(newConfig);
      expect(state.configLoading).toBe(false);
    });

    it('should set config loading state', () => {
      act(() => {
        useProcessStore.getState().setConfigLoading(true);
      });

      expect(useProcessStore.getState().configLoading).toBe(true);

      act(() => {
        useProcessStore.getState().setConfigLoading(false);
      });

      expect(useProcessStore.getState().configLoading).toBe(false);
    });

    it('should clear configLoading when setting config', () => {
      act(() => {
        useProcessStore.getState().setConfigLoading(true);
        useProcessStore.getState().setConfig(DEFAULT_PROCESS_CONFIG);
      });

      expect(useProcessStore.getState().configLoading).toBe(false);
    });

    it('should update allowed programs', () => {
      const config = {
        ...DEFAULT_PROCESS_CONFIG,
        allowedPrograms: ['python', 'node', 'npm'],
      };

      act(() => {
        useProcessStore.getState().setConfig(config);
      });

      expect(useProcessStore.getState().config.allowedPrograms).toEqual(['python', 'node', 'npm']);
    });

    it('should update denied programs', () => {
      const config = {
        ...DEFAULT_PROCESS_CONFIG,
        deniedPrograms: ['rm', 'del', 'format', 'shutdown'],
      };

      act(() => {
        useProcessStore.getState().setConfig(config);
      });

      expect(useProcessStore.getState().config.deniedPrograms).toEqual(['rm', 'del', 'format', 'shutdown']);
    });

    it('should update termination settings', () => {
      const config = {
        ...DEFAULT_PROCESS_CONFIG,
        allowTerminateAny: true,
        onlyTerminateOwn: false,
      };

      act(() => {
        useProcessStore.getState().setConfig(config);
      });

      const state = useProcessStore.getState();
      expect(state.config.allowTerminateAny).toBe(true);
      expect(state.config.onlyTerminateOwn).toBe(false);
    });

    it('should reset config to default on store reset', () => {
      act(() => {
        useProcessStore.getState().setConfig({
          ...DEFAULT_PROCESS_CONFIG,
          enabled: true,
          allowedPrograms: ['python'],
        });
        useProcessStore.getState().reset();
      });

      expect(useProcessStore.getState().config).toEqual(DEFAULT_PROCESS_CONFIG);
    });
  });

  describe('selectors', () => {
    const mockProcesses: ProcessInfo[] = [
      { pid: 1234, name: 'node.exe', cpuPercent: 5.2, memoryBytes: 1024000, status: 'running' },
    ];

    it('selectProcesses returns processes', () => {
      act(() => {
        useProcessStore.getState().setProcesses(mockProcesses);
      });

      expect(selectProcesses(useProcessStore.getState())).toEqual(mockProcesses);
    });

    it('selectIsLoading returns loading state', () => {
      act(() => {
        useProcessStore.getState().setLoading(true);
      });

      expect(selectIsLoading(useProcessStore.getState())).toBe(true);
    });

    it('selectTrackedPids returns array of tracked PIDs', () => {
      act(() => {
        useProcessStore.getState().trackProcess({
          pid: 1234,
          startedAt: new Date(),
          program: 'node',
        });
        useProcessStore.getState().trackProcess({
          pid: 5678,
          startedAt: new Date(),
          program: 'python',
        });
      });

      const pids = selectTrackedPids(useProcessStore.getState());
      expect(pids).toContain(1234);
      expect(pids).toContain(5678);
      expect(pids.length).toBe(2);
    });

    it('selectTrackedByAgent filters by agent ID', () => {
      act(() => {
        useProcessStore.getState().trackProcess({
          pid: 1234,
          agentId: 'agent-1',
          startedAt: new Date(),
          program: 'node',
        });
        useProcessStore.getState().trackProcess({
          pid: 5678,
          agentId: 'agent-2',
          startedAt: new Date(),
          program: 'python',
        });
        useProcessStore.getState().trackProcess({
          pid: 9012,
          agentId: 'agent-1',
          startedAt: new Date(),
          program: 'npm',
        });
      });

      const agent1Processes = selectTrackedByAgent('agent-1')(useProcessStore.getState());
      expect(agent1Processes.length).toBe(2);
      expect(agent1Processes.every((p) => p.agentId === 'agent-1')).toBe(true);

      const agent2Processes = selectTrackedByAgent('agent-2')(useProcessStore.getState());
      expect(agent2Processes.length).toBe(1);
      expect(agent2Processes[0].pid).toBe(5678);
    });
  });
});
