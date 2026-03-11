import { nanoid } from 'nanoid';
import {
  db,
  type DBAgentTrace,
  type DBAsset,
  type DBCheckpoint,
  type DBContextFile,
  type DBDocument,
  type DBFolder,
  type DBKnowledgeFile,
  type DBMCPServer,
  type DBMessage,
  type DBSummary,
  type DBWorkflow,
  type DBWorkflowExecution,
  type DBVideoProject,
} from '@/lib/db';
import { sessionRepository, sessionToDbSession } from '@/lib/db/repositories/session-repository';
import { toUIMessage, toDBMessage } from '@/lib/db/repositories/message-repository';
import { toDbProject } from '@/lib/db/repositories/project-repository';
import { messageRepository } from '@/lib/db/repositories/message-repository';
import { projectRepository } from '@/lib/db/repositories/project-repository';
import { isTauri } from '@/lib/utils';
import { invokeWithTrace } from '@/lib/native/invoke-with-trace';
import { loggers } from '@/lib/logger';
import { storageFeatureFlags } from './feature-flags';
import { BACKUP_PACKAGE_SCHEMA_VERSION } from './types';
import type {
  BackupAssetV3,
  BackupImportIntegrityReport,
  BackupImportMetadata,
  BackupImportWarning,
  BackupPayloadV3,
  ExportSelectionOptions,
  ImportConflictResolution,
  PersistenceBackend,
  PersistenceDiagnostic,
  PersistenceDiagnosticCode,
  PersistenceRuntimeMode,
  PersistenceRuntimeStatus,
  PersistedChatMessage,
} from './types';
import type { Artifact, Project, Session, UIMessage } from '@/types';
import type { StoredSummary } from '@/types/learning/summary';

// Adapter: convert PersistedChatMessage to DBMessage using the canonical toDBMessage
function persistedToDbMessage(message: PersistedChatMessage): DBMessage {
  return toDBMessage(message as unknown as UIMessage, message.sessionId, message.branchId);
}

// Adapter: convert DBMessage to PersistedChatMessage using the canonical toUIMessage  
function fromDbMessage(message: DBMessage): PersistedChatMessage {
  const uiMessage = toUIMessage(message);
  return { ...uiMessage, sessionId: message.sessionId };
}

const log = loggers.store;

const CHAT_DB_SCHEMA_VERSION = 1;
const DESKTOP_RECONCILIATION_BATCH_SIZE = 200;
const DESKTOP_MESSAGE_PAGE_SIZE = 500;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const STORAGE_SNAPSHOT_KEYS = ['selection-toolbar-storage', 'app-cache'] as const;

interface DesktopSchemaInfo {
  compatible: boolean;
  expectedSchemaVersion?: number;
  actualSchemaVersion?: number;
  reasonCode?: string;
  reason?: string;
}

const persistenceRuntimeState: {
  mode: PersistenceRuntimeMode;
  preflightChecked: boolean;
  reconciliationCompleted: boolean;
  expectedSchemaVersion: number;
  actualSchemaVersion?: number;
  lastTransitionAt: string;
  diagnostic?: PersistenceDiagnostic;
} = {
  mode: isTauri() && storageFeatureFlags.desktopSqliteEnabled ? 'degraded-dexie-fallback' : 'web-dexie-only',
  preflightChecked: false,
  reconciliationCompleted: false,
  expectedSchemaVersion: CHAT_DB_SCHEMA_VERSION,
  lastTransitionAt: new Date().toISOString(),
};

function isDesktopRuntimeConfigured(): boolean {
  return isTauri() && storageFeatureFlags.desktopSqliteEnabled;
}

function createDiagnostic(
  code: PersistenceDiagnosticCode,
  message: string,
  fields: Partial<Omit<PersistenceDiagnostic, 'code' | 'message' | 'at'>> = {}
): PersistenceDiagnostic {
  return {
    code,
    message,
    at: new Date().toISOString(),
    ...fields,
  };
}

function transitionRuntimeMode(
  mode: PersistenceRuntimeMode,
  diagnostic?: PersistenceDiagnostic,
  actualSchemaVersion?: number
): void {
  persistenceRuntimeState.mode = mode;
  persistenceRuntimeState.lastTransitionAt = new Date().toISOString();
  persistenceRuntimeState.diagnostic = diagnostic;
  persistenceRuntimeState.actualSchemaVersion = actualSchemaVersion;
}

function getRuntimeStatus(): PersistenceRuntimeStatus {
  return {
    mode: persistenceRuntimeState.mode,
    expectedSchemaVersion: persistenceRuntimeState.expectedSchemaVersion,
    actualSchemaVersion: persistenceRuntimeState.actualSchemaVersion,
    preflightChecked: persistenceRuntimeState.preflightChecked,
    reconciliationCompleted: persistenceRuntimeState.reconciliationCompleted,
    lastTransitionAt: persistenceRuntimeState.lastTransitionAt,
    diagnostic: persistenceRuntimeState.diagnostic,
  };
}

function createTraceId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `trace-${nanoid(12)}`;
}

function maybeDate(value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => maybeDate(item));
  }
  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return Object.fromEntries(Object.entries(objectValue).map(([key, nested]) => [key, maybeDate(nested)]));
  }
  return value;
}

function toStorageSnapshot(storage: Storage): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key) continue;
    if (!key.startsWith('cognia-') && !STORAGE_SNAPSHOT_KEYS.includes(key as (typeof STORAGE_SNAPSHOT_KEYS)[number])) {
      continue;
    }
    const value = storage.getItem(key);
    if (value !== null) {
      snapshot[key] = value;
    }
  }
  return snapshot;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function fromDbAsset(asset: DBAsset): Promise<BackupAssetV3> {
  return {
    id: asset.id,
    kind: asset.kind,
    mimeType: asset.mimeType,
    filename: asset.filename,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    base64: await blobToBase64(asset.blob),
  };
}

function toDbAsset(asset: BackupAssetV3): DBAsset {
  return {
    id: asset.id,
    kind: asset.kind,
    mimeType: asset.mimeType,
    filename: asset.filename,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    blob: new Blob([toArrayBuffer(base64ToBytes(asset.base64))], { type: asset.mimeType }),
  };
}

function toDbSummary(summary: StoredSummary): DBSummary {
  return {
    id: summary.id,
    sessionId: summary.sessionId,
    type: summary.type,
    summary: summary.summary,
    keyPoints: JSON.stringify(summary.keyPoints),
    topics: JSON.stringify(summary.topics),
    diagram: summary.diagram,
    diagramType: summary.diagramType,
    messageRange: JSON.stringify(summary.messageRange),
    messageCount: summary.messageCount,
    sourceTokens: summary.sourceTokens,
    summaryTokens: summary.summaryTokens,
    compressionRatio: summary.compressionRatio,
    language: summary.language,
    format: summary.format,
    style: summary.style,
    template: summary.template,
    usedAI: summary.usedAI,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

function fromDbSummary(summary: DBSummary): StoredSummary {
  return {
    id: summary.id,
    sessionId: summary.sessionId,
    type: summary.type as StoredSummary['type'],
    summary: summary.summary,
    keyPoints: summary.keyPoints ? (JSON.parse(summary.keyPoints) as StoredSummary['keyPoints']) : [],
    topics: summary.topics ? (JSON.parse(summary.topics) as StoredSummary['topics']) : [],
    diagram: summary.diagram,
    diagramType: summary.diagramType as StoredSummary['diagramType'],
    messageRange: summary.messageRange
      ? (JSON.parse(summary.messageRange) as StoredSummary['messageRange'])
      : { startIndex: 0, endIndex: 0 },
    messageCount: summary.messageCount,
    sourceTokens: summary.sourceTokens,
    summaryTokens: summary.summaryTokens,
    compressionRatio: summary.compressionRatio,
    language: summary.language,
    format: summary.format as StoredSummary['format'],
    style: summary.style as StoredSummary['style'],
    template: summary.template as StoredSummary['template'],
    usedAI: summary.usedAI,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

async function invokeDesktopCommandRaw<TResult>(
  command: string,
  payload: Record<string, unknown>
): Promise<TResult> {
  const traceId = createTraceId();
  return invokeWithTrace<TResult>(command, {
    schemaVersion: CHAT_DB_SCHEMA_VERSION,
    traceId,
    ...payload,
  });
}

function toEpoch(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function recordFreshness(record: { updatedAt?: unknown; createdAt?: unknown }): number {
  const updatedAt = toEpoch(record.updatedAt);
  if (updatedAt > 0) {
    return updatedAt;
  }
  return toEpoch(record.createdAt);
}

function mergeRecordsByFreshness<T extends { id: string; updatedAt?: unknown; createdAt?: unknown }>(
  dexieRecords: T[],
  desktopRecords: T[]
): T[] {
  const merged = new Map<string, T>();
  for (const record of dexieRecords) {
    merged.set(record.id, record);
  }
  for (const record of desktopRecords) {
    const existing = merged.get(record.id);
    if (!existing) {
      merged.set(record.id, record);
      continue;
    }
    if (recordFreshness(record) > recordFreshness(existing)) {
      merged.set(record.id, record);
    }
  }
  return Array.from(merged.values());
}

function chunkArray<T>(records: T[], chunkSize = DESKTOP_RECONCILIATION_BATCH_SIZE): T[][] {
  if (records.length === 0) {
    return [];
  }
  const chunks: T[][] = [];
  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize));
  }
  return chunks;
}

interface DesktopMessagesPage {
  items: PersistedChatMessage[];
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

async function listDesktopMessagesPagedRaw(): Promise<PersistedChatMessage[]> {
  const records: PersistedChatMessage[] = [];
  let offset = 0;
  while (true) {
    const page = await invokeDesktopCommandRaw<DesktopMessagesPage>('chat_db_get_messages_page', {
      limit: DESKTOP_MESSAGE_PAGE_SIZE,
      offset,
    });
    if (!Array.isArray(page.items) || page.items.length === 0) {
      if (!page.hasMore) {
        break;
      }
      offset += DESKTOP_MESSAGE_PAGE_SIZE;
      continue;
    }
    records.push(...page.items);
    if (!page.hasMore) {
      break;
    }
    offset += page.items.length;
  }
  return records;
}

async function mirrorSessionsToDesktopRaw(sessions: Session[]): Promise<void> {
  for (const chunk of chunkArray(sessions)) {
    await invokeDesktopCommandRaw('chat_db_upsert_sessions_batch', {
      sessions: serializeDesktopPayload(chunk),
    });
  }
}

async function mirrorMessagesToDesktopRaw(messages: PersistedChatMessage[]): Promise<void> {
  for (const chunk of chunkArray(messages)) {
    await invokeDesktopCommandRaw('chat_db_upsert_messages_batch', {
      messages: serializeDesktopPayload(chunk),
    });
  }
}

async function mirrorKnowledgeFilesToDesktopRaw(knowledgeFiles: DBKnowledgeFile[]): Promise<void> {
  for (const chunk of chunkArray(knowledgeFiles)) {
    await invokeDesktopCommandRaw('chat_db_upsert_knowledge_files_batch', {
      knowledgeFiles: serializeDesktopPayload(chunk),
    });
  }
}

async function mirrorProjectsToDesktopRaw(projects: Project[]): Promise<void> {
  for (const project of projects) {
    await invokeDesktopCommandRaw('chat_db_upsert_project', {
      project: serializeDesktopPayload(project),
    });
  }
}

async function mirrorSummariesToDesktopRaw(summaries: StoredSummary[]): Promise<void> {
  for (const summary of summaries) {
    await invokeDesktopCommandRaw('chat_db_upsert_summary', {
      summary: serializeDesktopPayload(summary),
    });
  }
}

async function reconcileMirroredStoresWithDesktop(): Promise<void> {
  const [desktopSessionsRaw, desktopProjectsRaw, desktopKnowledgeFilesRaw, desktopSummariesRaw] =
    await Promise.all([
      invokeDesktopCommandRaw<Session[]>('chat_db_list_sessions', {}),
      invokeDesktopCommandRaw<Project[]>('chat_db_list_projects', {}),
      invokeDesktopCommandRaw<DBKnowledgeFile[]>('chat_db_list_knowledge_files', {}),
      invokeDesktopCommandRaw<StoredSummary[]>('chat_db_list_summaries', {}),
    ]);
  const desktopMessagesRaw = await listDesktopMessagesPagedRaw();

  const desktopSessions = desktopSessionsRaw.map((session) => maybeDate(session) as Session);
  const desktopProjects = desktopProjectsRaw.map((project) => maybeDate(project) as Project);
  const desktopKnowledgeFiles = desktopKnowledgeFilesRaw.map(
    (knowledgeFile) => maybeDate(knowledgeFile) as DBKnowledgeFile
  );
  const desktopSummaries = desktopSummariesRaw.map((summary) => maybeDate(summary) as StoredSummary);
  const desktopMessages = desktopMessagesRaw.map((message) => maybeDate(message) as PersistedChatMessage);

  const dexieSessions = await sessionRepository.getAll();
  const dexieMessages = (await db.messages.toArray()).map(fromDbMessage);
  const dexieProjects = await projectRepository.getAll();
  const dexieKnowledgeFiles = await db.knowledgeFiles.toArray();
  const dexieSummaries = (await db.summaries.toArray()).map(fromDbSummary);

  const mergedSessions = mergeRecordsByFreshness(dexieSessions, desktopSessions);
  const mergedMessages = mergeRecordsByFreshness(dexieMessages, desktopMessages);
  const mergedProjects = mergeRecordsByFreshness(dexieProjects, desktopProjects);
  const mergedKnowledgeFiles = mergeRecordsByFreshness(dexieKnowledgeFiles, desktopKnowledgeFiles);
  const mergedSummaries = mergeRecordsByFreshness(dexieSummaries, desktopSummaries);

  await db.transaction('rw', [db.sessions, db.messages, db.projects, db.summaries, db.knowledgeFiles], async () => {
    await db.sessions.bulkPut(mergedSessions.map((session) => sessionToDbSession(session)));
    await db.messages.bulkPut(mergedMessages.map((message) => persistedToDbMessage(message)));
    await db.projects.bulkPut(mergedProjects.map((project) => toDbProject(project)));
    await db.summaries.bulkPut(mergedSummaries.map((summary) => toDbSummary(summary)));
    await db.knowledgeFiles.bulkPut(mergedKnowledgeFiles);
  });

  await mirrorSessionsToDesktopRaw(mergedSessions);
  await mirrorMessagesToDesktopRaw(mergedMessages);
  await mirrorProjectsToDesktopRaw(mergedProjects);
  await mirrorKnowledgeFilesToDesktopRaw(mergedKnowledgeFiles);
  await mirrorSummariesToDesktopRaw(mergedSummaries);
}

async function runDesktopPreflight(): Promise<boolean> {
  try {
    const schemaInfo = await invokeDesktopCommandRaw<DesktopSchemaInfo>('chat_db_get_schema_info', {});
    persistenceRuntimeState.preflightChecked = true;

    const actualSchemaVersion = schemaInfo.actualSchemaVersion;
    if (!schemaInfo.compatible || actualSchemaVersion !== CHAT_DB_SCHEMA_VERSION) {
      transitionRuntimeMode(
        'degraded-dexie-fallback',
        createDiagnostic(
          'schema-mismatch',
          schemaInfo.reason || 'Desktop SQLite schema mismatch detected.',
          {
            expectedSchemaVersion: CHAT_DB_SCHEMA_VERSION,
            actualSchemaVersion,
          }
        ),
        actualSchemaVersion
      );
      return false;
    }

    transitionRuntimeMode('desktop-primary', undefined, actualSchemaVersion);
    return true;
  } catch (error) {
    persistenceRuntimeState.preflightChecked = true;
    transitionRuntimeMode(
      'degraded-dexie-fallback',
      createDiagnostic(
        'schema-check-failed',
        error instanceof Error ? error.message : String(error),
        {
          expectedSchemaVersion: CHAT_DB_SCHEMA_VERSION,
        }
      )
    );
    return false;
  }
}

async function ensureDesktopReady(): Promise<boolean> {
  if (!isDesktopRuntimeConfigured()) {
    transitionRuntimeMode(
      'web-dexie-only',
      createDiagnostic(
        isTauri() ? 'desktop-disabled' : 'desktop-not-available',
        isTauri()
          ? 'Desktop SQLite feature flag is disabled.'
          : 'Desktop SQLite is unavailable outside Tauri runtime.'
      )
    );
    return false;
  }

  if (!persistenceRuntimeState.preflightChecked) {
    const preflightOk = await runDesktopPreflight();
    if (!preflightOk) {
      return false;
    }
  }

  if (persistenceRuntimeState.mode !== 'desktop-primary') {
    return false;
  }

  if (!persistenceRuntimeState.reconciliationCompleted) {
    try {
      await reconcileMirroredStoresWithDesktop();
      persistenceRuntimeState.reconciliationCompleted = true;
    } catch (error) {
      transitionRuntimeMode(
        'degraded-dexie-fallback',
        createDiagnostic(
          'reconciliation-failed',
          error instanceof Error ? error.message : String(error)
        ),
        persistenceRuntimeState.actualSchemaVersion
      );
      return false;
    }
  }

  return true;
}

async function invokeDesktopCommand<TResult>(
  command: string,
  payload: Record<string, unknown>
): Promise<TResult | null> {
  if (!(await ensureDesktopReady())) {
    return null;
  }

  try {
    const result = await invokeDesktopCommandRaw<TResult>(command, payload);
    transitionRuntimeMode('desktop-primary', undefined, persistenceRuntimeState.actualSchemaVersion);
    return result;
  } catch (error) {
    transitionRuntimeMode(
      'degraded-dexie-fallback',
      createDiagnostic(
        'desktop-command-failed',
        error instanceof Error ? error.message : String(error),
        {
          command,
          expectedSchemaVersion: CHAT_DB_SCHEMA_VERSION,
          actualSchemaVersion: persistenceRuntimeState.actualSchemaVersion,
        }
      ),
      persistenceRuntimeState.actualSchemaVersion
    );
    log.warn('Desktop SQLite command failed, fallback to Dexie', {
      command,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function getBackend(): PersistenceBackend {
  if (persistenceRuntimeState.mode === 'desktop-primary') {
    return 'desktop-sqlite';
  }
  return 'web-dexie';
}

function remapImportedSession(
  session: Session,
  strategy: ImportConflictResolution,
  index: number
): Session {
  if (strategy !== 'merge-rename') {
    return session;
  }
  return {
    ...session,
    id: `${session.id}-import-${index + 1}`,
    title: `${session.title} (imported)`,
    updatedAt: new Date(),
  };
}

async function mirrorSessionToDesktop(session: Session): Promise<void> {
  await invokeDesktopCommand('chat_db_upsert_session', { session: serializeDesktopPayload(session) });
}

async function mirrorSessionsToDesktop(sessions: Session[]): Promise<void> {
  if (sessions.length === 0) return;
  await invokeDesktopCommand('chat_db_upsert_sessions_batch', {
    sessions: serializeDesktopPayload(sessions),
  });
}

async function mirrorProjectToDesktop(project: Project): Promise<void> {
  await invokeDesktopCommand('chat_db_upsert_project', { project: serializeDesktopPayload(project) });
}

async function mirrorSummaryToDesktop(summary: StoredSummary): Promise<void> {
  await invokeDesktopCommand('chat_db_upsert_summary', { summary: serializeDesktopPayload(summary) });
}

async function mirrorMessagesToDesktop(messages: PersistedChatMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await invokeDesktopCommand('chat_db_upsert_messages_batch', {
    messages: serializeDesktopPayload(messages),
  });
}

function serializeDesktopPayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, nestedValue) => {
    if (nestedValue instanceof Date) {
      return nestedValue.toISOString();
    }
    return nestedValue;
  })) as T;
}

export const unifiedPersistenceService = {
  getBackend,
  getRuntimeStatus,

  async clearDomainData(): Promise<void> {
    await Promise.all([
      db.messages.clear(),
      db.summaries.clear(),
      db.knowledgeFiles.clear(),
      db.sessions.clear(),
      db.projects.clear(),
      db.documents.clear(),
      db.workflows.clear(),
      db.workflowExecutions.clear(),
      db.agentTraces.clear(),
      db.checkpoints.clear(),
      db.contextFiles.clear(),
      db.videoProjects.clear(),
      db.assets.clear(),
      db.folders.clear(),
      db.mcpServers.clear(),
    ]);
    await invokeDesktopCommand('chat_db_clear_domain_data', {});
  },

  sessions: {
    async list(): Promise<Session[]> {
      const sessions = await sessionRepository.getAll();
      if (sessions.length > 0) {
        return sessions;
      }
      await ensureDesktopReady();
      if (persistenceRuntimeState.mode !== 'desktop-primary') {
        return sessions;
      }
      return sessionRepository.getAll();
    },

    async upsert(session: Session): Promise<void> {
      await db.sessions.put(sessionToDbSession(session));
      await mirrorSessionToDesktop(session);
    },

    async bulkUpsert(sessions: Session[]): Promise<void> {
      if (sessions.length === 0) return;
      await db.sessions.bulkPut(sessions.map((session) => sessionToDbSession(session)));
      await mirrorSessionsToDesktop(sessions);
    },

    async remove(sessionId: string): Promise<void> {
      await db.sessions.delete(sessionId);
      await invokeDesktopCommand('chat_db_delete_session', { sessionId });
    },

    async clear(): Promise<void> {
      await db.sessions.clear();
      await invokeDesktopCommand('chat_db_clear_sessions', {});
    },
  },

  messages: {
    async listAll(): Promise<PersistedChatMessage[]> {
      const messages = await db.messages.toArray();
      return messages.map(fromDbMessage);
    },

    async listBySession(sessionId: string): Promise<UIMessage[]> {
      return messageRepository.getBySessionId(sessionId);
    },

    async upsertBatch(messages: PersistedChatMessage[]): Promise<void> {
      if (messages.length === 0) return;
      await db.messages.bulkPut(messages.map(persistedToDbMessage));
      await mirrorMessagesToDesktop(messages);
    },

    async removeBySession(sessionId: string): Promise<void> {
      await messageRepository.deleteBySessionId(sessionId);
      await invokeDesktopCommand('chat_db_delete_messages_by_session', { sessionId });
    },
  },

  projects: {
    async list() {
      const projects = await projectRepository.getAll();
      if (projects.length > 0) {
        return projects;
      }
      await ensureDesktopReady();
      if (persistenceRuntimeState.mode !== 'desktop-primary') {
        return projects;
      }
      return projectRepository.getAll();
    },

    async upsert(project: Project): Promise<void> {
      await db.projects.put(toDbProject(project));
      await mirrorProjectToDesktop(project);
    },

    async upsertProjectById(projectId: string): Promise<void> {
      const project = await projectRepository.getById(projectId);
      if (!project) return;
      await unifiedPersistenceService.projects.upsert(project);
    },

    async remove(projectId: string): Promise<void> {
      await db.projects.delete(projectId);
      await db.knowledgeFiles.where('projectId').equals(projectId).delete();
      await invokeDesktopCommand('chat_db_delete_project', { projectId });
    },

    async upsertKnowledgeFiles(
      knowledgeFiles: DBKnowledgeFile[],
      projectId?: string
    ): Promise<void> {
      const targetProjectId = projectId || knowledgeFiles[0]?.projectId;
      if (targetProjectId) {
        const nextKnowledgeFileIds = new Set(
          knowledgeFiles
            .filter((knowledgeFile) => knowledgeFile.projectId === targetProjectId)
            .map((knowledgeFile) => knowledgeFile.id)
        );
        const existingKnowledgeFileIds = (
          await db.knowledgeFiles.where('projectId').equals(targetProjectId).primaryKeys()
        ) as string[];
        const staleKnowledgeFileIds = existingKnowledgeFileIds.filter(
          (knowledgeFileId) => !nextKnowledgeFileIds.has(knowledgeFileId)
        );
        if (staleKnowledgeFileIds.length > 0) {
          await db.knowledgeFiles.bulkDelete(staleKnowledgeFileIds);
        }
      }

      if (knowledgeFiles.length === 0) {
        return;
      }

      await db.knowledgeFiles.bulkPut(knowledgeFiles);
      await invokeDesktopCommand('chat_db_upsert_knowledge_files_batch', {
        knowledgeFiles: serializeDesktopPayload(knowledgeFiles),
      });
    },
  },

  summaries: {
    async listBySession(sessionId: string): Promise<StoredSummary[]> {
      const summaries = await db.summaries.where('sessionId').equals(sessionId).toArray();
      return summaries.map(fromDbSummary);
    },

    async upsert(summary: StoredSummary): Promise<void> {
      await db.summaries.put(toDbSummary(summary));
      await mirrorSummaryToDesktop(summary);
    },

    async remove(summaryId: string): Promise<void> {
      await db.summaries.delete(summaryId);
      await invokeDesktopCommand('chat_db_delete_summary', { summaryId });
    },

    async removeBySession(sessionId: string): Promise<void> {
      await db.summaries.where('sessionId').equals(sessionId).delete();
      await invokeDesktopCommand('chat_db_delete_summaries_by_session', { sessionId });
    },
  },

  backup: {
    async exportPayload(options: ExportSelectionOptions): Promise<BackupPayloadV3> {
      const includeSessions = options.includeSessions !== false;
      const includeSettings = options.includeSettings !== false;
      const includeArtifacts = options.includeArtifacts !== false;
      const includeIndexedDB = options.includeIndexedDB !== false;

      const payload: BackupPayloadV3 = {
        sessions: includeSessions ? await unifiedPersistenceService.sessions.list() : [],
        messages: includeIndexedDB ? await unifiedPersistenceService.messages.listAll() : [],
        projects: includeIndexedDB ? await unifiedPersistenceService.projects.list() : [],
        knowledgeFiles: includeIndexedDB ? await db.knowledgeFiles.toArray() : [],
        summaries: includeIndexedDB ? (await db.summaries.toArray()).map(fromDbSummary) : [],
      };

      if (includeSettings) {
        const { useSettingsStore } = await import('@/stores');
        const settings = useSettingsStore.getState();
        payload.settings = {
          theme: settings.theme,
          defaultProvider: settings.defaultProvider,
          providerSettings: settings.providerSettings,
          language: settings.language,
        };
      }

      if (includeArtifacts) {
        const { useArtifactStore } = await import('@/stores');
        const artifactState = useArtifactStore.getState();
        payload.artifacts = artifactState.artifacts;
        payload.canvasDocuments = artifactState.canvasDocuments;
      }

      if (includeIndexedDB) {
        const [
          documents,
          workflows,
          workflowExecutions,
          agentTraces,
          checkpoints,
          contextFiles,
          videoProjects,
          folders,
          mcpServers,
          assets,
        ] = await Promise.all([
          db.documents.toArray(),
          db.workflows.toArray(),
          db.workflowExecutions.toArray(),
          db.agentTraces.toArray(),
          db.checkpoints.toArray(),
          db.contextFiles.toArray(),
          db.videoProjects.toArray(),
          db.folders.toArray(),
          db.mcpServers.toArray(),
          db.assets.toArray(),
        ]);

        payload.documents = documents;
        payload.workflows = workflows;
        payload.workflowExecutions = workflowExecutions;
        payload.agentTraces = agentTraces;
        payload.checkpoints = checkpoints;
        payload.contextFiles = contextFiles;
        payload.videoProjects = videoProjects;
        payload.folders = folders;
        payload.mcpServers = mcpServers;
        payload.assets = await Promise.all(assets.map((asset) => fromDbAsset(asset as DBAsset)));
      }

      if (typeof window !== 'undefined') {
        payload.storageSnapshot = {
          localStorage: toStorageSnapshot(localStorage),
          sessionStorage: toStorageSnapshot(sessionStorage),
        };
      }

      return payload;
    },

    async importPayload(
      payload: BackupPayloadV3,
      strategy: ImportConflictResolution,
      metadata: BackupImportMetadata = {}
    ): Promise<{
      importedSessions: number;
      importedMessages: number;
      importedProjects: number;
      importedSummaries: number;
      warnings: string[];
      warningDetails: BackupImportWarning[];
      integrity: BackupImportIntegrityReport;
    }> {
      const warnings: string[] = [];
      const warningDetails: BackupImportWarning[] = [];
      const rejectedSegments: string[] = [];
      const importPayload = payload as Partial<Record<keyof BackupPayloadV3, unknown>>;
      let sessionRemaps = 0;
      let messageRemaps = 0;

      const appendWarning = (warning: BackupImportWarning): void => {
        warningDetails.push(warning);
        warnings.push(warning.message);
      };

      const readArraySegment = <T>(
        segment: keyof BackupPayloadV3,
        entity: BackupImportWarning['entity']
      ): T[] => {
        const value = importPayload[segment];
        if (value === undefined || value === null) {
          return [];
        }
        if (Array.isArray(value)) {
          return value as T[];
        }
        const message = `Skipped incompatible payload segment "${String(segment)}"`;
        appendWarning({
          code: 'incompatible-segment',
          message,
          entity,
          id: String(segment),
        });
        rejectedSegments.push(String(segment));
        return [];
      };

      if (
        typeof metadata.schemaVersion === 'number'
        && metadata.schemaVersion > BACKUP_PACKAGE_SCHEMA_VERSION
      ) {
        const message = `Backup schema version ${metadata.schemaVersion} is newer than supported version ${BACKUP_PACKAGE_SCHEMA_VERSION}`;
        appendWarning({
          code: 'schema-version-unsupported',
          message,
          entity: 'manifest',
        });
        throw new Error(message);
      }

      const sessionsSegment = readArraySegment<Session>('sessions', 'session');
      const messagesSegment = readArraySegment<PersistedChatMessage>('messages', 'message');
      const projectsSegment = readArraySegment<Project>('projects', 'project');
      const knowledgeFilesSegment = readArraySegment<DBKnowledgeFile>('knowledgeFiles', 'knowledge-file');
      const summariesSegment = readArraySegment<StoredSummary>('summaries', 'summary');
      const documentsSegment = readArraySegment<DBDocument>('documents', 'payload');
      const workflowsSegment = readArraySegment<DBWorkflow>('workflows', 'payload');
      const workflowExecutionsSegment = readArraySegment<DBWorkflowExecution>('workflowExecutions', 'payload');
      const agentTracesSegment = readArraySegment<DBAgentTrace>('agentTraces', 'payload');
      const checkpointsSegment = readArraySegment<DBCheckpoint>('checkpoints', 'payload');
      const contextFilesSegment = readArraySegment<DBContextFile>('contextFiles', 'payload');
      const videoProjectsSegment = readArraySegment<DBVideoProject>('videoProjects', 'payload');
      const assetsSegment = readArraySegment<BackupAssetV3>('assets', 'payload');
      const foldersSegment = readArraySegment<DBFolder>('folders', 'payload');
      const mcpServersSegment = readArraySegment<DBMCPServer>('mcpServers', 'payload');

      const existingSessionIds = new Set((await db.sessions.toCollection().primaryKeys()) as string[]);
      const sessionIdMap = new Map<string, string>();

      let importedSessions = 0;
      for (let index = 0; index < sessionsSegment.length; index++) {
        const session = maybeDate(sessionsSegment[index]) as Session;
        const alreadyExists = existingSessionIds.has(session.id);
        if (alreadyExists && strategy === 'skip') {
          appendWarning({
            code: 'session-skipped',
            message: `Skipped session ${session.title}`,
            entity: 'session',
            id: session.id,
          });
          continue;
        }

        const prepared = alreadyExists ? remapImportedSession(session, strategy, index) : session;
        if (alreadyExists && prepared.id !== session.id) {
          sessionRemaps++;
          appendWarning({
            code: 'session-renamed',
            message: `Renamed session ${session.title} to avoid id conflict`,
            entity: 'session',
            id: session.id,
          });
        }

        sessionIdMap.set(session.id, prepared.id);
        await unifiedPersistenceService.sessions.upsert(prepared);
        importedSessions++;
      }

      const existingMessageIds = new Set((await db.messages.toCollection().primaryKeys()) as string[]);
      const remappedMessages: PersistedChatMessage[] = [];
      for (let index = 0; index < messagesSegment.length; index++) {
        const message = maybeDate(messagesSegment[index]) as PersistedChatMessage;
        const mappedSessionId = sessionIdMap.get(message.sessionId) || message.sessionId;
        const exists = existingMessageIds.has(message.id);
        if (exists && strategy === 'skip') {
          appendWarning({
            code: 'message-skipped',
            message: `Skipped message ${message.id}`,
            entity: 'message',
            id: message.id,
          });
          continue;
        }
        const remappedId = exists && strategy === 'merge-rename'
          ? `${message.id}-import-${index + 1}`
          : message.id;
        if (remappedId !== message.id) {
          messageRemaps++;
          appendWarning({
            code: 'message-renamed',
            message: `Renamed message ${message.id} to avoid id conflict`,
            entity: 'message',
            id: message.id,
          });
        }
        remappedMessages.push({
          ...message,
          id: remappedId,
          sessionId: mappedSessionId,
        });
      }
      await unifiedPersistenceService.messages.upsertBatch(remappedMessages);

      let importedProjects = 0;
      for (const project of projectsSegment) {
        const preparedProject = maybeDate(project) as Project;
        const remappedProject: Project = {
          ...preparedProject,
          sessionIds: (preparedProject.sessionIds || []).map(
            (sessionId) => sessionIdMap.get(sessionId) || sessionId
          ),
        };
        await unifiedPersistenceService.projects.upsert(remappedProject);
        importedProjects++;
      }

      if (knowledgeFilesSegment.length > 0) {
        const normalizedKnowledgeFiles = knowledgeFilesSegment.map(
          (file) => maybeDate(file) as DBKnowledgeFile
        );
        await unifiedPersistenceService.projects.upsertKnowledgeFiles(normalizedKnowledgeFiles);
      }

      let importedSummaries = 0;
      for (const summary of summariesSegment) {
        const normalized = maybeDate(summary) as StoredSummary;
        const mappedSessionId = sessionIdMap.get(normalized.sessionId) || normalized.sessionId;
        await unifiedPersistenceService.summaries.upsert({
          ...normalized,
          sessionId: mappedSessionId,
        });
        importedSummaries++;
      }

      if (
        importPayload.settings
        && typeof importPayload.settings === 'object'
        && !Array.isArray(importPayload.settings)
      ) {
        const { useSettingsStore } = await import('@/stores');
        const settingsStore = useSettingsStore.getState();
        const settings = importPayload.settings as Record<string, unknown>;
        if (typeof settings.theme === 'string') {
          settingsStore.setTheme(settings.theme as 'light' | 'dark' | 'system');
        }
      } else if (importPayload.settings !== undefined) {
        appendWarning({
          code: 'incompatible-segment',
          message: 'Skipped incompatible payload segment "settings"',
          entity: 'payload',
          id: 'settings',
        });
        rejectedSegments.push('settings');
      }

      if (
        importPayload.artifacts
        && typeof importPayload.artifacts === 'object'
        && !Array.isArray(importPayload.artifacts)
      ) {
        const { useArtifactStore } = await import('@/stores');
        const artifactStore = useArtifactStore.getState();
        for (const artifact of Object.values(importPayload.artifacts as Record<string, Artifact>)) {
          artifactStore.createArtifact({
            sessionId: artifact.sessionId || '',
            messageId: artifact.messageId || '',
            type: artifact.type,
            title: artifact.title,
            content: artifact.content,
            language: artifact.language,
          });
        }
      } else if (importPayload.artifacts !== undefined) {
        appendWarning({
          code: 'incompatible-segment',
          message: 'Skipped incompatible payload segment "artifacts"',
          entity: 'payload',
          id: 'artifacts',
        });
        rejectedSegments.push('artifacts');
      }

      await db.documents.bulkPut(documentsSegment.map((document) => maybeDate(document) as DBDocument));
      await db.workflows.bulkPut(workflowsSegment.map((workflow) => maybeDate(workflow) as DBWorkflow));
      await db.workflowExecutions.bulkPut(
        workflowExecutionsSegment.map((execution) => maybeDate(execution) as DBWorkflowExecution)
      );
      await db.agentTraces.bulkPut(agentTracesSegment.map((trace) => maybeDate(trace) as DBAgentTrace));
      await db.checkpoints.bulkPut(checkpointsSegment.map((checkpoint) => maybeDate(checkpoint) as DBCheckpoint));
      await db.contextFiles.bulkPut(contextFilesSegment.map((contextFile) => maybeDate(contextFile) as DBContextFile));
      await db.videoProjects.bulkPut(videoProjectsSegment.map((project) => maybeDate(project) as DBVideoProject));
      await db.assets.bulkPut(assetsSegment.map((asset) => toDbAsset(maybeDate(asset) as BackupAssetV3)));
      await db.folders.bulkPut(foldersSegment.map((folder) => maybeDate(folder) as DBFolder));
      await db.mcpServers.bulkPut(mcpServersSegment.map((server) => maybeDate(server) as DBMCPServer));

      if (
        typeof window !== 'undefined'
        && importPayload.storageSnapshot
        && typeof importPayload.storageSnapshot === 'object'
      ) {
        const storageSnapshot = importPayload.storageSnapshot as {
          localStorage?: Record<string, string>;
          sessionStorage?: Record<string, string>;
        };
        for (const [key, value] of Object.entries(storageSnapshot.localStorage || {})) {
          localStorage.setItem(key, value);
        }
        for (const [key, value] of Object.entries(storageSnapshot.sessionStorage || {})) {
          sessionStorage.setItem(key, value);
        }
      }

      return {
        importedSessions,
        importedMessages: remappedMessages.length,
        importedProjects,
        importedSummaries,
        warnings,
        warningDetails,
        integrity: {
          requestedSchemaVersion: metadata.schemaVersion,
          sourceBackend: metadata.backend,
          traceId: metadata.traceId,
          accepted: rejectedSegments.length === 0,
          rejectedSegments,
          reconciliation: {
            sessionRemaps,
            messageRemaps,
          },
        },
      };
    },
  },

  migration: {
    async runIfNeeded(): Promise<void> {
      if (typeof window === 'undefined') return;
      const markerKey = 'cognia-chat-migration-v3';
      if (localStorage.getItem(markerKey)) {
        return;
      }

      const rawSessions =
        localStorage.getItem('cognia-sessions-legacy-snapshot-v3') ||
        localStorage.getItem('cognia-sessions');
      const rawProjects =
        localStorage.getItem('cognia-projects-legacy-snapshot-v3') ||
        localStorage.getItem('cognia-projects');
      if (!rawSessions && !rawProjects) {
        localStorage.setItem(markerKey, new Date().toISOString());
        return;
      }

      const rollbackExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (rawSessions) {
        localStorage.setItem('cognia-sessions-rollback-v1', rawSessions);
      }
      if (rawProjects) {
        localStorage.setItem('cognia-projects-rollback-v1', rawProjects);
      }
      localStorage.setItem('cognia-rollback-expires-at', rollbackExpiresAt);

      try {
        if (rawSessions) {
          const parsed = JSON.parse(rawSessions) as {
            state?: { sessions?: Session[]; activeSessionId?: string | null };
          };
          const sessions = parsed.state?.sessions || [];
          for (const session of sessions) {
            await unifiedPersistenceService.sessions.upsert(maybeDate(session) as Session);
          }
          if (parsed.state?.activeSessionId) {
            localStorage.setItem('cognia-active-session-id', parsed.state.activeSessionId);
          }
        }

        if (rawProjects) {
          const parsedProjects = JSON.parse(rawProjects) as { state?: { projects?: unknown[] } };
          const projects = parsedProjects.state?.projects || [];
          for (const project of projects) {
            const normalizedProject = maybeDate(project) as Partial<Project>;
            if (!normalizedProject.id || !normalizedProject.name) {
              continue;
            }

            await unifiedPersistenceService.projects.upsert({
              id: normalizedProject.id,
              name: normalizedProject.name,
              description: normalizedProject.description,
              icon: normalizedProject.icon,
              color: normalizedProject.color,
              customInstructions: normalizedProject.customInstructions,
              defaultProvider: normalizedProject.defaultProvider,
              defaultModel: normalizedProject.defaultModel,
              defaultMode: normalizedProject.defaultMode as Project['defaultMode'],
              tags: normalizedProject.tags || [],
              isArchived: normalizedProject.isArchived,
              archivedAt: normalizedProject.archivedAt,
              knowledgeBase: [],
              sessionIds: normalizedProject.sessionIds || [],
              sessionCount: normalizedProject.sessionCount || 0,
              messageCount: normalizedProject.messageCount || 0,
              createdAt: normalizedProject.createdAt || new Date(),
              updatedAt: normalizedProject.updatedAt || new Date(),
              lastAccessedAt: normalizedProject.lastAccessedAt || new Date(),
            });
          }
        }

        localStorage.setItem(markerKey, new Date().toISOString());
      } catch (error) {
        log.error('Failed to migrate legacy chat persistence data', error as Error);
      }
    },
  },
};

export type UnifiedPersistenceService = typeof unifiedPersistenceService;

function resetRuntimeStateForTest(): void {
  persistenceRuntimeState.mode = isTauri() && storageFeatureFlags.desktopSqliteEnabled
    ? 'degraded-dexie-fallback'
    : 'web-dexie-only';
  persistenceRuntimeState.preflightChecked = false;
  persistenceRuntimeState.reconciliationCompleted = false;
  persistenceRuntimeState.expectedSchemaVersion = CHAT_DB_SCHEMA_VERSION;
  persistenceRuntimeState.actualSchemaVersion = undefined;
  persistenceRuntimeState.lastTransitionAt = new Date().toISOString();
  persistenceRuntimeState.diagnostic = undefined;
}

export const __testOnly = {
  mergeRecordsByFreshness,
  resetRuntimeStateForTest,
};
