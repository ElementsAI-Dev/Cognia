/**
 * Tests for useNetworkStatus hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus, useApiHealth } from './use-network-status';

describe('useNetworkStatus', () => {
  const originalNavigator = { ...navigator };

  let onlineListeners: Set<() => void>;
  let offlineListeners: Set<() => void>;

  beforeEach(() => {
    onlineListeners = new Set();
    offlineListeners = new Set();

    // Mock addEventListener/removeEventListener
    jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online') onlineListeners.add(handler as () => void);
      if (event === 'offline') offlineListeners.add(handler as () => void);
    });

    jest.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'online') onlineListeners.delete(handler as () => void);
      if (event === 'offline') offlineListeners.delete(handler as () => void);
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    // Mock queueMicrotask
    jest.spyOn(globalThis, 'queueMicrotask').mockImplementation((cb) => {
      setTimeout(cb, 0);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: originalNavigator.onLine,
    });
  });

  describe('initial state', () => {
    it('should return online status when navigator is online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should return offline status when navigator is offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });
  });

  describe('network changes', () => {
    it('should update when going offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        offlineListeners.forEach((listener) => listener());
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update when coming online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // Simulate coming online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        onlineListeners.forEach((listener) => listener());
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('slow connection detection', () => {
    it('should detect slow 2g connection', async () => {
      const mockConnection = {
        effectiveType: 'slow-2g',
        rtt: 100,
        downlink: 0.5,
        saveData: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isSlowConnection).toBe(true);
        expect(result.current.effectiveType).toBe('slow-2g');
      });
    });

    it('should detect high RTT as slow connection', async () => {
      const mockConnection = {
        effectiveType: '4g',
        rtt: 600,
        downlink: 10,
        saveData: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isSlowConnection).toBe(true);
      });
    });

    it('should not detect fast connection as slow', async () => {
      const mockConnection = {
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isSlowConnection).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});

describe('useApiHealth', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();

    // Mock queueMicrotask
    jest.spyOn(globalThis, 'queueMicrotask').mockImplementation((cb) => {
      Promise.resolve().then(cb);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should return healthy when API responds successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const { result } = renderHook(() => useApiHealth('https://api.example.com/health'));

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return unhealthy when API returns error status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useApiHealth('https://api.example.com/health'));

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
      expect(result.current.error).toBe('HTTP 500');
    });
  });

  it('should return unhealthy when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApiHealth('https://api.example.com/health'));

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  it('should update lastChecked after check', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const { result } = renderHook(() => useApiHealth('https://api.example.com/health'));

    await waitFor(() => {
      expect(result.current.lastChecked).toBeInstanceOf(Date);
    });
  });

  it('should check periodically', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    renderHook(() => useApiHealth('https://api.example.com/health', 5000));

    // Wait for initial check
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Advance time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should clear interval on unmount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const { unmount } = renderHook(() => useApiHealth('https://api.example.com/health', 5000));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Advance time - should not trigger more checks
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
