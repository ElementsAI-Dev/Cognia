/**
 * Data Import Utilities (Backup Package v3 + legacy compatibility)
 */

import { nanoid } from 'nanoid';
import type { Session, Artifact, UIMessage } from '@/types';
import type {
  DBSession,
  DBMessage,
  DBDocument,
  DBProject,
  DBWorkflow,
  DBWorkflowExecution,
  DBSummary,
  DBKnowledgeFile,
  DBAgentTrace,
  DBFolder,
  DBMCPServer,
} from '@/lib/db';
import { toUIMessage } from '@/lib/db/repositories/message-repository';
import type { StoredSummary } from '@/types/learning/summary';
import type {
  BackupPayloadV3,
  BackupPackageV3,
  EncryptedEnvelopeV1,
  ImportConflictResolution,
  PersistedChatMessage,
} from './persistence/types';
import { dbSessionToSession } from '@/lib/db/repositories/session-repository';
import { decryptBackupPackage, sha256Hex } from './persistence/crypto';
import { getDefaultBackupPassphrase } from './persistence/backup-key';
import { unifiedPersistenceService } from './persistence/unified-persistence-service';

/**
 * Legacy export data structure (v2)
 */
interface LegacyExportData {
  version: string;
  exportedAt: string;
  checksum?: string;
  sessions?: Session[];
  settings?: Record<string, unknown>;
  artifacts?: Record<string, Artifact>;
  canvasDocuments?: Record<string, unknown>;
  indexedDB?: {
    sessions?: DBSession[];
    messages?: DBMessage[];
    documents?: DBDocument[];
    projects?: DBProject[];
    workflows?: DBWorkflow[];
    workflowExecutions?: DBWorkflowExecution[];
    summaries?: DBSummary[];
    knowledgeFiles?: DBKnowledgeFile[];
    agentTraces?: DBAgentTrace[];
    folders?: DBFolder[];
    mcpServers?: DBMCPServer[];
  };
}

export type ExportData = BackupPackageV3 | LegacyExportData | EncryptedEnvelopeV1;

/**
 * Import options
 */
export interface ImportOptions {
  mergeStrategy: 'replace' | 'merge' | 'skip';
  generateNewIds: boolean;
  validateData: boolean;
  categories?: ('sessions' | 'settings' | 'artifacts' | 'indexedDB')[];
  passphrase?: string;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  imported: {
    sessions: number;
    messages: number;
    artifacts: number;
    documents: number;
    projects: number;
    settings: boolean;
  };
  skipped: {
    sessions: number;
    messages: number;
    artifacts: number;
  };
  errors: ImportError[];
  warnings: string[];
  duration: number;
}

export interface ImportError {
  category: string;
  id?: string;
  message: string;
}

const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  mergeStrategy: 'merge',
  generateNewIds: false,
  validateData: true,
};
const STORAGE_SNAPSHOT_KEYS = ['selection-toolbar-storage', 'app-cache'] as const;

type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

type JsonSchema = {
  $schema?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  oneOf?: JsonSchema[];
};

const BACKUP_PACKAGE_V3_JSON_SCHEMA: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['version', 'manifest', 'payload'],
  properties: {
    version: { const: '3.0' },
    manifest: {
      type: 'object',
      required: ['version', 'schemaVersion', 'traceId', 'exportedAt', 'backend', 'integrity'],
      properties: {
        version: { const: '3.0' },
        schemaVersion: { type: 'integer' },
        traceId: { type: 'string' },
        exportedAt: { type: 'string' },
        backend: { enum: ['web-dexie', 'desktop-sqlite'] },
        integrity: {
          type: 'object',
          required: ['algorithm', 'checksum'],
          properties: {
            algorithm: { const: 'SHA-256' },
            checksum: { type: 'string' },
          },
          additionalProperties: true,
        },
        encryption: {
          type: 'object',
          required: ['enabled', 'format'],
          properties: {
            enabled: { const: true },
            format: { const: 'encrypted-envelope-v1' },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
    payload: {
      type: 'object',
      required: ['sessions', 'messages', 'projects', 'knowledgeFiles', 'summaries'],
      properties: {
        sessions: { type: 'array', items: { type: 'object' } },
        messages: { type: 'array', items: { type: 'object' } },
        projects: { type: 'array', items: { type: 'object' } },
        knowledgeFiles: { type: 'array', items: { type: 'object' } },
        summaries: { type: 'array', items: { type: 'object' } },
        settings: { type: 'object' },
        artifacts: { type: 'object' },
        canvasDocuments: { type: 'object' },
        documents: { type: 'array', items: { type: 'object' } },
        workflows: { type: 'array', items: { type: 'object' } },
        workflowExecutions: { type: 'array', items: { type: 'object' } },
        agentTraces: { type: 'array', items: { type: 'object' } },
        checkpoints: { type: 'array', items: { type: 'object' } },
        contextFiles: { type: 'array', items: { type: 'object' } },
        assets: { type: 'array', items: { type: 'object' } },
        videoProjects: { type: 'array', items: { type: 'object' } },
        folders: { type: 'array', items: { type: 'object' } },
        mcpServers: { type: 'array', items: { type: 'object' } },
        storageSnapshot: {
          type: 'object',
          properties: {
            localStorage: { type: 'object', additionalProperties: { type: 'string' } },
            sessionStorage: { type: 'object', additionalProperties: { type: 'string' } },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

const ENCRYPTED_ENVELOPE_V1_JSON_SCHEMA: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['version', 'algorithm', 'kdf', 'iv', 'ciphertext', 'manifest', 'checksum'],
  properties: {
    version: { const: 'enc-v1' },
    algorithm: { const: 'AES-GCM' },
    iv: { type: 'string' },
    ciphertext: { type: 'string' },
    checksum: { type: 'string' },
    kdf: {
      type: 'object',
      required: ['algorithm', 'hash', 'iterations', 'salt'],
      properties: {
        algorithm: { const: 'PBKDF2' },
        hash: { const: 'SHA-256' },
        iterations: { type: 'integer' },
        salt: { type: 'string' },
      },
      additionalProperties: true,
    },
    manifest: {
      type: 'object',
      required: ['version', 'schemaVersion', 'traceId', 'exportedAt', 'backend'],
      properties: {
        version: { const: '3.0' },
        schemaVersion: { type: 'integer' },
        traceId: { type: 'string' },
        exportedAt: { type: 'string' },
        backend: { enum: ['web-dexie', 'desktop-sqlite'] },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typeMatches(value: unknown, expectedType: JsonSchemaType): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function validateWithJsonSchema(
  value: unknown,
  schema: JsonSchema,
  path = '$'
): string[] {
  const errors: string[] = [];

  if (schema.oneOf && schema.oneOf.length > 0) {
    const oneOfMatched = schema.oneOf.some((option) =>
      validateWithJsonSchema(value, option, path).length === 0
    );
    if (!oneOfMatched) {
      errors.push(`${path}: value does not match any allowed schema variants`);
      return errors;
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected constant ${JSON.stringify(schema.const)}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: expected one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(', ')}`);
    return errors;
  }

  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matched = expectedTypes.some((entry) => typeMatches(value, entry));
    if (!matched) {
      errors.push(`${path}: expected type ${expectedTypes.join(' | ')}`);
      return errors;
    }
  }

  if (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))) {
    if (!isPlainObject(value)) {
      return errors;
    }

    const objectValue = value;
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in objectValue)) {
          errors.push(`${path}: missing required field "${key}"`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, nestedSchema] of Object.entries(schema.properties)) {
        if (key in objectValue) {
          errors.push(...validateWithJsonSchema(objectValue[key], nestedSchema, `${path}.${key}`));
        }
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      const allowedKeys = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(objectValue)) {
        if (!allowedKeys.has(key)) {
          errors.push(`${path}: unexpected field "${key}"`);
        }
      }
    } else if (isPlainObject(schema.additionalProperties)) {
      const allowedKeys = new Set(Object.keys(schema.properties || {}));
      for (const [key, nestedValue] of Object.entries(objectValue)) {
        if (!allowedKeys.has(key)) {
          errors.push(
            ...validateWithJsonSchema(
              nestedValue,
              schema.additionalProperties,
              `${path}.${key}`
            )
          );
        }
      }
    }
  }

  if (schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'))) {
    if (!Array.isArray(value)) {
      return errors;
    }

    if (schema.items) {
      for (let index = 0; index < value.length; index++) {
        errors.push(...validateWithJsonSchema(value[index], schema.items, `${path}[${index}]`));
      }
    }
  }

  return errors;
}

function toLegacyChecksum(data: string): string {
  let hash = 0;
  for (let index = 0; index < data.length; index++) {
    const char = data.charCodeAt(index);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateChecksum(data: string): string {
  return toLegacyChecksum(data);
}

export function verifyChecksum(data: string, checksum: string): boolean {
  return generateChecksum(data) === checksum;
}

// Adapter: convert DBMessage to PersistedChatMessage
function fromDbMessage(message: DBMessage): PersistedChatMessage {
  const uiMessage = toUIMessage(message);
  return { ...uiMessage, sessionId: message.sessionId };
}

function fromDbSummary(summary: DBSummary): StoredSummary {
  return {
    id: summary.id,
    sessionId: summary.sessionId,
    type: summary.type as StoredSummary['type'],
    summary: summary.summary,
    keyPoints: summary.keyPoints ? JSON.parse(summary.keyPoints) : [],
    topics: summary.topics ? JSON.parse(summary.topics) : [],
    diagram: summary.diagram,
    diagramType: summary.diagramType as StoredSummary['diagramType'],
    messageRange: summary.messageRange ? JSON.parse(summary.messageRange) : { startIndex: 0, endIndex: 0 },
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

function fromDbProject(project: DBProject): import('@/types/project').Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    color: project.color,
    customInstructions: project.customInstructions,
    defaultProvider: project.defaultProvider,
    defaultModel: project.defaultModel,
    defaultMode: project.defaultMode as import('@/types/project').Project['defaultMode'],
    tags: project.tags ? JSON.parse(project.tags) : [],
    isArchived: project.isArchived,
    archivedAt: project.archivedAt,
    knowledgeBase: [],
    sessionIds: project.sessionIds ? JSON.parse(project.sessionIds) : [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastAccessedAt: project.lastAccessedAt,
    sessionCount: project.sessionCount,
    messageCount: project.messageCount,
  };
}

function mapLegacyToBackupV3(data: LegacyExportData): BackupPackageV3 {
  const payload = data.indexedDB;
  const sessions = data.sessions || payload?.sessions?.map(dbSessionToSession) || [];
  const projects = payload?.projects?.map(fromDbProject) || [];
  const knowledgeFiles = payload?.knowledgeFiles || [];
  const summaries = payload?.summaries?.map(fromDbSummary) || [];
  const messages = payload?.messages?.map(fromDbMessage) || [];

  return {
    version: '3.0',
    manifest: {
      version: '3.0',
      schemaVersion: 3,
      traceId: globalThis.crypto?.randomUUID?.() || `legacy-${Date.now()}`,
      exportedAt: data.exportedAt || new Date().toISOString(),
      backend: unifiedPersistenceService.getBackend(),
      integrity: {
        algorithm: 'SHA-256',
        checksum: '',
      },
    },
    payload: {
      sessions,
      messages,
      projects,
      knowledgeFiles,
      summaries,
      settings: data.settings,
      artifacts: data.artifacts,
      canvasDocuments: data.canvasDocuments,
      documents: payload?.documents,
      workflows: payload?.workflows,
      workflowExecutions: payload?.workflowExecutions,
      agentTraces: payload?.agentTraces,
      folders: payload?.folders,
      mcpServers: payload?.mcpServers,
    },
  };
}

function isBackupPackageV3(data: unknown): data is BackupPackageV3 {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as BackupPackageV3).version === '3.0' &&
    typeof (data as BackupPackageV3).manifest === 'object' &&
    typeof (data as BackupPackageV3).payload === 'object'
  );
}

function isEncryptedEnvelopeV1(data: unknown): data is EncryptedEnvelopeV1 {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as EncryptedEnvelopeV1).version === 'enc-v1' &&
    typeof (data as EncryptedEnvelopeV1).ciphertext === 'string'
  );
}

export async function validateExportData(data: unknown): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid backup format: expected object');
    return { valid: false, errors };
  }

  if (isEncryptedEnvelopeV1(data)) {
    errors.push(...validateWithJsonSchema(data, ENCRYPTED_ENVELOPE_V1_JSON_SCHEMA));
    return { valid: errors.length === 0, errors };
  }

  const normalized = isBackupPackageV3(data) ? data : mapLegacyToBackupV3(data as LegacyExportData);
  const normalizedForValidation = JSON.parse(JSON.stringify(normalized)) as BackupPackageV3;
  errors.push(...validateWithJsonSchema(normalizedForValidation, BACKUP_PACKAGE_V3_JSON_SCHEMA));

  if (normalized.manifest.integrity.checksum) {
    const actualChecksum = await sha256Hex(JSON.stringify(normalized.payload));
    if (actualChecksum !== normalized.manifest.integrity.checksum) {
      errors.push('Backup checksum verification failed');
    }
  }

  return { valid: errors.length === 0, errors };
}

async function normalizeImportData(
  input: ExportData,
  passphrase?: string
): Promise<BackupPackageV3> {
  if (isBackupPackageV3(input)) {
    return input;
  }

  if (isEncryptedEnvelopeV1(input)) {
    const effectivePassphrase = passphrase || (await getDefaultBackupPassphrase());
    if (!effectivePassphrase) {
      throw new Error('Encrypted backup requires a passphrase');
    }

    const decrypted = await decryptBackupPackage(input, effectivePassphrase);
    const parsed = JSON.parse(decrypted) as ExportData;
    if (!isBackupPackageV3(parsed)) {
      throw new Error('Decrypted backup is not a valid BackupPackage v3 payload');
    }
    return parsed;
  }

  return mapLegacyToBackupV3(input as LegacyExportData);
}

function resolveConflictStrategy(options: ImportOptions): ImportConflictResolution {
  if (options.mergeStrategy === 'replace') return 'replace';
  if (options.mergeStrategy === 'skip') return 'skip';
  return 'merge-rename';
}

function clonePayload(payload: BackupPayloadV3): BackupPayloadV3 {
  return JSON.parse(JSON.stringify(payload)) as BackupPayloadV3;
}

function isCategoryEnabled(
  categories: ImportOptions['categories'],
  target: NonNullable<ImportOptions['categories']>[number]
): boolean {
  return !categories || categories.length === 0 || categories.includes(target);
}

function filterPayloadByCategories(payload: BackupPayloadV3, categories?: ImportOptions['categories']): BackupPayloadV3 {
  if (!categories || categories.length === 0) {
    return payload;
  }

  return {
    sessions: isCategoryEnabled(categories, 'sessions') ? payload.sessions : [],
    messages: isCategoryEnabled(categories, 'indexedDB') ? payload.messages : [],
    projects: isCategoryEnabled(categories, 'indexedDB') ? payload.projects : [],
    knowledgeFiles: isCategoryEnabled(categories, 'indexedDB') ? payload.knowledgeFiles : [],
    summaries: isCategoryEnabled(categories, 'indexedDB') ? payload.summaries : [],
    settings: isCategoryEnabled(categories, 'settings') ? payload.settings : undefined,
    artifacts: isCategoryEnabled(categories, 'artifacts') ? payload.artifacts : undefined,
    canvasDocuments: isCategoryEnabled(categories, 'artifacts') ? payload.canvasDocuments : undefined,
    documents: isCategoryEnabled(categories, 'indexedDB') ? payload.documents : undefined,
    workflows: isCategoryEnabled(categories, 'indexedDB') ? payload.workflows : undefined,
    workflowExecutions: isCategoryEnabled(categories, 'indexedDB') ? payload.workflowExecutions : undefined,
    agentTraces: isCategoryEnabled(categories, 'indexedDB') ? payload.agentTraces : undefined,
    checkpoints: isCategoryEnabled(categories, 'indexedDB') ? payload.checkpoints : undefined,
    contextFiles: isCategoryEnabled(categories, 'indexedDB') ? payload.contextFiles : undefined,
    assets: isCategoryEnabled(categories, 'indexedDB') ? payload.assets : undefined,
    videoProjects: isCategoryEnabled(categories, 'indexedDB') ? payload.videoProjects : undefined,
    folders: isCategoryEnabled(categories, 'indexedDB') ? payload.folders : undefined,
    mcpServers: isCategoryEnabled(categories, 'indexedDB') ? payload.mcpServers : undefined,
    storageSnapshot: isCategoryEnabled(categories, 'settings') ? payload.storageSnapshot : undefined,
  };
}

function createGeneratedId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${nanoid(16)}`;
}

function remapPayloadIds(payload: BackupPayloadV3): BackupPayloadV3 {
  const cloned = clonePayload(payload);
  const sessionIdMap = new Map<string, string>();
  const projectIdMap = new Map<string, string>();
  const messageIdMap = new Map<string, string>();
  const folderIdMap = new Map<string, string>();
  const workflowIdMap = new Map<string, string>();

  cloned.sessions = cloned.sessions.map((session) => {
    const nextId = createGeneratedId('session');
    sessionIdMap.set(session.id, nextId);
    return {
      ...session,
      id: nextId,
    };
  });

  cloned.folders = cloned.folders?.map((folder) => {
    const nextId = createGeneratedId('folder');
    folderIdMap.set(folder.id, nextId);
    return { ...folder, id: nextId };
  });

  cloned.messages = cloned.messages.map((message) => {
    const nextId = createGeneratedId('message');
    messageIdMap.set(message.id, nextId);
    return {
      ...message,
      id: nextId,
      sessionId: sessionIdMap.get(message.sessionId) || message.sessionId,
    };
  });

  cloned.projects = cloned.projects.map((project) => {
    const nextId = createGeneratedId('project');
    projectIdMap.set(project.id, nextId);
    return {
      ...project,
      id: nextId,
      sessionIds: (project.sessionIds || []).map((sessionId) => sessionIdMap.get(sessionId) || sessionId),
    };
  });

  cloned.sessions = cloned.sessions.map((session) => ({
    ...session,
    folderId: session.folderId ? folderIdMap.get(session.folderId) || session.folderId : session.folderId,
    projectId: session.projectId ? projectIdMap.get(session.projectId) || session.projectId : session.projectId,
  }));

  cloned.knowledgeFiles = cloned.knowledgeFiles.map((file) => ({
    ...file,
    id: createGeneratedId('knowledge'),
    projectId: projectIdMap.get(file.projectId) || file.projectId,
  }));

  cloned.summaries = cloned.summaries.map((summary) => ({
    ...summary,
    id: createGeneratedId('summary'),
    sessionId: sessionIdMap.get(summary.sessionId) || summary.sessionId,
  }));

  cloned.documents = cloned.documents?.map((document) => ({
    ...document,
    id: createGeneratedId('document'),
    projectId: document.projectId ? projectIdMap.get(document.projectId) || document.projectId : document.projectId,
  }));

  cloned.workflows = cloned.workflows?.map((workflow) => {
    const nextId = createGeneratedId('workflow');
    workflowIdMap.set(workflow.id, nextId);
    return { ...workflow, id: nextId };
  });

  cloned.workflowExecutions = cloned.workflowExecutions?.map((execution) => ({
    ...execution,
    id: createGeneratedId('workflow-exec'),
    workflowId: workflowIdMap.get(execution.workflowId) || execution.workflowId,
  }));

  cloned.agentTraces = cloned.agentTraces?.map((trace) => ({
    ...trace,
    id: createGeneratedId('agent-trace'),
    sessionId: trace.sessionId ? sessionIdMap.get(trace.sessionId) || trace.sessionId : trace.sessionId,
  }));

  cloned.checkpoints = cloned.checkpoints?.map((checkpoint) => ({
    ...checkpoint,
    id: createGeneratedId('checkpoint'),
    sessionId: sessionIdMap.get(checkpoint.sessionId) || checkpoint.sessionId,
  }));

  cloned.contextFiles = cloned.contextFiles?.map((contextFile) => ({
    ...contextFile,
    id: createGeneratedId('context-file'),
  }));

  cloned.videoProjects = cloned.videoProjects?.map((project) => ({
    ...project,
    id: createGeneratedId('video-project'),
  }));

  cloned.assets = cloned.assets?.map((asset) => ({
    ...asset,
    id: createGeneratedId('asset'),
  }));

  if (cloned.artifacts) {
    const remappedArtifacts: Record<string, Artifact> = {};
    for (const artifact of Object.values(cloned.artifacts)) {
      const artifactId = createGeneratedId('artifact');
      remappedArtifacts[artifactId] = {
        ...artifact,
        id: artifactId,
        sessionId: artifact.sessionId ? sessionIdMap.get(artifact.sessionId) || artifact.sessionId : artifact.sessionId,
        messageId: artifact.messageId ? messageIdMap.get(artifact.messageId) || artifact.messageId : artifact.messageId,
      };
    }
    cloned.artifacts = remappedArtifacts;
  }

  return cloned;
}

async function clearImportTargets(categories?: ImportOptions['categories']): Promise<void> {
  if (isCategoryEnabled(categories, 'sessions') || isCategoryEnabled(categories, 'indexedDB')) {
    await unifiedPersistenceService.clearDomainData();
  }

  if (typeof window !== 'undefined' && isCategoryEnabled(categories, 'settings')) {
    const keysToRemove = Object.keys(localStorage).filter(
      (key) => key.startsWith('cognia-') || STORAGE_SNAPSHOT_KEYS.includes(key as (typeof STORAGE_SNAPSHOT_KEYS)[number])
    );
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    const sessionKeys = Object.keys(sessionStorage).filter(
      (key) => key.startsWith('cognia-') || STORAGE_SNAPSHOT_KEYS.includes(key as (typeof STORAGE_SNAPSHOT_KEYS)[number])
    );
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
  }

  if (isCategoryEnabled(categories, 'artifacts')) {
    const { useArtifactStore } = await import('@/stores');
    useArtifactStore.setState({
      artifacts: {},
      canvasDocuments: {},
      activeArtifactId: null,
      activeCanvasId: null,
      panelOpen: false,
    });
  }
}

export async function importFullBackup(
  data: ExportData,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const startedAt = Date.now();

  const result: ImportResult = {
    success: false,
    imported: {
      sessions: 0,
      messages: 0,
      artifacts: 0,
      documents: 0,
      projects: 0,
      settings: false,
    },
    skipped: {
      sessions: 0,
      messages: 0,
      artifacts: 0,
    },
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    const normalized = await normalizeImportData(data, opts.passphrase);

    if (opts.validateData) {
      const validation = await validateExportData(normalized);
      if (!validation.valid) {
        result.errors.push(...validation.errors.map((message) => ({ category: 'validation', message })));
        result.duration = Date.now() - startedAt;
        return result;
      }
    }

    const scopedPayload = filterPayloadByCategories(normalized.payload, opts.categories);
    const importPayload = opts.generateNewIds ? remapPayloadIds(scopedPayload) : scopedPayload;

    if (opts.mergeStrategy === 'replace') {
      await clearImportTargets(opts.categories);
    }

    const importResponse = await unifiedPersistenceService.backup.importPayload(
      importPayload,
      resolveConflictStrategy(opts)
    );

    result.imported.sessions = importResponse.importedSessions;
    result.imported.messages = importResponse.importedMessages;
    result.imported.projects = importResponse.importedProjects;
    result.imported.artifacts = importPayload.artifacts
      ? Object.keys(importPayload.artifacts).length
      : 0;
    result.imported.documents = importPayload.documents?.length || 0;
    result.imported.settings = !!importPayload.settings;
    result.warnings.push(...importResponse.warnings);
    result.skipped.sessions = importResponse.warnings.filter((warning) => warning.startsWith('Skipped session')).length;
    result.success = true;
  } catch (error) {
    result.errors.push({
      category: 'global',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  result.duration = Date.now() - startedAt;
  if (result.errors.length > 0) {
    result.success = false;
  }
  return result;
}

export async function parseImportFile(
  file: File,
  passphrase?: string
): Promise<{
  data: BackupPackageV3 | null;
  errors: string[];
}> {
  const errors: string[] = [];
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as ExportData;
    const normalized = await normalizeImportData(parsed, passphrase);
    const validation = await validateExportData(normalized);
    if (!validation.valid) {
      errors.push(...validation.errors);
      return { data: null, errors };
    }
    return { data: normalized, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Failed to parse backup file');
    return { data: null, errors };
  }
}
