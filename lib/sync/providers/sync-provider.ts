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
  
  abstract downloadBackup(id: string): Promise<SyncData | null>;

  abstract deleteBackup(id: string): Promise<boolean>;
  
  abstract disconnect(): Promise<void>;

  /**
   * Retry a fetch operation with exponential backoff
   * Retries on network errors and 5xx status codes, not on 4xx
   */
  protected async retryFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    maxRetries = 3,
    baseDelayMs = 1000
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(input, init);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if aborted
        if (lastError.name === 'AbortError') {
          throw lastError;
        }

        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

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
