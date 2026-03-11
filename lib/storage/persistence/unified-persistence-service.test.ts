import type { BackupPayloadV3 } from './types';

const mockInvokeWithTrace = jest.fn();
const mockSessionGetAll = jest.fn();
const mockProjectGetAll = jest.fn();
const mockProjectGetById = jest.fn();
const mockMessageGetBySessionId = jest.fn();
const mockMessageDeleteBySessionId = jest.fn();
let unifiedPersistenceService: typeof import('./unified-persistence-service').unifiedPersistenceService;
let __testOnly: typeof import('./unified-persistence-service').__testOnly;

type MockTable = {
  put: jest.Mock;
  bulkPut: jest.Mock;
  bulkDelete: jest.Mock;
  clear: jest.Mock;
  delete: jest.Mock;
  toArray: jest.Mock;
  toCollection: jest.Mock;
  where: jest.Mock;
  count: jest.Mock;
};

function createMockTable(): MockTable {
  return {
    put: jest.fn().mockResolvedValue(undefined),
    bulkPut: jest.fn().mockResolvedValue(undefined),
    bulkDelete: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    toArray: jest.fn().mockResolvedValue([]),
    toCollection: jest.fn().mockReturnValue({
      primaryKeys: jest.fn().mockResolvedValue([]),
    }),
    where: jest.fn().mockReturnValue({
      equals: jest.fn().mockReturnValue({
        delete: jest.fn().mockResolvedValue(undefined),
        primaryKeys: jest.fn().mockResolvedValue([]),
        toArray: jest.fn().mockResolvedValue([]),
      }),
    }),
    count: jest.fn().mockResolvedValue(0),
  };
}

const mockDb = {
  transaction: jest.fn(async (_mode: unknown, _tables: unknown, callback: () => Promise<void>) => callback()),
  sessions: createMockTable(),
  messages: createMockTable(),
  projects: createMockTable(),
  summaries: createMockTable(),
  knowledgeFiles: createMockTable(),
  documents: createMockTable(),
  workflows: createMockTable(),
  workflowExecutions: createMockTable(),
  agentTraces: createMockTable(),
  checkpoints: createMockTable(),
  contextFiles: createMockTable(),
  videoProjects: createMockTable(),
  assets: createMockTable(),
  folders: createMockTable(),
  mcpServers: createMockTable(),
};

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

jest.mock('@/lib/db/repositories/session-repository', () => ({
  sessionRepository: {
    getAll: (...args: unknown[]) => mockSessionGetAll(...args),
  },
  sessionToDbSession: (session: unknown) => session,
}));

jest.mock('@/lib/db/repositories/message-repository', () => ({
  toUIMessage: (message: unknown) => message,
  toDBMessage: (message: unknown) => message,
  messageRepository: {
    getBySessionId: (...args: unknown[]) => mockMessageGetBySessionId(...args),
    deleteBySessionId: (...args: unknown[]) => mockMessageDeleteBySessionId(...args),
  },
}));

jest.mock('@/lib/db/repositories/project-repository', () => ({
  projectRepository: {
    getAll: (...args: unknown[]) => mockProjectGetAll(...args),
    getById: (...args: unknown[]) => mockProjectGetById(...args),
  },
  toDbProject: (project: unknown) => project,
}));

jest.mock('@/lib/utils', () => ({
  isTauri: () => true,
}));

jest.mock('@/lib/native/invoke-with-trace', () => ({
  invokeWithTrace: (...args: unknown[]) => mockInvokeWithTrace(...args),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

jest.mock('./feature-flags', () => ({
  storageFeatureFlags: {
    chatPersistenceV3Enabled: true,
    desktopSqliteEnabled: true,
    encryptedBackupV3Enabled: true,
  },
}));

jest.mock('@/stores', () => ({
  useSettingsStore: {
    getState: () => ({
      setTheme: jest.fn(),
    }),
  },
  useArtifactStore: {
    getState: () => ({
      createArtifact: jest.fn(),
      artifacts: {},
      canvasDocuments: {},
    }),
  },
}));

describe('unifiedPersistenceService reliability', () => {
  beforeAll(() => {
    ({ unifiedPersistenceService, __testOnly } = require('./unified-persistence-service') as typeof import('./unified-persistence-service'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __testOnly.resetRuntimeStateForTest();
    mockSessionGetAll.mockResolvedValue([]);
    mockProjectGetAll.mockResolvedValue([]);
    mockProjectGetById.mockResolvedValue(null);
    mockMessageGetBySessionId.mockResolvedValue([]);
    mockMessageDeleteBySessionId.mockResolvedValue(undefined);
  });

  it('falls back to degraded mode when schema preflight mismatches', async () => {
    mockInvokeWithTrace.mockImplementation(async (command: string) => {
      if (command === 'chat_db_get_schema_info') {
        return {
          compatible: false,
          expectedSchemaVersion: 1,
          actualSchemaVersion: 99,
          reasonCode: 'schema-mismatch',
          reason: 'expected schema version 1, got 99',
        };
      }
      throw new Error(`unexpected command: ${command}`);
    });

    const sessions = await unifiedPersistenceService.sessions.list();
    const status = unifiedPersistenceService.getRuntimeStatus();

    expect(sessions).toEqual([]);
    expect(status.mode).toBe('degraded-dexie-fallback');
    expect(status.diagnostic?.code).toBe('schema-mismatch');
    expect(status.actualSchemaVersion).toBe(99);
  });

  it('merges mirrored records by updatedAt freshness', () => {
    const merged = __testOnly.mergeRecordsByFreshness(
      [{ id: 'session-1', updatedAt: '2024-01-01T00:00:00.000Z', source: 'dexie' }],
      [{ id: 'session-1', updatedAt: '2024-01-02T00:00:00.000Z', source: 'desktop' }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(
      expect.objectContaining({
        id: 'session-1',
        source: 'desktop',
      })
    );
  });

  it('rejects newer backup schema and reports incompatible segments with warnings', async () => {
    const emptyPayload: BackupPayloadV3 = {
      sessions: [],
      messages: [],
      projects: [],
      knowledgeFiles: [],
      summaries: [],
    };

    await expect(
      unifiedPersistenceService.backup.importPayload(emptyPayload, 'merge-rename', {
        schemaVersion: 999,
        backend: 'web-dexie',
        traceId: 'trace-unsupported',
      })
    ).rejects.toThrow('Backup schema version 999');

    const malformedPayload = {
      sessions: 'invalid-sessions',
      messages: [],
      projects: [],
      knowledgeFiles: [],
      summaries: [],
    } as unknown as BackupPayloadV3;

    const result = await unifiedPersistenceService.backup.importPayload(
      malformedPayload,
      'merge-rename',
      {
        schemaVersion: 3,
        backend: 'web-dexie',
        traceId: 'trace-incompatible-segment',
      }
    );

    expect(result.warningDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'incompatible-segment',
          id: 'sessions',
        }),
      ])
    );
    expect(result.integrity.rejectedSegments).toContain('sessions');
    expect(result.integrity.accepted).toBe(false);
  });
});
