/**
 * Storage Manager - Centralized storage management for web storage resources
 * Provides unified API for localStorage, sessionStorage, and IndexedDB management
 */

import { db } from '@/lib/db';
import { loggers } from '@/lib/logger';

const log = loggers.store;
import type {
  StorageType,
  StorageStats,
  StorageKeyInfo,
  StorageCategory,
  StorageCategoryInfo,
  StorageHealth,
  StorageIssue,
  StorageRecommendation,
  StorageEvent,
  StorageEventType,
  StorageEventListener,
  StorageManagerConfig,
  DatabaseInfo,
  TableInfo,
} from './types';
import {
  DEFAULT_STORAGE_MANAGER_CONFIG,
  STORAGE_KEY_CATEGORIES,
  CATEGORY_INFO,
  INDEXED_DB_NAMES,
} from './types';

/**
 * Storage Manager Class
 * Singleton for managing all web storage resources
 */
class StorageManagerImpl {
  private config: StorageManagerConfig;
  private eventListeners: Set<StorageEventListener> = new Set();
  private eventLog: StorageEvent[] = [];
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private statsCache: StorageStats | null = null;
  private statsCacheTime = 0;
  private readonly STATS_CACHE_TTL = 5000; // 5 seconds

  constructor(config: Partial<StorageManagerConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_MANAGER_CONFIG, ...config };
  }

  /**
   * Initialize the storage manager
   */
  initialize(config?: Partial<StorageManagerConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StorageManagerConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.autoCleanup && !this.cleanupIntervalId) {
      this.startAutoCleanup();
    } else if (!this.config.autoCleanup && this.cleanupIntervalId) {
      this.stopAutoCleanup();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageManagerConfig {
    return { ...this.config };
  }

  // ============================================
  // Storage Statistics
  // ============================================

  /**
   * Get comprehensive storage statistics
   */
  async getStats(forceRefresh = false): Promise<StorageStats> {
    const now = Date.now();

    // Return cached stats if valid
    if (!forceRefresh && this.statsCache && now - this.statsCacheTime < this.STATS_CACHE_TTL) {
      return this.statsCache;
    }

    const [localStorageStats, sessionStorageStats, indexedDBStats, browserEstimate] =
      await Promise.all([
        this.getLocalStorageStats(),
        this.getSessionStorageStats(),
        this.getIndexedDBStats(),
        this.getBrowserStorageEstimate(),
      ]);

    const byCategory = this.getCategoryBreakdown();

    const stats: StorageStats = {
      localStorage: localStorageStats,
      sessionStorage: sessionStorageStats,
      indexedDB: indexedDBStats,
      total: {
        used: browserEstimate.usage,
        quota: browserEstimate.quota,
        usagePercent: browserEstimate.quota > 0 ? (browserEstimate.usage / browserEstimate.quota) * 100 : 0,
      },
      byCategory,
      lastUpdated: now,
    };

    this.statsCache = stats;
    this.statsCacheTime = now;

    return stats;
  }

  /**
   * Get localStorage statistics
   */
  private getLocalStorageStats(): { used: number; quota: number; itemCount: number } {
    if (typeof localStorage === 'undefined') {
      return { used: 0, quota: 0, itemCount: 0 };
    }

    let totalSize = 0;
    const itemCount = localStorage.length;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        // UTF-16 encoding: 2 bytes per character
        totalSize += (key.length + value.length) * 2;
      }
    }

    // localStorage quota is typically 5-10 MB
    const estimatedQuota = 5 * 1024 * 1024;

    return {
      used: totalSize,
      quota: estimatedQuota,
      itemCount,
    };
  }

  /**
   * Get sessionStorage statistics
   */
  private getSessionStorageStats(): { used: number; quota: number; itemCount: number } {
    if (typeof sessionStorage === 'undefined') {
      return { used: 0, quota: 0, itemCount: 0 };
    }

    let totalSize = 0;
    const itemCount = sessionStorage.length;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key) || '';
        totalSize += (key.length + value.length) * 2;
      }
    }

    const estimatedQuota = 5 * 1024 * 1024;

    return {
      used: totalSize,
      quota: estimatedQuota,
      itemCount,
    };
  }

  /**
   * Get IndexedDB statistics
   */
  private async getIndexedDBStats(): Promise<{
    used: number;
    quota: number;
    databases: DatabaseInfo[];
  }> {
    const databases: DatabaseInfo[] = [];
    let totalUsed = 0;

    try {
      // Get CogniaDB stats
      const cogniaDbInfo = await this.getDatabaseInfo(INDEXED_DB_NAMES.COGNIA_DB);
      if (cogniaDbInfo) {
        databases.push(cogniaDbInfo);
        totalUsed += cogniaDbInfo.size;
      }

      // Get RAG storage stats
      const ragDbInfo = await this.getDatabaseInfo(INDEXED_DB_NAMES.RAG_STORAGE);
      if (ragDbInfo) {
        databases.push(ragDbInfo);
        totalUsed += ragDbInfo.size;
      }
    } catch (error) {
      log.warn('Failed to get IndexedDB stats', { error: String(error) });
    }

    return {
      used: totalUsed,
      quota: 0, // Will be filled by browser estimate
      databases,
    };
  }

  /**
   * Get info for a specific database
   */
  private async getDatabaseInfo(dbName: string): Promise<DatabaseInfo | null> {
    try {
      if (dbName === INDEXED_DB_NAMES.COGNIA_DB) {
        const tables: TableInfo[] = [];
        let totalSize = 0;

        // Get counts from each table
        const tableNames = ['sessions', 'messages', 'documents', 'mcpServers', 'projects', 'knowledgeFiles', 'workflows', 'workflowExecutions', 'summaries', 'assets', 'folders'];

        for (const tableName of tableNames) {
          try {
            const table = (db as unknown as Record<string, { count: () => Promise<number> }>)[tableName];
            if (table) {
              const count = await table.count();
              // Estimate ~1KB per record average
              const estimatedSize = count * 1024;
              tables.push({
                name: tableName,
                recordCount: count,
                estimatedSize,
              });
              totalSize += estimatedSize;
            }
          } catch {
            // Table might not exist yet
          }
        }

        return {
          name: dbName,
          size: totalSize,
          tableCount: tables.length,
          tables,
        };
      }

      // For other databases, return minimal info
      return {
        name: dbName,
        size: 0,
        tableCount: 0,
        tables: [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get browser storage estimate
   */
  private async getBrowserStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return { usage: 0, quota: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch {
      return { usage: 0, quota: 0 };
    }
  }

  /**
   * Get storage breakdown by category
   */
  private getCategoryBreakdown(): StorageCategoryInfo[] {
    const categoryData: Map<StorageCategory, { keys: string[]; totalSize: number }> = new Map();

    // Initialize all categories
    Object.keys(CATEGORY_INFO).forEach((cat) => {
      categoryData.set(cat as StorageCategory, { keys: [], totalSize: 0 });
    });

    // Scan localStorage
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          const size = (key.length + value.length) * 2;
          const category = this.getCategoryForKey(key);

          const data = categoryData.get(category) || { keys: [], totalSize: 0 };
          data.keys.push(key);
          data.totalSize += size;
          categoryData.set(category, data);
        }
      }
    }

    return Array.from(categoryData.entries()).map(([category, data]) => ({
      category,
      displayName: CATEGORY_INFO[category].displayName,
      description: CATEGORY_INFO[category].description,
      icon: CATEGORY_INFO[category].icon,
      keys: data.keys,
      totalSize: data.totalSize,
      itemCount: data.keys.length,
    }));
  }

  /**
   * Get category for a storage key
   */
  getCategoryForKey(key: string): StorageCategory {
    // Check exact matches first
    if (STORAGE_KEY_CATEGORIES[key]) {
      return STORAGE_KEY_CATEGORIES[key];
    }

    // Check prefix matches
    for (const [prefix, category] of Object.entries(STORAGE_KEY_CATEGORIES)) {
      if (key.startsWith(prefix)) {
        return category;
      }
    }

    return 'other';
  }

  // ============================================
  // Storage Health
  // ============================================

  /**
   * Get storage health status
   */
  async getHealth(): Promise<StorageHealth> {
    const stats = await this.getStats();
    const issues: StorageIssue[] = [];
    const recommendations: StorageRecommendation[] = [];

    const usagePercent = stats.total.usagePercent / 100;

    // Check quota thresholds
    if (usagePercent >= this.config.criticalThreshold) {
      issues.push({
        type: 'quota_critical',
        severity: 'high',
        message: `Storage usage is critical (${(usagePercent * 100).toFixed(1)}%)`,
        suggestedAction: 'Immediately clear unused data to prevent storage failures',
      });
    } else if (usagePercent >= this.config.warningThreshold) {
      issues.push({
        type: 'quota_warning',
        severity: 'medium',
        message: `Storage usage is high (${(usagePercent * 100).toFixed(1)}%)`,
        suggestedAction: 'Consider cleaning up old data',
      });
    }

    // Check for large items
    const largeItems = this.findLargeItems(100 * 1024); // Items > 100KB
    if (largeItems.length > 0) {
      issues.push({
        type: 'large_item',
        severity: 'low',
        message: `Found ${largeItems.length} large items (>100KB)`,
        affectedKeys: largeItems.map((item) => item.key),
        suggestedAction: 'Review large items for potential optimization',
      });
    }

    // Generate recommendations
    if (stats.byCategory.length > 0) {
      const sortedCategories = [...stats.byCategory].sort((a, b) => b.totalSize - a.totalSize);
      const largestCategory = sortedCategories[0];

      if (largestCategory && largestCategory.totalSize > 1024 * 1024) {
        recommendations.push({
          action: `Clean ${largestCategory.displayName} data`,
          description: `${largestCategory.displayName} is using ${this.formatBytes(largestCategory.totalSize)}`,
          estimatedSavings: Math.floor(largestCategory.totalSize * 0.3),
          priority: 'medium',
        });
      }
    }

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.some((i) => i.severity === 'high')) {
      status = 'critical';
    } else if (issues.some((i) => i.severity === 'medium')) {
      status = 'warning';
    }

    return {
      status,
      usagePercent: usagePercent * 100,
      issues,
      recommendations,
    };
  }

  /**
   * Find items larger than a threshold
   */
  private findLargeItems(threshold: number): StorageKeyInfo[] {
    const largeItems: StorageKeyInfo[] = [];

    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          const size = (key.length + value.length) * 2;
          if (size > threshold) {
            largeItems.push({
              key,
              type: 'localStorage',
              size,
              category: this.getCategoryForKey(key),
            });
          }
        }
      }
    }

    return largeItems.sort((a, b) => b.size - a.size);
  }

  // ============================================
  // Key Management
  // ============================================

  /**
   * Get all storage keys with metadata
   */
  getAllKeys(): StorageKeyInfo[] {
    const keys: StorageKeyInfo[] = [];

    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          keys.push({
            key,
            type: 'localStorage',
            size: (key.length + value.length) * 2,
            category: this.getCategoryForKey(key),
          });
        }
      }
    }

    if (typeof sessionStorage !== 'undefined') {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key) || '';
          keys.push({
            key,
            type: 'sessionStorage',
            size: (key.length + value.length) * 2,
            category: this.getCategoryForKey(key),
          });
        }
      }
    }

    return keys;
  }

  /**
   * Get keys by category
   */
  getKeysByCategory(category: StorageCategory): StorageKeyInfo[] {
    return this.getAllKeys().filter((key) => key.category === category);
  }

  /**
   * Get Cognia-specific keys
   */
  getCogniaKeys(): StorageKeyInfo[] {
    return this.getAllKeys().filter(
      (key) => key.key.startsWith('cognia-') || key.key.startsWith('selection-toolbar')
    );
  }

  // ============================================
  // Data Operations
  // ============================================

  /**
   * Delete a specific key
   */
  deleteKey(key: string, storageType: StorageType = 'localStorage'): boolean {
    try {
      if (storageType === 'localStorage' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        this.emitEvent('delete', storageType, key);
        this.invalidateCache();
        return true;
      } else if (storageType === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
        this.emitEvent('delete', storageType, key);
        this.invalidateCache();
        return true;
      }
      return false;
    } catch (error) {
      log.error('Failed to delete key', error as Error);
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  deleteKeys(keys: string[], storageType: StorageType = 'localStorage'): number {
    let deleted = 0;
    for (const key of keys) {
      if (this.deleteKey(key, storageType)) {
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Clear all data for a category
   */
  clearCategory(category: StorageCategory): number {
    const keys = this.getKeysByCategory(category);
    let deleted = 0;

    for (const keyInfo of keys) {
      if (this.deleteKey(keyInfo.key, keyInfo.type)) {
        deleted++;
      }
    }

    this.emitEvent('clear', 'localStorage', undefined, { category, deleted });
    return deleted;
  }

  /**
   * Clear all Cognia data
   */
  async clearAllCogniaData(): Promise<{ localStorage: number; indexedDB: boolean }> {
    const cogniaKeys = this.getCogniaKeys();
    const localStorageDeleted = this.deleteKeys(cogniaKeys.map((k) => k.key));

    // Clear all IndexedDB tables
    let indexedDBCleared = false;
    try {
      await Promise.all([
        db.sessions.clear(),
        db.messages.clear(),
        db.documents.clear(),
        db.projects.clear(),
        db.workflows.clear(),
        db.workflowExecutions.clear(),
        db.summaries.clear(),
        db.knowledgeFiles.clear(),
        db.agentTraces.clear(),
        db.assets.clear(),
        db.folders.clear(),
        db.mcpServers.clear(),
      ]);
      indexedDBCleared = true;
    } catch (error) {
      log.error('Failed to clear IndexedDB', error as Error);
    }

    this.emitEvent('clear', 'localStorage', undefined, {
      localStorageDeleted,
      indexedDBCleared,
    });

    return {
      localStorage: localStorageDeleted,
      indexedDB: indexedDBCleared,
    };
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Add event listener
   */
  addEventListener(listener: StorageEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit storage event
   */
  private emitEvent(
    type: StorageEventType,
    storageType: StorageType,
    key?: string,
    details?: Record<string, unknown>
  ): void {
    const event: StorageEvent = {
      type,
      storageType,
      key,
      timestamp: Date.now(),
      details,
    };

    // Log event if enabled
    if (this.config.enableEventLogging) {
      this.eventLog.push(event);
      if (this.eventLog.length > this.config.maxEventLogSize) {
        this.eventLog.shift();
      }
    }

    // Notify listeners
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        log.error('Storage event listener error', error as Error);
      }
    });
  }

  /**
   * Get event log
   */
  getEventLog(): StorageEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  // ============================================
  // Auto Cleanup
  // ============================================

  /**
   * Start auto cleanup
   */
  private startAutoCleanup(): void {
    if (this.cleanupIntervalId) return;

    this.cleanupIntervalId = setInterval(() => {
      this.runAutoCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop auto cleanup
   */
  private stopAutoCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Run auto cleanup
   */
  private async runAutoCleanup(): Promise<void> {
    const health = await this.getHealth();

    if (health.status === 'critical' || health.status === 'warning') {
      // Trigger cleanup event
      this.emitEvent('cleanup', 'localStorage', undefined, {
        reason: 'auto',
        status: health.status,
      });
    }
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Invalidate stats cache
   */
  private invalidateCache(): void {
    this.statsCache = null;
    this.statsCacheTime = 0;
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.stopAutoCleanup();
    this.eventListeners.clear();
    this.eventLog = [];
    this.statsCache = null;
  }
}

// Singleton instance
export const StorageManager = new StorageManagerImpl();

// Export class for testing
export { StorageManagerImpl };
