/**
 * @jest-environment jsdom
 */

import type { Session } from '@/types/core';
import { importConversations } from './import-registry';

const mockSetSessionState = jest.fn();
const mockListSessions = jest.fn<Promise<Session[]>, []>();
const mockBulkUpsertSessions = jest.fn();
const mockRemoveSession = jest.fn();
const mockListMessages = jest.fn();
const mockUpsertMessagesBatch = jest.fn();
const mockRemoveMessagesBySession = jest.fn();
const mockRemoveSummariesBySession = jest.fn();

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'fixed-import-id'),
}));

jest.mock('@/stores', () => ({
  useSessionStore: {
    setState: (...args: unknown[]) => mockSetSessionState(...args),
  },
}));

jest.mock('@/lib/storage/persistence/unified-persistence-service', () => ({
  unifiedPersistenceService: {
    sessions: {
      list: () => mockListSessions(),
      bulkUpsert: (...args: unknown[]) => mockBulkUpsertSessions(...args),
      remove: (...args: unknown[]) => mockRemoveSession(...args),
    },
    messages: {
      listAll: () => mockListMessages(),
      upsertBatch: (...args: unknown[]) => mockUpsertMessagesBatch(...args),
      removeBySession: (...args: unknown[]) => mockRemoveMessagesBySession(...args),
    },
    summaries: {
      removeBySession: (...args: unknown[]) => mockRemoveSummariesBySession(...args),
    },
  },
}));

const chatgptExport = JSON.stringify([
  {
    id: 'conv-1',
    title: 'Imported Chat',
    create_time: 1704067200,
    update_time: 1704067800,
    current_node: 'node-2',
    mapping: {
      'node-1': {
        id: 'node-1',
        message: null,
        parent: null,
        children: ['node-2'],
      },
      'node-2': {
        id: 'node-2',
        message: {
          id: 'msg-1',
          author: { role: 'user' },
          content: { content_type: 'text', parts: ['hello'] },
          create_time: 1704067200,
        },
        parent: 'node-1',
        children: [],
      },
    },
  },
]);

const existingSession: Session = {
  id: 'conv-1',
  title: 'Existing',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  provider: 'openai',
  model: 'gpt-4',
  mode: 'chat',
  messageCount: 1,
};

describe('importConversations (unified persistence)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListSessions.mockResolvedValue([]);
    mockListMessages.mockResolvedValue([]);
    mockBulkUpsertSessions.mockResolvedValue(undefined);
    mockUpsertMessagesBatch.mockResolvedValue(undefined);
    mockRemoveMessagesBySession.mockResolvedValue(undefined);
    mockRemoveSummariesBySession.mockResolvedValue(undefined);
    mockRemoveSession.mockResolvedValue(undefined);
  });

  it('renames sessions on merge conflict and upserts through unified service', async () => {
    mockListSessions.mockResolvedValue([existingSession]);

    const result = await importConversations(chatgptExport, {
      mergeStrategy: 'merge',
      generateNewIds: false,
      preserveTimestamps: true,
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      defaultMode: 'chat',
    });

    expect(result.success).toBe(true);
    expect(result.imported.sessions).toBe(1);
    expect(mockBulkUpsertSessions).toHaveBeenCalledTimes(1);

    const [persistedSessions] = mockBulkUpsertSessions.mock.calls[0] as [Session[]];
    expect(persistedSessions[0].id).toBe('conv-1-import-fixed-import-id');
    expect(persistedSessions[0].title).toBe('Imported Chat (imported)');

    const [persistedMessages] = mockUpsertMessagesBatch.mock.calls[0] as [
      Array<{ sessionId: string }>
    ];
    expect(persistedMessages[0].sessionId).toBe('conv-1-import-fixed-import-id');
  });

  it('skips existing session when strategy is skip', async () => {
    mockListSessions.mockResolvedValue([existingSession]);

    const result = await importConversations(chatgptExport, {
      mergeStrategy: 'skip',
      generateNewIds: false,
      preserveTimestamps: true,
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      defaultMode: 'chat',
    });

    expect(result.success).toBe(true);
    expect(result.imported.sessions).toBe(0);
    expect(result.warnings).toContain('Skipped existing session: Imported Chat');
    expect(mockBulkUpsertSessions).not.toHaveBeenCalled();
    expect(mockUpsertMessagesBatch).not.toHaveBeenCalled();
  });
});
