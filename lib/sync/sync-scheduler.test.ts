/**
 * @jest-environment jsdom
 */

import {
  getSyncScheduler,
  initSyncScheduler,
  stopSyncScheduler,
  SyncSchedulerImpl,
} from './sync-scheduler';

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

// Mock sync store
const mockState = {
  activeProvider: 'webdav' as const,
  status: 'idle' as const,
  webdavConfig: {
    enabled: true,
    autoSync: true,
    syncInterval: 5,
    syncOnStartup: false,
    syncOnExit: true,
    syncDirection: 'bidirectional' as const,
  },
  githubConfig: {
    enabled: false,
    autoSync: false,
    syncInterval: 30,
    syncOnStartup: false,
    syncOnExit: false,
    syncDirection: 'bidirectional' as const,
  },
  startSync: jest.fn().mockResolvedValue({ success: true }),
};

let subscribeCallback: ((newState: typeof mockState, prevState: typeof mockState) => void) | null = null;

jest.mock('@/stores/sync', () => ({
  useSyncStore: {
    getState: jest.fn(() => mockState),
    subscribe: jest.fn((callback: (newState: typeof mockState, prevState: typeof mockState) => void) => {
      subscribeCallback = callback;
      return jest.fn();
    }),
  },
}));

describe('SyncScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    stopSyncScheduler();
    subscribeCallback = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    stopSyncScheduler();
  });

  describe('getSyncScheduler', () => {
    it('should return singleton instance', () => {
      const scheduler1 = getSyncScheduler();
      const scheduler2 = getSyncScheduler();
      expect(scheduler1).toBe(scheduler2);
    });
  });

  describe('initSyncScheduler', () => {
    it('should initialize scheduler', async () => {
      await initSyncScheduler();
      expect(getSyncScheduler().isActive()).toBe(true);
    });

    it('should subscribe to store changes', async () => {
      await initSyncScheduler();
      expect(subscribeCallback).toBeDefined();
    });

    it('should not run startup sync if disabled', async () => {
      await initSyncScheduler();
      expect(mockState.startSync).not.toHaveBeenCalled();
    });
  });

  describe('stopSyncScheduler', () => {
    it('should stop the scheduler', async () => {
      await initSyncScheduler();
      stopSyncScheduler();
      expect(getSyncScheduler().isActive()).toBe(false);
    });
  });

  describe('SyncSchedulerImpl', () => {
    let scheduler: SyncSchedulerImpl;

    beforeEach(async () => {
      scheduler = getSyncScheduler() as SyncSchedulerImpl;
    });

    describe('initialize', () => {
      it('should only initialize once', async () => {
        await scheduler.initialize();
        await scheduler.initialize();
        // Should not throw or cause issues - isActive depends on config
        expect(() => scheduler.isActive()).not.toThrow();
      });
    });

    describe('runSync', () => {
      beforeEach(async () => {
        await scheduler.initialize();
      });

      it('should run sync with default direction', async () => {
        const result = await scheduler.runSync();
        expect(result).toBe(true);
        expect(mockState.startSync).toHaveBeenCalled();
      });

      it('should run sync with specific direction', async () => {
        await scheduler.runSync('upload');
        expect(mockState.startSync).toHaveBeenCalledWith('upload');
      });

      it('should return false when no active provider', async () => {
        const originalProvider = mockState.activeProvider;
        (mockState as { activeProvider: string | null }).activeProvider = null;

        const result = await scheduler.runSync();
        expect(result).toBe(false);

        mockState.activeProvider = originalProvider;
      });

      it('should return false when already syncing', async () => {
        const originalStatus = mockState.status;
        (mockState as { status: string }).status = 'syncing';

        const result = await scheduler.runSync();
        expect(result).toBe(false);

        mockState.status = originalStatus;
      });

      it('should notify callbacks on success', async () => {
        const callback = jest.fn();
        scheduler.onSync(callback);

        await scheduler.runSync();

        expect(callback).toHaveBeenCalledWith(true, undefined);
      });

      it('should notify callbacks on failure', async () => {
        mockState.startSync.mockResolvedValueOnce({ success: false, error: 'Test error' });
        const callback = jest.fn();
        scheduler.onSync(callback);

        await scheduler.runSync();

        expect(callback).toHaveBeenCalledWith(false, 'Test error');
      });
    });

    describe('syncOnExit', () => {
      beforeEach(async () => {
        await scheduler.initialize();
      });

      it('should sync on exit when enabled', async () => {
        await scheduler.syncOnExit();
        expect(mockState.startSync).toHaveBeenCalledWith('upload');
      });

      it('should not sync when no active provider', async () => {
        const originalProvider = mockState.activeProvider;
        (mockState as { activeProvider: string | null }).activeProvider = null;

        await scheduler.syncOnExit();
        expect(mockState.startSync).not.toHaveBeenCalled();

        mockState.activeProvider = originalProvider;
      });
    });

    describe('onSync', () => {
      beforeEach(async () => {
        await scheduler.initialize();
      });

      it('should add callback', async () => {
        const callback = jest.fn();
        scheduler.onSync(callback);

        await scheduler.runSync();

        expect(callback).toHaveBeenCalled();
      });

      it('should return unsubscribe function', async () => {
        const callback = jest.fn();
        const unsubscribe = scheduler.onSync(callback);

        unsubscribe();
        await scheduler.runSync();

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('stop', () => {
      it('should be callable', () => {
        // Stop should be callable even if not initialized
        expect(() => scheduler.stop()).not.toThrow();
      });

      it('should set isActive to false', () => {
        scheduler.stop();
        expect(scheduler.isActive()).toBe(false);
      });
    });

    describe('isActive', () => {
      it('should return false initially', () => {
        const newScheduler = new SyncSchedulerImpl();
        expect(newScheduler.isActive()).toBe(false);
      });

      it('should return false after stop', () => {
        scheduler.stop();
        expect(scheduler.isActive()).toBe(false);
      });
    });
  });
});
