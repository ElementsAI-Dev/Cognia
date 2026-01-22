'use client';

/**
 * useResizeObserver - Hook for observing element resize with debouncing
 * Helps fix component alignment issues when panels are resized
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

export interface ResizeObserverOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Initial size before first measurement */
  initialSize?: Size;
  /** Called when size changes */
  onResize?: (size: Size) => void;
}

/**
 * Hook to observe element resizing with optional debouncing
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(
  options: ResizeObserverOptions = {}
) {
  const { debounceMs = 100, initialSize = { width: 0, height: 0 }, onResize } = options;

  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>(initialSize);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onResizeRef = useRef(onResize);

  // Keep callback ref updated
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the size update
      debounceTimerRef.current = setTimeout(() => {
        const newSize = { width, height };
        setSize(newSize);
        onResizeRef.current?.(newSize);
      }, debounceMs);
    });

    observer.observe(element);

    // Get initial size
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debounceMs]);

  return { ref, size };
}

/**
 * Hook to force layout recalculation on panel resize
 * Useful for Monaco editor and other components that need explicit layout updates
 */
export function useLayoutRecalculation(triggerRecalculation: () => void, debounceMs: number = 150) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef(triggerRecalculation);

  // Keep callback ref updated
  useEffect(() => {
    triggerRef.current = triggerRecalculation;
  }, [triggerRecalculation]);

  const requestRecalculation = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerRef.current();
    }, debounceMs);
  }, [debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return requestRecalculation;
}

/**
 * Hook to sync Monaco editor layout with container size
 */
export function useMonacoLayoutSync(editorRef: React.RefObject<{ layout: () => void } | null>) {
  const { ref: containerRef, size } = useResizeObserver<HTMLDivElement>({
    debounceMs: 100,
  });

  // Trigger layout update when size changes
  useEffect(() => {
    if (size.width > 0 && size.height > 0 && editorRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    }
  }, [size, editorRef]);

  return containerRef;
}

/**
 * Hook to detect when Sandpack preview needs refresh
 */
export function usePreviewRefreshTrigger() {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { refreshKey, triggerRefresh };
}

export default useResizeObserver;
