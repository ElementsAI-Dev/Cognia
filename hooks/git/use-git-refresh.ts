/**
 * useGitRefresh Hook
 *
 * Provides periodic refresh functionality for Git status polling.
 * Extracts the duplicated setInterval pattern from git-panel and git-status-panel.
 */

import { useEffect } from 'react';

/**
 * Periodically call a refresh function at a given interval.
 *
 * @param intervalMs - Polling interval in milliseconds
 * @param enabled - Whether polling is active (e.g. git installed && repo set)
 * @param refreshFn - Async function to call on each tick
 */
export function useGitRefresh(
  intervalMs: number,
  enabled: boolean,
  refreshFn: () => Promise<void> | void
): void {
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(refreshFn, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, enabled, refreshFn]);
}
