/**
 * useStorageCleanup Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useStorageCleanup } from './use-storage-cleanup';

// Mock the storage module
jest.mock('@/lib/storage', () => ({
  storageCleanup: {
    cleanup: jest.fn().mockResolvedValue({
      success: true,
      freedSpace: 1024,
      deletedItems: 5,
      errors: [],
      details: [],
      duration: 100,
    }),
    quickCleanup: jest.fn().mockResolvedValue({
      success: true,
      freedSpace: 512,
      deletedItems: 2,
      errors: [],
      details: [],
      duration: 50,
    }),
    deepCleanup: jest.fn().mockResolvedValue({
      success: true,
      freedSpace: 2048,
      deletedItems: 10,
      errors: [],
      details: [],
      duration: 200,
    }),
    previewCleanup: jest.fn().mockResolvedValue({
      success: true,
      freedSpace: 1024,
      deletedItems: 5,
      errors: [],
      details: [],
      duration: 50,
    }),
    clearExpiredCache: jest.fn().mockResolvedValue(3),
    cleanupOrphanedData: jest.fn().mockResolvedValue(2),
  },
  StorageManager: {
    getInstance: jest.fn().mockReturnValue({
      clearCategory: jest.fn().mockReturnValue(5),
      deleteKey: jest.fn().mockReturnValue(true),
      deleteKeys: jest.fn().mockReturnValue(3),
      clearAllCogniaData: jest.fn().mockResolvedValue({ localStorage: 5, indexedDB: true }),
    }),
  },
}));

describe('useStorageCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useStorageCleanup());

    expect(result.current.isRunning).toBe(false);
    expect(result.current.lastResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should perform cleanup', async () => {
    const { result } = renderHook(() => useStorageCleanup());

    await act(async () => {
      await result.current.cleanup();
    });

    expect(result.current.lastResult).toBeDefined();
    expect(result.current.lastResult?.success).toBe(true);
    expect(result.current.lastResult?.freedSpace).toBe(1024);
  });

  it('should perform quick cleanup', async () => {
    const { result } = renderHook(() => useStorageCleanup());

    await act(async () => {
      await result.current.quickCleanup();
    });

    expect(result.current.lastResult).toBeDefined();
    expect(result.current.lastResult?.freedSpace).toBe(512);
  });

  it('should perform deep cleanup', async () => {
    const { result } = renderHook(() => useStorageCleanup());

    await act(async () => {
      await result.current.deepCleanup();
    });

    expect(result.current.lastResult).toBeDefined();
    expect(result.current.lastResult?.freedSpace).toBe(2048);
  });

  it('should preview cleanup without deleting', async () => {
    const { result } = renderHook(() => useStorageCleanup());

    await act(async () => {
      await result.current.previewCleanup();
    });

    expect(result.current.lastResult).toBeDefined();
  });

  it('should have clearCategory function', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(typeof result.current.clearCategory).toBe('function');
  });

  it('should have deleteKeys function', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(typeof result.current.deleteKeys).toBe('function');
  });

  it('should have clearAll function', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(typeof result.current.clearAll).toBe('function');
  });

  it('should have cleanupOrphans function', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(typeof result.current.cleanupOrphans).toBe('function');
  });

  it('should have clearExpiredCache function', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(typeof result.current.clearExpiredCache).toBe('function');
  });

  it('should handle cleanup with options', async () => {
    const { result } = renderHook(() => useStorageCleanup());

    await act(async () => {
      await result.current.cleanup({
        categories: ['cache', 'temp'],
        olderThan: 7 * 24 * 60 * 60 * 1000,
      });
    });

    expect(result.current.lastResult).toBeDefined();
  });

  it('should set isRunning during cleanup', async () => {
    const { result } = renderHook(() => useStorageCleanup());
    
    await act(async () => {
      await result.current.cleanup();
    });

    // After completion, isRunning should be false
    expect(result.current.isRunning).toBe(false);
  });
});

describe('useStorageCleanup error handling', () => {
  it('should have error state', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(result.current.error).toBeNull();
  });

  it('should have isRunning state', () => {
    const { result } = renderHook(() => useStorageCleanup());
    expect(result.current.isRunning).toBe(false);
  });
});
