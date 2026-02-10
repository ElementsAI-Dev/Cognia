/**
 * useTransformers hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { useTransformers } from './use-transformers';
import { useTransformersStore } from '@/stores/ai/transformers-store';

// Mock the transformers manager module
const mockLoadModel = jest.fn().mockResolvedValue({ task: 'text-classification', modelId: 'Xenova/test', duration: 100 });
const mockInfer = jest.fn().mockResolvedValue({
  task: 'text-classification',
  modelId: 'Xenova/test',
  output: [{ label: 'POSITIVE', score: 0.99 }],
  duration: 50,
});
const mockDispose = jest.fn().mockResolvedValue(undefined);
const mockGetTransformersManager = jest.fn().mockReturnValue({
  loadModel: mockLoadModel,
  infer: mockInfer,
  dispose: mockDispose,
});

jest.mock('@/lib/ai/transformers/transformers-manager', () => ({
  getTransformersManager: () => mockGetTransformersManager(),
  isWebGPUAvailable: () => false,
  isWebWorkerAvailable: () => true,
}));

jest.mock('@/lib/ai/transformers', () => ({
  isWebGPUAvailable: () => false,
  isWebWorkerAvailable: () => true,
}));

// Reset store before each test
beforeEach(() => {
  useTransformersStore.getState().reset();
  jest.clearAllMocks();
});

describe('useTransformers', () => {
  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification' })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInferring).toBe(false);
      expect(result.current.isModelReady).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(true);
      expect(typeof result.current.infer).toBe('function');
      expect(typeof result.current.loadModel).toBe('function');
      expect(typeof result.current.dispose).toBe('function');
    });

    it('uses default model when none specified', () => {
      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification' })
      );

      // Should not throw - default model is resolved internally
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('loadModel', () => {
    it('sets error when not enabled', async () => {
      // Settings default: enabled = false
      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification' })
      );

      await act(async () => {
        await result.current.loadModel();
      });

      expect(result.current.error).toBe('Transformers.js is not enabled or not supported');
    });

    it('loads model when enabled', async () => {
      // Enable first
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification', modelId: 'Xenova/test' })
      );

      await act(async () => {
        await result.current.loadModel();
      });

      expect(mockLoadModel).toHaveBeenCalledWith(
        'text-classification',
        'Xenova/test',
        expect.objectContaining({
          device: 'wasm',
          dtype: 'q8',
        })
      );
    });
  });

  describe('infer', () => {
    it('throws when not enabled', async () => {
      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification' })
      );

      await expect(
        act(async () => {
          await result.current.infer('test input');
        })
      ).rejects.toThrow('Transformers.js is not enabled or not supported');
    });

    it('runs inference when enabled', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification', modelId: 'Xenova/test' })
      );

      let inferResult: unknown;
      await act(async () => {
        inferResult = await result.current.infer('I love this!');
      });

      expect(mockInfer).toHaveBeenCalledWith(
        'text-classification',
        'Xenova/test',
        'I love this!',
        expect.objectContaining({
          device: 'wasm',
          dtype: 'q8',
        })
      );
      expect(inferResult).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('calls manager dispose', async () => {
      useTransformersStore.getState().updateSettings({ enabled: true });

      const { result } = renderHook(() =>
        useTransformers({ task: 'text-classification', modelId: 'Xenova/test' })
      );

      await act(async () => {
        await result.current.dispose();
      });

      expect(mockDispose).toHaveBeenCalledWith('text-classification', 'Xenova/test');
    });
  });
});
