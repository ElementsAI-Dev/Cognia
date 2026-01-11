/**
 * Tests for History Handler - Chat history persistence for summarization recovery
 */

import {
  writeHistoryFile,
  createSummaryWithHistoryRef,
  getSessionHistoryFiles,
  searchHistory,
  readHistoryFile,
  formatHistoryRefForPrompt,
  shouldSummarize,
  chunkHistory,
  type HistoryMessage,
  type WriteHistoryOptions,
  type CreateSummaryOptions,
} from './history-handler';
import {
  writeContextFile,
  grepContextFiles,
  searchContextFiles,
} from './context-fs';
import type { HistoryReference } from '@/types/system/context';

// Mock context-fs
jest.mock('./context-fs', () => ({
  writeContextFile: jest.fn(),
  readContextFile: jest.fn(),
  grepContextFiles: jest.fn(),
  searchContextFiles: jest.fn(),
  estimateTokens: jest.fn((text: string) => Math.ceil(text.length / 4)),
  CONTEXT_CONSTANTS: {
    BASE_DIR: 'context',
    DEFAULT_TOKEN_LIMIT: 2000,
  },
}));

const mockWriteContextFile = writeContextFile as jest.MockedFunction<typeof writeContextFile>;
const mockGrepContextFiles = grepContextFiles as jest.MockedFunction<typeof grepContextFiles>;
const mockSearchContextFiles = searchContextFiles as jest.MockedFunction<typeof searchContextFiles>;

describe('history-handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockMessages = (count: number): HistoryMessage[] => {
    return Array.from({ length: count }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant' as const,
      content: `Message ${i + 1} content`,
      timestamp: new Date(`2024-01-15T10:${String(i).padStart(2, '0')}:00Z`),
    }));
  };

  describe('writeHistoryFile', () => {
    it('should write history file with serialized messages', async () => {
      mockWriteContextFile.mockResolvedValue({
        path: 'context/history/session_test-session.txt',
        content: 'serialized content',
      } as never);

      const options: WriteHistoryOptions = {
        sessionId: 'test-session',
        messages: createMockMessages(3),
      };

      const result = await writeHistoryFile(options);

      expect(result).toBeDefined();
      expect(mockWriteContextFile).toHaveBeenCalled();
    });

    it('should write chunked history file', async () => {
      mockWriteContextFile.mockResolvedValue({
        path: 'context/history/session_test_chunk_0.txt',
        content: '',
      } as never);

      const options: WriteHistoryOptions = {
        sessionId: 'test-session',
        messages: createMockMessages(2),
        isChunk: true,
        chunkIndex: 0,
      };

      const result = await writeHistoryFile(options);

      expect(result).toBeDefined();
    });

    it('should include custom tags', async () => {
      mockWriteContextFile.mockResolvedValue({
        path: 'context/history/session_tagged.txt',
        content: '',
      } as never);

      const options: WriteHistoryOptions = {
        sessionId: 'tagged',
        messages: createMockMessages(2),
        tags: ['important', 'summarized'],
      };

      await writeHistoryFile(options);

      expect(mockWriteContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.arrayContaining(['important', 'summarized']),
        })
      );
    });
  });

  describe('createSummaryWithHistoryRef', () => {
    it('should create summary with history reference', async () => {
      mockWriteContextFile.mockResolvedValue({
        path: 'context/history/session_summary.txt',
        content: 'Summary content',
      } as never);

      const options: CreateSummaryOptions = {
        sessionId: 'summary-session',
        messages: createMockMessages(10),
        summaryText: 'User discussed topic X.',
        messageRange: { startIndex: 0, endIndex: 9 },
      };

      const result = await createSummaryWithHistoryRef(options);

      expect(result).toBeDefined();
      expect(result.reference).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.history).toBeDefined();
    });
  });

  describe('getSessionHistoryFiles', () => {
    it('should retrieve history files for session', async () => {
      mockSearchContextFiles.mockResolvedValue([
        {
          id: 'h1',
          category: 'history',
          source: 'session-123',
          sizeBytes: 500,
          estimatedTokens: 125,
          createdAt: new Date(),
          accessedAt: new Date(),
          tags: [],
        },
      ]);

      const result = await getSessionHistoryFiles('session-123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for non-existent session', async () => {
      mockSearchContextFiles.mockResolvedValue([]);

      const result = await getSessionHistoryFiles('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('searchHistory', () => {
    it('should search history with pattern', async () => {
      mockGrepContextFiles.mockResolvedValue([
        { path: 'session_1.txt', lineNumber: 10, content: 'learning content' },
        { path: 'session_2.txt', lineNumber: 5, content: 'learning algorithms' },
      ]);

      const result = await searchHistory('session-1', 'learning');

      expect(result).toHaveLength(2);
      expect(mockGrepContextFiles).toHaveBeenCalled();
    });
  });

  describe('readHistoryFile', () => {
    it('should read history file content', async () => {
      const { readContextFile } = jest.requireMock('./context-fs');
      readContextFile.mockResolvedValue({
        content: 'History content here',
      });

      const result = await readHistoryFile('context/history/session.txt');

      expect(result).toBeDefined();
    });

    it('should return null for non-existent file', async () => {
      const { readContextFile } = jest.requireMock('./context-fs');
      readContextFile.mockResolvedValue(null);

      const result = await readHistoryFile('non-existent.txt');

      expect(result).toBeNull();
    });
  });

  describe('formatHistoryRefForPrompt', () => {
    it('should format history reference for prompt injection', () => {
      const ref: HistoryReference = {
        sessionId: 'test-session',
        historyPath: 'context/history/session_test.txt',
        summaryPath: 'context/history/session_test_summary.txt',
        messageRange: {
          startIndex: 0,
          endIndex: 10,
          startTimestamp: new Date('2024-01-15T10:00:00Z'),
          endTimestamp: new Date('2024-01-15T11:00:00Z'),
        },
        estimatedTokens: 500,
      };

      const result = formatHistoryRefForPrompt(ref);

      expect(result).toContain('Full conversation history preserved');
      expect(result).toContain('session_test.txt');
      expect(result).toContain('Messages 1-11');
    });
  });

  describe('shouldSummarize', () => {
    it('should return true when messages exceed threshold', () => {
      const longMessages: HistoryMessage[] = Array.from({ length: 100 }, () => ({
        role: 'user' as const,
        content: 'A'.repeat(2000), // Large content
        timestamp: new Date(),
      }));

      const result = shouldSummarize(longMessages, 1000);

      expect(result).toBe(true);
    });

    it('should return false when messages are under threshold', () => {
      const shortMessages: HistoryMessage[] = [
        { role: 'user', content: 'Hi', timestamp: new Date() },
        { role: 'assistant', content: 'Hello!', timestamp: new Date() },
      ];

      const result = shouldSummarize(shortMessages, 100000);

      expect(result).toBe(false);
    });
  });

  describe('chunkHistory', () => {
    it('should split messages into chunks', () => {
      const messages: HistoryMessage[] = Array.from({ length: 20 }, () => ({
        role: 'user' as const,
        content: 'A'.repeat(4000), // ~1000 tokens each
        timestamp: new Date(),
      }));

      const chunks = chunkHistory(messages, 5000);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every(c => c.length > 0)).toBe(true);
    });

    it('should return single chunk for small history', () => {
      const messages: HistoryMessage[] = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      ];

      const chunks = chunkHistory(messages, 50000);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(2);
    });
  });
});
