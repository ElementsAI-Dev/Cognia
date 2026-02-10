/**
 * Sync Types - Type definitions for WebDAV, GitHub, and Google Drive sync features
 */

import type { Session, Artifact } from '@/types';
import type { DBMessage } from '@/lib/db';

// ============================================
// Base Sync Configuration
// ============================================

export type SyncProviderType = 'webdav' | 'github' | 'googledrive';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';
export type ConflictResolution = 'local' | 'remote' | 'newest' | 'manual';
export type SyncDirection = 'upload' | 'download' | 'bidirectional';

export type SyncDataType = 'settings' | 'sessions' | 'messages' | 'artifacts' | 'folders' | 'projects';

export const ALL_SYNC_DATA_TYPES: SyncDataType[] = ['settings', 'sessions', 'messages', 'artifacts', 'folders', 'projects'];

export interface BaseSyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSyncAt: string | null;
  syncOnStartup: boolean;
  syncOnExit: boolean;
  conflictResolution: ConflictResolution;
  syncDirection: SyncDirection;
  maxBackups: number; // max number of backup files to keep (0 = unlimited)
  syncDataTypes: SyncDataType[]; // which data types to sync (empty = all)
}

// ============================================
// WebDAV Configuration
// ============================================

export interface WebDAVConfig extends BaseSyncConfig {
  type: 'webdav';
  serverUrl: string;
  username: string;
  remotePath: string; // e.g., /cognia-sync/
  useDigestAuth: boolean;
  // Password stored in Stronghold, not here
}

export const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
  type: 'webdav',
  enabled: false,
  autoSync: false,
  syncInterval: 30,
  lastSyncAt: null,
  syncOnStartup: false,
  syncOnExit: false,
  conflictResolution: 'newest',
  syncDirection: 'bidirectional',
  maxBackups: 10,
  syncDataTypes: [],
  serverUrl: '',
  username: '',
  remotePath: '/cognia-sync/',
  useDigestAuth: false,
};

// ============================================
// GitHub Configuration
// ============================================

export interface GitHubSyncConfig extends BaseSyncConfig {
  type: 'github';
  repoOwner: string;
  repoName: string;
  branch: string;
  remotePath: string; // e.g., cognia-backup/
  createPrivateRepo: boolean;
  gistMode: boolean; // use Gist instead of repo
  gistId?: string;
  // Access token stored in Stronghold, not here
}

export const DEFAULT_GITHUB_CONFIG: GitHubSyncConfig = {
  type: 'github',
  enabled: false,
  autoSync: false,
  syncInterval: 60,
  lastSyncAt: null,
  syncOnStartup: false,
  syncOnExit: false,
  conflictResolution: 'newest',
  syncDirection: 'bidirectional',
  maxBackups: 10,
  syncDataTypes: [],
  repoOwner: '',
  repoName: 'cognia-sync',
  branch: 'main',
  remotePath: 'backup/',
  createPrivateRepo: true,
  gistMode: false,
};

// ============================================
// Google Drive Configuration
// ============================================

export interface GoogleDriveConfig extends BaseSyncConfig {
  type: 'googledrive';
  useAppDataFolder: boolean; // Use hidden app-specific folder (recommended)
  folderId?: string; // Custom folder ID (when not using appDataFolder)
  folderName: string; // Folder name for display
  enableResumableUpload: boolean; // Use resumable upload for large files
  chunkSize: number; // Chunk size for resumable upload (bytes)
  userEmail?: string; // Connected Google account email
  // OAuth tokens stored in Stronghold, not here
}

export const DEFAULT_GOOGLE_DRIVE_CONFIG: GoogleDriveConfig = {
  type: 'googledrive',
  enabled: false,
  autoSync: false,
  syncInterval: 30,
  lastSyncAt: null,
  syncOnStartup: false,
  syncOnExit: false,
  conflictResolution: 'newest',
  syncDirection: 'bidirectional',
  maxBackups: 10,
  syncDataTypes: [],
  useAppDataFolder: true,
  folderName: 'cognia-backup',
  enableResumableUpload: true,
  chunkSize: 10 * 1024 * 1024, // 10MB chunks
};

// ============================================
// Sync Data Structures
// ============================================

export interface SyncDataContent {
  settings?: Record<string, unknown>;
  sessions?: Session[];
  messages?: DBMessage[];
  artifacts?: Record<string, Artifact>;
  folders?: unknown[];
  projects?: unknown[];
}

export interface SyncData {
  version: string;
  syncedAt: string;
  deviceId: string;
  deviceName: string;
  checksum: string;
  dataTypes: (keyof SyncDataContent)[];
  data: SyncDataContent;
}

export interface SyncMetadata {
  version: string;
  syncedAt: string;
  deviceId: string;
  deviceName: string;
  checksum: string;
  size: number;
}

// ============================================
// Sync Operations
// ============================================

export interface SyncResult {
  success: boolean;
  timestamp: string;
  direction: SyncDirection;
  itemsSynced: number;
  error?: string;
  conflicts?: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  type: 'session' | 'message' | 'artifact' | 'setting';
  key: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: string;
  remoteTimestamp: string;
  resolved: boolean;
  resolution?: 'local' | 'remote';
}

export interface BackupInfo {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  deviceId: string;
  deviceName: string;
  checksum: string;
}

export interface SyncProgress {
  phase: 'preparing' | 'uploading' | 'downloading' | 'merging' | 'completing';
  current: number;
  total: number;
  message: string;
}

// ============================================
// Sync Provider Interface
// ============================================

export interface SyncProvider {
  readonly type: SyncProviderType;
  
  /** Test connection to remote */
  testConnection(): Promise<{ success: boolean; error?: string }>;
  
  /** Upload sync data to remote */
  upload(data: SyncData, onProgress?: (progress: SyncProgress) => void): Promise<SyncResult>;
  
  /** Download sync data from remote */
  download(onProgress?: (progress: SyncProgress) => void): Promise<SyncData | null>;
  
  /** Get remote metadata without full download */
  getRemoteMetadata(): Promise<SyncMetadata | null>;
  
  /** List available backups */
  listBackups(): Promise<BackupInfo[]>;

  /** Download a specific backup by ID */
  downloadBackup(id: string): Promise<SyncData | null>;
  
  /** Delete a specific backup */
  deleteBackup(id: string): Promise<boolean>;
  
  /** Disconnect and cleanup */
  disconnect(): Promise<void>;
}

// ============================================
// Sync Store State
// ============================================

export interface SyncState {
  // Provider configurations
  webdavConfig: WebDAVConfig;
  githubConfig: GitHubSyncConfig;
  googleDriveConfig: GoogleDriveConfig;
  activeProvider: SyncProviderType | null;
  
  // Sync status
  status: SyncStatus;
  progress: SyncProgress | null;
  lastError: string | null;
  
  // Sync history
  syncHistory: SyncResult[];
  
  // Conflicts
  pendingConflicts: SyncConflict[];
  
  // Device info
  deviceId: string;
  deviceName: string;
}

export interface SyncActions {
  // Configuration
  setWebDAVConfig: (config: Partial<WebDAVConfig>) => void;
  setGitHubConfig: (config: Partial<GitHubSyncConfig>) => void;
  setGoogleDriveConfig: (config: Partial<GoogleDriveConfig>) => void;
  setActiveProvider: (provider: SyncProviderType | null) => void;
  
  // Operations
  startSync: (direction?: SyncDirection) => Promise<SyncResult>;
  cancelSync: () => void;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  
  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => void;
  resolveAllConflicts: (resolution: 'local' | 'remote') => void;
  
  // Backup management
  listBackups: () => Promise<BackupInfo[]>;
  restoreBackup: (backupId: string) => Promise<boolean>;
  deleteBackup: (backupId: string) => Promise<boolean>;
  
  // Status
  setStatus: (status: SyncStatus) => void;
  setProgress: (progress: SyncProgress | null) => void;
  setError: (error: string | null) => void;
  
  // Device
  setDeviceName: (name: string) => void;
  
  // Reset
  reset: () => void;
}

export type SyncStore = SyncState & SyncActions;

// ============================================
// Credential Types (for Stronghold)
// ============================================

export interface WebDAVCredentials {
  password: string;
}

export interface GitHubCredentials {
  accessToken: string;
}

export interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================
// Sync Events
// ============================================

export type SyncEventType = 
  | 'sync:started'
  | 'sync:progress'
  | 'sync:completed'
  | 'sync:failed'
  | 'sync:conflict'
  | 'sync:cancelled';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: string;
  data?: unknown;
}

export type SyncEventListener = (event: SyncEvent) => void;
