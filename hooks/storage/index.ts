/**
 * Storage Hooks Module
 */

export {
  useStorageStats,
  useStorageUsage,
  useStorageHealth,
  type UseStorageStatsOptions,
  type UseStorageStatsReturn,
} from './use-storage-stats';

export {
  useStorageCleanup,
  type UseStorageCleanupReturn,
} from './use-storage-cleanup';

export {
  usePersistentStorage,
  requestPersistentStorage,
  isPersistentStorage,
  type UsePersistentStorageReturn,
  type StorageEstimate,
} from './use-persistent-storage';

export {
  useStorage,
  type UseStorageReturn,
  type UseStorageOptions,
} from './use-storage';
