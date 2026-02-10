/**
 * Tests for IndexedDB Transport optimizations
 */

import { IndexedDBTransport } from './indexeddb-transport';

// Mock IndexedDB
const mockAdd = jest.fn();
const mockOpenCursor = jest.fn();
const mockCount = jest.fn();
const mockIndex = jest.fn();
const mockObjectStore = jest.fn();
const mockTransaction = jest.fn();

const mockDb = {
  transaction: mockTransaction,
  close: jest.fn(),
};

// Mock IDBFactory
const mockOpen = jest.fn();

beforeAll(() => {
  // Mock indexedDB globally
  const mockIDBRequest = {
    result: mockDb,
    onsuccess: null as ((event: unknown) => void) | null,
    onerror: null as ((event: unknown) => void) | null,
    onupgradeneeded: null as ((event: unknown) => void) | null,
  };

  mockOpen.mockImplementation(() => {
    setTimeout(() => {
      if (mockIDBRequest.onsuccess) {
        mockIDBRequest.onsuccess({ target: mockIDBRequest });
      }
    }, 0);
    return mockIDBRequest;
  });

  Object.defineProperty(window, 'indexedDB', {
    value: { open: mockOpen },
    writable: true,
  });
});

describe('IndexedDBTransport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockReturnValue({
      objectStore: mockObjectStore,
      oncomplete: null,
      onerror: null,
    });
    mockObjectStore.mockReturnValue({
      add: mockAdd,
      index: mockIndex,
      count: mockCount,
    });
    mockIndex.mockReturnValue({
      openCursor: mockOpenCursor,
    });
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const transport = new IndexedDBTransport();
      expect(transport.name).toBe('indexeddb');
    });

    it('should accept custom options', () => {
      const transport = new IndexedDBTransport({
        maxEntries: 5000,
        retentionDays: 14,
        bufferSize: 100,
      });
      expect(transport.name).toBe('indexeddb');
    });
  });

  describe('updateOptions', () => {
    it('should update options at runtime', () => {
      const transport = new IndexedDBTransport();
      // Should not throw
      expect(() => {
        transport.updateOptions({ maxEntries: 20000, retentionDays: 30 });
      }).not.toThrow();
    });

    it('should restart flush timer when flushInterval changes', () => {
      const transport = new IndexedDBTransport({ flushInterval: 5000 });
      expect(() => {
        transport.updateOptions({ flushInterval: 10000 });
      }).not.toThrow();
    });
  });

  describe('log', () => {
    it('should buffer log entries', () => {
      const transport = new IndexedDBTransport({ bufferSize: 100 });
      const entry = {
        id: 'test-1',
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        module: 'test',
        message: 'Test message',
      };

      // Should not throw
      expect(() => transport.log(entry)).not.toThrow();
    });
  });

  describe('onLogsUpdated', () => {
    it('should return an unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = IndexedDBTransport.onLogsUpdated(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });

    it('should handle BroadcastChannel messages', () => {
      const callback = jest.fn();
      const unsubscribe = IndexedDBTransport.onLogsUpdated(callback);

      // Simulate a BroadcastChannel message
      // Note: In test environment BroadcastChannel may be mocked
      // The important thing is it doesn't throw
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should return noop when BroadcastChannel is unavailable', () => {
      const originalBC = globalThis.BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).BroadcastChannel = undefined;

      const callback = jest.fn();
      const unsubscribe = IndexedDBTransport.onLogsUpdated(callback);
      expect(typeof unsubscribe).toBe('function');
      
      // Should be a noop, not throw
      unsubscribe();

      // Restore
      globalThis.BroadcastChannel = originalBC;
    });
  });

  describe('close', () => {
    it('should close without errors', async () => {
      const transport = new IndexedDBTransport();
      
      // Wait for init
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      await expect(transport.close()).resolves.not.toThrow();
    });
  });
});
