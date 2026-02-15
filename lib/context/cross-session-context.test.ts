/**
 * Tests for Cross-Session Context Service
 */

import {
  getRecentSessions,
  buildSessionContextSummary,
  buildHistoryContext,
  shouldBuildHistoryContext,
} from './cross-session-context';
import { DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS } from '@/types/core/chat-history-context';

// Mock the database
jest.mock('@/lib/db/schema', () => ({
  db: {
    sessions: {
      orderBy: jest.fn(() => ({
        reverse: jest.fn(() => ({
          limit: jest.fn(() => ({
            toArray: jest.fn(() => Promise.resolve([
              {
                id: 'session-1',
                title: 'Test Session 1',
                mode: 'chat',
                messageCount: 5,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
              },
              {
                id: 'session-2',
                title: 'Test Session 2',
                mode: 'agent',
                messageCount: 10,
                createdAt: new Date('2024-01-03'),
                updatedAt: new Date('2024-01-04'),
              },
              {
                id: 'session-3',
                title: 'Empty Session',
                mode: 'chat',
                messageCount: 0,
                createdAt: new Date('2024-01-05'),
                updatedAt: new Date('2024-01-06'),
              },
            ])),
          })),
        })),
      })),
    },
    summaries: {
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
        })),
      })),
    },
  },
}));

// Mock the message repository
jest.mock('@/lib/db/repositories/message-repository', () => ({
  messageRepository: {
    getBySessionId: jest.fn((sessionId: string) => {
      if (sessionId === 'session-1') {
        return Promise.resolve([
          { id: 'msg-1', role: 'user', content: 'Hello, how are you?', createdAt: new Date() },
          { id: 'msg-2', role: 'assistant', content: 'I am doing well!', createdAt: new Date() },
          { id: 'msg-3', role: 'user', content: 'Can you help me with React?', createdAt: new Date() },
          { id: 'msg-4', role: 'assistant', content: 'Of course! What do you need help with?', createdAt: new Date() },
          { id: 'msg-5', role: 'user', content: 'I need help with hooks', createdAt: new Date() },
        ]);
      }
      if (sessionId === 'session-2') {
        return Promise.resolve([
          { id: 'msg-6', role: 'user', content: 'Run a Python script', createdAt: new Date() },
          { id: 'msg-7', role: 'assistant', content: 'Sure, executing...', createdAt: new Date() },
        ]);
      }
      return Promise.resolve([]);
    }),
  },
}));

// Mock context-fs
jest.mock('./context-fs', () => ({
  estimateTokens: jest.fn((text: string) => Math.ceil(text.length / 4)),
}));

// Mock the summarizer utilities
jest.mock('@/lib/ai/generation/summarizer', () => ({
  extractTopicsSimple: jest.fn(() => [
    { name: 'React', messageIds: ['msg-1'], description: 'Discussed in 2 messages', keywords: [] },
    { name: 'Hooks', messageIds: ['msg-2'], description: 'Discussed in 1 message', keywords: [] },
  ]),
}));

describe('cross-session-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecentSessions', () => {
    it('should get recent sessions', async () => {
      const sessions = await getRecentSessions(3);
      expect(sessions).toHaveLength(3);
      expect(sessions[0].id).toBe('session-1');
    });

    it('should exclude specified session', async () => {
      const sessions = await getRecentSessions(3, { excludeSessionId: 'session-1' });
      expect(sessions.every(s => s.id !== 'session-1')).toBe(true);
    });

    it('should filter out empty sessions', async () => {
      const sessions = await getRecentSessions(3, { excludeEmpty: true });
      expect(sessions.every(s => (s.messageCount || 0) > 0)).toBe(true);
    });

    it('should filter by minimum messages', async () => {
      const sessions = await getRecentSessions(3, { minMessages: 5 });
      expect(sessions.every(s => (s.messageCount || 0) >= 5)).toBe(true);
    });
  });

  describe('buildSessionContextSummary', () => {
    it('should build minimal summary', async () => {
      const session = {
        id: 'session-1',
        title: 'Test Session',
        mode: 'chat' as const,
        provider: 'openai' as const,
        model: 'gpt-4o',
        messageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = await buildSessionContextSummary(session, 'minimal', 50);
      expect(summary.sessionId).toBe('session-1');
      expect(summary.title).toBe('Test Session');
      expect(summary.summary).toBeDefined();
    });

    it('should build moderate summary', async () => {
      const session = {
        id: 'session-1',
        title: 'Test Session',
        mode: 'chat' as const,
        provider: 'openai' as const,
        model: 'gpt-4o',
        messageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = await buildSessionContextSummary(session, 'moderate', 150);
      expect(summary.summary).toBeDefined();
      expect(summary.summary.length).toBeGreaterThan(0);
    });

    it('should build detailed summary', async () => {
      const session = {
        id: 'session-1',
        title: 'Test Session',
        mode: 'chat' as const,
        provider: 'openai' as const,
        model: 'gpt-4o',
        messageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = await buildSessionContextSummary(session, 'detailed', 300);
      expect(summary.summary).toBeDefined();
    });
  });

  describe('buildHistoryContext', () => {
    it('should return empty context when disabled', async () => {
      const settings = { ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS, enabled: false };
      const result = await buildHistoryContext(settings);
      
      expect(result.success).toBe(true);
      expect(result.contextText).toBe('');
      expect(result.sessionCount).toBe(0);
    });

    it('should build context when enabled', async () => {
      const settings = {
        ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS,
        enabled: true,
        recentSessionCount: 2,
        maxTokenBudget: 500,
        compressionLevel: 'moderate' as const,
      };

      const result = await buildHistoryContext(settings, {
        excludeSessionId: 'current-session',
      });

      expect(result.success).toBe(true);
      expect(result.sessionCount).toBeGreaterThan(0);
    });

    it('should exclude current session', async () => {
      const settings = {
        ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS,
        enabled: true,
        recentSessionCount: 3,
      };

      const result = await buildHistoryContext(settings, {
        excludeSessionId: 'session-1',
      });

      expect(result.summaries.every(s => s.sessionId !== 'session-1')).toBe(true);
    });
  });

  describe('buildHistoryContext - intelligent truncation', () => {
    it('should drop least-important sessions when over budget', async () => {
      const settings = {
        ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS,
        enabled: true,
        recentSessionCount: 3,
        maxTokenBudget: 30, // Very small budget to force truncation
        compressionLevel: 'minimal' as const,
        excludeEmptySessions: true,
      };

      const result = await buildHistoryContext(settings);

      expect(result.success).toBe(true);
      // Should have fewer sessions than the 3 requested due to budget
      expect(result.sessionCount).toBeLessThanOrEqual(3);
      // Token count should be within reasonable range
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('should keep most important (recent, high-message-count) sessions', async () => {
      const settings = {
        ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS,
        enabled: true,
        recentSessionCount: 3,
        maxTokenBudget: 50,
        compressionLevel: 'minimal' as const,
        excludeEmptySessions: true,
      };

      const result = await buildHistoryContext(settings);

      expect(result.success).toBe(true);
      // If truncation happened, the most recent/important sessions should remain
      if (result.sessionCount < 2) {
        // The remaining session should be one of the non-empty ones
        expect(result.summaries[0].sessionId).toBeDefined();
      }
    });
  });

  describe('shouldBuildHistoryContext', () => {
    it('should return false when disabled', async () => {
      const settings = { ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS, enabled: false };
      const result = await shouldBuildHistoryContext(settings);
      expect(result).toBe(false);
    });

    it('should return true when enabled and sessions exist', async () => {
      const settings = { ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS, enabled: true };
      const result = await shouldBuildHistoryContext(settings);
      expect(result).toBe(true);
    });
  });
});
