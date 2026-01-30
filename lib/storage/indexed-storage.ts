/**
 * IndexedDB Storage Adapter for Zustand
 * Provides IndexedDB-backed storage for large stores
 */

import { StateStorage } from 'zustand/middleware';

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
        console.error('[IndexedStorage] Failed to open database:', request.error);
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
          console.error('[IndexedStorage] Database error:', event);
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
          console.error('[IndexedStorage] Error reading:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve(request.result ?? null);
        };
      });
    } catch (error) {
      console.error('[IndexedStorage] getItem error:', error);
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
          console.error('[IndexedStorage] Error writing:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error('[IndexedStorage] setItem error:', error);
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
          console.error('[IndexedStorage] Error removing:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error('[IndexedStorage] removeItem error:', error);
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
    console.error('[IndexedStorage] clearIndexedStorage error:', error);
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
    console.error('[IndexedStorage] getIndexedStorageKeys error:', error);
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
    console.error('[IndexedStorage] getIndexedStorageSize error:', error);
    return 0;
  }
}

export default indexedStorage;
