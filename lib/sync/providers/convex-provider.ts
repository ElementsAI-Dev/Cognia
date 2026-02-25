/**
 * Convex Sync Provider
 *
 * Implements the SyncProvider interface for Convex cloud database.
 * Uses Convex HTTP API endpoints for upload/download operations.
 */

import type {
  SyncData,
  SyncResult,
  SyncMetadata,
  SyncProgress,
  BackupInfo,
  ConvexSyncConfig,
} from '@/types/sync';
import { BaseSyncProvider } from './sync-provider';
import { loggers } from '@/lib/logger';

const log = loggers.app;

export class ConvexProvider extends BaseSyncProvider {
  readonly type = 'convex' as const;
  private deploymentUrl: string;
  private deployKey: string;

  constructor(config: ConvexSyncConfig, deployKey: string) {
    super();
    this.deploymentUrl = config.deploymentUrl.replace(/\/$/, '');
    this.deployKey = deployKey;
  }

  private getHttpUrl(path: string): string {
    return `${this.deploymentUrl}${path}`;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Convex ${this.deployKey}`,
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.retryFetch(
        this.getHttpUrl('/health'),
        { method: 'GET', headers: this.getHeaders() },
        2,
        500
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Convex returned status ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      if (data.status === 'ok') {
        return { success: true };
      }

      return { success: false, error: 'Unexpected health check response' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async upload(
    data: SyncData,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    try {
      onProgress?.(this.createProgress('preparing', 0, 100, 'Preparing data for Convex...'));

      const syncContent = data.data;
      const tables: Record<string, unknown[]> = {};

      // Map SyncData content to Convex table records with localId.
      // Indexed fields are stored as top-level columns; all remaining
      // fields are serialized into the `metadata` JSON column so that
      // the round-trip is lossless.
      if (syncContent.sessions) {
        tables.sessions = syncContent.sessions.map((s) => {
          const dateToISO = (d: unknown): string =>
            d instanceof Date ? d.toISOString() : String(d ?? new Date().toISOString());

          // Indexed / queryable fields
          const indexed = {
            localId: s.id,
            title: s.title,
            provider: s.provider ?? '',
            model: s.model ?? '',
            mode: s.mode ?? 'chat',
            customIcon: s.customIcon,
            folderId: s.folderId,
            projectId: s.projectId,
            systemPrompt: s.systemPrompt,
            temperature: s.temperature,
            maxTokens: s.maxTokens,
            enableTools: s.enableTools,
            enableResearch: s.enableResearch,
            messageCount: s.messageCount ?? 0,
            lastMessagePreview: s.lastMessagePreview,
            localCreatedAt: dateToISO(s.createdAt),
            localUpdatedAt: dateToISO(s.updatedAt),
          };

          // Collect ALL remaining fields into metadata for lossless sync
          const {
            id: _id, title: _t, provider: _p, model: _m, mode: _mo,
            customIcon: _ci, folderId: _fi, projectId: _pi,
            systemPrompt: _sp, temperature: _te, maxTokens: _mt,
            enableTools: _et, enableResearch: _er,
            messageCount: _mc, lastMessagePreview: _lp,
            createdAt: _ca, updatedAt: _ua,
            ...extraFields
          } = s;

          const metadata = Object.keys(extraFields).length > 0
            ? JSON.stringify(extraFields, (_k, v) =>
                v instanceof Date ? v.toISOString() : v
              )
            : undefined;

          return { ...indexed, metadata };
        });
      }

      if (syncContent.messages) {
        tables.messages = syncContent.messages.map((m) => {
          const dateToISO = (d: unknown): string =>
            d instanceof Date ? d.toISOString() : String(d ?? new Date().toISOString());

          return {
            localId: m.id,
            sessionId: m.sessionId,
            branchId: m.branchId,
            role: m.role,
            content: m.content,
            parts: m.parts,
            model: m.model,
            provider: m.provider,
            tokens: m.tokens,
            attachments: m.attachments,
            sources: m.sources,
            error: m.error,
            isEdited: m.isEdited,
            editHistory: m.editHistory,
            originalContent: m.originalContent,
            isBookmarked: m.isBookmarked,
            bookmarkedAt: m.bookmarkedAt ? dateToISO(m.bookmarkedAt) : undefined,
            reaction: m.reaction,
            reactions: m.reactions,
            localCreatedAt: dateToISO(m.createdAt),
          };
        });
      }

      if (syncContent.folders) {
        tables.folders = (syncContent.folders as Record<string, unknown>[]).map((f) => {
          const dateToISO = (d: unknown): string =>
            d instanceof Date ? d.toISOString() : String(d ?? new Date().toISOString());

          return {
            localId: String(f.id ?? ''),
            name: String(f.name ?? ''),
            order: Number(f.order ?? 0),
            isExpanded: f.isExpanded as boolean | undefined,
            localCreatedAt: dateToISO(f.createdAt),
            localUpdatedAt: dateToISO(f.updatedAt),
          };
        });
      }

      if (syncContent.projects) {
        tables.projects = (syncContent.projects as Record<string, unknown>[]).map((p) => {
          const dateToISO = (d: unknown): string =>
            d instanceof Date ? d.toISOString() : String(d ?? new Date().toISOString());

          // Indexed / queryable fields
          const indexed = {
            localId: String(p.id ?? ''),
            name: String(p.name ?? ''),
            description: p.description as string | undefined,
            icon: p.icon as string | undefined,
            color: p.color as string | undefined,
            customInstructions: p.customInstructions as string | undefined,
            defaultProvider: p.defaultProvider as string | undefined,
            defaultModel: p.defaultModel as string | undefined,
            defaultMode: p.defaultMode as string | undefined,
            tags: p.tags ? JSON.stringify(p.tags) : undefined,
            isArchived: p.isArchived as boolean | undefined,
            archivedAt: p.archivedAt ? dateToISO(p.archivedAt) : undefined,
            sessionIds: p.sessionIds ? JSON.stringify(p.sessionIds) : undefined,
            metadata: p.metadata as string | undefined,
            sessionCount: Number(p.sessionCount ?? 0),
            messageCount: Number(p.messageCount ?? 0),
            localCreatedAt: dateToISO(p.createdAt),
            localUpdatedAt: dateToISO(p.updatedAt),
            lastAccessedAt: dateToISO(p.lastAccessedAt),
          };

          return indexed;
        });
      }

      onProgress?.(this.createProgress('uploading', 30, 100, 'Uploading to Convex...'));

      // Upload via HTTP API - split into chunks if payload is large
      const payload = JSON.stringify({
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        version: data.version,
        checksum: data.checksum,
        tables,
      });

      const MAX_PAYLOAD_SIZE = 7 * 1024 * 1024; // 7MB (under Convex 8MB limit)
      let totalImported = 0;

      if (payload.length <= MAX_PAYLOAD_SIZE) {
        const response = await this.retryFetch(
          this.getHttpUrl('/api/sync/import'),
          { method: 'POST', headers: this.getHeaders(), body: payload },
          2,
          1000
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }

        const result = await response.json();
        totalImported = result.imported ?? 0;
      } else {
        // Split tables into batches
        log.info('Convex upload: payload too large, splitting into batches');
        const tableNames = Object.keys(tables);
        const batchErrors: string[] = [];
        for (let i = 0; i < tableNames.length; i++) {
          const tableName = tableNames[i];
          const batchPayload = JSON.stringify({
            deviceId: data.deviceId,
            deviceName: data.deviceName,
            version: data.version,
            checksum: data.checksum,
            tables: { [tableName]: tables[tableName] },
          });

          onProgress?.(
            this.createProgress(
              'uploading',
              30 + Math.round((i / tableNames.length) * 60),
              100,
              `Uploading ${tableName}...`
            )
          );

          const response = await this.retryFetch(
            this.getHttpUrl('/api/sync/import'),
            { method: 'POST', headers: this.getHeaders(), body: batchPayload },
            2,
            1000
          );

          if (response.ok) {
            const result = await response.json();
            totalImported += result.imported ?? 0;
          } else {
            batchErrors.push(tableName);
            log.warn(`Convex upload: batch for ${tableName} failed`);
          }
        }

        if (batchErrors.length > 0) {
          return this.createErrorResult(
            'upload',
            `Partial upload failure: ${batchErrors.join(', ')} failed`
          );
        }
      }

      onProgress?.(this.createProgress('completing', 95, 100, 'Sync complete'));

      return this.createSuccessResult('upload', totalImported);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      log.error('Convex upload failed', error as Error);
      return this.createErrorResult('upload', message);
    }
  }

  async download(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null> {
    try {
      onProgress?.(this.createProgress('downloading', 0, 100, 'Downloading from Convex...'));

      const response = await this.retryFetch(
        this.getHttpUrl('/api/sync/export'),
        { method: 'GET', headers: this.getHeaders() },
        2,
        1000
      );

      if (!response.ok) {
        log.error(`Convex download failed: ${response.status}`);
        return null;
      }

      const exportedData = await response.json();

      onProgress?.(this.createProgress('merging', 50, 100, 'Processing downloaded data...'));

      // Helper: strip Convex internal fields from exported records
      const stripConvexFields = (rec: Record<string, unknown>): Record<string, unknown> => {
        const { _id, _creationTime, ...rest } = rec;
        return rest;
      };

      // Map Convex records back to SyncData format.
      // For sessions: merge indexed fields with the lossless metadata JSON
      // to reconstruct the full Session object.
      const sessions = (exportedData.sessions ?? []).map((raw: Record<string, unknown>) => {
        const s = stripConvexFields(raw);

        // Parse metadata to recover extra session fields
        let extra: Record<string, unknown> = {};
        if (typeof s.metadata === 'string' && s.metadata.length > 0) {
          try { extra = JSON.parse(s.metadata); } catch { /* ignore */ }
        }

        return {
          ...extra,
          id: s.localId,
          title: s.title,
          provider: s.provider,
          model: s.model,
          mode: s.mode,
          customIcon: s.customIcon,
          folderId: s.folderId,
          projectId: s.projectId,
          systemPrompt: s.systemPrompt,
          temperature: s.temperature,
          maxTokens: s.maxTokens,
          enableTools: s.enableTools,
          enableResearch: s.enableResearch,
          messageCount: s.messageCount,
          lastMessagePreview: s.lastMessagePreview,
          createdAt: new Date(s.localCreatedAt as string),
          updatedAt: new Date(s.localUpdatedAt as string),
        };
      });

      const messages = (exportedData.messages ?? []).map((raw: Record<string, unknown>) => {
        const m = stripConvexFields(raw);
        return {
          id: m.localId,
          sessionId: m.sessionId,
          branchId: m.branchId,
          role: m.role,
          content: m.content,
          parts: m.parts,
          model: m.model,
          provider: m.provider,
          tokens: m.tokens,
          attachments: m.attachments,
          sources: m.sources,
          error: m.error,
          isEdited: m.isEdited,
          editHistory: m.editHistory,
          originalContent: m.originalContent,
          isBookmarked: m.isBookmarked,
          bookmarkedAt: m.bookmarkedAt ? new Date(m.bookmarkedAt as string) : undefined,
          reaction: m.reaction,
          reactions: m.reactions,
          createdAt: new Date(m.localCreatedAt as string),
        };
      });

      const folders = (exportedData.folders ?? []).map((raw: Record<string, unknown>) => {
        const f = stripConvexFields(raw);
        return {
          id: f.localId,
          name: f.name,
          order: f.order,
          isExpanded: f.isExpanded,
          createdAt: new Date(f.localCreatedAt as string),
          updatedAt: new Date(f.localUpdatedAt as string),
        };
      });

      const projects = (exportedData.projects ?? []).map((raw: Record<string, unknown>) => {
        const p = stripConvexFields(raw);
        return {
          id: p.localId,
          name: p.name,
          description: p.description,
          icon: p.icon,
          color: p.color,
          customInstructions: p.customInstructions,
          defaultProvider: p.defaultProvider,
          defaultModel: p.defaultModel,
          defaultMode: p.defaultMode,
          tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
          isArchived: p.isArchived,
          archivedAt: p.archivedAt ? new Date(p.archivedAt as string) : undefined,
          sessionIds: typeof p.sessionIds === 'string' ? JSON.parse(p.sessionIds) : p.sessionIds,
          metadata: p.metadata,
          sessionCount: p.sessionCount,
          messageCount: p.messageCount,
          createdAt: new Date(p.localCreatedAt as string),
          updatedAt: new Date(p.localUpdatedAt as string),
          lastAccessedAt: new Date(p.lastAccessedAt as string),
        };
      });

      onProgress?.(this.createProgress('completing', 90, 100, 'Download complete'));

      // Get metadata for device info
      const metaResponse = await this.retryFetch(
        this.getHttpUrl('/api/sync/metadata'),
        { method: 'GET', headers: this.getHeaders() },
        1,
        500
      );
      const metadata = metaResponse.ok ? await metaResponse.json() : null;

      return {
        version: metadata?.version ?? '1.1',
        syncedAt: metadata?.syncedAt ?? new Date().toISOString(),
        deviceId: metadata?.deviceId ?? 'unknown',
        deviceName: metadata?.deviceName ?? 'unknown',
        checksum: metadata?.checksum ?? '',
        dataTypes: ['sessions', 'messages', 'folders', 'projects'],
        data: {
          sessions,
          messages,
          folders,
          projects,
        },
      };
    } catch (error) {
      log.error('Convex download failed', error as Error);
      return null;
    }
  }

  async getRemoteMetadata(): Promise<SyncMetadata | null> {
    try {
      const response = await this.retryFetch(
        this.getHttpUrl('/api/sync/metadata'),
        { method: 'GET', headers: this.getHeaders() },
        1,
        500
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (!data) return null;

      return {
        version: data.version,
        syncedAt: data.syncedAt,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        checksum: data.checksum,
        size: 0,
      };
    } catch {
      return null;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    // Convex doesn't have built-in versioned backups like file-based providers.
    // Return empty array — backups are managed by Convex dashboard.
    return [];
  }

  async downloadBackup(_id: string): Promise<SyncData | null> {
    return null;
  }

  async deleteBackup(_id: string): Promise<boolean> {
    return false;
  }

  async disconnect(): Promise<void> {
    // No persistent connection to clean up for HTTP-based sync
  }
}
