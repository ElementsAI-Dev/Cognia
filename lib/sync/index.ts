/**
 * Sync Module - WebDAV and GitHub sync functionality
 */

// Core exports
export { getSyncManager, resetSyncManager, SyncManager } from './sync-manager';
export { getSyncScheduler, initSyncScheduler, stopSyncScheduler } from './sync-scheduler';

// Credential storage
export {
  storeWebDAVPassword,
  getWebDAVPassword,
  removeWebDAVPassword,
  storeGitHubToken,
  getGitHubToken,
  removeGitHubToken,
  hasStoredCredentials,
} from './credential-storage';

// Providers
export { WebDAVProvider } from './providers/webdav-provider';
export { GitHubProvider } from './providers/github-provider';
export { BaseSyncProvider } from './providers/sync-provider';
export type { SyncProvider } from './providers/sync-provider';
