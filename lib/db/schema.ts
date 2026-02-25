/**
 * Dexie Database Schema
 */

import Dexie, { type EntityTable } from 'dexie';

// Database entity types
export interface DBSession {
  id: string;
  title: string;
  provider: string;
  model: string;
  mode: string;
  customIcon?: string;
  folderId?: string;
  projectId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
  enableResearch?: boolean;
  metadata?: string; // JSON serialized session fields not indexed in Dexie
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBMessage {
  id: string;
  sessionId: string;
  branchId?: string; // null/undefined means main branch
  role: string;
  content: string;
  parts?: string; // JSON serialized MessagePart[]
  model?: string;
  provider?: string;
  tokens?: string; // JSON serialized TokenUsage
  attachments?: string; // JSON serialized Attachment[]
  sources?: string; // JSON serialized Source[]
  error?: string;
  createdAt: Date;
  // Edit history support
  isEdited?: boolean;
  editHistory?: string; // JSON serialized MessageEdit[]
  originalContent?: string;
  // Bookmark support
  isBookmarked?: boolean;
  bookmarkedAt?: Date;
  // Reaction support
  reaction?: string; // 'like' | 'dislike'
  reactions?: string; // JSON serialized EmojiReaction[]
}

export interface DBDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  embeddableContent?: string;
  embedding?: number[];
  metadata?: string; // JSON serialized
  projectId?: string;
  collectionId?: string;
  isIndexed?: boolean;
  version?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DBProject {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  customInstructions?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultMode?: string;
  tags?: string; // JSON serialized string[]
  isArchived?: boolean;
  archivedAt?: Date;
  sessionIds?: string; // JSON serialized string[]
  metadata?: string; // JSON serialized project fields not indexed in Dexie
  sessionCount: number;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

export interface DBKnowledgeFile {
  id: string;
  projectId: string;
  name: string;
  type: string;
  content: string;
  size: number;
  mimeType?: string;
  originalSize?: number;
  pageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBMCPServer {
  id: string;
  name: string;
  url: string;
  connected: boolean;
  tools?: string; // JSON serialized MCPTool[]
  createdAt: Date;
  updatedAt: Date;
}

export interface DBWorkflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string; // JSON serialized string[]
  nodes: string; // JSON serialized WorkflowNode[]
  edges: string; // JSON serialized WorkflowEdge[]
  settings?: string; // JSON serialized WorkflowSettings
  viewport?: string; // JSON serialized Viewport
  version: number;
  isTemplate?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBWorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  input?: string; // JSON serialized Record<string, unknown>
  output?: string; // JSON serialized Record<string, unknown>
  nodeStates?: string; // JSON serialized Record<string, NodeExecutionState>
  logs?: string; // JSON serialized ExecutionLog[]
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface DBSummary {
  id: string;
  sessionId: string;
  type: string; // 'chat' | 'agent' | 'incremental'
  summary: string;
  keyPoints?: string; // JSON serialized KeyPoint[]
  topics?: string; // JSON serialized ConversationTopic[]
  diagram?: string; // Mermaid code
  diagramType?: string;
  messageRange?: string; // JSON serialized { startMessageId, endMessageId, startIndex, endIndex }
  messageCount: number;
  sourceTokens: number;
  summaryTokens: number;
  compressionRatio: number;
  language?: string;
  format: string;
  style?: string;
  template?: string;
  usedAI: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBAsset {
  id: string;
  kind: 'background-image';
  blob: Blob;
  mimeType: string;
  filename?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DBFolder {
  id: string;
  name: string;
  order: number;
  isExpanded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBAgentTrace {
  id: string;
  sessionId?: string;
  timestamp: Date;
  vcsType?: string;
  vcsRevision?: string;
  record: string;
  createdAt: Date;
  /** Extracted file paths for indexed queries (added in v9) */
  filePaths?: string[];
}

export interface DBCheckpoint {
  id: string;
  sessionId: string;
  traceId: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string | null;
  modelId: string | null;
  timestamp: Date;
  createdAt: Date;
}

export interface DBVideoProject {
  id: string;
  name: string;
  resolution: string; // JSON serialized { width, height }
  frameRate: number;
  aspectRatio: string;
  tracks: string; // JSON serialized VideoTrack[]
  duration: number;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBContextFile {
  id: string;
  path: string;
  category: string;
  source: string;
  filename?: string;
  content: string;
  sizeBytes: number;
  estimatedTokens: number;
  tags: string[];
  ttlMs?: number;
  createdAt: Date;
  lastAccessedAt: Date;
}

// Database class
class CogniaDB extends Dexie {
  sessions!: EntityTable<DBSession, 'id'>;
  messages!: EntityTable<DBMessage, 'id'>;
  documents!: EntityTable<DBDocument, 'id'>;
  mcpServers!: EntityTable<DBMCPServer, 'id'>;
  projects!: EntityTable<DBProject, 'id'>;
  knowledgeFiles!: EntityTable<DBKnowledgeFile, 'id'>;
  workflows!: EntityTable<DBWorkflow, 'id'>;
  workflowExecutions!: EntityTable<DBWorkflowExecution, 'id'>;
  summaries!: EntityTable<DBSummary, 'id'>;
  agentTraces!: EntityTable<DBAgentTrace, 'id'>;
  checkpoints!: EntityTable<DBCheckpoint, 'id'>;
  assets!: EntityTable<DBAsset, 'id'>;
  folders!: EntityTable<DBFolder, 'id'>;
  videoProjects!: EntityTable<DBVideoProject, 'id'>;
  contextFiles!: EntityTable<DBContextFile, 'id'>;

  constructor() {
    super('CogniaDB', { cache: 'immutable' });

    // ── Schema Versions (incremental — only changed tables per version) ──

    // Version 1: Initial schema
    this.version(1).stores({
      sessions: 'id, title, provider, createdAt, updatedAt',
      messages: 'id, sessionId, role, createdAt, [sessionId+createdAt]',
      documents: 'id, name, type, createdAt',
      mcpServers: 'id, name, url, connected',
    });

    // Version 2: Add branchId + compound index for messages
    this.version(2).stores({
      messages: 'id, sessionId, branchId, role, createdAt, [sessionId+createdAt], [sessionId+branchId+createdAt]',
    });

    // Version 3: Add projectId to sessions/documents; new projects + knowledgeFiles tables
    this.version(3).stores({
      sessions: 'id, title, provider, projectId, createdAt, updatedAt',
      documents: 'id, name, type, projectId, collectionId, isIndexed, createdAt, updatedAt',
      projects: 'id, name, createdAt, updatedAt, lastAccessedAt',
      knowledgeFiles: 'id, projectId, name, type, createdAt, [projectId+createdAt]',
    });

    // Version 4: Add workflows + workflowExecutions tables
    this.version(4).stores({
      workflows: 'id, name, category, isTemplate, createdAt, updatedAt',
      workflowExecutions: 'id, workflowId, status, startedAt, completedAt, [workflowId+startedAt]',
    });

    // Version 5: Add summaries table
    this.version(5).stores({
      summaries: 'id, sessionId, type, format, createdAt, updatedAt, [sessionId+createdAt]',
    });

    // Version 6: Add folderId to sessions; new assets table
    this.version(6).stores({
      sessions: 'id, title, provider, projectId, folderId, createdAt, updatedAt',
      assets: 'id, kind, createdAt',
    });

    // Version 7: Add folders table
    this.version(7).stores({
      folders: 'id, name, order, createdAt',
    });

    // Version 8: Add agentTraces table
    this.version(8).stores({
      agentTraces: 'id, sessionId, timestamp, vcsRevision, [sessionId+timestamp], [vcsRevision+timestamp]',
    });

    // Version 9: Add *filePaths multi-entry index to agentTraces
    this.version(9).stores({
      agentTraces: 'id, sessionId, timestamp, vcsRevision, *filePaths, [sessionId+timestamp], [vcsRevision+timestamp]',
    });

    // Version 10: Add checkpoints table
    this.version(10).stores({
      checkpoints: 'id, sessionId, traceId, filePath, timestamp, [sessionId+filePath], [sessionId+timestamp]',
    });

    // Version 11: Add videoProjects table
    this.version(11).stores({
      videoProjects: 'id, name, createdAt, updatedAt',
    });

    // Version 12: Add contextFiles table
    this.version(12).stores({
      contextFiles: 'id, path, category, source, createdAt, lastAccessedAt, [category+createdAt], [category+source]',
    });

    // Version 13: Add isArchived index to projects
    this.version(13).stores({
      projects: 'id, name, isArchived, createdAt, updatedAt, lastAccessedAt',
    });

    // ── Events ──

    // Seed default data on first database creation
    this.on('populate', (tx) => {
      tx.table('folders').add({
        id: 'default-folder',
        name: 'General',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Handle multi-tab version change gracefully
    this.on('versionchange', () => {
      this.close();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cognia:db-version-change'));
      }
      return false;
    });
  }
}

export const db = new CogniaDB();

// Export database instance
export default db;
