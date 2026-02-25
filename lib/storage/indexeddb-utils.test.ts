/**
 * @jest-environment jsdom
 */

import { cleanupOrphanedRecords } from './indexeddb-utils';

// Parent tables: toCollection().primaryKeys() returns string[]
const mockSessionIds = jest.fn<Promise<string[]>, []>().mockResolvedValue([]);
const mockProjectIds = jest.fn<Promise<string[]>, []>().mockResolvedValue([]);
const mockWorkflowIds = jest.fn<Promise<string[]>, []>().mockResolvedValue([]);

// Child tables: .each(callback) iterates over data, .bulkDelete() removes
const mockMessagesData: Array<{ id: string; sessionId: string }> = [];
const mockKnowledgeFilesData: Array<{ id: string; projectId: string }> = [];
const mockWorkflowExecutionsData: Array<{ id: string; workflowId: string }> = [];
const mockSummariesData: Array<{ id: string; sessionId: string }> = [];
const mockAgentTracesData: Array<{ id: string; sessionId?: string }> = [];
const mockDocumentsData: Array<{ id: string; projectId?: string }> = [];

const mockBulkDeleteMessages = jest.fn().mockResolvedValue(undefined);
const mockBulkDeleteKnowledgeFiles = jest.fn().mockResolvedValue(undefined);
const mockBulkDeleteWorkflowExecutions = jest.fn().mockResolvedValue(undefined);
const mockBulkDeleteSummaries = jest.fn().mockResolvedValue(undefined);
const mockBulkDeleteAgentTraces = jest.fn().mockResolvedValue(undefined);
const mockBulkDeleteDocuments = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/db', () => ({
  db: {
    sessions: { toCollection: () => ({ primaryKeys: () => mockSessionIds() }) },
    projects: { toCollection: () => ({ primaryKeys: () => mockProjectIds() }) },
    workflows: { toCollection: () => ({ primaryKeys: () => mockWorkflowIds() }) },
    messages: {
      each: async (cb: (item: unknown) => void) => { mockMessagesData.forEach(cb); },
      bulkDelete: (...args: unknown[]) => mockBulkDeleteMessages(...args),
    },
    knowledgeFiles: {
      each: async (cb: (item: unknown) => void) => { mockKnowledgeFilesData.forEach(cb); },
      bulkDelete: (...args: unknown[]) => mockBulkDeleteKnowledgeFiles(...args),
    },
    workflowExecutions: {
      each: async (cb: (item: unknown) => void) => { mockWorkflowExecutionsData.forEach(cb); },
      bulkDelete: (...args: unknown[]) => mockBulkDeleteWorkflowExecutions(...args),
    },
    summaries: {
      each: async (cb: (item: unknown) => void) => { mockSummariesData.forEach(cb); },
      bulkDelete: (...args: unknown[]) => mockBulkDeleteSummaries(...args),
    },
    agentTraces: {
      each: async (cb: (item: unknown) => void) => { mockAgentTracesData.forEach(cb); },
      bulkDelete: (...args: unknown[]) => mockBulkDeleteAgentTraces(...args),
    },
    documents: {
      each: async (cb: (item: unknown) => void) => { mockDocumentsData.forEach(cb); },
      bulkDelete: (...args: unknown[]) => mockBulkDeleteDocuments(...args),
    },
  },
}));

// Helper to clear mutable data arrays
function clearData() {
  mockMessagesData.length = 0;
  mockKnowledgeFilesData.length = 0;
  mockWorkflowExecutionsData.length = 0;
  mockSummariesData.length = 0;
  mockAgentTracesData.length = 0;
  mockDocumentsData.length = 0;
}

describe('cleanupOrphanedRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionIds.mockResolvedValue([]);
    mockProjectIds.mockResolvedValue([]);
    mockWorkflowIds.mockResolvedValue([]);
    clearData();
  });

  it('returns 0 when no orphaned records exist', async () => {
    mockSessionIds.mockResolvedValue(['s1']);
    mockMessagesData.push({ id: 'm1', sessionId: 's1' });

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(0);
    expect(mockBulkDeleteMessages).not.toHaveBeenCalled();
  });

  it('deletes orphaned messages (sessionId not in sessions)', async () => {
    mockSessionIds.mockResolvedValue(['s1']);
    mockMessagesData.push(
      { id: 'm1', sessionId: 's1' },
      { id: 'm2', sessionId: 'deleted-session' },
      { id: 'm3', sessionId: 'another-deleted' },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(2);
    expect(mockBulkDeleteMessages).toHaveBeenCalledWith(['m2', 'm3']);
  });

  it('does not delete valid messages', async () => {
    mockSessionIds.mockResolvedValue(['s1', 's2']);
    mockMessagesData.push(
      { id: 'm1', sessionId: 's1' },
      { id: 'm2', sessionId: 's2' },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(0);
    expect(mockBulkDeleteMessages).not.toHaveBeenCalled();
  });

  it('deletes orphaned knowledge files (projectId not in projects)', async () => {
    mockProjectIds.mockResolvedValue(['p1']);
    mockKnowledgeFilesData.push(
      { id: 'kf1', projectId: 'p1' },
      { id: 'kf2', projectId: 'deleted-project' },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(1);
    expect(mockBulkDeleteKnowledgeFiles).toHaveBeenCalledWith(['kf2']);
  });

  it('deletes orphaned workflow executions', async () => {
    mockWorkflowIds.mockResolvedValue(['w1']);
    mockWorkflowExecutionsData.push(
      { id: 'we1', workflowId: 'w1' },
      { id: 'we2', workflowId: 'deleted-workflow' },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(1);
    expect(mockBulkDeleteWorkflowExecutions).toHaveBeenCalledWith(['we2']);
  });

  it('deletes orphaned summaries (sessionId not in sessions)', async () => {
    mockSessionIds.mockResolvedValue(['s1']);
    mockSummariesData.push(
      { id: 'sum1', sessionId: 's1' },
      { id: 'sum2', sessionId: 'gone-session' },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(1);
    expect(mockBulkDeleteSummaries).toHaveBeenCalledWith(['sum2']);
  });

  it('deletes orphaned agent traces with sessionId set', async () => {
    mockSessionIds.mockResolvedValue(['s1']);
    mockAgentTracesData.push(
      { id: 't1', sessionId: 's1' },
      { id: 't2', sessionId: 'gone-session' },
      { id: 't3', sessionId: undefined },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(1);
    expect(mockBulkDeleteAgentTraces).toHaveBeenCalledWith(['t2']);
  });

  it('deletes orphaned documents with projectId set', async () => {
    mockProjectIds.mockResolvedValue(['p1']);
    mockDocumentsData.push(
      { id: 'd1', projectId: 'p1' },
      { id: 'd2', projectId: 'gone-project' },
      { id: 'd3', projectId: undefined },
    );

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(1);
    expect(mockBulkDeleteDocuments).toHaveBeenCalledWith(['d2']);
  });

  it('does not delete when dryRun=true', async () => {
    mockMessagesData.push({ id: 'm1', sessionId: 'gone' });
    mockKnowledgeFilesData.push({ id: 'kf1', projectId: 'gone' });

    const result = await cleanupOrphanedRecords(true);
    expect(result).toBe(0);
    expect(mockBulkDeleteMessages).not.toHaveBeenCalled();
    expect(mockBulkDeleteKnowledgeFiles).not.toHaveBeenCalled();
  });

  it('handles all orphan types simultaneously', async () => {
    mockSessionIds.mockResolvedValue(['s1']);
    mockProjectIds.mockResolvedValue(['p1']);
    mockWorkflowIds.mockResolvedValue(['w1']);
    mockMessagesData.push({ id: 'm1', sessionId: 'gone' });
    mockKnowledgeFilesData.push({ id: 'kf1', projectId: 'gone' });
    mockWorkflowExecutionsData.push({ id: 'we1', workflowId: 'gone' });
    mockSummariesData.push({ id: 'sum1', sessionId: 'gone' });
    mockAgentTracesData.push({ id: 't1', sessionId: 'gone' });
    mockDocumentsData.push({ id: 'd1', projectId: 'gone' });

    const result = await cleanupOrphanedRecords();
    expect(result).toBe(6);
  });

  it('returns 0 when all tables are empty', async () => {
    const result = await cleanupOrphanedRecords();
    expect(result).toBe(0);
  });
});
