jest.mock('./_generated/server', () => ({
  mutation: (config: unknown) => config,
  query: (config: unknown) => config,
  internalMutation: (config: unknown) => config,
}), { virtual: true });

jest.mock('convex/values', () => {
  const literal = (value: unknown) => ({ type: 'literal', value });
  return {
    v: {
      string: () => ({ type: 'string' }),
      number: () => ({ type: 'number' }),
      any: () => ({ type: 'any' }),
      optional: (value: unknown) => ({ type: 'optional', value }),
      array: (value: unknown) => ({ type: 'array', value }),
      object: (value: unknown) => ({ type: 'object', value }),
      union: (...values: unknown[]) => ({ type: 'union', values }),
      literal,
      null: () => ({ type: 'null' }),
      boolean: () => ({ type: 'boolean' }),
    },
  };
});

import {
  DEFAULT_EXPORT_LIMIT,
  MAX_EXPORT_LIMIT,
  MAX_IMPORT_RECORDS_PER_REQUEST,
  bulkImport,
  exportPage,
} from './sync';

type ExportPageHandler = (
  ctx: unknown,
  args: { table: string; cursor?: string; limit?: number }
) => Promise<{ isDone: boolean }>;

type BulkImportHandler = (
  ctx: unknown,
  args: Record<string, unknown>
) => Promise<{ imported: number; deleted?: number }>;

const exportPageHandler = (exportPage as { handler: ExportPageHandler }).handler;
const bulkImportHandler = (bulkImport as { handler: BulkImportHandler }).handler;

describe('convex/sync contract', () => {
  it('clamps export page limit to configured maximum', async () => {
    const paginate = jest.fn().mockResolvedValue({
      page: [],
      continueCursor: 'done',
      isDone: true,
    });
    const ctx = {
      db: {
        query: jest.fn(() => ({ paginate })),
      },
    };

    const result = await exportPageHandler(ctx, {
      table: 'sessions',
      limit: MAX_EXPORT_LIMIT + 100,
      cursor: undefined,
    });

    expect(paginate).toHaveBeenCalledWith(
      expect.objectContaining({
        numItems: MAX_EXPORT_LIMIT,
      })
    );
    expect(result.isDone).toBe(true);
  });

  it('uses default export limit when value is not provided', async () => {
    const paginate = jest.fn().mockResolvedValue({
      page: [],
      continueCursor: 'done',
      isDone: true,
    });
    const ctx = {
      db: {
        query: jest.fn(() => ({ paginate })),
      },
    };

    await exportPageHandler(ctx, {
      table: 'settings',
      cursor: undefined,
      limit: undefined,
    });

    expect(paginate).toHaveBeenCalledWith(
      expect.objectContaining({
        numItems: DEFAULT_EXPORT_LIMIT,
      })
    );
  });

  it('rejects oversized import requests to enforce bounded writes', async () => {
    const hugeRecords = Array.from({ length: MAX_IMPORT_RECORDS_PER_REQUEST + 1 }, (_, index) => ({
      localId: `msg-${index + 1}`,
    }));

    const ctx = {
      db: {
        query: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        insert: jest.fn(),
      },
    };

    await expect(
      bulkImportHandler(ctx, {
        deviceId: 'device-1',
        deviceName: 'Device',
        version: '1.1',
        checksum: 'abc',
        tables: {
          settings: undefined,
          sessions: undefined,
          messages: hugeRecords,
          artifacts: undefined,
          projects: undefined,
          documents: undefined,
          knowledgeFiles: undefined,
          workflows: undefined,
          workflowExecutions: undefined,
          summaries: undefined,
          folders: undefined,
          agentTraces: undefined,
          checkpoints: undefined,
          mcpServers: undefined,
          videoProjects: undefined,
          contextFiles: undefined,
          assets: undefined,
        },
        reconciliation: {
          mode: 'authoritative',
          replaceTables: ['messages'],
          syncRunId: 'run-1',
          chunkIndex: 0,
          chunkCount: 2,
        },
      })
    ).rejects.toThrow(`Max per request is ${MAX_IMPORT_RECORDS_PER_REQUEST}`);
  });

  it('applies authoritative replace contract before importing rows', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const patchMock = jest.fn().mockResolvedValue(undefined);
    const insertMock = jest.fn().mockResolvedValue(undefined);

    const queryMock = jest.fn((table: string) => {
      if (table === 'messages') {
        return {
          paginate: jest.fn().mockResolvedValue({
            page: [{ _id: 'old-row-id' }],
            continueCursor: 'done',
            isDone: true,
          }),
          withIndex: jest.fn(() => ({
            first: jest.fn().mockResolvedValue(null),
          })),
        };
      }

      if (table === 'syncMetadata') {
        return {
          withIndex: jest.fn(() => ({
            first: jest.fn().mockResolvedValue(null),
          })),
        };
      }

      return {
        withIndex: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(null),
        })),
      };
    });

    const ctx = {
      db: {
        query: queryMock,
        delete: deleteMock,
        patch: patchMock,
        insert: insertMock,
      },
    };

    const result = await bulkImportHandler(ctx, {
      deviceId: 'device-1',
      deviceName: 'Device',
      version: '1.1',
      checksum: 'abc',
      tables: {
        settings: undefined,
        sessions: undefined,
        messages: [{ localId: 'msg-1', content: 'hello' }],
        artifacts: undefined,
        projects: undefined,
        documents: undefined,
        knowledgeFiles: undefined,
        workflows: undefined,
        workflowExecutions: undefined,
        summaries: undefined,
        folders: undefined,
        agentTraces: undefined,
        checkpoints: undefined,
        mcpServers: undefined,
        videoProjects: undefined,
        contextFiles: undefined,
        assets: undefined,
      },
      reconciliation: {
        mode: 'authoritative',
        replaceTables: ['messages'],
        syncRunId: 'run-1',
        chunkIndex: 0,
        chunkCount: 1,
      },
    });

    expect(deleteMock).toHaveBeenCalledWith('old-row-id');
    expect(result.deleted).toBeGreaterThan(0);
    expect(result.imported).toBe(1);
    expect(patchMock).not.toHaveBeenCalled();
  });
});
