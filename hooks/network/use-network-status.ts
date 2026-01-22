'use client';

/**
 * useNetworkStatus - hook for detecting network connectivity
 */

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  type?: string;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
  }));

  const updateNetworkStatus = useCallback(() => {
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    const isSlowConnection =
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g' ||
      (connection?.rtt !== undefined && connection.rtt > 500);

    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection,
      connectionType: connection?.type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial status - use microtask to avoid synchronous setState
    queueMicrotask(updateNetworkStatus);

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}

/**
 * Hook to check if a specific API endpoint is reachable
 */
export function useApiHealth(
  url: string,
  checkInterval: number = 30000
): { isHealthy: boolean; lastChecked: Date | null; error: string | null } {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setIsHealthy(response.ok);
      setError(response.ok ? null : `HTTP ${response.status}`);
      setLastChecked(new Date());
    } catch (err) {
      setIsHealthy(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setLastChecked(new Date());
    }
  }, [url]);

  useEffect(() => {
    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(checkHealth);
    const interval = setInterval(checkHealth, checkInterval);
    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return { isHealthy, lastChecked, error };
}

export default useNetworkStatus;
