'use client';

/**
 * SyncInitializer - Initializes sync scheduler on app startup
 * Handles sync on exit via beforeunload event
 */

import { useEffect, useRef } from 'react';
import { initSyncScheduler, getSyncScheduler } from '@/lib/sync';
import { useSyncStore } from '@/stores/sync';

export function SyncInitializer() {
  const hasInitialized = useRef(false);
  const activeProvider = useSyncStore((state) => state.activeProvider);

  useEffect(() => {
    if (hasInitialized.current) return;

    const initialize = async () => {
      hasInitialized.current = true;
      
      try {
        // Initialize sync scheduler
        await initSyncScheduler();
        console.log('[SyncInitializer] Sync scheduler initialized');
      } catch (error) {
        console.error('[SyncInitializer] Failed to initialize sync:', error);
      }
    };

    initialize();
  }, []);

  // Handle sync on exit
  useEffect(() => {
    if (!activeProvider) return;

    const handleBeforeUnload = async (_event: BeforeUnloadEvent) => {
      const scheduler = getSyncScheduler();
      
      // Trigger sync on exit (non-blocking)
      scheduler.syncOnExit().catch((error) => {
        console.error('[SyncInitializer] Sync on exit failed:', error);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeProvider]);

  return null;
}

export default SyncInitializer;
