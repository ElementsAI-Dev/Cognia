/**
 * useSandpackBundler - Hook for managing Sandpack bundling with debouncing
 * Prevents excessive rebundling on every keystroke
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface BundlerProgress {
  status: 'idle' | 'pending' | 'bundling' | 'complete' | 'error';
  progress: number;
  message?: string;
}

export interface UseSandpackBundlerOptions {
  debounceMs?: number;
  minChangeDelay?: number;
  onProgress?: (progress: BundlerProgress) => void;
  onBundleComplete?: () => void;
  _onBundleError?: (error: string) => void;
}

export interface UseSandpackBundlerReturn {
  bundlerState: BundlerProgress;
  scheduleBundle: (code: string) => void;
  cancelPendingBundle: () => void;
  forceBundle: () => void;
  isPending: boolean;
  isBundling: boolean;
}

export function useSandpackBundler(
  options: UseSandpackBundlerOptions = {}
): UseSandpackBundlerReturn {
  const {
    debounceMs = 1000,
    minChangeDelay = 500,
    onProgress,
    onBundleComplete,
    _onBundleError,
  } = options;

  const [bundlerState, setBundlerState] = useState<BundlerProgress>({
    status: 'idle',
    progress: 0,
  });

  const pendingCodeRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBundleTimeRef = useRef<number>(0);
  const bundleRequestIdRef = useRef<number>(0);

  // Update state and notify callback
  const updateState = useCallback(
    (newState: BundlerProgress) => {
      setBundlerState(newState);
      onProgress?.(newState);
    },
    [onProgress]
  );

  // Cancel any pending bundle
  const cancelPendingBundle = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingCodeRef.current = null;
    bundleRequestIdRef.current += 1;
    updateState({ status: 'idle', progress: 0 });
  }, [updateState]);

  // Execute bundle (simulated - actual bundling is handled by Sandpack)
  const executeBundle = useCallback(
    async (requestId: number) => {
      // Check if this request is still valid
      if (requestId !== bundleRequestIdRef.current) {
        return;
      }

      updateState({ status: 'bundling', progress: 30, message: 'Bundling...' });

      // Simulate progress updates
      const progressSteps = [50, 70, 90, 100];
      for (const progress of progressSteps) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (requestId !== bundleRequestIdRef.current) {
          return; // Cancelled
        }
        updateState({
          status: progress < 100 ? 'bundling' : 'complete',
          progress,
          message: progress < 100 ? 'Bundling...' : 'Complete',
        });
      }

      lastBundleTimeRef.current = Date.now();
      onBundleComplete?.();

      // Reset to idle after a brief delay
      setTimeout(() => {
        if (requestId === bundleRequestIdRef.current) {
          updateState({ status: 'idle', progress: 0 });
        }
      }, 500);
    },
    [updateState, onBundleComplete]
  );

  // Schedule a bundle with debouncing
  const scheduleBundle = useCallback(
    (code: string) => {
      pendingCodeRef.current = code;

      // Cancel existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Update state to pending
      updateState({ status: 'pending', progress: 10, message: 'Waiting...' });

      // Calculate delay based on time since last bundle
      const timeSinceLastBundle = Date.now() - lastBundleTimeRef.current;
      const effectiveDelay = Math.max(
        debounceMs,
        minChangeDelay - timeSinceLastBundle
      );

      // Schedule new bundle
      const requestId = ++bundleRequestIdRef.current;
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        executeBundle(requestId);
      }, effectiveDelay);
    },
    [debounceMs, minChangeDelay, updateState, executeBundle]
  );

  // Force immediate bundle
  const forceBundle = useCallback(() => {
    cancelPendingBundle();
    const requestId = ++bundleRequestIdRef.current;
    executeBundle(requestId);
  }, [cancelPendingBundle, executeBundle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    bundlerState,
    scheduleBundle,
    cancelPendingBundle,
    forceBundle,
    isPending: bundlerState.status === 'pending',
    isBundling: bundlerState.status === 'bundling',
  };
}

export default useSandpackBundler;
