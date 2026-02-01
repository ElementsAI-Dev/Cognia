'use client';

import { useEffect, useRef } from 'react';

import { initSchedulerSystem, stopSchedulerSystem } from '@/lib/scheduler';
import { useSchedulerStore } from '@/stores/scheduler';

/**
 * SchedulerInitializer Component
 *
 * Initializes the task scheduler system on app startup and handles graceful shutdown.
 * Should be placed in the app providers to ensure scheduler runs throughout the app lifecycle.
 */
export function SchedulerInitializer() {
  const hasInitialized = useRef(false);
  const setSchedulerStatus = useSchedulerStore((state) => state.setSchedulerStatus);

  useEffect(() => {
    if (hasInitialized.current) return;

    const initialize = async () => {
      hasInitialized.current = true;

      try {
        await initSchedulerSystem();
        setSchedulerStatus?.('running');
        console.log('[SchedulerInitializer] Scheduler system initialized');
      } catch (error) {
        console.error('[SchedulerInitializer] Failed to initialize scheduler:', error);
        setSchedulerStatus?.('stopped');
      }
    };

    initialize();

    // Cleanup on component unmount
    return () => {
      try {
        stopSchedulerSystem();
        setSchedulerStatus?.('stopped');
        console.log('[SchedulerInitializer] Scheduler system stopped');
      } catch (error) {
        console.error('[SchedulerInitializer] Error stopping scheduler:', error);
      }
    };
  }, [setSchedulerStatus]);

  // Handle beforeunload for graceful shutdown
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        stopSchedulerSystem();
      } catch (error) {
        console.error('[SchedulerInitializer] Error on beforeunload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return null;
}
