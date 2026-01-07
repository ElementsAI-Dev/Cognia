/**
 * useFileWatcher Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileWatcher, useMultiFileWatcher } from './use-file-watcher';

// Mock dependencies
jest.mock('@/lib/file', () => ({
  watchPath: jest.fn(),
  watchPathImmediate: jest.fn(),
}));

jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

import { watchPath, watchPathImmediate } from '@/lib/file';
import { isTauri } from '@/lib/native/utils';

const mockWatchPath = watchPath as jest.MockedFunction<typeof watchPath>;
const mockWatchPathImmediate = watchPathImmediate as jest.MockedFunction<typeof watchPathImmediate>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

type WatchCallback = Parameters<typeof watchPath>[1];
type WatchEvent = Parameters<WatchCallback>[0];

describe('useFileWatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileWatcher(null));

    expect(result.current.isWatching).toBe(false);
    expect(result.current.lastEvent).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set error when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const { result } = renderHook(() => useFileWatcher('/test/path'));

    await act(async () => {
      await result.current.startWatching();
    });

    expect(result.current.error).toBe('File watching requires Tauri desktop environment');
  });

  it('should start watching a path', async () => {
    const mockUnwatch = jest.fn().mockResolvedValue(undefined);
    mockWatchPath.mockResolvedValue(mockUnwatch);

    const { result } = renderHook(() => 
      useFileWatcher('/test/path', undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startWatching();
    });

    expect(mockWatchPath).toHaveBeenCalledWith('/test/path', expect.any(Function), {});
    expect(result.current.isWatching).toBe(true);
  });

  it('should use watchPathImmediate when immediate option is true', async () => {
    const mockUnwatch = jest.fn().mockResolvedValue(undefined);
    mockWatchPathImmediate.mockResolvedValue(mockUnwatch);

    const { result } = renderHook(() => 
      useFileWatcher('/test/path', undefined, { enabled: false, immediate: true })
    );

    await act(async () => {
      await result.current.startWatching();
    });

    expect(mockWatchPathImmediate).toHaveBeenCalled();
  });

  it('should stop watching', async () => {
    const mockUnwatch = jest.fn().mockResolvedValue(undefined);
    mockWatchPath.mockResolvedValue(mockUnwatch);

    const { result } = renderHook(() => 
      useFileWatcher('/test/path', undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startWatching();
    });

    expect(result.current.isWatching).toBe(true);

    await act(async () => {
      await result.current.stopWatching();
    });

    expect(mockUnwatch).toHaveBeenCalled();
    expect(result.current.isWatching).toBe(false);
  });

  it('should call onEvent callback when event occurs', async () => {
    const onEvent = jest.fn();
    let capturedCallback: WatchCallback | null = null;
    
    mockWatchPath.mockImplementation(async (_path, callback) => {
      capturedCallback = callback;
      return jest.fn().mockResolvedValue(undefined);
    });

    const { result } = renderHook(() => 
      useFileWatcher('/test/path', onEvent, { enabled: false })
    );

    await act(async () => {
      await result.current.startWatching();
    });

    const mockEvent = { type: 'modify', paths: ['/test/path/file.txt'] } as WatchEvent;
    
    await act(async () => {
      capturedCallback?.(mockEvent);
    });

    expect(onEvent).toHaveBeenCalledWith(mockEvent);
    expect(result.current.lastEvent).toEqual(mockEvent);
  });

  it('should handle watch errors', async () => {
    mockWatchPath.mockRejectedValue(new Error('Watch failed'));

    const { result } = renderHook(() => 
      useFileWatcher('/test/path', undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startWatching();
    });

    expect(result.current.error).toBe('Watch failed');
    expect(result.current.isWatching).toBe(false);
  });

  it('should auto-start when enabled and path provided', async () => {
    const mockUnwatch = jest.fn().mockResolvedValue(undefined);
    mockWatchPath.mockResolvedValue(mockUnwatch);

    renderHook(() => useFileWatcher('/test/path', undefined, { enabled: true }));

    await waitFor(() => {
      expect(mockWatchPath).toHaveBeenCalled();
    });
  });

  it('should not start when path is null', () => {
    renderHook(() => useFileWatcher(null));

    expect(mockWatchPath).not.toHaveBeenCalled();
  });

  it('should handle null unwatch return', async () => {
    mockWatchPath.mockResolvedValue(null as unknown as () => Promise<void>);

    const { result } = renderHook(() => 
      useFileWatcher('/test/path', undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startWatching();
    });

    expect(result.current.error).toBe('Failed to start file watcher');
  });
});

describe('useMultiFileWatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMultiFileWatcher([]));

    expect(result.current.isWatching).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it('should watch multiple paths', async () => {
    const mockUnwatch = jest.fn().mockResolvedValue(undefined);
    mockWatchPath.mockResolvedValue(mockUnwatch);

    const paths = ['/path/1', '/path/2', '/path/3'];

    const { result } = renderHook(() => 
      useMultiFileWatcher(paths, undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startAll();
    });

    expect(mockWatchPath).toHaveBeenCalledTimes(3);
    expect(result.current.isWatching).toBe(true);
  });

  it('should stop all watchers', async () => {
    const mockUnwatch = jest.fn().mockResolvedValue(undefined);
    mockWatchPath.mockResolvedValue(mockUnwatch);

    const paths = ['/path/1', '/path/2'];

    const { result } = renderHook(() => 
      useMultiFileWatcher(paths, undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startAll();
    });

    await act(async () => {
      await result.current.stopAll();
    });

    expect(mockUnwatch).toHaveBeenCalledTimes(2);
    expect(result.current.isWatching).toBe(false);
  });

  it('should track errors per path', async () => {
    mockWatchPath
      .mockResolvedValueOnce(jest.fn().mockResolvedValue(undefined))
      .mockRejectedValueOnce(new Error('Path 2 failed'));

    const paths = ['/path/1', '/path/2'];

    const { result } = renderHook(() => 
      useMultiFileWatcher(paths, undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startAll();
    });

    expect(result.current.errors['/path/2']).toBe('Path 2 failed');
    expect(result.current.isWatching).toBe(true);
  });

  it('should set global error when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);

    const { result } = renderHook(() => 
      useMultiFileWatcher(['/path/1'], undefined, { enabled: false })
    );

    await act(async () => {
      await result.current.startAll();
    });

    expect(result.current.errors._global).toBe('File watching requires Tauri desktop environment');
  });

  it('should call onEvent with path when event occurs', async () => {
    const onEvent = jest.fn();
    let capturedCallback: WatchCallback | null = null;
    
    mockWatchPath.mockImplementation(async (_path, callback) => {
      capturedCallback = callback;
      return jest.fn().mockResolvedValue(undefined);
    });

    const { result } = renderHook(() => 
      useMultiFileWatcher(['/path/1'], onEvent, { enabled: false })
    );

    await act(async () => {
      await result.current.startAll();
    });

    const mockEvent = { type: 'create', paths: ['/path/1/new.txt'] } as WatchEvent;
    
    await act(async () => {
      capturedCallback?.(mockEvent);
    });

    expect(onEvent).toHaveBeenCalledWith('/path/1', mockEvent);
  });
});
