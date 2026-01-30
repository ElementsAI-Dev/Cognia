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
    });
  });

  describe('process list management', () => {
    it('should set processes', () => {
      const mockProcesses: ProcessInfo[] = [
        { pid: 1234, name: 'node.exe', cpu: 5.2, memory: 1024000 },
        { pid: 5678, name: 'code.exe', cpu: 2.1, memory: 512000 },
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
          { pid: 1, name: 'test', cpu: 1, memory: 1000 },
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

  describe('selectors', () => {
    const mockProcesses: ProcessInfo[] = [
      { pid: 1234, name: 'node.exe', cpu: 5.2, memory: 1024000 },
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
