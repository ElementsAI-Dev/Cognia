/**
 * Sync Provider Interface - Base interface for all sync providers
 */

import type {
  SyncProvider,
  SyncProviderType,
  SyncData,
  SyncResult,
  SyncMetadata,
  SyncProgress,
  BackupInfo,
} from '@/types/sync';

/**
 * Abstract base class for sync providers
 */
export abstract class BaseSyncProvider implements SyncProvider {
  abstract readonly type: SyncProviderType;

  abstract testConnection(): Promise<{ success: boolean; error?: string }>;
  
  abstract upload(
    data: SyncData,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult>;
  
  abstract download(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null>;
  
  abstract getRemoteMetadata(): Promise<SyncMetadata | null>;
  
  abstract listBackups(): Promise<BackupInfo[]>;
  
  abstract deleteBackup(id: string): Promise<boolean>;
  
  abstract disconnect(): Promise<void>;

  /**
   * Helper to create progress updates
   */
  protected createProgress(
    phase: SyncProgress['phase'],
    current: number,
    total: number,
    message: string
  ): SyncProgress {
    return { phase, current, total, message };
  }

  /**
   * Helper to create success result
   */
  protected createSuccessResult(
    direction: SyncResult['direction'],
    itemsSynced: number
  ): SyncResult {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      direction,
      itemsSynced,
    };
  }

  /**
   * Helper to create error result
   */
  protected createErrorResult(
    direction: SyncResult['direction'],
    error: string
  ): SyncResult {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      direction,
      itemsSynced: 0,
      error,
    };
  }
}

export type { SyncProvider };
