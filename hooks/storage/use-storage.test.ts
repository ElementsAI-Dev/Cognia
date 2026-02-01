/**
 * useStorage Hook Tests
 * Comprehensive tests for the unified storage hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStorage } from './use-storage';

// Mock data defined before jest.mock
const mockStats = {
  totalSize: 1024 * 1024,
  localStorage: { used: 512 * 1024, quota: 5 * 1024 * 1024 },
  sessionStorage: { used: 256 * 1024, quota: 5 * 1024 * 1024 },
  indexedDB: { used: 256 * 1024, quota: 100 * 1024 * 1024 },
  categories: new Map(),
  keyCount: 10,
  largestKeys: [],
};

const mockHealth = {
  status: 'healthy' as const,
  score: 95,
  issues: [],
  recommendations: [],
  lastChecked: new Date(),
};

const mockCleanupResult = {
  freedBytes: 1024,
  deletedKeys: 5,
  details: [],
  errors: [],
  duration: 100,
};

const mockImportResult = {
  success: true,
  imported: { sessions: 1, messages: 10, artifacts: 2, documents: 0, projects: 0, settings: true },
  skipped: { sessions: 0, messages: 0, artifacts: 0 },
  errors: [],
  warnings: [],
  duration: 500,
};

// Mock functions
const mockGetStats = jest.fn();
const mockGetHealth = jest.fn();
const mockClearCategory = jest.fn();
const mockClearAllCogniaData = jest.fn();
const mockQuickCleanup = jest.fn();
const mockDeepCleanup = jest.fn();
const mockCalculateTrend = jest.fn();
const mockTakeSnapshot = jest.fn();
const mockImportFullBackup = jest.fn();
const mockParseImportFile = jest.fn();
const mockDownloadExport = jest.fn();

// Mock the storage module
jest.mock('@/lib/storage', () => ({
  StorageManager: {
    getStats: (...args: unknown[]) => mockGetStats(...args),
    getHealth: (...args: unknown[]) => mockGetHealth(...args),
    clearCategory: (...args: unknown[]) => mockClearCategory(...args),
    clearAllCogniaData: (...args: unknown[]) => mockClearAllCogniaData(...args),
    formatBytes: (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    },
  },
  storageCleanup: {
    quickCleanup: (...args: unknown[]) => mockQuickCleanup(...args),
    deepCleanup: (...args: unknown[]) => mockDeepCleanup(...args),
  },
  storageMetrics: {
    calculateTrend: (...args: unknown[]) => mockCalculateTrend(...args),
    takeSnapshot: (...args: unknown[]) => mockTakeSnapshot(...args),
  },
  importFullBackup: (...args: unknown[]) => mockImportFullBackup(...args),
  parseImportFile: (...args: unknown[]) => mockParseImportFile(...args),
  downloadExport: (...args: unknown[]) => mockDownloadExport(...args),
}));

// Mock navigator.storage
const mockPersist = jest.fn().mockResolvedValue(true);
const mockPersisted = jest.fn().mockResolvedValue(false);

Object.defineProperty(global, 'navigator', {
  value: {
    storage: {
      persist: mockPersist,
      persisted: mockPersisted,
    },
  },
  writable: true,
});

describe('useStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    mockGetStats.mockResolvedValue(mockStats);
    mockGetHealth.mockResolvedValue(mockHealth);
    mockClearCategory.mockReturnValue(5);
    mockClearAllCogniaData.mockResolvedValue({ localStorage: 10, indexedDB: true });
    mockQuickCleanup.mockResolvedValue(mockCleanupResult);
    mockDeepCleanup.mockResolvedValue({ ...mockCleanupResult, freedBytes: 2048 });
    mockCalculateTrend.mockReturnValue({ direction: 'stable', changePercent: 0, averageDaily: 0 });
    mockTakeSnapshot.mockResolvedValue(undefined);
    mockImportFullBackup.mockResolvedValue(mockImportResult);
    mockParseImportFile.mockResolvedValue({ data: { version: '1.0' }, errors: [] });
    mockDownloadExport.mockResolvedValue(undefined);
    mockPersist.mockResolvedValue(true);
    mockPersisted.mockResolvedValue(false);
  });

  describe('Hook Interface', () => {
    it('should return complete hook interface', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Stats properties
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('health');
      expect(result.current).toHaveProperty('trend');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      // Persistence properties
      expect(result.current).toHaveProperty('isPersistent');
      expect(result.current).toHaveProperty('requestPersistence');

      // Action methods
      expect(result.current).toHaveProperty('refresh');
      expect(result.current).toHaveProperty('cleanup');
      expect(result.current).toHaveProperty('clearCategory');
      expect(result.current).toHaveProperty('clearAll');

      // Backup/Restore methods
      expect(result.current).toHaveProperty('createBackup');
      expect(result.current).toHaveProperty('restoreBackup');

      // Utility methods
      expect(result.current).toHaveProperty('formatBytes');
      expect(result.current).toHaveProperty('takeSnapshot');
    });

    it('should have all functions defined', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.requestPersistence).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.cleanup).toBe('function');
      expect(typeof result.current.clearCategory).toBe('function');
      expect(typeof result.current.clearAll).toBe('function');
      expect(typeof result.current.createBackup).toBe('function');
      expect(typeof result.current.restoreBackup).toBe('function');
      expect(typeof result.current.formatBytes).toBe('function');
      expect(typeof result.current.takeSnapshot).toBe('function');
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useStorage());
      expect(result.current.isLoading).toBe(true);
    });

    it('should load stats and health on mount', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.health).toEqual(mockHealth);
      expect(result.current.error).toBeNull();
    });

    it('should check persistence status on mount', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPersisted).toHaveBeenCalled();
    });
  });

  describe('Options', () => {
    it('should respect enableMetrics option', async () => {
      const { result } = renderHook(() => useStorage({ enableMetrics: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCalculateTrend).toHaveBeenCalledWith(7);
      expect(result.current.trend).toBeDefined();
    });

    it('should not calculate trend when enableMetrics is false', async () => {
      mockCalculateTrend.mockClear();

      const { result } = renderHook(() => useStorage({ enableMetrics: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCalculateTrend).not.toHaveBeenCalled();
      expect(result.current.trend).toBeNull();
    });

    it('should auto-request persistence by default', async () => {
      renderHook(() => useStorage());

      await waitFor(() => {
        expect(mockPersist).toHaveBeenCalled();
      });
    });

    it('should not auto-request persistence when disabled', async () => {
      mockPersist.mockClear();

      renderHook(() => useStorage({ autoRequestPersistence: false }));

      // Wait a bit to ensure the effect has run
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockPersist).not.toHaveBeenCalled();
    });

    it('should set up refresh interval when specified', async () => {
      jest.useFakeTimers();

      renderHook(() => useStorage({ refreshInterval: 1000 }));

      // Wait for initial load
      await act(async () => {
        await Promise.resolve();
      });

      mockGetStats.mockClear();

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockGetStats).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Refresh', () => {
    it('should refresh stats and health', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetStats.mockClear();
      mockGetHealth.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetStats).toHaveBeenCalledWith(true);
      expect(mockGetHealth).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const testError = new Error('Refresh failed');
      mockGetStats.mockRejectedValueOnce(testError);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toEqual(testError);
    });
  });

  describe('Persistence', () => {
    it('should request persistent storage', async () => {
      const { result } = renderHook(() => useStorage({ autoRequestPersistence: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockPersist.mockClear();

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestPersistence();
      });

      expect(mockPersist).toHaveBeenCalled();
      expect(granted).toBe(true);
      expect(result.current.isPersistent).toBe(true);
    });

    it('should handle persistence request failure', async () => {
      mockPersist.mockRejectedValueOnce(new Error('Permission denied'));

      const { result } = renderHook(() => useStorage({ autoRequestPersistence: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestPersistence();
      });

      expect(granted).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should perform quick cleanup', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let cleanupResult;
      await act(async () => {
        cleanupResult = await result.current.cleanup();
      });

      expect(mockQuickCleanup).toHaveBeenCalled();
      expect(cleanupResult).toEqual(mockCleanupResult);
    });

    it('should perform deep cleanup when aggressive is true', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.cleanup(true);
      });

      expect(mockDeepCleanup).toHaveBeenCalled();
    });
  });

  describe('Clear Operations', () => {
    it('should clear category', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleted: number = 0;
      await act(async () => {
        deleted = await result.current.clearCategory('settings');
      });

      expect(mockClearCategory).toHaveBeenCalledWith('settings');
      expect(deleted).toBe(5);
    });

    it('should clear all data', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearAll();
      });

      expect(mockClearAllCogniaData).toHaveBeenCalled();
      expect(clearResult).toEqual({ localStorage: 10, indexedDB: true });
    });
  });

  describe('Backup/Restore', () => {
    it('should create backup', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const options = { includeSettings: true };
      await act(async () => {
        await result.current.createBackup(options);
      });

      expect(mockDownloadExport).toHaveBeenCalledWith(options);
    });

    it('should restore backup successfully', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockFile = new File(['{}'], 'backup.json', { type: 'application/json' });

      let importResult: Awaited<ReturnType<typeof result.current.restoreBackup>> | undefined;
      await act(async () => {
        importResult = await result.current.restoreBackup(mockFile);
      });

      expect(mockParseImportFile).toHaveBeenCalledWith(mockFile);
      expect(mockImportFullBackup).toHaveBeenCalled();
      expect(importResult).toEqual(mockImportResult);
    });

    it('should handle parse errors during restore', async () => {
      mockParseImportFile.mockResolvedValueOnce({ data: null, errors: ['Invalid JSON'] });

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockFile = new File(['invalid'], 'backup.json', { type: 'application/json' });

      let importResult: Awaited<ReturnType<typeof result.current.restoreBackup>> | undefined;
      await act(async () => {
        importResult = await result.current.restoreBackup(mockFile);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.errors).toHaveLength(1);
      expect(importResult!.errors[0].category).toBe('parse');
    });
  });

  describe('Utilities', () => {
    it('should format bytes correctly', async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.formatBytes(0)).toBe('0 B');
      expect(result.current.formatBytes(1024)).toBe('1 KB');
      expect(result.current.formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should take snapshot when metrics enabled', async () => {
      const { result } = renderHook(() => useStorage({ enableMetrics: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockTakeSnapshot.mockClear();

      await act(async () => {
        await result.current.takeSnapshot();
      });

      expect(mockTakeSnapshot).toHaveBeenCalled();
      expect(mockCalculateTrend).toHaveBeenCalled();
    });

    it('should not take snapshot when metrics disabled', async () => {
      const { result } = renderHook(() => useStorage({ enableMetrics: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockTakeSnapshot.mockClear();

      await act(async () => {
        await result.current.takeSnapshot();
      });

      expect(mockTakeSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should clear interval on unmount', async () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useStorage({ refreshInterval: 1000 }));

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
