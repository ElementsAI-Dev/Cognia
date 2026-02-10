/**
 * Sync Scheduler - Handles automatic sync scheduling
 */

import type { SyncDirection, BaseSyncConfig, SyncState } from '@/types/sync';
import { loggers } from '@/lib/logger';

const log = loggers.app;

type SyncCallback = (success: boolean, error?: string) => void;

/**
 * Get the active provider's config from sync state
 */
function getActiveConfig(state: SyncState): BaseSyncConfig | null {
  if (!state.activeProvider) return null;
  switch (state.activeProvider) {
    case 'webdav': return state.webdavConfig;
    case 'github': return state.githubConfig;
    case 'googledrive': return state.googleDriveConfig;
    default: return null;
  }
}

/**
 * Sync Scheduler class
 */
class SyncSchedulerImpl {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private callbacks: Set<SyncCallback> = new Set();

  /**
   * Initialize scheduler with auto-sync settings
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();

    // Subscribe to store changes
    useSyncStore.subscribe((newState, prevState) => {
      const config = getActiveConfig(newState);
      const prevConfig = getActiveConfig(prevState);

      if (
        config?.autoSync !== prevConfig?.autoSync ||
        config?.syncInterval !== prevConfig?.syncInterval ||
        newState.activeProvider !== prevState.activeProvider
      ) {
        this.updateSchedule();
      }
    });

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        log.info('SyncScheduler: Network offline, pausing auto-sync');
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      });

      window.addEventListener('online', () => {
        log.info('SyncScheduler: Network online, resuming auto-sync');
        this.updateSchedule();
        // Trigger a sync when coming back online
        this.runSync('bidirectional');
      });
    }

    // Initial setup
    this.updateSchedule();
    this.isInitialized = true;

    // Run startup sync if enabled
    const config = getActiveConfig(state);
    if (config?.enabled && config.syncOnStartup) {
      this.runSync('download');
    }
  }

  /**
   * Update the sync schedule
   */
  private async updateSchedule(): Promise<void> {
    // Clear existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();
    
    if (!state.activeProvider) return;

    const config = getActiveConfig(state);

    if (!config || !config.enabled || !config.autoSync || config.syncInterval <= 0) {
      return;
    }

    // Set up new interval
    const intervalMs = config.syncInterval * 60 * 1000; // Convert minutes to ms
    
    this.intervalId = setInterval(() => {
      this.runSync(config.syncDirection);
    }, intervalMs);

    log.info(`SyncScheduler: Auto-sync scheduled every ${config.syncInterval} minutes`);
  }

  /**
   * Run a sync operation
   */
  async runSync(direction: SyncDirection = 'bidirectional'): Promise<boolean> {
    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();

    if (!state.activeProvider || state.status === 'syncing') {
      return false;
    }

    // Emit sync:started event for event-triggered tasks
    this.emitEvent('sync:started', { direction, provider: state.activeProvider });

    try {
      const result = await state.startSync(direction);
      
      // Notify callbacks
      this.callbacks.forEach((cb) => cb(result.success, result.error));

      // Emit sync completion/failure event
      if (result.success) {
        this.emitEvent('sync:completed', { direction, provider: state.activeProvider });
      } else {
        this.emitEvent('sync:failed', { direction, provider: state.activeProvider, error: result.error });
      }
      
      return result.success;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Sync failed';
      this.callbacks.forEach((cb) => cb(false, errorMsg));
      this.emitEvent('sync:failed', { direction, provider: state.activeProvider, error: errorMsg });
      return false;
    }
  }

  /**
   * Emit a scheduler event (non-blocking)
   */
  private emitEvent(eventType: string, data?: Record<string, unknown>): void {
    import('@/lib/scheduler/event-integration').then(({ emitSchedulerEvent, isValidEventType, createEventData }) => {
      if (isValidEventType(eventType)) {
        const eventData = createEventData(eventType, data);
        emitSchedulerEvent(eventType, { ...eventData.data, _timestamp: eventData.timestamp.toISOString() }).catch((err) => {
          log.error(`Failed to emit scheduler event ${eventType}:`, err);
        });
      }
    }).catch(() => {
      // Scheduler module may not be initialized yet
    });
  }

  /**
   * Trigger sync on app exit
   */
  async syncOnExit(): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();

    if (!state.activeProvider) return;

    const config = getActiveConfig(state);

    if (config?.enabled && config.syncOnExit) {
      await this.runSync('upload');
    }
  }

  /**
   * Add callback for sync events
   */
  onSync(callback: SyncCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get scheduler status
   */
  isActive(): boolean {
    return this.intervalId !== null;
  }
}

// Singleton instance
let schedulerInstance: SyncSchedulerImpl | null = null;

/**
 * Get sync scheduler instance
 */
export function getSyncScheduler(): SyncSchedulerImpl {
  if (!schedulerInstance) {
    schedulerInstance = new SyncSchedulerImpl();
  }
  return schedulerInstance;
}

/**
 * Initialize sync scheduler
 */
export async function initSyncScheduler(): Promise<void> {
  const scheduler = getSyncScheduler();
  await scheduler.initialize();
}

/**
 * Stop sync scheduler
 */
export function stopSyncScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}

export { SyncSchedulerImpl };
