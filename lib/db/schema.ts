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
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
  enableResearch?: boolean;
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
  sessionIds?: string; // JSON serialized string[]
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

// Database class
class CogniaDB extends Dexie {
  sessions!: EntityTable<DBSession, 'id'>;
  messages!: EntityTable<DBMessage, 'id'>;
  documents!: EntityTable<DBDocument, 'id'>;
  mcpServers!: EntityTable<DBMCPServer, 'id'>;
  projects!: EntityTable<DBProject, 'id'>;
  knowledgeFiles!: EntityTable<DBKnowledgeFile, 'id'>;

  constructor() {
    super('CogniaDB');

    this.version(1).stores({
      sessions: 'id, title, provider, createdAt, updatedAt',
      messages: 'id, sessionId, role, createdAt, [sessionId+createdAt]',
      documents: 'id, name, type, createdAt',
      mcpServers: 'id, name, url, connected',
    });

    // Version 2: Add branchId support for messages
    this.version(2).stores({
      sessions: 'id, title, provider, createdAt, updatedAt',
      messages: 'id, sessionId, branchId, role, createdAt, [sessionId+createdAt], [sessionId+branchId+createdAt]',
      documents: 'id, name, type, createdAt',
      mcpServers: 'id, name, url, connected',
    });

    // Version 3: Add projects, knowledgeFiles tables and enhance documents
    this.version(3).stores({
      sessions: 'id, title, provider, projectId, createdAt, updatedAt',
      messages: 'id, sessionId, branchId, role, createdAt, [sessionId+createdAt], [sessionId+branchId+createdAt]',
      documents: 'id, name, type, projectId, collectionId, isIndexed, createdAt, updatedAt',
      mcpServers: 'id, name, url, connected',
      projects: 'id, name, createdAt, updatedAt, lastAccessedAt',
      knowledgeFiles: 'id, projectId, name, type, createdAt, [projectId+createdAt]',
    });
  }
}

export const db = new CogniaDB();

// Export database instance
export default db;
