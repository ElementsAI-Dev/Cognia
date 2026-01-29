/**
 * Storage Cleanup Service
 * Automated cleanup for stale, expired, and redundant storage data
 */

import { db } from '@/lib/db';
import { StorageManager } from './storage-manager';
import type {
  StorageCategory,
  CleanupOptions,
  CleanupResult,
  CleanupDetail,
  CleanupError,
} from './types';

/**
 * Default cleanup options
 */
const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
  storageTypes: ['localStorage', 'sessionStorage'],
  olderThan: 30 * 24 * 60 * 60 * 1000, // 30 days
  dryRun: false,
  maxItemsPerCategory: 100,
  preservePinned: true,
};

/**
 * Cleanup rules per category
 */
interface CategoryCleanupRule {
  maxItems?: number;
  maxAge?: number; // in milliseconds
  preserveKeys?: string[];
  cleanupFn?: (keys: string[], options: CleanupOptions) => Promise<number>;
}

const CATEGORY_CLEANUP_RULES: Partial<Record<StorageCategory, CategoryCleanupRule>> = {
  cache: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
  session: {
    maxItems: 100,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
  chat: {
    maxItems: 500,
  },
  media: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  learning: {
    maxItems: 50,
    maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
  },
  workflow: {
    maxItems: 100,
  },
  system: {
    maxItems: 1000,
    preserveKeys: ['cognia-settings', 'cognia-window-store'],
  },
};

/**
 * Storage Cleanup Service
 */
export class StorageCleanupService {
  /**
   * Run cleanup with options
   */
  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const opts = { ...DEFAULT_CLEANUP_OPTIONS, ...options };
    const result: CleanupResult = {
      success: true,
      freedSpace: 0,
      deletedItems: 0,
      errors: [],
      details: [],
    };

    try {
      // Cleanup localStorage
      if (opts.storageTypes?.includes('localStorage')) {
        const localStorageResult = await this.cleanupWebStorage('localStorage', opts);
        result.details.push(...localStorageResult.details);
        result.freedSpace += localStorageResult.freedSpace;
        result.deletedItems += localStorageResult.deletedItems;
        result.errors.push(...localStorageResult.errors);
      }

      // Cleanup sessionStorage
      if (opts.storageTypes?.includes('sessionStorage')) {
        const sessionStorageResult = await this.cleanupWebStorage('sessionStorage', opts);
        result.details.push(...sessionStorageResult.details);
        result.freedSpace += sessionStorageResult.freedSpace;
        result.deletedItems += sessionStorageResult.deletedItems;
        result.errors.push(...sessionStorageResult.errors);
      }

      // Cleanup IndexedDB
      if (opts.storageTypes?.includes('indexedDB')) {
        const indexedDBResult = await this.cleanupIndexedDB(opts);
        result.details.push(...indexedDBResult.details);
        result.freedSpace += indexedDBResult.freedSpace;
        result.deletedItems += indexedDBResult.deletedItems;
        result.errors.push(...indexedDBResult.errors);
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        key: 'global',
        storageType: 'localStorage',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  /**
   * Cleanup web storage (localStorage or sessionStorage)
   */
  private async cleanupWebStorage(
    storageType: 'localStorage' | 'sessionStorage',
    options: CleanupOptions
  ): Promise<{
    details: CleanupDetail[];
    freedSpace: number;
    deletedItems: number;
    errors: CleanupError[];
  }> {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const details: CleanupDetail[] = [];
    const errors: CleanupError[] = [];
    let totalFreedSpace = 0;
    let totalDeletedItems = 0;

    if (typeof storage === 'undefined') {
      return { details, freedSpace: 0, deletedItems: 0, errors };
    }

    // Group keys by category
    const keysByCategory = new Map<StorageCategory, { key: string; size: number; data: unknown }[]>();

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;

      const value = storage.getItem(key);
      if (!value) continue;

      const category = StorageManager.getCategoryForKey(key);

      // Skip if category not in target list
      if (options.categories && !options.categories.includes(category)) {
        continue;
      }

      const size = (key.length + value.length) * 2;
      let data: unknown = null;

      try {
        data = JSON.parse(value);
      } catch {
        data = value;
      }

      const categoryKeys = keysByCategory.get(category) || [];
      categoryKeys.push({ key, size, data });
      keysByCategory.set(category, categoryKeys);
    }

    // Process each category
    for (const [category, keys] of keysByCategory) {
      const rule = CATEGORY_CLEANUP_RULES[category] || {};
      const toDelete: string[] = [];
      let skipped = 0;

      for (const { key, size, data } of keys) {
        // Skip preserved keys
        if (rule.preserveKeys?.includes(key)) {
          skipped++;
          continue;
        }

        // Check age if data has timestamp
        if (options.olderThan && data && typeof data === 'object') {
          const record = data as Record<string, unknown>;
          const state = record.state as Record<string, unknown> | undefined;
          const timestamp = state?.lastUpdated ?? record.lastUpdated ?? record.timestamp;
          if (timestamp && typeof timestamp === 'number') {
            const age = Date.now() - timestamp;
            if (age < options.olderThan) {
              skipped++;
              continue;
            }
          }
        }

        // Check category-specific max age
        if (rule.maxAge && data && typeof data === 'object') {
          const record = data as Record<string, unknown>;
          const state = record.state as Record<string, unknown> | undefined;
          const timestamp = state?.lastUpdated ?? record.lastUpdated ?? record.timestamp;
          if (timestamp && typeof timestamp === 'number') {
            const age = Date.now() - timestamp;
            if (age < rule.maxAge) {
              skipped++;
              continue;
            }
          }
        }

        // Add to delete list
        if (!options.dryRun) {
          if (toDelete.length < (options.maxItemsPerCategory || 100)) {
            toDelete.push(key);
            totalFreedSpace += size;
            totalDeletedItems++;
          }
        } else {
          totalFreedSpace += size;
          totalDeletedItems++;
        }
      }

      // Delete keys
      if (!options.dryRun) {
        for (const key of toDelete) {
          try {
            storage.removeItem(key);
          } catch (error) {
            errors.push({
              key,
              storageType,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      details.push({
        category,
        storageType,
        deletedItems: toDelete.length,
        freedSpace: totalFreedSpace,
        skippedItems: skipped,
      });
    }

    return { details, freedSpace: totalFreedSpace, deletedItems: totalDeletedItems, errors };
  }

  /**
   * Cleanup IndexedDB
   */
  private async cleanupIndexedDB(options: CleanupOptions): Promise<{
    details: CleanupDetail[];
    freedSpace: number;
    deletedItems: number;
    errors: CleanupError[];
  }> {
    const details: CleanupDetail[] = [];
    const errors: CleanupError[] = [];
    let freedSpace = 0;
    let deletedItems = 0;

    try {
      // Cleanup old messages (keep last 1000 per session)
      if (!options.dryRun) {
        const sessions = await db.sessions.toArray();

        for (const session of sessions) {
          const messages = await db.messages
            .where('sessionId')
            .equals(session.id)
            .sortBy('createdAt');

          if (messages.length > 1000) {
            const toDelete = messages.slice(0, messages.length - 1000);
            const deleteIds = toDelete.map((m) => m.id);

            await db.messages.bulkDelete(deleteIds);

            deletedItems += deleteIds.length;
            freedSpace += deleteIds.length * 1024; // Estimate 1KB per message
          }
        }
      }

      // Cleanup old workflow executions (keep last 50 per workflow)
      if (!options.dryRun) {
        const workflows = await db.workflows.toArray();

        for (const workflow of workflows) {
          const executions = await db.workflowExecutions
            .where('workflowId')
            .equals(workflow.id)
            .sortBy('startedAt');

          if (executions.length > 50) {
            const toDelete = executions.slice(0, executions.length - 50);
            const deleteIds = toDelete.map((e) => e.id);

            await db.workflowExecutions.bulkDelete(deleteIds);

            deletedItems += deleteIds.length;
            freedSpace += deleteIds.length * 2048; // Estimate 2KB per execution
          }
        }
      }

      details.push({
        category: 'chat',
        storageType: 'indexedDB',
        deletedItems,
        freedSpace,
        skippedItems: 0,
      });
    } catch (error) {
      errors.push({
        key: 'indexedDB',
        storageType: 'indexedDB',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { details, freedSpace, deletedItems, errors };
  }

  /**
   * Quick cleanup - remove only cache and temporary data
   */
  async quickCleanup(): Promise<CleanupResult> {
    return this.cleanup({
      categories: ['cache'],
      dryRun: false,
    });
  }

  /**
   * Deep cleanup - aggressive cleanup of old data
   */
  async deepCleanup(): Promise<CleanupResult> {
    return this.cleanup({
      storageTypes: ['localStorage', 'sessionStorage', 'indexedDB'],
      olderThan: 7 * 24 * 60 * 60 * 1000, // 7 days
      dryRun: false,
    });
  }

  /**
   * Preview cleanup - dry run to see what would be deleted
   */
  async previewCleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    return this.cleanup({ ...options, dryRun: true });
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    let cleared = 0;

    if (typeof localStorage === 'undefined') return 0;

    const cacheKey = 'app-cache';
    const cacheData = localStorage.getItem(cacheKey);

    if (cacheData) {
      try {
        const cache = JSON.parse(cacheData) as Record<string, { timestamp: number; ttl?: number }>;
        const now = Date.now();
        let modified = false;

        for (const [key, entry] of Object.entries(cache)) {
          if (entry.ttl && now - entry.timestamp > entry.ttl) {
            delete cache[key];
            cleared++;
            modified = true;
          }
        }

        if (modified) {
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        }
      } catch {
        // Ignore parse errors
      }
    }

    return cleared;
  }

  /**
   * Remove orphaned data (references to deleted entities)
   */
  async cleanupOrphanedData(): Promise<number> {
    let cleaned = 0;

    try {
      // Find messages without valid sessions
      const sessions = await db.sessions.toArray();
      const sessionIds = new Set(sessions.map((s) => s.id));

      const allMessages = await db.messages.toArray();
      const orphanedMessages = allMessages.filter((m) => !sessionIds.has(m.sessionId));

      if (orphanedMessages.length > 0) {
        await db.messages.bulkDelete(orphanedMessages.map((m) => m.id));
        cleaned += orphanedMessages.length;
      }

      // Find knowledge files without valid projects
      const projects = await db.projects.toArray();
      const projectIds = new Set(projects.map((p) => p.id));

      const allKnowledgeFiles = await db.knowledgeFiles.toArray();
      const orphanedFiles = allKnowledgeFiles.filter((f) => !projectIds.has(f.projectId));

      if (orphanedFiles.length > 0) {
        await db.knowledgeFiles.bulkDelete(orphanedFiles.map((f) => f.id));
        cleaned += orphanedFiles.length;
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned data:', error);
    }

    return cleaned;
  }
}

// Singleton instance
export const storageCleanup = new StorageCleanupService();
