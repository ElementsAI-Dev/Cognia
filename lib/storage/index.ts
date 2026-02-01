/**
 * Storage Management Module
 * Centralized storage management for web storage resources
 */

// Core manager
export { StorageManager, StorageManagerImpl } from './storage-manager';

// Cleanup service
export { StorageCleanupService, storageCleanup } from './storage-cleanup';

// Metrics service
export { StorageMetricsService, storageMetrics } from './storage-metrics';
export type { StorageMetricSnapshot, StorageTrend, MetricsConfig } from './storage-metrics';

// IndexedDB utilities
export {
  getCogniaDBStats,
  cleanupIndexedDB,
  cleanupOrphanedRecords,
  optimizeDatabase,
  exportAllData,
  clearTable,
  getStorageEstimate,
  requestPersistentStorage,
  isPersistentStorage,
} from './indexeddb-utils';
export type {
  TableStats,
  DatabaseStats,
  IndexedDBCleanupOptions,
  IndexedDBCleanupResult,
} from './indexeddb-utils';

// Compression utilities
export {
  compressString,
  decompressString,
  CompressedStorage,
  LZString,
  isCompressionSupported,
  calculateCompressionRatio,
  formatCompressionRatio,
} from './storage-compression';
export type { CompressionOptions } from './storage-compression';

// Types
export type {
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
  CleanupOptions,
  CleanupResult,
  CleanupDetail,
  CleanupError,
} from './types';

export {
  DEFAULT_STORAGE_MANAGER_CONFIG,
  STORAGE_KEY_CATEGORIES,
  CATEGORY_INFO,
  INDEXED_DB_NAMES,
} from './types';

// Data import/export utilities
export {
  importFullBackup,
  validateExportData,
  generateChecksum,
  verifyChecksum,
  parseImportFile,
} from './data-import';
export type {
  ExportData,
  ImportOptions,
  ImportResult,
  ImportError,
} from './data-import';

export {
  createFullBackup,
  exportToJSON,
  exportToBlob,
  downloadExport,
  getExportSizeEstimate,
} from './data-export';
export type { ExportOptions } from './data-export';

// Store migration utilities
export {
  createMigrator,
  createPersistOptions,
  createMigrationBuilder,
  MigrationBuilder,
  commonMigrations,
  withMigration,
  getStoredVersion,
  needsMigration,
  forceRehydrate,
} from './store-migration';
export type { MigrationFn, MigrationConfig } from './store-migration';

// IndexedDB storage adapter
export {
  indexedStorage,
  createIndexedStorage,
  clearIndexedStorage,
  getIndexedStorageKeys,
  getIndexedStorageSize,
} from './indexed-storage';

// ChatGPT import utilities
export {
  isChatGPTFormat,
  convertConversation,
  parseChatGPTExport,
  importChatGPTConversations,
  previewChatGPTImport,
} from './chatgpt-import';

// Claude import utilities
export {
  isClaudeFormat,
  ClaudeImporter,
  parseClaudeExport,
  previewClaudeImport,
} from './claude-import';

// Gemini import utilities
export {
  isGeminiFormat,
  GeminiImporter,
  parseGeminiExport,
  previewGeminiImport,
} from './gemini-import';

// Unified import registry
export {
  detectImportFormat,
  getImporter,
  getProviderInfo,
  getSupportedFormats,
  parseImport,
  previewImport,
  importConversations,
  PLATFORM_INFO,
} from './import-registry';
