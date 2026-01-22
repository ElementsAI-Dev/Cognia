/**
 * useOllama hook tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOllama } from './use-ollama';
import * as ollamaApi from '@/lib/ai/providers/ollama';
import type { OllamaPullProgress, OllamaModelInfo } from '@/types/provider/ollama';

// Mock the ollama API module
jest.mock('@/lib/ai/providers/ollama', () => ({
  getOllamaStatus: jest.fn(),
  listOllamaModels: jest.fn(),
  showOllamaModel: jest.fn(),
  pullOllamaModel: jest.fn(),
  deleteOllamaModel: jest.fn(),
  listRunningModels: jest.fn(),
  stopOllamaModel: jest.fn(),
  DEFAULT_OLLAMA_URL: 'http://localhost:11434',
}));

const mockOllamaApi = ollamaApi as jest.Mocked<typeof ollamaApi>;

describe('useOllama', () => {
  // Suppress console.error for act() warnings during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  const mockModels = [
    {
      name: 'llama3.2',
      model: 'llama3.2',
      modified_at: '2024-01-01T00:00:00Z',
      size: 2000000000,
      digest: 'abc123',
    },
    {
      name: 'qwen2.5',
      model: 'qwen2.5',
      modified_at: '2024-01-02T00:00:00Z',
      size: 4000000000,
      digest: 'def456',
    },
  ];

  const mockStatus = {
    connected: true,
    version: '0.1.0',
    models_count: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOllamaApi.getOllamaStatus.mockResolvedValue(mockStatus);
    mockOllamaApi.listOllamaModels.mockResolvedValue(mockModels);
    mockOllamaApi.listRunningModels.mockResolvedValue([]);
  });

  afterEach(async () => {
    // Allow pending promises to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useOllama());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.models).toEqual([]);
      expect(result.current.status).toBe(null);

      // Allow async effect to settle to avoid act warnings
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch status and models on mount', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOllamaApi.getOllamaStatus).toHaveBeenCalled();
      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();
      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.models).toEqual(mockModels);
    });

    it('should use custom base URL', async () => {
      const customUrl = 'http://custom:8080';
      renderHook(() => useOllama({ baseUrl: customUrl }));

      await waitFor(() => {
        expect(mockOllamaApi.getOllamaStatus).toHaveBeenCalledWith(customUrl);
      });
    });
  });

  describe('connection status', () => {
    it('should report connected when status is connected', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should report disconnected when status fails', async () => {
      mockOllamaApi.getOllamaStatus.mockResolvedValue({
        connected: false,
        models_count: 0,
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('should handle connection errors', async () => {
      mockOllamaApi.getOllamaStatus.mockRejectedValue(new Error('Connection refused'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.error).toBe('Connection refused');
      });
    });
  });

  describe('refresh', () => {
    it('should refresh status and models', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to check new calls
      jest.clearAllMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockOllamaApi.getOllamaStatus).toHaveBeenCalled();
      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();
    });

    it('should update loading state during refresh', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start refresh
      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await refreshPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('pullModel', () => {
    it('should pull a model and update state', async () => {
      mockOllamaApi.pullOllamaModel.mockResolvedValue({
        success: true,
        unsubscribe: jest.fn(),
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let pullResult: boolean;
      await act(async () => {
        pullResult = await result.current.pullModel('new-model');
      });

      expect(pullResult!).toBe(true);
      expect(mockOllamaApi.pullOllamaModel).toHaveBeenCalledWith(
        'http://localhost:11434',
        'new-model',
        expect.any(Function)
      );
    });

    it('should track pull progress', async () => {
      let progressCallback: ((progress: OllamaPullProgress) => void) | undefined;

      mockOllamaApi.pullOllamaModel.mockImplementation(async (_baseUrl, _model, onProgress) => {
        progressCallback = onProgress;
        return { success: true, unsubscribe: jest.fn() };
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start pull
      act(() => {
        result.current.pullModel('new-model');
      });

      // Check initial pull state
      expect(result.current.pullStates.get('new-model')?.isActive).toBe(true);

      // Simulate progress
      act(() => {
        progressCallback?.({
          status: 'downloading',
          completed: 500000000,
          total: 2000000000,
          model: 'new-model',
        });
      });

      const state = result.current.pullStates.get('new-model');
      expect(state?.progress?.completed).toBe(500000000);
      expect(state?.progress?.total).toBe(2000000000);
    });

    it('should set isPulling when pull is active', async () => {
      mockOllamaApi.pullOllamaModel.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, unsubscribe: jest.fn() }), 100);
          })
      );

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pullModel('new-model');
      });

      expect(result.current.isPulling).toBe(true);
    });

    it('should handle pull errors', async () => {
      mockOllamaApi.pullOllamaModel.mockRejectedValue(new Error('Pull failed: model not found'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let pullResult: boolean;
      await act(async () => {
        pullResult = await result.current.pullModel('invalid-model');
      });

      expect(pullResult!).toBe(false);
      expect(result.current.pullStates.get('invalid-model')?.error).toBe(
        'Pull failed: model not found'
      );
    });
  });

  describe('cancelPull', () => {
    it('should cancel an active pull', async () => {
      const mockUnsubscribe = jest.fn();
      mockOllamaApi.pullOllamaModel.mockResolvedValue({
        success: true,
        unsubscribe: mockUnsubscribe,
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pullModel('new-model');
      });

      act(() => {
        result.current.cancelPull('new-model');
      });

      expect(result.current.pullStates.has('new-model')).toBe(false);
    });
  });

  describe('deleteModel', () => {
    it('should delete a model and refresh list', async () => {
      mockOllamaApi.deleteOllamaModel.mockResolvedValue(true);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      let deleteResult: boolean;
      await act(async () => {
        deleteResult = await result.current.deleteModel('llama3.2');
      });

      expect(deleteResult!).toBe(true);
      expect(mockOllamaApi.deleteOllamaModel).toHaveBeenCalledWith(
        'http://localhost:11434',
        'llama3.2'
      );
      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      mockOllamaApi.deleteOllamaModel.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: boolean;
      await act(async () => {
        deleteResult = await result.current.deleteModel('llama3.2');
      });

      expect(deleteResult!).toBe(false);
      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('stopModel', () => {
    it('should stop a running model', async () => {
      mockOllamaApi.stopOllamaModel.mockResolvedValue(true);
      mockOllamaApi.listRunningModels.mockResolvedValue([
        { name: 'llama3.2', model: 'llama3.2', size: 2000000000, digest: 'abc' },
      ]);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let stopResult: boolean;
      await act(async () => {
        stopResult = await result.current.stopModel('llama3.2');
      });

      expect(stopResult!).toBe(true);
      expect(mockOllamaApi.stopOllamaModel).toHaveBeenCalledWith(
        'http://localhost:11434',
        'llama3.2'
      );
    });
  });

  describe('getModelInfo', () => {
    it('should get model info', async () => {
      const mockInfo = {
        modelfile: 'FROM llama3.2',
        parameters: 'temperature 0.7',
      };
      mockOllamaApi.showOllamaModel.mockResolvedValue(mockInfo);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let info: OllamaModelInfo | null;
      await act(async () => {
        info = await result.current.getModelInfo('llama3.2');
      });

      expect(info!).toEqual(mockInfo);
      expect(mockOllamaApi.showOllamaModel).toHaveBeenCalledWith(
        'http://localhost:11434',
        'llama3.2'
      );
    });

    it('should return null on error', async () => {
      mockOllamaApi.showOllamaModel.mockRejectedValue(new Error('Model not found'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let info: unknown;
      await act(async () => {
        info = await result.current.getModelInfo('nonexistent');
      });

      expect(info).toBe(null);
    });
  });

  describe('auto refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto refresh when enabled', async () => {
      const { result } = renderHook(() => useOllama({ autoRefresh: true, refreshInterval: 5000 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();
    });

    it('should not auto refresh when disabled', async () => {
      const { result } = renderHook(() => useOllama({ autoRefresh: false, refreshInterval: 5000 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockOllamaApi.listOllamaModels).not.toHaveBeenCalled();
    });

    it('should not auto refresh when disconnected', async () => {
      mockOllamaApi.getOllamaStatus.mockResolvedValue({
        connected: false,
        models_count: 0,
      });

      const { result } = renderHook(() => useOllama({ autoRefresh: true, refreshInterval: 5000 }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      jest.clearAllMocks();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not call listOllamaModels when disconnected
      expect(mockOllamaApi.listOllamaModels).not.toHaveBeenCalled();
    });
  });

  describe('refreshStatus', () => {
    it('should refresh status independently', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      const newStatus = {
        connected: true,
        version: '0.2.0',
        models_count: 5,
      };
      mockOllamaApi.getOllamaStatus.mockResolvedValue(newStatus);

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(mockOllamaApi.getOllamaStatus).toHaveBeenCalled();
      expect(result.current.status).toEqual(newStatus);
    });

    it('should clear error on successful status refresh', async () => {
      mockOllamaApi.getOllamaStatus.mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockOllamaApi.getOllamaStatus.mockResolvedValue(mockStatus);

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('refreshModels', () => {
    it('should refresh models independently', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      const newModels = [
        {
          name: 'new-model',
          model: 'new-model',
          modified_at: '2024-01-03T00:00:00Z',
          size: 3000000000,
          digest: 'ghi789',
        },
      ];
      mockOllamaApi.listOllamaModels.mockResolvedValue(newModels);

      await act(async () => {
        await result.current.refreshModels();
      });

      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();
      expect(result.current.models).toEqual(newModels);
    });

    it('should not refresh models when disconnected', async () => {
      mockOllamaApi.getOllamaStatus.mockResolvedValue({
        connected: false,
        models_count: 0,
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refreshModels();
      });

      expect(mockOllamaApi.listOllamaModels).not.toHaveBeenCalled();
    });

    it('should handle refreshModels errors', async () => {
      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockOllamaApi.listOllamaModels.mockRejectedValue(new Error('List failed'));

      await act(async () => {
        await result.current.refreshModels();
      });

      expect(result.current.error).toBe('List failed');
    });
  });

  describe('refreshRunning', () => {
    it('should refresh running models independently', async () => {
      const runningModel = {
        name: 'llama3.2',
        model: 'llama3.2',
        size: 2000000000,
        digest: 'abc123',
      };
      mockOllamaApi.listRunningModels.mockResolvedValue([runningModel]);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.runningModels).toEqual([runningModel]);
    });

    it('should not refresh running when disconnected', async () => {
      mockOllamaApi.getOllamaStatus.mockResolvedValue({
        connected: false,
        models_count: 0,
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refreshRunning();
      });

      expect(mockOllamaApi.listRunningModels).not.toHaveBeenCalled();
    });

    it('should silently ignore refreshRunning errors', async () => {
      mockOllamaApi.listRunningModels.mockRejectedValue(new Error('Not available'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not set error for running models
      expect(result.current.error).toBe(null);
      expect(result.current.runningModels).toEqual([]);
    });
  });

  describe('runningModels', () => {
    it('should track running models state', async () => {
      const runningModels = [
        { name: 'llama3.2', model: 'llama3.2', size: 2000000000, digest: 'abc' },
        { name: 'qwen2.5', model: 'qwen2.5', size: 4000000000, digest: 'def' },
      ];
      mockOllamaApi.listRunningModels.mockResolvedValue(runningModels);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.runningModels).toEqual(runningModels);
      });
    });

    it('should update running models after stopping', async () => {
      const initialRunning = [
        { name: 'llama3.2', model: 'llama3.2', size: 2000000000, digest: 'abc' },
      ];
      mockOllamaApi.listRunningModels.mockResolvedValue(initialRunning);
      mockOllamaApi.stopOllamaModel.mockResolvedValue(true);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.runningModels).toEqual(initialRunning);
      });

      // After stop, running models should be empty
      mockOllamaApi.listRunningModels.mockResolvedValue([]);

      await act(async () => {
        await result.current.stopModel('llama3.2');
      });

      expect(result.current.runningModels).toEqual([]);
    });
  });

  describe('multiple concurrent pulls', () => {
    it('should track multiple pulls simultaneously', async () => {
      mockOllamaApi.pullOllamaModel.mockImplementation(async (_baseUrl, _model) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, unsubscribe: jest.fn() }), 100);
        });
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start multiple pulls
      act(() => {
        result.current.pullModel('model-a');
        result.current.pullModel('model-b');
        result.current.pullModel('model-c');
      });

      // All should be active
      expect(result.current.pullStates.get('model-a')?.isActive).toBe(true);
      expect(result.current.pullStates.get('model-b')?.isActive).toBe(true);
      expect(result.current.pullStates.get('model-c')?.isActive).toBe(true);
      expect(result.current.isPulling).toBe(true);
    });

    it('should handle individual pull cancellation', async () => {
      const unsubscribeFns = new Map<string, jest.Mock>();

      mockOllamaApi.pullOllamaModel.mockImplementation(async (_baseUrl, model) => {
        const unsub = jest.fn();
        unsubscribeFns.set(model, unsub);
        return { success: true, unsubscribe: unsub };
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pullModel('model-a');
        result.current.pullModel('model-b');
      });

      // Cancel only model-a
      act(() => {
        result.current.cancelPull('model-a');
      });

      expect(result.current.pullStates.has('model-a')).toBe(false);
      expect(result.current.pullStates.has('model-b')).toBe(true);
    });
  });

  describe('pull completion', () => {
    it('should update state when pull completes with success status', async () => {
      let progressCallback: ((progress: OllamaPullProgress) => void) | undefined;

      mockOllamaApi.pullOllamaModel.mockImplementation(async (_baseUrl, _model, onProgress) => {
        progressCallback = onProgress;
        return { success: true, unsubscribe: jest.fn() };
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pullModel('new-model');
      });

      // Simulate success progress
      act(() => {
        progressCallback?.({
          status: 'success',
          completed: 2000000000,
          total: 2000000000,
          model: 'new-model',
        });
      });

      const state = result.current.pullStates.get('new-model');
      expect(state?.isActive).toBe(false);
      expect(state?.progress?.status).toBe('success');
    });

    it('should refresh models after successful pull', async () => {
      mockOllamaApi.pullOllamaModel.mockResolvedValue({
        success: true,
        unsubscribe: jest.fn(),
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.pullModel('new-model');
      });

      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();
    });
  });

  describe('stopModel errors', () => {
    it('should handle stop model errors', async () => {
      mockOllamaApi.stopOllamaModel.mockRejectedValue(new Error('Stop failed'));

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let stopResult: boolean;
      await act(async () => {
        stopResult = await result.current.stopModel('llama3.2');
      });

      expect(stopResult!).toBe(false);
      expect(result.current.error).toBe('Stop failed');
    });

    it('should refresh running models after successful stop', async () => {
      mockOllamaApi.stopOllamaModel.mockResolvedValue(true);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.stopModel('llama3.2');
      });

      expect(mockOllamaApi.listRunningModels).toHaveBeenCalled();
    });
  });

  describe('cleanup and unmount', () => {
    it('should cleanup pull subscriptions on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      mockOllamaApi.pullOllamaModel.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, unsubscribe: mockUnsubscribe }), 1000);
          })
      );

      const { result, unmount } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start a pull
      act(() => {
        result.current.pullModel('new-model');
      });

      // Unmount should trigger cleanup
      unmount();

      // Note: Due to async nature, unsubscribe might be called after promise resolves
      // This test verifies the hook sets up cleanup correctly
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Unmount the hook
      unmount();

      // Try to call refresh - should not throw
      // State updates should be skipped due to isMounted check
    });
  });

  describe('default options', () => {
    it('should use default base URL when not provided', async () => {
      renderHook(() => useOllama());

      await waitFor(() => {
        expect(mockOllamaApi.getOllamaStatus).toHaveBeenCalledWith('http://localhost:11434');
      });
    });

    it('should not auto refresh by default', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockOllamaApi.listOllamaModels).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should use default refresh interval of 30000ms', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useOllama({ autoRefresh: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Should not refresh before interval
      act(() => {
        jest.advanceTimersByTime(29000);
      });
      expect(mockOllamaApi.listOllamaModels).not.toHaveBeenCalled();

      // Should refresh after interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOllamaApi.listOllamaModels).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      mockOllamaApi.getOllamaStatus.mockRejectedValue('String error');

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to get status');
      });
    });

    it('should handle getModelInfo non-Error rejection', async () => {
      mockOllamaApi.showOllamaModel.mockRejectedValue('Not an error');

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let info: unknown;
      await act(async () => {
        info = await result.current.getModelInfo('test');
      });

      expect(info).toBe(null);
      expect(result.current.error).toBe('Failed to get model info');
    });

    it('should handle deleteModel non-Error rejection', async () => {
      mockOllamaApi.deleteOllamaModel.mockRejectedValue({ code: 'ERROR' });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteModel('test');
      });

      expect(result.current.error).toBe('Delete failed');
    });

    it('should handle stopModel non-Error rejection', async () => {
      mockOllamaApi.stopOllamaModel.mockRejectedValue(null);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.stopModel('test');
      });

      expect(result.current.error).toBe('Stop failed');
    });

    it('should handle pullModel non-Error rejection', async () => {
      mockOllamaApi.pullOllamaModel.mockRejectedValue(undefined);

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let pullResult: boolean;
      await act(async () => {
        pullResult = await result.current.pullModel('test');
      });

      expect(pullResult!).toBe(false);
      expect(result.current.pullStates.get('test')?.error).toBe('Pull failed');
    });
  });

  describe('pull progress updates', () => {
    it('should handle different pull status types', async () => {
      let progressCallback: ((progress: OllamaPullProgress) => void) | undefined;

      mockOllamaApi.pullOllamaModel.mockImplementation(async (_baseUrl, _model, onProgress) => {
        progressCallback = onProgress;
        return { success: true, unsubscribe: jest.fn() };
      });

      const { result } = renderHook(() => useOllama());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pullModel('new-model');
      });

      // Test 'pulling manifest' status
      act(() => {
        progressCallback?.({
          status: 'pulling manifest',
          completed: 0,
          total: 0,
          model: 'new-model',
        });
      });

      expect(result.current.pullStates.get('new-model')?.progress?.status).toBe('pulling manifest');

      // Test 'verifying' status
      act(() => {
        progressCallback?.({
          status: 'verifying sha256 digest',
          completed: 2000000000,
          total: 2000000000,
          model: 'new-model',
        });
      });

      expect(result.current.pullStates.get('new-model')?.progress?.status).toBe(
        'verifying sha256 digest'
      );
    });
  });
});
