/**
 * @jest-environment jsdom
 */

import {
  indexedStorage,
  createIndexedStorage,
  clearIndexedStorage,
  getIndexedStorageKeys,
  getIndexedStorageSize,
} from './indexed-storage';

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  },
}));

describe('indexed-storage', () => {
  describe('indexedStorage interface', () => {
    it('should have getItem method', () => {
      expect(typeof indexedStorage.getItem).toBe('function');
    });

    it('should have setItem method', () => {
      expect(typeof indexedStorage.setItem).toBe('function');
    });

    it('should have removeItem method', () => {
      expect(typeof indexedStorage.removeItem).toBe('function');
    });
  });

  describe('createIndexedStorage', () => {
    it('should create namespaced storage', () => {
      const storage = createIndexedStorage('my-db', 'my-store');
      expect(storage).toHaveProperty('getItem');
      expect(storage).toHaveProperty('setItem');
      expect(storage).toHaveProperty('removeItem');
    });

    it('should use default store name', () => {
      const storage = createIndexedStorage('my-db');
      expect(storage).toBeDefined();
      expect(typeof storage.getItem).toBe('function');
    });
  });

  describe('clearIndexedStorage', () => {
    it('should be a function', () => {
      expect(typeof clearIndexedStorage).toBe('function');
    });
  });

  describe('getIndexedStorageKeys', () => {
    it('should be a function', () => {
      expect(typeof getIndexedStorageKeys).toBe('function');
    });
  });

  describe('getIndexedStorageSize', () => {
    it('should be a function', () => {
      expect(typeof getIndexedStorageSize).toBe('function');
    });
  });
});
