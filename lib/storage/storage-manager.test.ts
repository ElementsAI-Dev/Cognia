/**
 * Storage Manager Tests
 */

import { StorageManagerImpl } from './storage-manager';
import { DEFAULT_STORAGE_MANAGER_CONFIG } from './types';

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

// Mock navigator.storage
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest.fn().mockResolvedValue({ usage: 1000000, quota: 5000000 }),
  },
});

describe('StorageManager', () => {
  let storageManager: StorageManagerImpl;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    storageManager = new StorageManagerImpl();
  });

  afterEach(() => {
    storageManager.dispose();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const config = storageManager.getConfig();
      expect(config).toEqual(DEFAULT_STORAGE_MANAGER_CONFIG);
    });

    it('should accept custom config', () => {
      const customManager = new StorageManagerImpl({
        warningThreshold: 0.8,
        criticalThreshold: 0.95,
      });
      const config = customManager.getConfig();
      expect(config.warningThreshold).toBe(0.8);
      expect(config.criticalThreshold).toBe(0.95);
      customManager.dispose();
    });

    it('should update config', () => {
      storageManager.updateConfig({ warningThreshold: 0.75 });
      expect(storageManager.getConfig().warningThreshold).toBe(0.75);
    });
  });

  describe('getAllKeys', () => {
    it('should return empty array when no keys', () => {
      const keys = storageManager.getAllKeys();
      expect(keys).toEqual([]);
    });

    it('should return all localStorage keys with metadata', () => {
      localStorageMock.setItem('cognia-test', JSON.stringify({ foo: 'bar' }));
      localStorageMock.setItem('other-key', 'value');

      const keys = storageManager.getAllKeys();
      expect(keys.length).toBe(2);
      expect(keys.some((k) => k.key === 'cognia-test')).toBe(true);
      expect(keys.some((k) => k.key === 'other-key')).toBe(true);
    });
  });

  describe('getCategoryForKey', () => {
    it('should return correct category for cognia keys', () => {
      expect(storageManager.getCategoryForKey('cognia-settings')).toBe('settings');
      expect(storageManager.getCategoryForKey('cognia-sessions')).toBe('session');
      expect(storageManager.getCategoryForKey('cognia-artifacts')).toBe('artifact');
    });

    it('should return "other" for unknown keys', () => {
      expect(storageManager.getCategoryForKey('unknown-key')).toBe('other');
      expect(storageManager.getCategoryForKey('random')).toBe('other');
    });
  });

  describe('deleteKey', () => {
    it('should delete a localStorage key', () => {
      localStorageMock.setItem('test-key', 'value');
      const result = storageManager.deleteKey('test-key', 'localStorage');
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should return false for unsupported storage type', () => {
      const result = storageManager.deleteKey('test-key', 'cache');
      expect(result).toBe(false);
    });
  });

  describe('deleteKeys', () => {
    it('should delete multiple keys', () => {
      localStorageMock.setItem('key1', 'value1');
      localStorageMock.setItem('key2', 'value2');
      localStorageMock.setItem('key3', 'value3');

      const deleted = storageManager.deleteKeys(['key1', 'key2', 'key3']);
      expect(deleted).toBe(3);
    });
  });

  describe('getCogniaKeys', () => {
    it('should return only Cognia-prefixed keys', () => {
      localStorageMock.setItem('cognia-settings', '{}');
      localStorageMock.setItem('cognia-sessions', '[]');
      localStorageMock.setItem('other-app-data', '{}');

      const cogniaKeys = storageManager.getCogniaKeys();
      expect(cogniaKeys.length).toBe(2);
      expect(cogniaKeys.every((k) => k.key.startsWith('cognia-'))).toBe(true);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(storageManager.formatBytes(0)).toBe('0 B');
      expect(storageManager.formatBytes(1024)).toBe('1 KB');
      expect(storageManager.formatBytes(1048576)).toBe('1 MB');
      expect(storageManager.formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('event system', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      const remove = storageManager.addEventListener(listener);

      // Trigger an event
      storageManager.deleteKey('test-key', 'localStorage');

      expect(listener).toHaveBeenCalled();

      // Remove listener
      remove();
      listener.mockClear();

      storageManager.deleteKey('test-key2', 'localStorage');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should log events when enabled', () => {
      storageManager.updateConfig({ enableEventLogging: true });

      storageManager.deleteKey('test-key', 'localStorage');

      const log = storageManager.getEventLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].type).toBe('delete');
    });

    it('should clear event log', () => {
      storageManager.updateConfig({ enableEventLogging: true });
      storageManager.deleteKey('test-key', 'localStorage');

      expect(storageManager.getEventLog().length).toBeGreaterThan(0);

      storageManager.clearEventLog();
      expect(storageManager.getEventLog().length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return storage statistics', async () => {
      localStorageMock.setItem('cognia-test', JSON.stringify({ data: 'test' }));

      const stats = await storageManager.getStats(true);

      expect(stats).toBeDefined();
      expect(stats.localStorage).toBeDefined();
      expect(stats.localStorage.itemCount).toBeGreaterThan(0);
      expect(stats.total).toBeDefined();
      expect(stats.byCategory).toBeDefined();
      expect(stats.lastUpdated).toBeDefined();
    });

    it('should cache stats', async () => {
      const stats1 = await storageManager.getStats(true);
      const stats2 = await storageManager.getStats(false);

      expect(stats1.lastUpdated).toBe(stats2.lastUpdated);
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await storageManager.getHealth();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(health.usagePercent).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('clearCategory', () => {
    it('should clear all keys in a category', () => {
      localStorageMock.setItem('cognia-settings', '{}');
      localStorageMock.setItem('cognia-presets', '[]');
      localStorageMock.setItem('cognia-sessions', '[]');

      const deleted = storageManager.clearCategory('settings');
      expect(deleted).toBeGreaterThan(0);
    });
  });
});

describe('StorageManager Configuration', () => {
  it('should have valid default thresholds', () => {
    expect(DEFAULT_STORAGE_MANAGER_CONFIG.warningThreshold).toBeLessThan(
      DEFAULT_STORAGE_MANAGER_CONFIG.criticalThreshold
    );
    expect(DEFAULT_STORAGE_MANAGER_CONFIG.warningThreshold).toBeGreaterThan(0);
    expect(DEFAULT_STORAGE_MANAGER_CONFIG.criticalThreshold).toBeLessThanOrEqual(1);
  });

  it('should have valid cleanup settings', () => {
    expect(DEFAULT_STORAGE_MANAGER_CONFIG.cleanupInterval).toBeGreaterThan(0);
    expect(DEFAULT_STORAGE_MANAGER_CONFIG.staleDataAge).toBeGreaterThan(0);
  });
});
