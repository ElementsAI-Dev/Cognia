'use client';

/**
 * Context Sync Initializer
 * Runs background auto-sync for MCP tools, skills, and terminal sessions
 * to context files at the app level, enabling agent dynamic discovery.
 */

import { useEffect, useRef } from 'react';
import { useAutoSync } from '@/hooks/context';
import { initContextFS } from '@/lib/context';

export function ContextSyncInitializer() {
  const hasInitialized = useRef(false);
  const { start, stop } = useAutoSync({
    syncOnMount: false,
    syncIntervalMs: 0,
    syncOnChange: false,
  });

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Restore ContextFS from IndexedDB, then start background sync
    initContextFS().catch(() => {});

    // Start background context sync after a short delay to avoid
    // competing with other initializers during app startup
    const timer = setTimeout(() => {
      start(60000);
    }, 3000);

    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [start, stop]);

  return null;
}

export default ContextSyncInitializer;
