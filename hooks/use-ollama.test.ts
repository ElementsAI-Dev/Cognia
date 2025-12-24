/**
 * useOllama hook tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOllama } from './use-ollama';
import * as ollamaApi from '@/lib/ai/ollama';
import type { OllamaPullProgress, OllamaModelInfo } from '@/types/ollama';

// Mock the ollama API module
jest.mock('@/lib/ai/ollama', () => ({
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

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useOllama());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.models).toEqual([]);
      expect(result.current.status).toBe(null);
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
      mockOllamaApi.getOllamaStatus.mockRejectedValue(
        new Error('Connection refused')
      );

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

      mockOllamaApi.pullOllamaModel.mockImplementation(
        async (_baseUrl, _model, onProgress) => {
          progressCallback = onProgress;
          return { success: true, unsubscribe: jest.fn() };
        }
      );

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
            setTimeout(
              () => resolve({ success: true, unsubscribe: jest.fn() }),
              100
            );
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
      mockOllamaApi.pullOllamaModel.mockRejectedValue(
        new Error('Pull failed: model not found')
      );

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
      mockOllamaApi.deleteOllamaModel.mockRejectedValue(
        new Error('Delete failed')
      );

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
      mockOllamaApi.showOllamaModel.mockRejectedValue(
        new Error('Model not found')
      );

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
      const { result } = renderHook(() =>
        useOllama({ autoRefresh: true, refreshInterval: 5000 })
      );

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
      const { result } = renderHook(() =>
        useOllama({ autoRefresh: false, refreshInterval: 5000 })
      );

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

      const { result } = renderHook(() =>
        useOllama({ autoRefresh: true, refreshInterval: 5000 })
      );

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
});
