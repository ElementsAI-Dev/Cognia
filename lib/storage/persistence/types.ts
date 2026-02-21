import type { Session, UIMessage, Artifact, Project } from '@/types';
import type { StoredSummary } from '@/types/learning/summary';
import type {
  DBDocument,
  DBWorkflow,
  DBWorkflowExecution,
  DBKnowledgeFile,
  DBAgentTrace,
  DBCheckpoint,
  DBContextFile,
  DBFolder,
  DBMCPServer,
  DBVideoProject,
} from '@/lib/db';

export type PersistenceBackend = 'web-dexie' | 'desktop-sqlite';

export type ImportConflictResolution = 'merge-rename' | 'replace' | 'skip';

export const BACKUP_PACKAGE_SCHEMA_VERSION = 3 as const;

export interface BackupManifestV3 {
  version: '3.0';
  schemaVersion: number;
  traceId: string;
  exportedAt: string;
  backend: PersistenceBackend;
  integrity: {
    algorithm: 'SHA-256';
    checksum: string;
  };
  encryption?: {
    enabled: true;
    format: 'encrypted-envelope-v1';
  };
}

export interface BackupPayloadV3 {
  sessions: Session[];
  messages: PersistedChatMessage[];
  projects: Project[];
  knowledgeFiles: DBKnowledgeFile[];
  summaries: StoredSummary[];
  settings?: Record<string, unknown>;
  artifacts?: Record<string, Artifact>;
  canvasDocuments?: Record<string, unknown>;
  documents?: DBDocument[];
  workflows?: DBWorkflow[];
  workflowExecutions?: DBWorkflowExecution[];
  agentTraces?: DBAgentTrace[];
  checkpoints?: DBCheckpoint[];
  contextFiles?: DBContextFile[];
  assets?: BackupAssetV3[];
  videoProjects?: DBVideoProject[];
  folders?: DBFolder[];
  mcpServers?: DBMCPServer[];
  storageSnapshot?: {
    localStorage?: Record<string, string>;
    sessionStorage?: Record<string, string>;
  };
}

export interface BackupAssetV3 {
  id: string;
  kind: 'background-image';
  mimeType: string;
  filename?: string;
  createdAt: Date;
  updatedAt?: Date;
  base64: string;
}

export type PersistedChatMessage = UIMessage & {
  sessionId: string;
};

export interface BackupPackageV3 {
  version: '3.0';
  manifest: BackupManifestV3;
  payload: BackupPayloadV3;
}

export interface EncryptedEnvelopeV1 {
  version: 'enc-v1';
  algorithm: 'AES-GCM';
  kdf: {
    algorithm: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  iv: string;
  ciphertext: string;
  manifest: Omit<BackupManifestV3, 'integrity'>;
  checksum: string;
}

export interface ExportSelectionOptions {
  includeSessions?: boolean;
  includeSettings?: boolean;
  includeArtifacts?: boolean;
  includeIndexedDB?: boolean;
  includeChecksum?: boolean;
}
