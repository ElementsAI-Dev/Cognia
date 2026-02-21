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
  type DBProject,
  type DBSummary,
  type DBWorkflow,
  type DBWorkflowExecution,
  type DBVideoProject,
} from '@/lib/db';
import { sessionRepository, sessionToDbSession } from '@/lib/db/repositories/session-repository';
import { messageRepository } from '@/lib/db/repositories/message-repository';
import { projectRepository } from '@/lib/db/repositories/project-repository';
import { isTauri } from '@/lib/utils';
import { invokeWithTrace } from '@/lib/native/invoke-with-trace';
import { loggers } from '@/lib/logger';
import { storageFeatureFlags } from './feature-flags';
import type {
  BackupAssetV3,
  BackupPayloadV3,
  ExportSelectionOptions,
  ImportConflictResolution,
  PersistenceBackend,
  PersistedChatMessage,
} from './types';
import type { Project, Session, UIMessage } from '@/types';
import type { StoredSummary } from '@/types/learning/summary';

const log = loggers.store;

const CHAT_DB_SCHEMA_VERSION = 1;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const STORAGE_SNAPSHOT_KEYS = ['selection-toolbar-storage', 'app-cache'] as const;

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

function toDbMessage(message: PersistedChatMessage): DBMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    branchId: message.branchId,
    role: message.role,
    content: message.content,
    parts: message.parts ? JSON.stringify(message.parts) : undefined,
    model: message.model,
    provider: message.provider,
    tokens: message.tokens ? JSON.stringify(message.tokens) : undefined,
    attachments: message.attachments ? JSON.stringify(message.attachments) : undefined,
    sources: message.sources ? JSON.stringify(message.sources) : undefined,
    error: message.error,
    createdAt: message.createdAt,
    isEdited: message.isEdited,
    editHistory: message.editHistory ? JSON.stringify(message.editHistory) : undefined,
    originalContent: message.originalContent,
    isBookmarked: message.isBookmarked,
    bookmarkedAt: message.bookmarkedAt,
    reaction: message.reaction,
    reactions: message.reactions ? JSON.stringify(message.reactions) : undefined,
  };
}

function toDbProject(project: Project): DBProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    color: project.color,
    customInstructions: project.customInstructions,
    defaultProvider: project.defaultProvider,
    defaultModel: project.defaultModel,
    defaultMode: project.defaultMode,
    tags: project.tags ? JSON.stringify(project.tags) : undefined,
    isArchived: project.isArchived,
    archivedAt: project.archivedAt,
    sessionIds: JSON.stringify(project.sessionIds || []),
    sessionCount: project.sessionCount || 0,
    messageCount: project.messageCount || 0,
    createdAt: project.createdAt || new Date(),
    updatedAt: project.updatedAt || new Date(),
    lastAccessedAt: project.lastAccessedAt || new Date(),
    metadata: undefined,
  };
}

function fromDbMessage(message: DBMessage): PersistedChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    branchId: message.branchId,
    role: message.role as UIMessage['role'],
    content: message.content,
    parts: message.parts ? (JSON.parse(message.parts) as UIMessage['parts']) : undefined,
    model: message.model,
    provider: message.provider,
    tokens: message.tokens ? (JSON.parse(message.tokens) as UIMessage['tokens']) : undefined,
    attachments: message.attachments ? (JSON.parse(message.attachments) as UIMessage['attachments']) : undefined,
    sources: message.sources ? (JSON.parse(message.sources) as UIMessage['sources']) : undefined,
    error: message.error,
    createdAt: message.createdAt,
    isEdited: message.isEdited,
    editHistory: message.editHistory ? (JSON.parse(message.editHistory) as UIMessage['editHistory']) : undefined,
    originalContent: message.originalContent,
    isBookmarked: message.isBookmarked,
    bookmarkedAt: message.bookmarkedAt,
    reaction: message.reaction as UIMessage['reaction'],
    reactions: message.reactions ? (JSON.parse(message.reactions) as UIMessage['reactions']) : undefined,
  };
}

async function invokeDesktopCommand<TResult>(
  command: string,
  payload: Record<string, unknown>
): Promise<TResult | null> {
  if (!isTauri() || !storageFeatureFlags.desktopSqliteEnabled) {
    return null;
  }

  const traceId = createTraceId();
  try {
    const result = await invokeWithTrace<TResult>(command, {
      schemaVersion: CHAT_DB_SCHEMA_VERSION,
      traceId,
      ...payload,
    });
    return result;
  } catch (error) {
    log.warn('Desktop SQLite command failed, fallback to Dexie', {
      command,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function getBackend(): PersistenceBackend {
  if (isTauri() && storageFeatureFlags.desktopSqliteEnabled) {
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

async function rebuildDexieFromDesktop(): Promise<void> {
  const desktopSessions = await invokeDesktopCommand<Session[]>('chat_db_list_sessions', {});
  const desktopProjects = await invokeDesktopCommand<Project[]>('chat_db_list_projects', {});
  const desktopKnowledgeFiles = await invokeDesktopCommand<DBKnowledgeFile[]>('chat_db_list_knowledge_files', {});
  const desktopSummaries = await invokeDesktopCommand<StoredSummary[]>('chat_db_list_summaries', {});
  const desktopMessages = await invokeDesktopCommand<PersistedChatMessage[]>('chat_db_list_messages', {});

  if (!desktopSessions && !desktopProjects && !desktopKnowledgeFiles && !desktopSummaries && !desktopMessages) {
    return;
  }

  await db.transaction(
    'rw',
    [db.sessions, db.messages, db.projects, db.summaries, db.knowledgeFiles],
    async () => {
      if (desktopSessions) {
        await db.sessions.bulkPut(desktopSessions.map((session) => sessionToDbSession(maybeDate(session) as Session)));
      }
      if (desktopMessages) {
        await db.messages.bulkPut(
          desktopMessages.map((message) => toDbMessage(maybeDate(message) as PersistedChatMessage))
        );
      }
      if (desktopProjects) {
        await db.projects.bulkPut(
          desktopProjects.map((project) => toDbProject(maybeDate(project) as Project))
        );
      }
      if (desktopSummaries) {
        await db.summaries.bulkPut(desktopSummaries.map((summary) => toDbSummary(maybeDate(summary) as StoredSummary)));
      }
      if (desktopKnowledgeFiles) {
        await db.knowledgeFiles.bulkPut(
          desktopKnowledgeFiles.map((knowledgeFile) => maybeDate(knowledgeFile) as DBKnowledgeFile)
        );
      }
    }
  );
}

export const unifiedPersistenceService = {
  getBackend,

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
      if (sessions.length > 0 || getBackend() !== 'desktop-sqlite') {
        return sessions;
      }
      await rebuildDexieFromDesktop();
      return sessionRepository.getAll();
    },

    async upsert(session: Session): Promise<void> {
      await db.sessions.put(sessionToDbSession(session));
      await mirrorSessionToDesktop(session);
    },

    async bulkUpsert(sessions: Session[]): Promise<void> {
      if (sessions.length === 0) return;
      await db.sessions.bulkPut(sessions.map((session) => sessionToDbSession(session)));
      for (const session of sessions) {
        await mirrorSessionToDesktop(session);
      }
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
      await db.messages.bulkPut(messages.map(toDbMessage));
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
      if (projects.length > 0 || getBackend() !== 'desktop-sqlite') {
        return projects;
      }
      await rebuildDexieFromDesktop();
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

    async importPayload(payload: BackupPayloadV3, strategy: ImportConflictResolution): Promise<{
      importedSessions: number;
      importedMessages: number;
      importedProjects: number;
      importedSummaries: number;
      warnings: string[];
    }> {
      const warnings: string[] = [];
      const existingSessionIds = new Set((await db.sessions.toCollection().primaryKeys()) as string[]);
      const sessionIdMap = new Map<string, string>();

      let importedSessions = 0;
      for (let index = 0; index < payload.sessions.length; index++) {
        const session = maybeDate(payload.sessions[index]) as Session;
        const alreadyExists = existingSessionIds.has(session.id);
        if (alreadyExists && strategy === 'skip') {
          warnings.push(`Skipped session ${session.title}`);
          continue;
        }

        const prepared = alreadyExists ? remapImportedSession(session, strategy, index) : session;
        sessionIdMap.set(session.id, prepared.id);
        await unifiedPersistenceService.sessions.upsert(prepared);
        importedSessions++;
      }

      const existingMessageIds = new Set((await db.messages.toCollection().primaryKeys()) as string[]);
      const remappedMessages: PersistedChatMessage[] = [];
      for (let index = 0; index < payload.messages.length; index++) {
        const message = maybeDate(payload.messages[index]) as PersistedChatMessage;
        const mappedSessionId = sessionIdMap.get(message.sessionId) || message.sessionId;
        const exists = existingMessageIds.has(message.id);
        if (exists && strategy === 'skip') {
          continue;
        }
        const mappedMessage: PersistedChatMessage = {
          ...message,
          id: exists && strategy === 'merge-rename' ? `${message.id}-import-${index + 1}` : message.id,
          sessionId: mappedSessionId,
        };
        remappedMessages.push(mappedMessage);
      }
      await unifiedPersistenceService.messages.upsertBatch(remappedMessages);

      let importedProjects = 0;
      for (const project of payload.projects) {
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

      if (payload.knowledgeFiles.length > 0) {
        const normalizedKnowledgeFiles = payload.knowledgeFiles.map(
          (file) => maybeDate(file) as DBKnowledgeFile
        );
        await unifiedPersistenceService.projects.upsertKnowledgeFiles(normalizedKnowledgeFiles);
      }

      let importedSummaries = 0;
      for (const summary of payload.summaries) {
        const normalized = maybeDate(summary) as StoredSummary;
        const mappedSessionId = sessionIdMap.get(normalized.sessionId) || normalized.sessionId;
        await unifiedPersistenceService.summaries.upsert({
          ...normalized,
          sessionId: mappedSessionId,
        });
        importedSummaries++;
      }

      if (payload.settings) {
        const { useSettingsStore } = await import('@/stores');
        const settingsStore = useSettingsStore.getState();
        if (typeof payload.settings.theme === 'string') {
          settingsStore.setTheme(payload.settings.theme as 'light' | 'dark' | 'system');
        }
      }

      if (payload.artifacts) {
        const { useArtifactStore } = await import('@/stores');
        const artifactStore = useArtifactStore.getState();
        for (const artifact of Object.values(payload.artifacts)) {
          artifactStore.createArtifact({
            sessionId: artifact.sessionId || '',
            messageId: artifact.messageId || '',
            type: artifact.type,
            title: artifact.title,
            content: artifact.content,
            language: artifact.language,
          });
        }
      }

      if (payload.documents) {
        await db.documents.bulkPut(payload.documents.map((document) => maybeDate(document) as DBDocument));
      }
      if (payload.workflows) {
        await db.workflows.bulkPut(payload.workflows.map((workflow) => maybeDate(workflow) as DBWorkflow));
      }
      if (payload.workflowExecutions) {
        await db.workflowExecutions.bulkPut(
          payload.workflowExecutions.map((execution) => maybeDate(execution) as DBWorkflowExecution)
        );
      }
      if (payload.agentTraces) {
        await db.agentTraces.bulkPut(payload.agentTraces.map((trace) => maybeDate(trace) as DBAgentTrace));
      }
      if (payload.checkpoints) {
        await db.checkpoints.bulkPut(payload.checkpoints.map((checkpoint) => maybeDate(checkpoint) as DBCheckpoint));
      }
      if (payload.contextFiles) {
        await db.contextFiles.bulkPut(payload.contextFiles.map((contextFile) => maybeDate(contextFile) as DBContextFile));
      }
      if (payload.videoProjects) {
        await db.videoProjects.bulkPut(payload.videoProjects.map((project) => maybeDate(project) as DBVideoProject));
      }
      if (payload.assets) {
        await db.assets.bulkPut(payload.assets.map((asset) => toDbAsset(maybeDate(asset) as BackupAssetV3)));
      }
      if (payload.folders) {
        await db.folders.bulkPut(payload.folders.map((folder) => maybeDate(folder) as DBFolder));
      }
      if (payload.mcpServers) {
        await db.mcpServers.bulkPut(payload.mcpServers.map((server) => maybeDate(server) as DBMCPServer));
      }
      if (typeof window !== 'undefined' && payload.storageSnapshot) {
        for (const [key, value] of Object.entries(payload.storageSnapshot.localStorage || {})) {
          localStorage.setItem(key, value);
        }
        for (const [key, value] of Object.entries(payload.storageSnapshot.sessionStorage || {})) {
          sessionStorage.setItem(key, value);
        }
      }

      return {
        importedSessions,
        importedMessages: remappedMessages.length,
        importedProjects,
        importedSummaries,
        warnings,
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
