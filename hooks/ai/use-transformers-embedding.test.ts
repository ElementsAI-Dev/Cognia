/**
 * useTransformersEmbedding hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { useTransformersEmbedding } from './use-transformers-embedding';
import { useTransformersStore } from '@/stores/ai/transformers-store';

// Mock embedding results
const mockEmbedding = new Array(384).fill(0).map((_, i) => Math.sin(i) * 0.1);

const mockGenerateEmbedding = jest.fn().mockResolvedValue({
  embedding: mockEmbedding,
  modelId: 'Xenova/all-MiniLM-L6-v2',
  dimension: 384,
  duration: 120,
});

const mockGenerateEmbeddings = jest.fn().mockResolvedValue({
  embeddings: [mockEmbedding, mockEmbedding],
  modelId: 'Xenova/all-MiniLM-L6-v2',
  dimension: 384,
  duration: 240,
});

const mockLoadModel = jest.fn().mockResolvedValue({
  task: 'feature-extraction',
  modelId: 'Xenova/all-MiniLM-L6-v2',
  duration: 500,
});

const mockDispose = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/ai/transformers/transformers-manager', () => ({
  getTransformersManager: () => ({
    generateEmbedding: mockGenerateEmbedding,
    generateEmbeddings: mockGenerateEmbeddings,
    loadModel: mockLoadModel,
    dispose: mockDispose,
  }),
  isWebGPUAvailable: () => false,
  isWebWorkerAvailable: () => true,
}));

jest.mock('@/lib/ai/transformers', () => ({
  isWebGPUAvailable: () => false,
  isWebWorkerAvailable: () => true,
  TRANSFORMERS_EMBEDDING_MODELS: {
    'Xenova/all-MiniLM-L6-v2': { dimensions: 384, sizeInMB: 23 },
    'Xenova/bge-small-en-v1.5': { dimensions: 384, sizeInMB: 33 },
  },
}));

beforeEach(() => {
  useTransformersStore.getState().reset();
  jest.clearAllMocks();
});

describe('useTransformersEmbedding', () => {
  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useTransformersEmbedding());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isReady).toBe(false);
      expect(result.current.isEmbedding).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.dimension).toBe(384);
      expect(result.current.isSupported).toBe(true);
      expect(typeof result.current.embed).toBe('function');
      expect(typeof result.current.embedBatch).toBe('function');
      expect(typeof result.current.loadModel).toBe('function');
      expect(typeof result.current.dispose).toBe('function');
    });

    it('uses default model id when none specified', () => {
      const { result } = renderHook(() => useTransformersEmbedding());
      expect(result.current.dimension).toBe(384);
    });

    it('accepts custom model id', () => {
      const { result } = renderHook(() =>
        useTransformersEmbedding({ modelId: 'Xenova/bge-small-en-v1.5' })
      );
      expect(result.current.dimension).toBe(384);
    });
  });

  describe('loadModel', () => {
    it('sets error when not enabled', async () => {
      const { result } = renderHook(() => useTransformersEmbedding());

      await act(async () => {
        await result.current.loadModel();
      });

      expect(result.current.error).toBe('Transformers.js is not enabled or not supported');
    });

    it('loads model when enabled', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() => useTransformersEmbedding());

      await act(async () => {
        await result.current.loadModel();
      });

      expect(mockLoadModel).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        expect.objectContaining({
          device: 'wasm',
          dtype: 'q8',
        })
      );
    });
  });

  describe('embed', () => {
    it('throws when not enabled', async () => {
      const { result } = renderHook(() => useTransformersEmbedding());

      await expect(
        act(async () => {
          await result.current.embed('test text');
        })
      ).rejects.toThrow('Transformers.js is not enabled or not supported');
    });

    it('generates embedding when enabled', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() => useTransformersEmbedding());

      let embeddingResult: unknown;
      await act(async () => {
        embeddingResult = await result.current.embed('Hello world');
      });

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        'Hello world',
        'Xenova/all-MiniLM-L6-v2',
        expect.objectContaining({
          device: 'wasm',
          dtype: 'q8',
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((embeddingResult as any).embedding).toHaveLength(384);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((embeddingResult as any).dimension).toBe(384);
    });
  });

  describe('embedBatch', () => {
    it('throws when not enabled', async () => {
      const { result } = renderHook(() => useTransformersEmbedding());

      await expect(
        act(async () => {
          await result.current.embedBatch(['text1', 'text2']);
        })
      ).rejects.toThrow('Transformers.js is not enabled or not supported');
    });

    it('generates batch embeddings when enabled', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() => useTransformersEmbedding());

      let batchResult: unknown;
      await act(async () => {
        batchResult = await result.current.embedBatch(['Hello', 'World']);
      });

      expect(mockGenerateEmbeddings).toHaveBeenCalledWith(
        ['Hello', 'World'],
        'Xenova/all-MiniLM-L6-v2',
        expect.objectContaining({
          device: 'wasm',
          dtype: 'q8',
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((batchResult as any).embeddings).toHaveLength(2);
    });
  });

  describe('dispose', () => {
    it('calls manager dispose with correct args', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() => useTransformersEmbedding());

      await act(async () => {
        await result.current.dispose();
      });

      expect(mockDispose).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    });
  });

  describe('error handling', () => {
    it('rejects on embed failure', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('Model load failed'));

      const { result } = renderHook(() => useTransformersEmbedding());

      await expect(
        act(async () => {
          await result.current.embed('test');
        })
      ).rejects.toThrow('Model load failed');

      // isEmbedding should be false after error
      expect(result.current.isEmbedding).toBe(false);
    });

    it('succeeds after a previous failure', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('Temporary error'));

      const { result } = renderHook(() => useTransformersEmbedding());

      // First call fails
      try {
        await act(async () => {
          await result.current.embed('test');
        });
      } catch {
        // expected
      }

      // Second call succeeds — restore mock
      mockGenerateEmbedding.mockResolvedValueOnce({
        embedding: mockEmbedding,
        modelId: 'Xenova/all-MiniLM-L6-v2',
        dimension: 384,
        duration: 100,
      });

      let secondResult: unknown;
      await act(async () => {
        secondResult = await result.current.embed('test again');
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((secondResult as any).embedding).toHaveLength(384);
      expect(result.current.error).toBeNull();
    });
  });
});
