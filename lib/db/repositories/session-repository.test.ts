/**
 * Tests for Session Repository
 */

// Use fake-indexeddb for testing - must be imported before Dexie
import 'fake-indexeddb/auto';
import { sessionRepository } from './session-repository';
import { messageRepository } from './message-repository';
import { db } from '../schema';

describe('sessionRepository', () => {
  beforeEach(async () => {
    await db.messages.clear();
    await db.sessions.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates session with defaults', async () => {
      const session = await sessionRepository.create();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.title).toBe('New Chat');
      expect(session.provider).toBe('openai');
      expect(session.model).toBe('gpt-4o');
      expect(session.mode).toBe('chat');
      expect(session.messageCount).toBe(0);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('creates session with custom values', async () => {
      const session = await sessionRepository.create({
        title: 'Custom Session',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        mode: 'agent',
        systemPrompt: 'You are a coding assistant',
      });

      expect(session.title).toBe('Custom Session');
      expect(session.provider).toBe('anthropic');
      expect(session.model).toBe('claude-sonnet-4-20250514');
      expect(session.mode).toBe('agent');
      expect(session.systemPrompt).toBe('You are a coding assistant');
    });

    it('generates unique IDs', async () => {
      const session1 = await sessionRepository.create();
      const session2 = await sessionRepository.create();

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('getById', () => {
    it('retrieves session by ID', async () => {
      const created = await sessionRepository.create({ title: 'Test Session' });
      const retrieved = await sessionRepository.getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Test Session');
    });

    it('returns undefined for non-existent ID', async () => {
      const result = await sessionRepository.getById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all sessions', async () => {
      await sessionRepository.create({ title: 'Session 1' });
      await sessionRepository.create({ title: 'Session 2' });
      await sessionRepository.create({ title: 'Session 3' });

      const sessions = await sessionRepository.getAll();

      expect(sessions).toHaveLength(3);
    });

    it('returns sessions sorted by updatedAt descending', async () => {
      const session1 = await sessionRepository.create({ title: 'Old Session' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const session2 = await sessionRepository.create({ title: 'New Session' });

      // Update session1 to make it newer
      await sessionRepository.update(session1.id, { title: 'Updated Old Session' });

      const sessions = await sessionRepository.getAll();

      expect(sessions[0].title).toBe('Updated Old Session');
      expect(sessions[1].id).toBe(session2.id);
    });

    it('returns empty array when no sessions', async () => {
      const sessions = await sessionRepository.getAll();
      expect(sessions).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates session fields', async () => {
      const created = await sessionRepository.create({ title: 'Original' });

      const updated = await sessionRepository.update(created.id, {
        title: 'Updated Title',
        temperature: 0.5,
        maxTokens: 2048,
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.temperature).toBe(0.5);
      expect(updated?.maxTokens).toBe(2048);
    });

    it('updates updatedAt timestamp', async () => {
      const created = await sessionRepository.create();
      const originalUpdatedAt = new Date(created.updatedAt).getTime();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await sessionRepository.update(created.id, { title: 'New Title' });

      expect(new Date(updated?.updatedAt ?? 0).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('returns undefined for non-existent session', async () => {
      const result = await sessionRepository.update('non-existent', { title: 'Test' });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes session', async () => {
      const created = await sessionRepository.create();
      await sessionRepository.delete(created.id);

      const deleted = await sessionRepository.getById(created.id);
      expect(deleted).toBeUndefined();
    });

    it('deletes associated messages', async () => {
      const session = await sessionRepository.create();

      await messageRepository.create(session.id, {
        role: 'user' as const,
        content: 'Test message',
      });

      await sessionRepository.delete(session.id);

      const messages = await messageRepository.getBySessionId(session.id);
      expect(messages).toHaveLength(0);
    });
  });

  describe('deleteAll', () => {
    it('deletes all sessions and messages', async () => {
      const session1 = await sessionRepository.create({ title: 'Session 1' });
      const session2 = await sessionRepository.create({ title: 'Session 2' });

      await messageRepository.create(session1.id, {
        role: 'user' as const,
        content: 'Message 1',
      });

      await messageRepository.create(session2.id, {
        role: 'user' as const,
        content: 'Message 2',
      });

      await sessionRepository.deleteAll();

      const sessions = await sessionRepository.getAll();
      const allMessages = await db.messages.toArray();

      expect(sessions).toHaveLength(0);
      expect(allMessages).toHaveLength(0);
    });
  });

  describe('duplicate', () => {
    it('duplicates session without messages', async () => {
      const original = await sessionRepository.create({
        title: 'Original Session',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        systemPrompt: 'Test prompt',
      });

      await messageRepository.create(original.id, {
        role: 'user' as const,
        content: 'Test message',
      });

      const duplicate = await sessionRepository.duplicate(original.id);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.title).toBe('Original Session (copy)');
      expect(duplicate?.provider).toBe('anthropic');
      expect(duplicate?.systemPrompt).toBe('Test prompt');
      expect(duplicate?.messageCount).toBe(0);
    });

    it('returns undefined for non-existent session', async () => {
      const result = await sessionRepository.duplicate('non-existent');
      expect(result).toBeUndefined();
    });

    it('creates new timestamps', async () => {
      const original = await sessionRepository.create({ title: 'Original' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const duplicate = await sessionRepository.duplicate(original.id);

      expect(duplicate?.createdAt.getTime()).toBeGreaterThan(original.createdAt.getTime());
    });
  });

  describe('searchByTitle', () => {
    it('finds sessions by title (case insensitive)', async () => {
      await sessionRepository.create({ title: 'JavaScript Tutorial' });
      await sessionRepository.create({ title: 'Python Guide' });
      await sessionRepository.create({ title: 'JavaScript Advanced' });

      const results = await sessionRepository.searchByTitle('javascript');

      expect(results).toHaveLength(2);
      expect(results.every((s) => s.title.toLowerCase().includes('javascript'))).toBe(true);
    });

    it('returns empty array for no matches', async () => {
      await sessionRepository.create({ title: 'Test Session' });

      const results = await sessionRepository.searchByTitle('nonexistent');

      expect(results).toHaveLength(0);
    });

    it('matches partial titles', async () => {
      await sessionRepository.create({ title: 'Understanding AI Models' });

      const results = await sessionRepository.searchByTitle('AI');

      expect(results).toHaveLength(1);
    });
  });

  describe('getCount', () => {
    it('returns correct count', async () => {
      await sessionRepository.create();
      await sessionRepository.create();
      await sessionRepository.create();

      const count = await sessionRepository.getCount();

      expect(count).toBe(3);
    });

    it('returns 0 when no sessions', async () => {
      const count = await sessionRepository.getCount();
      expect(count).toBe(0);
    });
  });

  describe('exportAll', () => {
    it('exports all sessions and messages', async () => {
      const session = await sessionRepository.create({ title: 'Export Test' });

      await messageRepository.create(session.id, {
        role: 'user' as const,
        content: 'Test message',
      });

      const exported = await sessionRepository.exportAll();

      expect(exported.sessions).toHaveLength(1);
      expect(exported.sessions[0].title).toBe('Export Test');
      expect(exported.messages).toHaveLength(1);
    });
  });

  describe('importAll', () => {
    it('imports sessions and messages', async () => {
      const now = new Date();
      const data = {
        sessions: [
          {
            id: 'imported-1',
            title: 'Imported Session',
            provider: 'openai' as const,
            model: 'gpt-4o',
            mode: 'chat' as const,
            messageCount: 1,
            createdAt: now,
            updatedAt: now,
          },
        ],
        messages: [
          {
            id: 'imported-msg-1',
            sessionId: 'imported-1',
            role: 'user',
            content: 'Imported message',
            createdAt: now,
          },
        ],
      };

      await sessionRepository.importAll(data);

      const sessions = await sessionRepository.getAll();
      const messages = await db.messages.toArray();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].title).toBe('Imported Session');
      expect(messages).toHaveLength(1);
    });
  });

  describe('importWithValidation', () => {
    const createTestSession = (id: string, title: string) => ({
      id,
      title,
      provider: 'openai' as const,
      model: 'gpt-4o',
      mode: 'chat' as const,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('imports valid sessions successfully', async () => {
      const data = {
        sessions: [createTestSession('valid-1', 'Valid Session')],
        messages: [],
      };

      const result = await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'skip',
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const sessions = await sessionRepository.getAll();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].title).toBe('Valid Session');
    });

    it('skips conflicting sessions with skip strategy', async () => {
      await sessionRepository.create({ title: 'Existing Session' });
      const existingSession = (await sessionRepository.getAll())[0];

      const data = {
        sessions: [{ ...createTestSession(existingSession.id, 'Conflicting Session') }],
        messages: [],
      };

      const result = await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'skip',
      });

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);

      const sessions = await sessionRepository.getAll();
      expect(sessions[0].title).toBe('Existing Session');
    });

    it('replaces conflicting sessions with replace strategy', async () => {
      await sessionRepository.create({ title: 'Existing Session' });
      const existingSession = (await sessionRepository.getAll())[0];

      const data = {
        sessions: [{ ...createTestSession(existingSession.id, 'Replaced Session') }],
        messages: [],
      };

      const result = await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'replace',
      });

      expect(result.replaced).toBe(1);
      expect(result.imported).toBe(0);

      const sessions = await sessionRepository.getAll();
      expect(sessions[0].title).toBe('Replaced Session');
    });

    it('renames conflicting sessions with rename strategy', async () => {
      await sessionRepository.create({ title: 'Existing Session' });
      const existingSession = (await sessionRepository.getAll())[0];

      const data = {
        sessions: [{ ...createTestSession(existingSession.id, 'Conflicting Session') }],
        messages: [],
      };

      const result = await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'rename',
      });

      expect(result.imported).toBe(1);

      const sessions = await sessionRepository.getAll();
      expect(sessions).toHaveLength(2);
      const renamed = sessions.find((s) => s.id !== existingSession.id);
      expect(renamed?.title).toBe('Conflicting Session (imported)');
    });

    it('validates session data and reports errors', async () => {
      const data = {
        sessions: [
          { id: '', title: 'No ID', provider: 'openai', model: 'gpt-4o', mode: 'chat', messageCount: 0, createdAt: new Date(), updatedAt: new Date() } as never,
          { id: 'valid-id', title: '', provider: 'openai', model: 'gpt-4o', mode: 'chat', messageCount: 0, createdAt: new Date(), updatedAt: new Date() } as never,
          createTestSession('good-1', 'Good Session'),
        ],
        messages: [],
      };

      const result = await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'skip',
        validateData: true,
      });

      expect(result.errors).toHaveLength(2);
      expect(result.imported).toBe(1);
    });

    it('calls progress callback during import', async () => {
      const progressCalls: Array<{ current: number; total: number; phase: string }> = [];

      const data = {
        sessions: [
          createTestSession('progress-1', 'Session 1'),
          createTestSession('progress-2', 'Session 2'),
        ],
        messages: [
          { id: 'msg-1', sessionId: 'progress-1', role: 'user', content: 'Hello', createdAt: new Date() },
        ],
      };

      await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'skip',
        onProgress: (progress) => progressCalls.push({ ...progress }),
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      const lastProgress = progressCalls[progressCalls.length - 1];
      expect(lastProgress.phase).toBe('complete');
    });

    it('imports messages in batches', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: `batch-msg-${i}`,
        sessionId: 'batch-session',
        role: 'user',
        content: `Message ${i}`,
        createdAt: new Date(),
      }));

      const data = {
        sessions: [createTestSession('batch-session', 'Batch Test')],
        messages,
      };

      const result = await sessionRepository.importWithValidation(data, {
        conflictStrategy: 'skip',
      });

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);

      const dbMessages = await db.messages.toArray();
      expect(dbMessages).toHaveLength(5);
    });
  });
});
