/**
 * useTransportHealth Hook
 *
 * Polls logger transport health snapshots for UI observability.
 */

import { useCallback, useEffect, useState } from 'react';
import { getTransportHealthSnapshot, type TransportHealthSnapshot } from '@/lib/logger';

export interface UseTransportHealthOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTransportHealthResult {
  healthByTransport: Record<string, TransportHealthSnapshot>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

const DEFAULT_OPTIONS: Required<UseTransportHealthOptions> = {
  autoRefresh: true,
  refreshInterval: 3000,
};

export function useTransportHealth(options: UseTransportHealthOptions = {}): UseTransportHealthResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [healthByTransport, setHealthByTransport] = useState<
    Record<string, TransportHealthSnapshot>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    try {
      const snapshot = getTransportHealthSnapshot();
      setHealthByTransport(snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to read transport health'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!opts.autoRefresh) {
      return;
    }

    const timer = setInterval(refresh, opts.refreshInterval);
    return () => clearInterval(timer);
  }, [opts.autoRefresh, opts.refreshInterval, refresh]);

  return {
    healthByTransport,
    isLoading,
    error,
    refresh,
  };
}
