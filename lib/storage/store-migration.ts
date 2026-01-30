/**
 * Store Migration System
 * Provides versioned migration support for Zustand stores
 */

import { StateCreator } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';

/**
 * Migration function type
 */
export type MigrationFn<T> = (persistedState: unknown, version: number) => T;

/**
 * Migration configuration
 */
export interface MigrationConfig<T> {
  /** Current version number */
  version: number;
  /** Migration functions keyed by target version */
  migrations: Record<number, (state: unknown) => unknown>;
  /** Optional custom merge function */
  merge?: (persistedState: unknown, currentState: T) => T;
}

/**
 * Create a migrate function from migration config
 */
export function createMigrator<T>(config: MigrationConfig<T>): MigrationFn<T> {
  return (persistedState: unknown, version: number): T => {
    let state = persistedState;

    // Run migrations sequentially from current version to target version
    for (let v = version + 1; v <= config.version; v++) {
      const migration = config.migrations[v];
      if (migration) {
        try {
          state = migration(state);
          console.log(`[Migration] Migrated from v${v - 1} to v${v}`);
        } catch (error) {
          console.error(`[Migration] Failed to migrate to v${v}:`, error);
          throw error;
        }
      }
    }

    return state as T;
  };
}

/**
 * Create persist options with migration support
 */
export function createPersistOptions<T>(
  name: string,
  config: MigrationConfig<T>,
  additionalOptions?: Partial<Omit<PersistOptions<T, T>, 'name' | 'version' | 'migrate'>>
): PersistOptions<T, T> {
  return {
    name,
    version: config.version,
    migrate: createMigrator(config),
    storage: createJSONStorage(() => localStorage),
    ...additionalOptions,
  };
}

/**
 * Common migrations for handling Date objects
 */
export const commonMigrations = {
  /**
   * Convert ISO date strings to Date objects
   */
  parseDates: <T extends Record<string, unknown>>(
    state: T,
    dateFields: string[]
  ): T => {
    const result = { ...state };
    for (const field of dateFields) {
      if (result[field] && typeof result[field] === 'string') {
        (result as Record<string, unknown>)[field] = new Date(result[field] as string);
      }
    }
    return result;
  },

  /**
   * Convert Date objects to ISO strings for storage
   */
  serializeDates: <T extends Record<string, unknown>>(
    state: T,
    dateFields: string[]
  ): T => {
    const result = { ...state };
    for (const field of dateFields) {
      if (result[field] instanceof Date) {
        (result as Record<string, unknown>)[field] = (result[field] as Date).toISOString();
      }
    }
    return result;
  },

  /**
   * Rename a field in state
   */
  renameField: <T extends Record<string, unknown>>(
    state: T,
    oldName: string,
    newName: string
  ): T => {
    const result = { ...state };
    if (oldName in result) {
      (result as Record<string, unknown>)[newName] = result[oldName];
      delete (result as Record<string, unknown>)[oldName];
    }
    return result;
  },

  /**
   * Set default value for a field if not present
   */
  setDefault: <T extends Record<string, unknown>>(
    state: T,
    field: string,
    defaultValue: unknown
  ): T => {
    const result = { ...state };
    if (!(field in result) || result[field] === undefined) {
      (result as Record<string, unknown>)[field] = defaultValue;
    }
    return result;
  },

  /**
   * Remove a deprecated field
   */
  removeField: <T extends Record<string, unknown>>(
    state: T,
    field: string
  ): T => {
    const result = { ...state };
    delete (result as Record<string, unknown>)[field];
    return result;
  },

  /**
   * Transform array items
   */
  transformArray: <T extends Record<string, unknown>, I>(
    state: T,
    field: string,
    transformer: (item: I) => I
  ): T => {
    const result = { ...state };
    if (Array.isArray(result[field])) {
      (result as Record<string, unknown>)[field] = (result[field] as I[]).map(transformer);
    }
    return result;
  },
};

/**
 * Migration builder for fluent API
 */
export class MigrationBuilder<T> {
  private migrations: Record<number, (state: unknown) => unknown> = {};
  private currentVersion = 0;

  /**
   * Add a migration for a specific version
   */
  addMigration(version: number, migration: (state: unknown) => unknown): this {
    this.migrations[version] = migration;
    this.currentVersion = Math.max(this.currentVersion, version);
    return this;
  }

  /**
   * Build the migration config
   */
  build(): MigrationConfig<T> {
    return {
      version: this.currentVersion,
      migrations: this.migrations,
    };
  }
}

/**
 * Create a new migration builder
 */
export function createMigrationBuilder<T>(): MigrationBuilder<T> {
  return new MigrationBuilder<T>();
}

/**
 * Helper to wrap a store creator with persist and migration support
 */
export function withMigration<T>(
  name: string,
  storeCreator: StateCreator<T, [], []>,
  config: MigrationConfig<T>,
  partialized?: (state: T) => Partial<T>
): StateCreator<T, [], [['zustand/persist', T]]> {
  return persist(storeCreator, {
    name,
    version: config.version,
    migrate: createMigrator(config),
    storage: createJSONStorage(() => localStorage),
    partialize: partialized as (state: T) => T,
  });
}

/**
 * Get current store version from localStorage
 */
export function getStoredVersion(name: string): number | null {
  try {
    const stored = localStorage.getItem(name);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if store needs migration
 */
export function needsMigration(name: string, currentVersion: number): boolean {
  const storedVersion = getStoredVersion(name);
  return storedVersion !== null && storedVersion < currentVersion;
}

/**
 * Force rehydrate a store
 */
export async function forceRehydrate(storeName: string): Promise<void> {
  // Emit custom event that stores can listen to
  window.dispatchEvent(new CustomEvent('cognia:rehydrate', { detail: { storeName } }));
}
