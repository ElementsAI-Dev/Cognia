/**
 * Tests for usePersistentStorage hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePersistentStorage, requestPersistentStorage, isPersistentStorage } from './use-persistent-storage';

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

// Store original navigator
const originalNavigator = global.navigator;

describe('usePersistentStorage', () => {
  // Mock navigator.storage
  const mockPersisted = jest.fn();
  const mockPersist = jest.fn();
  const mockEstimate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup navigator.storage mock
    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          persisted: mockPersisted,
          persist: mockPersist,
          estimate: mockEstimate,
        },
      },
      writable: true,
      configurable: true,
    });

    mockPersisted.mockResolvedValue(false);
    mockPersist.mockResolvedValue(true);
    mockEstimate.mockResolvedValue({ usage: 1000000, quota: 10000000 });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('initialization', () => {
    it('should return initial state', async () => {
      const { result } = renderHook(() => usePersistentStorage());

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isChecking).toBe(false);
      expect(typeof result.current.requestPersistence).toBe('function');
      expect(typeof result.current.refreshEstimate).toBe('function');
    });

    it('should check persistence on mount', async () => {
      renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockPersisted).toHaveBeenCalled();
    });

    it('should get storage estimate on mount', async () => {
      renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockEstimate).toHaveBeenCalled();
    });
  });

  describe('persistence check', () => {
    it('should set isPersistent to true when already persisted', async () => {
      mockPersisted.mockResolvedValue(true);

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isPersistent).toBe(true);
    });

    it('should handle persisted check error', async () => {
      mockPersisted.mockRejectedValue(new Error('Check failed'));

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('requestPersistence', () => {
    it('should request persistent storage', async () => {
      mockPersist.mockResolvedValue(true);

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      let granted;
      await act(async () => {
        granted = await result.current.requestPersistence();
      });

      expect(granted).toBe(true);
      expect(result.current.isPersistent).toBe(true);
    });

    it('should handle denied persistence', async () => {
      mockPersist.mockResolvedValue(false);
      mockPersisted.mockResolvedValue(true); // Prevent auto-request

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      let granted;
      await act(async () => {
        granted = await result.current.requestPersistence();
      });

      expect(granted).toBe(false);
    });

    it('should handle request error', async () => {
      mockPersist.mockRejectedValue(new Error('Request failed'));
      mockPersisted.mockResolvedValue(true); // Prevent auto-request

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      let granted;
      await act(async () => {
        granted = await result.current.requestPersistence();
      });

      expect(granted).toBe(false);
    });

    it('should return false when storage API unavailable', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { storage: undefined },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      let granted;
      await act(async () => {
        granted = await result.current.requestPersistence();
      });

      expect(granted).toBe(false);
    });
  });

  describe('storage estimate', () => {
    it('should calculate usage percent', async () => {
      mockEstimate.mockResolvedValue({ usage: 5000000, quota: 10000000 });

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.estimate).toEqual({
        usage: 5000000,
        quota: 10000000,
        usagePercent: 50,
      });
    });

    it('should handle zero quota', async () => {
      mockEstimate.mockResolvedValue({ usage: 0, quota: 0 });

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.estimate?.usagePercent).toBe(0);
    });

    it('should handle estimate error', async () => {
      mockEstimate.mockRejectedValue(new Error('Estimate failed'));

      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.estimate).toBeNull();
    });

    it('should refresh estimate', async () => {
      const { result } = renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockEstimate.mockClear();
      mockEstimate.mockResolvedValue({ usage: 2000000, quota: 10000000 });

      await act(async () => {
        await result.current.refreshEstimate();
      });

      expect(mockEstimate).toHaveBeenCalled();
      expect(result.current.estimate?.usage).toBe(2000000);
    });
  });

  describe('auto-request persistence', () => {
    it('should auto-request when not persisted', async () => {
      mockPersisted.mockResolvedValue(false);
      mockPersist.mockResolvedValue(true);

      renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockPersist).toHaveBeenCalled();
    });

    it('should not auto-request when already persisted', async () => {
      mockPersisted.mockResolvedValue(true);

      renderHook(() => usePersistentStorage());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockPersist).not.toHaveBeenCalled();
    });
  });
});

describe('requestPersistentStorage', () => {
  const mockPersisted = jest.fn();
  const mockPersist = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          persisted: mockPersisted,
          persist: mockPersist,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should return true if already persisted', async () => {
    mockPersisted.mockResolvedValue(true);

    const result = await requestPersistentStorage();

    expect(result).toBe(true);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('should request persistence if not persisted', async () => {
    mockPersisted.mockResolvedValue(false);
    mockPersist.mockResolvedValue(true);

    const result = await requestPersistentStorage();

    expect(result).toBe(true);
    expect(mockPersist).toHaveBeenCalled();
  });

  it('should return false when storage API unavailable', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { storage: undefined },
      writable: true,
      configurable: true,
    });

    const result = await requestPersistentStorage();

    expect(result).toBe(false);
  });

  it('should handle error', async () => {
    mockPersisted.mockRejectedValue(new Error('Failed'));

    const result = await requestPersistentStorage();

    expect(result).toBe(false);
  });
});

describe('isPersistentStorage', () => {
  const mockPersisted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          persisted: mockPersisted,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should return true when persisted', async () => {
    mockPersisted.mockResolvedValue(true);

    const result = await isPersistentStorage();

    expect(result).toBe(true);
  });

  it('should return false when not persisted', async () => {
    mockPersisted.mockResolvedValue(false);

    const result = await isPersistentStorage();

    expect(result).toBe(false);
  });

  it('should return false when storage API unavailable', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { storage: undefined },
      writable: true,
      configurable: true,
    });

    const result = await isPersistentStorage();

    expect(result).toBe(false);
  });

  it('should return false on error', async () => {
    mockPersisted.mockRejectedValue(new Error('Failed'));

    const result = await isPersistentStorage();

    expect(result).toBe(false);
  });
});
