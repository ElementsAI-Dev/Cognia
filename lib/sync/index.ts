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
  storeGoogleTokens,
  updateGoogleAccessToken,
  getGoogleAccessToken,
  getGoogleRefreshToken,
  getGoogleTokenExpiry,
  isGoogleTokenExpired,
  removeGoogleTokens,
  hasStoredCredentials,
} from './credential-storage';

// Providers
export { WebDAVProvider } from './providers/webdav-provider';
export { GitHubProvider } from './providers/github-provider';
export { GoogleDriveProvider } from './providers/googledrive-provider';
export { BaseSyncProvider } from './providers/sync-provider';
export type { SyncProvider } from './providers/sync-provider';

// Cross-tab sync
export {
  ChatBroadcastChannel,
  getChatBroadcastChannel,
  closeChatBroadcastChannel,
  type ChatSyncEvent,
  type ChatSyncEventType,
  type MessageAddedPayload,
  type MessageUpdatedPayload,
  type MessageDeletedPayload,
  type SessionCreatedPayload,
  type SessionUpdatedPayload,
  type SessionDeletedPayload,
  type SessionSwitchedPayload,
  type MessagesClearedPayload,
} from './chat-broadcast';
