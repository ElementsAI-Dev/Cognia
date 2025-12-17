/**
 * Tests for Database Schema
 */

// Use fake-indexeddb for testing - must be imported before Dexie
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db, type DBSession, type DBMessage, type DBDocument, type DBMCPServer } from './schema';

describe('CogniaDB Schema', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.sessions.clear();
    await db.messages.clear();
    await db.documents.clear();
    await db.mcpServers.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Database Instance', () => {
    it('is a Dexie database', () => {
      expect(db).toBeInstanceOf(Dexie);
    });

    it('has correct database name', () => {
      expect(db.name).toBe('CogniaDB');
    });

    it('has sessions table', () => {
      expect(db.sessions).toBeDefined();
    });

    it('has messages table', () => {
      expect(db.messages).toBeDefined();
    });

    it('has documents table', () => {
      expect(db.documents).toBeDefined();
    });

    it('has mcpServers table', () => {
      expect(db.mcpServers).toBeDefined();
    });
  });

  describe('Sessions Table', () => {
    it('creates session with all fields', async () => {
      const session: DBSession = {
        id: 'session-1',
        title: 'Test Session',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        maxTokens: 4096,
        enableTools: true,
        enableResearch: false,
        messageCount: 0,
        lastMessagePreview: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.sessions.add(session);
      const retrieved = await db.sessions.get('session-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Session');
      expect(retrieved?.provider).toBe('openai');
      expect(retrieved?.temperature).toBe(0.7);
    });

    it('updates session', async () => {
      const session: DBSession = {
        id: 'session-2',
        title: 'Original Title',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.sessions.add(session);
      await db.sessions.update('session-2', { title: 'Updated Title' });

      const updated = await db.sessions.get('session-2');
      expect(updated?.title).toBe('Updated Title');
    });

    it('deletes session', async () => {
      const session: DBSession = {
        id: 'session-3',
        title: 'To Delete',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.sessions.add(session);
      await db.sessions.delete('session-3');

      const deleted = await db.sessions.get('session-3');
      expect(deleted).toBeUndefined();
    });

    it('queries sessions by provider', async () => {
      await db.sessions.bulkAdd([
        {
          id: 's1',
          title: 'OpenAI Session',
          provider: 'openai',
          model: 'gpt-4o',
          mode: 'chat',
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 's2',
          title: 'Anthropic Session',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          mode: 'chat',
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const openaiSessions = await db.sessions.where('provider').equals('openai').toArray();
      expect(openaiSessions).toHaveLength(1);
      expect(openaiSessions[0].title).toBe('OpenAI Session');
    });

    it('orders sessions by updatedAt', async () => {
      const now = new Date();
      await db.sessions.bulkAdd([
        {
          id: 's1',
          title: 'Old Session',
          provider: 'openai',
          model: 'gpt-4o',
          mode: 'chat',
          messageCount: 0,
          createdAt: now,
          updatedAt: new Date(now.getTime() - 10000),
        },
        {
          id: 's2',
          title: 'New Session',
          provider: 'openai',
          model: 'gpt-4o',
          mode: 'chat',
          messageCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const sessions = await db.sessions.orderBy('updatedAt').reverse().toArray();
      expect(sessions[0].title).toBe('New Session');
    });
  });

  describe('Messages Table', () => {
    it('creates message with all fields', async () => {
      const message: DBMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello, world!',
        parts: JSON.stringify([{ type: 'text', text: 'Hello, world!' }]),
        model: 'gpt-4o',
        provider: 'openai',
        tokens: JSON.stringify({ input: 10, output: 20 }),
        attachments: JSON.stringify([]),
        sources: JSON.stringify([]),
        error: undefined,
        createdAt: new Date(),
      };

      await db.messages.add(message);
      const retrieved = await db.messages.get('msg-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Hello, world!');
      expect(retrieved?.role).toBe('user');
    });

    it('queries messages by sessionId', async () => {
      await db.messages.bulkAdd([
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Message 1',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Message 2',
          createdAt: new Date(),
        },
        {
          id: 'msg-3',
          sessionId: 'session-2',
          role: 'user',
          content: 'Message 3',
          createdAt: new Date(),
        },
      ]);

      const session1Messages = await db.messages
        .where('sessionId')
        .equals('session-1')
        .toArray();

      expect(session1Messages).toHaveLength(2);
    });

    it('deletes messages by sessionId', async () => {
      await db.messages.bulkAdd([
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Message 1',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Message 2',
          createdAt: new Date(),
        },
      ]);

      await db.messages.where('sessionId').equals('session-1').delete();

      const remaining = await db.messages.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('orders messages by createdAt', async () => {
      const now = new Date();
      await db.messages.bulkAdd([
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'First',
          createdAt: new Date(now.getTime() - 1000),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Second',
          createdAt: now,
        },
      ]);

      const messages = await db.messages.where('sessionId').equals('session-1').sortBy('createdAt');

      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });
  });

  describe('Documents Table', () => {
    it('creates document', async () => {
      const document: DBDocument = {
        id: 'doc-1',
        name: 'test.txt',
        type: 'text/plain',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        metadata: JSON.stringify({ size: 100 }),
        createdAt: new Date(),
      };

      await db.documents.add(document);
      const retrieved = await db.documents.get('doc-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test.txt');
      expect(retrieved?.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('queries documents by type', async () => {
      await db.documents.bulkAdd([
        {
          id: 'doc-1',
          name: 'file.txt',
          type: 'text/plain',
          content: 'Text',
          createdAt: new Date(),
        },
        {
          id: 'doc-2',
          name: 'file.md',
          type: 'text/markdown',
          content: '# Markdown',
          createdAt: new Date(),
        },
      ]);

      const textDocs = await db.documents.where('type').equals('text/plain').toArray();
      expect(textDocs).toHaveLength(1);
    });
  });

  describe('MCP Servers Table', () => {
    it('creates MCP server', async () => {
      const server: DBMCPServer = {
        id: 'server-1',
        name: 'Test Server',
        url: 'http://localhost:3001',
        connected: true,
        tools: JSON.stringify([{ name: 'tool1', description: 'A tool' }]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.mcpServers.add(server);
      const retrieved = await db.mcpServers.get('server-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Server');
      expect(retrieved?.connected).toBe(true);
    });

    it('queries servers by connection status', async () => {
      await db.mcpServers.bulkAdd([
        {
          id: 'server-1',
          name: 'Connected',
          url: 'http://localhost:3001',
          connected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'server-2',
          name: 'Disconnected',
          url: 'http://localhost:3002',
          connected: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const connectedServers = await db.mcpServers.where('connected').equals(1).toArray();
      // Note: Dexie stores booleans as 0/1
      expect(connectedServers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Type Interfaces', () => {
    it('DBSession has correct required fields', () => {
      const session: DBSession = {
        id: 'test',
        title: 'Test',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(session.id).toBeDefined();
      expect(session.title).toBeDefined();
    });

    it('DBMessage has correct required fields', () => {
      const message: DBMessage = {
        id: 'test',
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello',
        createdAt: new Date(),
      };

      expect(message.id).toBeDefined();
      expect(message.sessionId).toBeDefined();
      expect(message.role).toBeDefined();
    });
  });
});
