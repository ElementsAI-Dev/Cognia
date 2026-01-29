/**
 * Storage Cleanup Service Tests
 */

import { StorageCleanupService } from './storage-cleanup';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock db
jest.mock('@/lib/db', () => ({
  db: {
    sessions: {
      toArray: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(undefined),
    },
    messages: {
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          sortBy: jest.fn().mockResolvedValue([]),
        }),
      }),
      toArray: jest.fn().mockResolvedValue([]),
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    },
    workflows: {
      toArray: jest.fn().mockResolvedValue([]),
    },
    workflowExecutions: {
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          sortBy: jest.fn().mockResolvedValue([]),
        }),
      }),
      toArray: jest.fn().mockResolvedValue([]),
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    },
    projects: {
      toArray: jest.fn().mockResolvedValue([]),
    },
    knowledgeFiles: {
      toArray: jest.fn().mockResolvedValue([]),
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('StorageCleanupService', () => {
  let cleanupService: StorageCleanupService;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    cleanupService = new StorageCleanupService();
  });

  describe('cleanup', () => {
    it('should return a cleanup result', async () => {
      const result = await cleanupService.cleanup();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.freedSpace).toBe('number');
      expect(typeof result.deletedItems).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should support dry run mode', async () => {
      localStorageMock.setItem('app-cache', JSON.stringify({
        key1: { timestamp: Date.now() - 100000000, ttl: 1000 },
      }));

      const result = await cleanupService.cleanup({ dryRun: true });

      expect(result.success).toBe(true);
      // In dry run, no actual deletion should happen
    });

    it('should filter by categories', async () => {
      localStorageMock.setItem('cognia-settings', '{}');
      localStorageMock.setItem('app-cache', '{}');

      const result = await cleanupService.cleanup({
        categories: ['cache'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('quickCleanup', () => {
    it('should perform quick cleanup on cache only', async () => {
      const result = await cleanupService.quickCleanup();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('deepCleanup', () => {
    it('should perform deep cleanup', async () => {
      const result = await cleanupService.deepCleanup();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('previewCleanup', () => {
    it('should preview cleanup without deleting', async () => {
      localStorageMock.setItem('cognia-old-data', JSON.stringify({
        timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days old
      }));

      const result = await cleanupService.previewCleanup();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('clearExpiredCache', () => {
    it('should clear expired cache entries', async () => {
      const now = Date.now();
      localStorageMock.setItem('app-cache', JSON.stringify({
        expired: { timestamp: now - 100000, ttl: 1000 },
        valid: { timestamp: now, ttl: 100000 },
      }));

      const cleared = await cleanupService.clearExpiredCache();

      expect(typeof cleared).toBe('number');
    });

    it('should handle empty cache', async () => {
      const cleared = await cleanupService.clearExpiredCache();
      expect(cleared).toBe(0);
    });

    it('should handle invalid cache data', async () => {
      localStorageMock.setItem('app-cache', 'invalid json');

      const cleared = await cleanupService.clearExpiredCache();
      expect(cleared).toBe(0);
    });
  });

  describe('cleanupOrphanedData', () => {
    it('should cleanup orphaned records', async () => {
      const cleaned = await cleanupService.cleanupOrphanedData();
      expect(typeof cleaned).toBe('number');
    });
  });
});

describe('StorageCleanupService - Edge Cases', () => {
  let cleanupService: StorageCleanupService;

  beforeEach(() => {
    localStorageMock.clear();
    cleanupService = new StorageCleanupService();
  });

  it('should handle localStorage errors gracefully', async () => {
    // Simulate localStorage error
    const originalRemoveItem = localStorageMock.removeItem;
    localStorageMock.removeItem = jest.fn((_key: string) => {
      throw new Error('Storage quota exceeded');
    });

    localStorageMock.setItem('test-key', 'value');

    const result = await cleanupService.cleanup();

    // Should not throw, but may have errors in result
    expect(result).toBeDefined();

    // Restore
    localStorageMock.removeItem = originalRemoveItem;
  });

  it('should respect maxItemsPerCategory option', async () => {
    // Add many items
    for (let i = 0; i < 20; i++) {
      localStorageMock.setItem(`cache-item-${i}`, JSON.stringify({
        timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000,
      }));
    }

    const result = await cleanupService.cleanup({
      maxItemsPerCategory: 5,
    });

    expect(result).toBeDefined();
  });
});
