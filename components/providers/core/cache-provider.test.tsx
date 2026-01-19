/**
 * Tests for CacheProvider
 */

import { renderHook, act } from '@testing-library/react';
import { CacheProvider, useCache, useCachedAsync, useCachedValue } from './cache-provider';
import { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CacheProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CacheProvider>{children}</CacheProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('useCache hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCache());
      }).toThrow('useCache must be used within CacheProvider');

      consoleSpy.mockRestore();
    });

    it('provides cache context when used within provider', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.get).toBeInstanceOf(Function);
      expect(result.current.set).toBeInstanceOf(Function);
      expect(result.current.has).toBeInstanceOf(Function);
      expect(result.current.delete).toBeInstanceOf(Function);
      expect(result.current.clear).toBeInstanceOf(Function);
    });
  });

  describe('basic operations', () => {
    it('sets and gets a value', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1');
      });

      expect(result.current.get('key1')).toBe('value1');
    });

    it('returns null for non-existent key', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      expect(result.current.get('nonexistent')).toBeNull();
    });

    it('checks if key exists', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1');
      });

      expect(result.current.has('key1')).toBe(true);
      expect(result.current.has('nonexistent')).toBe(false);
    });

    it('deletes a key', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1');
      });

      expect(result.current.has('key1')).toBe(true);

      act(() => {
        result.current.delete('key1');
      });

      expect(result.current.has('key1')).toBe(false);
    });

    it('clears all cache', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1');
        result.current.set('key2', 'value2');
      });

      expect(result.current.getSize()).toBe(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.getSize()).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns null for expired entries', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1', 1000); // 1 second TTL
      });

      expect(result.current.get('key1')).toBe('value1');

      // Advance time past TTL
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.get('key1')).toBeNull();
    });

    it('has() returns false for expired entries', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1', 1000);
      });

      expect(result.current.has('key1')).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.has('key1')).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('sets multiple entries at once', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.setMany({
          key1: 'value1',
          key2: 'value2',
          key3: 'value3',
        });
      });

      expect(result.current.get('key1')).toBe('value1');
      expect(result.current.get('key2')).toBe('value2');
      expect(result.current.get('key3')).toBe('value3');
    });

    it('gets multiple entries at once', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.setMany({
          key1: 'value1',
          key2: 'value2',
        });
      });

      const values = result.current.getMany(['key1', 'key2', 'key3']);

      expect(values).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('deletes multiple entries at once', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.setMany({
          key1: 'value1',
          key2: 'value2',
          key3: 'value3',
        });
      });

      act(() => {
        result.current.deleteMany(['key1', 'key2']);
      });

      expect(result.current.has('key1')).toBe(false);
      expect(result.current.has('key2')).toBe(false);
      expect(result.current.has('key3')).toBe(true);
    });
  });

  describe('cache management', () => {
    it('returns cache stats', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1');
      });

      // Get the value to register a hit
      result.current.get('key1');
      // Try to get non-existent key to register a miss
      result.current.get('nonexistent');

      const stats = result.current.getStats();

      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('returns cache size', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      expect(result.current.getSize()).toBe(0);

      act(() => {
        result.current.set('key1', 'value1');
        result.current.set('key2', 'value2');
      });

      expect(result.current.getSize()).toBe(2);
    });

    it('returns cache keys', () => {
      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1');
        result.current.set('key2', 'value2');
      });

      const keys = result.current.getKeys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('cleans up expired entries', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useCache(), { wrapper });

      act(() => {
        result.current.set('key1', 'value1', 1000);
        result.current.set('key2', 'value2', 5000);
      });

      expect(result.current.getSize()).toBe(2);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      act(() => {
        result.current.cleanup();
      });

      expect(result.current.getSize()).toBe(1);
      expect(result.current.has('key2')).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('with initial cache', () => {
    it('loads initial cache values', () => {
      const initialWrapper = ({ children }: { children: ReactNode }) => (
        <CacheProvider initialCache={{ preloaded: 'data' }}>
          {children}
        </CacheProvider>
      );

      const { result } = renderHook(() => useCache(), { wrapper: initialWrapper });

      expect(result.current.get('preloaded')).toBe('data');
    });
  });

  describe('useCachedValue hook', () => {
    it('caches a value', () => {
      const { result } = renderHook(
        () => useCachedValue('myKey', 'myValue'),
        { wrapper }
      );

      expect(result.current).toBe('myValue');
    });
  });
});

describe('useCachedAsync hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CacheProvider>{children}</CacheProvider>
  );

  it('caches async function results', async () => {
    const mockFn = jest.fn().mockResolvedValue('async result');

    const { result } = renderHook(
      () => useCachedAsync('asyncKey', mockFn),
      { wrapper }
    );

    // First call
    const firstResult = await result.current();
    expect(firstResult).toBe('async result');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const secondResult = await result.current();
    expect(secondResult).toBe('async result');
    expect(mockFn).toHaveBeenCalledTimes(1); // Still 1, used cache
  });
});
