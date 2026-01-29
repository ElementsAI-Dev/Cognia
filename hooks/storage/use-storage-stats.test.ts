/**
 * useStorageStats Hook Tests
 * Basic interface tests - complex async tests are in integration tests
 */

import { renderHook } from '@testing-library/react';
import { useStorageStats, useStorageUsage, useStorageHealth } from './use-storage-stats';

// Mock the storage module
jest.mock('@/lib/storage', () => ({
  StorageManager: {
    formatBytes: (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    },
    getInstance: jest.fn().mockReturnValue({
      getStats: jest.fn().mockResolvedValue(null),
      getHealth: jest.fn().mockResolvedValue(null),
      addEventListener: jest.fn().mockReturnValue(() => {}),
    }),
  },
  storageMetrics: {
    getTrend: jest.fn().mockReturnValue(null),
    getCategoryGrowth: jest.fn().mockReturnValue(new Map()),
  },
}));

describe('useStorageStats', () => {
  it('should return hook interface', () => {
    const { result } = renderHook(() => useStorageStats());

    expect(result.current).toHaveProperty('stats');
    expect(result.current).toHaveProperty('health');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('formatBytes');
  });

  it('should have formatBytes function', () => {
    const { result } = renderHook(() => useStorageStats());
    expect(typeof result.current.formatBytes).toBe('function');
  });

  it('should have refresh function', () => {
    const { result } = renderHook(() => useStorageStats());
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should have getCategoryInfo function', () => {
    const { result } = renderHook(() => useStorageStats());
    expect(typeof result.current.getCategoryInfo).toBe('function');
  });
});

describe('useStorageUsage', () => {
  it('should return usage interface', () => {
    const { result } = renderHook(() => useStorageUsage());

    expect(result.current).toHaveProperty('used');
    expect(result.current).toHaveProperty('quota');
    expect(result.current).toHaveProperty('usagePercent');
    expect(result.current).toHaveProperty('isLoading');
  });

  it('should return zero values initially', () => {
    const { result } = renderHook(() => useStorageUsage());

    expect(result.current.used).toBe(0);
    expect(result.current.quota).toBe(0);
    expect(result.current.usagePercent).toBe(0);
  });
});

describe('useStorageHealth', () => {
  it('should return health interface', () => {
    const { result } = renderHook(() => useStorageHealth());

    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('issues');
    expect(result.current).toHaveProperty('recommendations');
    expect(result.current).toHaveProperty('isLoading');
  });

  it('should return null status initially', () => {
    const { result } = renderHook(() => useStorageHealth());
    expect(result.current.status).toBeNull();
  });

  it('should return empty arrays initially', () => {
    const { result } = renderHook(() => useStorageHealth());
    expect(Array.isArray(result.current.issues)).toBe(true);
    expect(Array.isArray(result.current.recommendations)).toBe(true);
  });
});
