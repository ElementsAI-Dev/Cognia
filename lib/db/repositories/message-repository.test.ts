/**
 * Tests for Message Repository
 */

// Use fake-indexeddb for testing - must be imported before Dexie
import 'fake-indexeddb/auto';
import { messageRepository } from './message-repository';
import { db } from '../schema';
import type { UIMessage } from '@/types';

describe('messageRepository', () => {
  const testSessionId = 'test-session-1';

  beforeEach(async () => {
    // Clear tables and create a test session
    await db.messages.clear();
    await db.sessions.clear();

    await db.sessions.add({
      id: testSessionId,
      title: 'Test Session',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'chat',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a new message', async () => {
      const input = {
        role: 'user' as const,
        content: 'Hello, world!',
      };

      const message = await messageRepository.create(testSessionId, input);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.content).toBe('Hello, world!');
      expect(message.role).toBe('user');
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs', async () => {
      const message1 = await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'First',
      });

      const message2 = await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Second',
      });

      expect(message1.id).not.toBe(message2.id);
    });

    it('updates session message count', async () => {
      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Test message',
      });

      const session = await db.sessions.get(testSessionId);
      expect(session?.messageCount).toBe(1);
    });

    it('updates session lastMessagePreview', async () => {
      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'This is the message preview',
      });

      const session = await db.sessions.get(testSessionId);
      expect(session?.lastMessagePreview).toBe('This is the message preview');
    });

    it('handles message with all optional fields', async () => {
      const message = await messageRepository.create(testSessionId, {
        role: 'assistant' as const,
        content: 'Response',
        model: 'gpt-4o',
        provider: 'openai',
      });

      expect(message.model).toBe('gpt-4o');
      expect(message.provider).toBe('openai');
    });
  });

  describe('getById', () => {
    it('retrieves message by ID', async () => {
      const created = await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Test content',
      });

      const retrieved = await messageRepository.getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.content).toBe('Test content');
    });

    it('returns undefined for non-existent ID', async () => {
      const result = await messageRepository.getById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getBySessionId', () => {
    it('retrieves all messages for session', async () => {
      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'First message',
      });

      await messageRepository.create(testSessionId, {
        role: 'assistant' as const,
        content: 'Second message',
      });

      const messages = await messageRepository.getBySessionId(testSessionId);

      expect(messages).toHaveLength(2);
    });

    it('returns messages in chronological order', async () => {
      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'First',
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await messageRepository.create(testSessionId, {
        role: 'assistant' as const,
        content: 'Second',
      });

      const messages = await messageRepository.getBySessionId(testSessionId);

      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });

    it('returns empty array for session with no messages', async () => {
      const messages = await messageRepository.getBySessionId('empty-session');
      expect(messages).toEqual([]);
    });

    it('only returns messages for specified session', async () => {
      const otherSessionId = 'other-session';
      await db.sessions.add({
        id: otherSessionId,
        title: 'Other Session',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Test session message',
      });

      await messageRepository.create(otherSessionId, {
        role: 'user' as const,
        content: 'Other session message',
      });

      const messages = await messageRepository.getBySessionId(testSessionId);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Test session message');
    });
  });

  describe('update', () => {
    it('updates message content', async () => {
      const created = await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Original content',
      });

      await messageRepository.update(created.id, { content: 'Updated content' });

      const updated = await messageRepository.getById(created.id);
      expect(updated?.content).toBe('Updated content');
    });

    it('updates message error field', async () => {
      const created = await messageRepository.create(testSessionId, {
        role: 'assistant' as const,
        content: '',
      });

      await messageRepository.update(created.id, { error: 'API Error' });

      const updated = await messageRepository.getById(created.id);
      expect(updated?.error).toBe('API Error');
    });

    it('does nothing for non-existent message', async () => {
      await expect(
        messageRepository.update('non-existent', { content: 'Updated' })
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('deletes message', async () => {
      const created = await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'To delete',
      });

      await messageRepository.delete(created.id);

      const deleted = await messageRepository.getById(created.id);
      expect(deleted).toBeUndefined();
    });

    it('decrements session message count', async () => {
      const message = await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Test',
      });

      let session = await db.sessions.get(testSessionId);
      expect(session?.messageCount).toBe(1);

      await messageRepository.delete(message.id);

      session = await db.sessions.get(testSessionId);
      expect(session?.messageCount).toBe(0);
    });

    it('does nothing for non-existent message', async () => {
      await expect(messageRepository.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('deleteBySessionId', () => {
    it('deletes all messages for session', async () => {
      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Message 1',
      });

      await messageRepository.create(testSessionId, {
        role: 'assistant' as const,
        content: 'Message 2',
      });

      await messageRepository.deleteBySessionId(testSessionId);

      const messages = await messageRepository.getBySessionId(testSessionId);
      expect(messages).toHaveLength(0);
    });

    it('does not affect other sessions', async () => {
      const otherSessionId = 'other-session-2';
      await db.sessions.add({
        id: otherSessionId,
        title: 'Other',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'Test message',
      });

      await messageRepository.create(otherSessionId, {
        role: 'user' as const,
        content: 'Other message',
      });

      await messageRepository.deleteBySessionId(testSessionId);

      const otherMessages = await messageRepository.getBySessionId(otherSessionId);
      expect(otherMessages).toHaveLength(1);
    });
  });

  describe('bulkCreate', () => {
    it('creates multiple messages', async () => {
      const messages = [
        {
          id: 'bulk-1',
          role: 'user' as const,
          content: 'Message 1',
          createdAt: new Date(),
        },
        {
          id: 'bulk-2',
          role: 'assistant' as const,
          content: 'Message 2',
          createdAt: new Date(),
        },
      ] as UIMessage[];

      await messageRepository.bulkCreate(testSessionId, messages);

      const retrieved = await messageRepository.getBySessionId(testSessionId);
      expect(retrieved).toHaveLength(2);
    });

    it('updates session message count', async () => {
      const messages = [
        {
          id: 'bulk-3',
          role: 'user' as const,
          content: 'M1',
          createdAt: new Date(),
        },
        {
          id: 'bulk-4',
          role: 'assistant' as const,
          content: 'M2',
          createdAt: new Date(),
        },
        {
          id: 'bulk-5',
          role: 'user' as const,
          content: 'M3',
          createdAt: new Date(),
        },
      ] as UIMessage[];

      await messageRepository.bulkCreate(testSessionId, messages);

      const session = await db.sessions.get(testSessionId);
      expect(session?.messageCount).toBe(3);
    });

    it('sets lastMessagePreview to last message', async () => {
      const messages = [
        {
          id: 'bulk-6',
          role: 'user' as const,
          content: 'First message',
          createdAt: new Date(),
        },
        {
          id: 'bulk-7',
          role: 'assistant' as const,
          content: 'Last message preview',
          createdAt: new Date(),
        },
      ] as UIMessage[];

      await messageRepository.bulkCreate(testSessionId, messages);

      const session = await db.sessions.get(testSessionId);
      expect(session?.lastMessagePreview).toBe('Last message preview');
    });
  });

  describe('getCountBySessionId', () => {
    it('returns correct count', async () => {
      await messageRepository.create(testSessionId, {
        role: 'user' as const,
        content: 'M1',
      });

      await messageRepository.create(testSessionId, {
        role: 'assistant' as const,
        content: 'M2',
      });

      const count = await messageRepository.getCountBySessionId(testSessionId);
      expect(count).toBe(2);
    });

    it('returns 0 for empty session', async () => {
      const count = await messageRepository.getCountBySessionId('empty-session');
      expect(count).toBe(0);
    });
  });
});
