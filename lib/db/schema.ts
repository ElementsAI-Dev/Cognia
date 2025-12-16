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
  embedding?: number[];
  metadata?: string; // JSON serialized
  createdAt: Date;
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

  constructor() {
    super('CogniaDB');

    this.version(1).stores({
      sessions: 'id, title, provider, createdAt, updatedAt',
      messages: 'id, sessionId, role, createdAt, [sessionId+createdAt]',
      documents: 'id, name, type, createdAt',
      mcpServers: 'id, name, url, connected',
    });
  }
}

export const db = new CogniaDB();

// Export database instance
export default db;
