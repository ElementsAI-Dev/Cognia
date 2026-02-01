/**
 * IndexedDB Storage Adapter for Zustand
 * Provides IndexedDB-backed storage for large stores
 */

import { StateStorage } from 'zustand/middleware';
import { loggers } from '@/lib/logger';

const log = loggers.store;

const DB_NAME = 'cognia-zustand-storage';
const STORE_NAME = 'zustand-state';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or get the IndexedDB database
 */
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        log.error('Failed to open database', request.error as Error);
        reject(request.error);
      };

      request.onsuccess = () => {
        dbInstance = request.result;

        // Handle connection closing
        dbInstance.onclose = () => {
          dbInstance = null;
          dbPromise = null;
        };

        // Handle connection errors
        dbInstance.onerror = (event) => {
          log.error('Database error', new Error(String(event)));
        };

        resolve(dbInstance);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  return dbPromise;
}

/**
 * IndexedDB-backed StateStorage for Zustand persist middleware
 */
export const indexedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(name);

        request.onerror = () => {
          log.error('Error reading from IndexedDB', request.error as Error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve(request.result ?? null);
        };
      });
    } catch (error) {
      log.error('getItem error', error as Error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, name);

        request.onerror = () => {
          log.error('Error writing to IndexedDB', request.error as Error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      log.error('setItem error', error as Error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(name);

        request.onerror = () => {
          log.error('Error removing from IndexedDB', request.error as Error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      log.error('removeItem error', error as Error);
    }
  },
};

/**
 * Create a namespaced IndexedDB storage
 * Useful for storing multiple stores in separate databases
 */
export function createIndexedStorage(dbName: string, storeName = 'state'): StateStorage {
  let db: IDBDatabase | null = null;
  let promise: Promise<IDBDatabase> | null = null;

  const openDB = (): Promise<IDBDatabase> => {
    if (db) return Promise.resolve(db);

    if (!promise) {
      promise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          db = request.result;
          db.onclose = () => {
            db = null;
            promise = null;
          };
          resolve(db);
        };

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
          }
        };
      });
    }

    return promise;
  };

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(name);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result ?? null);
        });
      } catch {
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put(value, name);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch {
        // Silently fail
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(name);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch {
        // Silently fail
      }
    },
  };
}

/**
 * Clear all data from the IndexedDB storage
 */
export async function clearIndexedStorage(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    log.error('clearIndexedStorage error', error as Error);
  }
}

/**
 * Get all keys stored in IndexedDB
 */
export async function getIndexedStorageKeys(): Promise<string[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  } catch (error) {
    log.error('getIndexedStorageKeys error', error as Error);
    return [];
  }
}

/**
 * Get storage size estimate for IndexedDB
 */
export async function getIndexedStorageSize(): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const values = request.result as string[];
        const totalSize = values.reduce((sum, value) => sum + (value?.length || 0) * 2, 0);
        resolve(totalSize);
      };
    });
  } catch (error) {
    log.error('getIndexedStorageSize error', error as Error);
    return 0;
  }
}

export default indexedStorage;
