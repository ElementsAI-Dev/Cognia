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
  SyncDataContent,
} from '@/types/sync';
import { BaseSyncProvider } from './sync-provider';
import { resolveConvexHttpBaseUrl } from '@/lib/sync/convex-url';
import { loggers } from '@/lib/logger';

const log = loggers.app;

const PAGED_EXPORT_TABLES = [
  'settings',
  'sessions',
  'messages',
  'artifacts',
  'folders',
  'projects',
] as const;

const EXPORT_PAGE_SIZE = 250;
const IMPORT_RECORD_CHUNK_SIZE = 200;
const MAX_EXPORT_PAGES_PER_TABLE = 5000;

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) return value;
  return new Date().toISOString();
}

function sortDeep(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function stripConvexFields(rec: Record<string, unknown>): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = rec;
  return rest;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function buildDataTypes(data: SyncDataContent): (keyof SyncDataContent)[] {
  const dataTypes: (keyof SyncDataContent)[] = [];
  if (data.settings !== undefined) dataTypes.push('settings');
  if (data.sessions !== undefined) dataTypes.push('sessions');
  if (data.messages !== undefined) dataTypes.push('messages');
  if (data.artifacts !== undefined) dataTypes.push('artifacts');
  if (data.folders !== undefined) dataTypes.push('folders');
  if (data.projects !== undefined) dataTypes.push('projects');
  return dataTypes;
}

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value as Record<string, unknown>[];
}

function chunkRecords(records: unknown[], chunkSize: number): unknown[][] {
  if (records.length === 0) return [];
  const chunks: unknown[][] = [];
  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize));
  }
  return chunks;
}

async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      fallback;
    const code = typeof payload.code === 'string' ? payload.code : '';
    return code ? `${message} (${code})` : message;
  } catch {
    return fallback;
  }
}

interface PagedExportResponse {
  table: string;
  items: unknown[];
  continueCursor: string;
  isDone: boolean;
}

export class ConvexProvider extends BaseSyncProvider {
  readonly type = 'convex' as const;
  private deploymentUrl: string;
  private deployKey: string;

  constructor(config: ConvexSyncConfig, deployKey: string) {
    super();
    const resolvedBaseUrl = resolveConvexHttpBaseUrl(config.deploymentUrl);
    this.deploymentUrl = resolvedBaseUrl || config.deploymentUrl.replace(/\/$/, '');
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

  private async fetchLegacyExport(): Promise<Record<string, unknown>> {
    const response = await this.retryFetch(
      this.getHttpUrl('/api/sync/export'),
      { method: 'GET', headers: this.getHeaders() },
      2,
      1000
    );

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        `Convex export failed: ${response.status}`
      );
      throw new Error(message);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private async fetchTablePaged(table: (typeof PAGED_EXPORT_TABLES)[number]): Promise<Record<string, unknown>[] | null> {
    let cursor: string | undefined;
    const rows: Record<string, unknown>[] = [];

    for (let pageIndex = 0; pageIndex < MAX_EXPORT_PAGES_PER_TABLE; pageIndex++) {
      const url = new URL(this.getHttpUrl('/api/sync/export'));
      url.searchParams.set('table', table);
      url.searchParams.set('limit', String(EXPORT_PAGE_SIZE));
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await this.retryFetch(
        url.toString(),
        { method: 'GET', headers: this.getHeaders() },
        2,
        1000
      );

      if (!response.ok) {
        // Older servers may not support paged contract yet.
        if (response.status === 400 || response.status === 404) {
          return null;
        }

        const message = await parseErrorResponse(
          response,
          `Convex paged export failed: ${response.status}`
        );
        throw new Error(message);
      }

      const payload = (await response.json()) as Partial<PagedExportResponse>;
      if (!Array.isArray(payload.items) || typeof payload.isDone !== 'boolean') {
        return null;
      }

      rows.push(...asRecords(payload.items));
      if (payload.isDone) {
        break;
      }

      cursor = typeof payload.continueCursor === 'string' ? payload.continueCursor : undefined;
      if (!cursor) {
        break;
      }
    }

    return rows;
  }

  private async fetchExportData(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<Record<string, unknown>> {
    const pagedResult: Record<string, unknown> = {};

    for (let index = 0; index < PAGED_EXPORT_TABLES.length; index++) {
      const table = PAGED_EXPORT_TABLES[index];
      onProgress?.(
        this.createProgress(
          'downloading',
          5 + Math.round((index / PAGED_EXPORT_TABLES.length) * 30),
          100,
          `Downloading ${table}...`
        )
      );

      const rows = await this.fetchTablePaged(table);
      if (rows === null) {
        log.info('Convex export: paged endpoint unavailable, using legacy export fallback');
        return this.fetchLegacyExport();
      }
      pagedResult[table] = rows;
    }

    return pagedResult;
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
          error: await parseErrorResponse(
            response,
            `Convex returned status ${response.status}: ${response.statusText}`
          ),
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

      if (syncContent.settings !== undefined) {
        tables.settings = [
          {
            localId: 'global-settings',
            payload: stableStringify(syncContent.settings),
            localUpdatedAt: data.syncedAt,
          },
        ];
      }

      if (syncContent.sessions) {
        tables.sessions = syncContent.sessions.map((s) => {
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
            localCreatedAt: toIso(s.createdAt),
            localUpdatedAt: toIso(s.updatedAt),
          };

          const {
            id: _id,
            title: _title,
            provider: _provider,
            model: _model,
            mode: _mode,
            customIcon: _customIcon,
            folderId: _folderId,
            projectId: _projectId,
            systemPrompt: _systemPrompt,
            temperature: _temperature,
            maxTokens: _maxTokens,
            enableTools: _enableTools,
            enableResearch: _enableResearch,
            messageCount: _messageCount,
            lastMessagePreview: _lastMessagePreview,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...extraFields
          } = s;

          const metadata =
            Object.keys(extraFields).length > 0 ? stableStringify(extraFields) : undefined;

          return { ...indexed, metadata };
        });
      }

      if (syncContent.messages) {
        tables.messages = syncContent.messages.map((m) => ({
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
          bookmarkedAt: m.bookmarkedAt ? toIso(m.bookmarkedAt) : undefined,
          reaction: m.reaction,
          reactions: m.reactions,
          localCreatedAt: toIso(m.createdAt),
        }));
      }

      if (syncContent.artifacts !== undefined) {
        tables.artifacts = Object.entries(syncContent.artifacts).map(([id, artifact]) => ({
          localId: id,
          payload: stableStringify(artifact),
          localUpdatedAt: data.syncedAt,
        }));
      }

      if (syncContent.folders) {
        tables.folders = (syncContent.folders as Record<string, unknown>[]).map((f) => ({
          localId: String(f.id ?? ''),
          name: String(f.name ?? ''),
          order: Number(f.order ?? 0),
          isExpanded: f.isExpanded as boolean | undefined,
          localCreatedAt: toIso(f.createdAt),
          localUpdatedAt: toIso(f.updatedAt),
        }));
      }

      if (syncContent.projects) {
        tables.projects = (syncContent.projects as Record<string, unknown>[]).map((p) => ({
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
          archivedAt: p.archivedAt ? toIso(p.archivedAt) : undefined,
          sessionIds: p.sessionIds ? JSON.stringify(p.sessionIds) : undefined,
          metadata:
            typeof p.metadata === 'string' ? p.metadata : p.metadata ? stableStringify(p.metadata) : undefined,
          sessionCount: Number(p.sessionCount ?? 0),
          messageCount: Number(p.messageCount ?? 0),
          localCreatedAt: toIso(p.createdAt),
          localUpdatedAt: toIso(p.updatedAt),
          lastAccessedAt: toIso(p.lastAccessedAt),
        }));
      }

      const tableEntries = Object.entries(tables).filter(([, rows]) => rows.length > 0);
      const totalChunks = tableEntries.reduce(
        (sum, [, rows]) => sum + chunkRecords(rows, IMPORT_RECORD_CHUNK_SIZE).length,
        0
      );

      onProgress?.(this.createProgress('uploading', 25, 100, 'Uploading to Convex...'));

      let processedChunks = 0;
      let totalImported = 0;
      const syncRunId = `${data.deviceId}:${Date.now()}`;

      for (const [tableName, rows] of tableEntries) {
        const chunks = chunkRecords(rows, IMPORT_RECORD_CHUNK_SIZE);

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          processedChunks++;

          const payload = JSON.stringify({
            deviceId: data.deviceId,
            deviceName: data.deviceName,
            version: data.version,
            checksum: data.checksum,
            tables: { [tableName]: chunk },
            reconciliation: {
              mode: 'authoritative',
              replaceTables: chunkIndex === 0 ? [tableName] : [],
              syncRunId,
              chunkIndex,
              chunkCount: chunks.length,
            },
          });

          onProgress?.(
            this.createProgress(
              'uploading',
              25 + Math.round((processedChunks / Math.max(totalChunks, 1)) * 65),
              100,
              `Uploading ${tableName} (${chunkIndex + 1}/${chunks.length})...`
            )
          );

          const response = await this.retryFetch(
            this.getHttpUrl('/api/sync/import'),
            { method: 'POST', headers: this.getHeaders(), body: payload },
            2,
            1000
          );

          if (!response.ok) {
            const message = await parseErrorResponse(
              response,
              `Upload failed for ${tableName}: ${response.status}`
            );
            throw new Error(message);
          }

          const result = (await response.json()) as Record<string, unknown>;
          totalImported += Number(result.imported ?? 0);
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

      const exportedData = await this.fetchExportData(onProgress);
      onProgress?.(this.createProgress('merging', 50, 100, 'Processing downloaded data...'));

      const sessions = asRecords(exportedData.sessions).map((raw) => {
        const s = stripConvexFields(raw);
        const extra = parseJson<Record<string, unknown>>(s.metadata, {});
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
          createdAt: new Date(toIso(s.localCreatedAt)),
          updatedAt: new Date(toIso(s.localUpdatedAt)),
        };
      });

      const messages = asRecords(exportedData.messages).map((raw) => {
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
          bookmarkedAt: m.bookmarkedAt ? new Date(toIso(m.bookmarkedAt)) : undefined,
          reaction: m.reaction,
          reactions: m.reactions,
          createdAt: new Date(toIso(m.localCreatedAt)),
        };
      });

      const folders = asRecords(exportedData.folders).map((raw) => {
        const f = stripConvexFields(raw);
        return {
          id: f.localId,
          name: f.name,
          order: f.order,
          isExpanded: f.isExpanded,
          createdAt: new Date(toIso(f.localCreatedAt)),
          updatedAt: new Date(toIso(f.localUpdatedAt)),
        };
      });

      const projects = asRecords(exportedData.projects).map((raw) => {
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
          tags: typeof p.tags === 'string' ? parseJson(p.tags, []) : p.tags,
          isArchived: p.isArchived,
          archivedAt: p.archivedAt ? new Date(toIso(p.archivedAt)) : undefined,
          sessionIds: typeof p.sessionIds === 'string' ? parseJson(p.sessionIds, []) : p.sessionIds,
          metadata: typeof p.metadata === 'string' ? parseJson(p.metadata, p.metadata) : p.metadata,
          sessionCount: p.sessionCount,
          messageCount: p.messageCount,
          createdAt: new Date(toIso(p.localCreatedAt)),
          updatedAt: new Date(toIso(p.localUpdatedAt)),
          lastAccessedAt: new Date(toIso(p.lastAccessedAt)),
        };
      });

      const settingsRecord = asRecords(exportedData.settings).map(stripConvexFields)[0];
      const settings =
        settingsRecord && typeof settingsRecord.payload === 'string'
          ? parseJson<Record<string, unknown>>(settingsRecord.payload, {})
          : undefined;

      const artifactsRecords = asRecords(exportedData.artifacts).map(stripConvexFields);
      const artifacts =
        artifactsRecords.length > 0
          ? artifactsRecords.reduce<Record<string, unknown>>((acc, record) => {
              const localId = String(record.localId ?? '');
              if (!localId) return acc;
              acc[localId] = parseJson(record.payload, null);
              return acc;
            }, {})
          : undefined;

      const normalizedData: SyncDataContent = {};
      if (settings !== undefined) normalizedData.settings = settings;
      if (sessions.length > 0) normalizedData.sessions = sessions as never;
      if (messages.length > 0) normalizedData.messages = messages as never;
      if (artifacts !== undefined) normalizedData.artifacts = artifacts as never;
      if (folders.length > 0) normalizedData.folders = folders as never;
      if (projects.length > 0) normalizedData.projects = projects as never;

      const metaResponse = await this.retryFetch(
        this.getHttpUrl('/api/sync/metadata'),
        { method: 'GET', headers: this.getHeaders() },
        1,
        500
      );
      const metadata = metaResponse.ok ? await metaResponse.json() : null;

      const looksLegacyPayload =
        (exportedData.settings === undefined || asRecords(exportedData.settings).length === 0) &&
        (exportedData.artifacts === undefined || asRecords(exportedData.artifacts).length === 0);

      let checksum = metadata?.checksum ?? '';
      if (looksLegacyPayload && checksum) {
        // Legacy payloads were missing settings/artifacts and may not match
        // modern checksum expectations. Returning empty checksum enables
        // compatibility mode in sync-manager (no hard-fail integrity check).
        checksum = '';
      }

      const dataTypes = buildDataTypes(normalizedData);
      onProgress?.(this.createProgress('completing', 90, 100, 'Download complete'));

      return {
        version: metadata?.version ?? '1.1',
        syncedAt: metadata?.syncedAt ?? new Date().toISOString(),
        deviceId: metadata?.deviceId ?? 'unknown',
        deviceName: metadata?.deviceName ?? 'unknown',
        checksum,
        dataTypes,
        data: normalizedData,
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
    // No persistent connection to clean up for HTTP-based sync.
  }
}

