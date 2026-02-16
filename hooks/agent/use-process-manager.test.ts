/**
 * Tests for useProcessManager hook
 */

import { renderHook, act } from '@testing-library/react';
import { useProcessManager } from './use-process-manager';
import { useProcessStore, DEFAULT_PROCESS_CONFIG } from '@/stores/agent/process-store';
import { processService, isProcessManagementAvailable } from '@/lib/native/process';

// Mock dependencies
jest.mock('@/lib/native/process', () => ({
  processService: {
    list: jest.fn(),
    search: jest.fn(),
    topMemory: jest.fn(),
    getTracked: jest.fn(),
    terminate: jest.fn(),
    start: jest.fn(),
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    isProgramAllowed: jest.fn(),
  },
  isProcessManagementAvailable: jest.fn(),
}));

const mockProcessService = processService as jest.Mocked<typeof processService>;
const mockIsAvailable = isProcessManagementAvailable as jest.MockedFunction<
  typeof isProcessManagementAvailable
>;

describe('useProcessManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProcessStore.getState().reset();
    // Disable auto-refresh to prevent background updates during tests
    useProcessStore.getState().setAutoRefresh(false);
    mockIsAvailable.mockReturnValue(true);
    // Default mock for list to prevent hanging promises
    mockProcessService.list.mockResolvedValue([]);
    mockProcessService.getTracked.mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('returns isAvailable based on platform check', () => {
      mockIsAvailable.mockReturnValue(true);
      const { result } = renderHook(() => useProcessManager());
      expect(result.current.isAvailable).toBe(true);
    });

    it('returns initial state from store', () => {
      const { result } = renderHook(() => useProcessManager());
      expect(result.current.processes).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.config).toEqual(DEFAULT_PROCESS_CONFIG);
    });
  });

  describe('refresh', () => {
    it('fetches process list and updates store', async () => {
      const mockProcesses = [
        { pid: 1234, name: 'node.exe', status: 'running' as const },
      ];
      mockProcessService.list.mockResolvedValue(mockProcesses);

      const { result } = renderHook(() => useProcessManager());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockProcessService.list).toHaveBeenCalled();
      expect(mockProcessService.getTracked).toHaveBeenCalled();
      expect(result.current.processes).toEqual(mockProcesses);
    });

    it('does nothing when not available', async () => {
      mockIsAvailable.mockReturnValue(false);
      const { result } = renderHook(() => useProcessManager());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockProcessService.list).not.toHaveBeenCalled();
    });
  });

  describe('terminate', () => {
    it('terminates process successfully', async () => {
      mockProcessService.terminate.mockResolvedValue({ success: true });
      mockProcessService.list.mockResolvedValue([]);

      const { result } = renderHook(() => useProcessManager());

      let success: boolean;
      await act(async () => {
        success = await result.current.terminate(1234);
      });

      expect(success!).toBe(true);
      expect(mockProcessService.terminate).toHaveBeenCalledWith({ pid: 1234, force: false });
    });

    it('returns false when not available', async () => {
      mockIsAvailable.mockReturnValue(false);
      const { result } = renderHook(() => useProcessManager());

      let success: boolean;
      await act(async () => {
        success = await result.current.terminate(1234);
      });

      expect(success!).toBe(false);
    });
  });

  describe('startProcess', () => {
    it('starts process and tracks it', async () => {
      mockProcessService.start.mockResolvedValue({ success: true, pid: 5678 });
      mockProcessService.getTracked.mockResolvedValue([5678]);

      const { result } = renderHook(() => useProcessManager());

      await act(async () => {
        await result.current.startProcess({ program: 'python' });
      });

      expect(mockProcessService.start).toHaveBeenCalledWith({ program: 'python' });
      expect(result.current.trackedPids).toContain(5678);
    });

    it('returns null when not available', async () => {
      mockIsAvailable.mockReturnValue(false);
      const { result } = renderHook(() => useProcessManager());

      let startResult: unknown;
      await act(async () => {
        startResult = await result.current.startProcess({ program: 'python' });
      });

      expect(startResult).toBeNull();
    });
  });

  describe('refreshConfig', () => {
    it('fetches config from backend', async () => {
      const mockConfig = { ...DEFAULT_PROCESS_CONFIG, enabled: true };
      mockProcessService.getConfig.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useProcessManager());

      await act(async () => {
        await result.current.refreshConfig();
      });

      expect(mockProcessService.getConfig).toHaveBeenCalled();
      expect(result.current.config).toEqual(mockConfig);
    });
  });

  describe('updateConfig', () => {
    it('updates config successfully', async () => {
      mockProcessService.updateConfig.mockResolvedValue(undefined);
      const newConfig = { ...DEFAULT_PROCESS_CONFIG, enabled: true };

      const { result } = renderHook(() => useProcessManager());

      let success: boolean;
      await act(async () => {
        success = await result.current.updateConfig(newConfig);
      });

      expect(success!).toBe(true);
      expect(mockProcessService.updateConfig).toHaveBeenCalledWith(newConfig);
      expect(result.current.config).toEqual(newConfig);
    });

    it('returns false on failure', async () => {
      mockProcessService.updateConfig.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useProcessManager());

      let success: boolean;
      await act(async () => {
        success = await result.current.updateConfig(DEFAULT_PROCESS_CONFIG);
      });

      expect(success!).toBe(false);
    });
  });

  describe('isProgramAllowed', () => {
    it('checks if program is allowed', async () => {
      mockProcessService.isProgramAllowed.mockResolvedValue(true);

      const { result } = renderHook(() => useProcessManager());

      let allowed: boolean;
      await act(async () => {
        allowed = await result.current.isProgramAllowed('python');
      });

      expect(allowed!).toBe(true);
    });

    it('returns false when not available', async () => {
      mockIsAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useProcessManager());

      let allowed: boolean;
      await act(async () => {
        allowed = await result.current.isProgramAllowed('python');
      });

      expect(allowed!).toBe(false);
    });
  });

  describe('trackProcess / untrackProcess', () => {
    it('tracks and untracks local agent metadata', () => {
      const { result } = renderHook(() => useProcessManager());

      act(() => {
        result.current.trackProcess({
          pid: 1234,
          agentId: 'agent-1',
          program: 'node',
          startedAt: new Date(),
        });
      });

      expect(result.current.getTrackedByAgent('agent-1')).toHaveLength(1);

      act(() => {
        result.current.untrackProcess(1234);
      });

      expect(result.current.getTrackedByAgent('agent-1')).toHaveLength(0);
    });
  });

  describe('autoRefresh', () => {
    it('toggles auto refresh setting', () => {
      const { result } = renderHook(() => useProcessManager());
      // Initially false due to beforeEach setup
      expect(result.current.autoRefresh).toBe(false);

      act(() => {
        result.current.setAutoRefresh(true);
      });

      expect(result.current.autoRefresh).toBe(true);
    });
  });
});
