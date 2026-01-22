/**
 * useFileWatcher - React hook for watching file system changes
 * Uses Tauri's file system watch API for real-time updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { watchPath, watchPathImmediate, type WatchEvent, type WatchOptions } from '@/lib/file';
import { isTauri } from '@/lib/native/utils';

export interface UseFileWatcherOptions extends WatchOptions {
  enabled?: boolean;
  immediate?: boolean;
}

export interface UseFileWatcherResult {
  isWatching: boolean;
  lastEvent: WatchEvent | null;
  error: string | null;
  startWatching: () => Promise<void>;
  stopWatching: () => Promise<void>;
}

/**
 * Hook to watch a file or directory for changes
 * @param path - Path to watch
 * @param onEvent - Callback when file changes occur
 * @param options - Watch options
 */
export function useFileWatcher(
  path: string | null,
  onEvent?: (event: WatchEvent) => void,
  options: UseFileWatcherOptions = {}
): UseFileWatcherResult {
  const { enabled = true, immediate = false, ...watchOptions } = options;

  const [isWatching, setIsWatching] = useState(false);
  const [lastEvent, setLastEvent] = useState<WatchEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unwatchRef = useRef<(() => Promise<void>) | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep callback ref updated
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const handleEvent = useCallback((event: WatchEvent) => {
    setLastEvent(event);
    onEventRef.current?.(event);
  }, []);

  const startWatching = useCallback(async () => {
    if (!path || !isTauri()) {
      setError('File watching requires Tauri desktop environment');
      return;
    }

    // Stop any existing watcher
    if (unwatchRef.current) {
      await unwatchRef.current();
      unwatchRef.current = null;
    }

    setError(null);

    try {
      const watchFn = immediate ? watchPathImmediate : watchPath;
      const unwatch = await watchFn(path, handleEvent, watchOptions);

      if (unwatch) {
        unwatchRef.current = unwatch;
        setIsWatching(true);
      } else {
        setError('Failed to start file watcher');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error starting watcher');
      setIsWatching(false);
    }
  }, [path, immediate, watchOptions, handleEvent]);

  const stopWatching = useCallback(async () => {
    if (unwatchRef.current) {
      await unwatchRef.current();
      unwatchRef.current = null;
    }
    setIsWatching(false);
  }, []);

  // Auto-start/stop based on enabled and path
  useEffect(() => {
    if (!enabled || !path || !isTauri()) {
      return;
    }

    let cancelled = false;
    let currentUnwatch: (() => Promise<void>) | null = null;

    const setup = async () => {
      setError(null);
      try {
        const watchFn = immediate ? watchPathImmediate : watchPath;
        const unwatch = await watchFn(path, handleEvent, watchOptions);

        if (cancelled) {
          unwatch?.();
          return;
        }

        if (unwatch) {
          currentUnwatch = unwatch;
          unwatchRef.current = unwatch;
          setIsWatching(true);
        } else {
          setError('Failed to start file watcher');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error starting watcher');
          setIsWatching(false);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (currentUnwatch) {
        currentUnwatch();
      }
      setIsWatching(false);
    };
  }, [enabled, path, immediate, watchOptions, handleEvent]);

  return {
    isWatching,
    lastEvent,
    error,
    startWatching,
    stopWatching,
  };
}

/**
 * Hook to watch multiple files/directories
 */
export function useMultiFileWatcher(
  paths: string[],
  onEvent?: (path: string, event: WatchEvent) => void,
  options: UseFileWatcherOptions = {}
): {
  isWatching: boolean;
  errors: Record<string, string>;
  startAll: () => Promise<void>;
  stopAll: () => Promise<void>;
} {
  const { enabled = true, ...watchOptions } = options;

  const [isWatching, setIsWatching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const unwatchersRef = useRef<Map<string, () => Promise<void>>>(new Map());
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const startAll = useCallback(async () => {
    if (!isTauri()) {
      setErrors({ _global: 'File watching requires Tauri desktop environment' });
      return;
    }

    // Stop existing watchers
    for (const unwatch of unwatchersRef.current.values()) {
      await unwatch();
    }
    unwatchersRef.current.clear();

    const newErrors: Record<string, string> = {};

    for (const path of paths) {
      try {
        const unwatch = await watchPath(
          path,
          (event) => onEventRef.current?.(path, event),
          watchOptions
        );

        if (unwatch) {
          unwatchersRef.current.set(path, unwatch);
        } else {
          newErrors[path] = 'Failed to start watcher';
        }
      } catch (err) {
        newErrors[path] = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    setErrors(newErrors);
    setIsWatching(unwatchersRef.current.size > 0);
  }, [paths, watchOptions]);

  const stopAll = useCallback(async () => {
    for (const unwatch of unwatchersRef.current.values()) {
      await unwatch();
    }
    unwatchersRef.current.clear();
    setIsWatching(false);
  }, []);

  useEffect(() => {
    if (!enabled || paths.length === 0 || !isTauri()) {
      return;
    }

    let cancelled = false;
    const currentUnwatchers = new Map<string, () => Promise<void>>();

    const setup = async () => {
      const newErrors: Record<string, string> = {};

      for (const path of paths) {
        if (cancelled) break;

        try {
          const unwatch = await watchPath(
            path,
            (event) => onEventRef.current?.(path, event),
            watchOptions
          );

          if (!cancelled && unwatch) {
            currentUnwatchers.set(path, unwatch);
            unwatchersRef.current.set(path, unwatch);
          } else if (!unwatch) {
            newErrors[path] = 'Failed to start watcher';
          }
        } catch (err) {
          if (!cancelled) {
            newErrors[path] = err instanceof Error ? err.message : 'Unknown error';
          }
        }
      }

      if (!cancelled) {
        setErrors(newErrors);
        setIsWatching(currentUnwatchers.size > 0);
      }
    };

    setup();

    return () => {
      cancelled = true;
      for (const unwatch of currentUnwatchers.values()) {
        unwatch();
      }
      setIsWatching(false);
    };
  }, [enabled, paths, watchOptions]);

  return {
    isWatching,
    errors,
    startAll,
    stopAll,
  };
}

export default useFileWatcher;
