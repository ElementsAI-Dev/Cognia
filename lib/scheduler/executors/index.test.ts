import type { ScheduledTask, TaskExecution } from '@/types/scheduler';
import { loggers } from '@/lib/logger';
import {
  executeBackupTask,
  executeWorkflowTask,
  executeAIGenerationTask,
  executeChatTask,
  executeTestTask,
} from './index';

const mockRegisterTaskExecutor = jest.fn();
const mockExecutePluginTask = jest.fn();
const mockExecuteScript = jest.fn();
const mockRun = jest.fn();
const mockPersistExecution = jest.fn();
const mockGetById = jest.fn();
const mockDefinitionToVisual = jest.fn();
const mockCreateFullBackup = jest.fn();
const mockExportToJSON = jest.fn();
const mockRunBackupUploadForProvider = jest.fn();
const mockHasStoredCredentials = jest.fn();

jest.mock('../task-scheduler', () => ({
  registerTaskExecutor: (...args: unknown[]) => mockRegisterTaskExecutor(...args),
}));

jest.mock('./plugin-executor', () => ({
  executePluginTask: (...args: unknown[]) => mockExecutePluginTask(...args),
}));

jest.mock('../script-executor', () => ({
  executeScript: (...args: unknown[]) => mockExecuteScript(...args),
}));

jest.mock('@/lib/workflow-editor/orchestrator', () => ({
  workflowOrchestrator: {
    run: (...args: unknown[]) => mockRun(...args),
    persistExecution: (...args: unknown[]) => mockPersistExecution(...args),
  },
}));

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

jest.mock('@/lib/workflow-editor/converter', () => ({
  definitionToVisual: (...args: unknown[]) => mockDefinitionToVisual(...args),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

const mockSyncStoreState = {
  webdavConfig: { enabled: true },
  githubConfig: { enabled: true },
  googleDriveConfig: { enabled: true },
};

jest.mock('@/lib/storage/data-export', () => ({
  createFullBackup: (...args: unknown[]) => mockCreateFullBackup(...args),
  exportToJSON: (...args: unknown[]) => mockExportToJSON(...args),
}));

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => false),
}));

jest.mock('@/lib/storage/persistence/feature-flags', () => ({
  storageFeatureFlags: {
    encryptedBackupV3Enabled: false,
  },
}));

jest.mock('@/lib/sync', () => ({
  getSyncManager: () => ({
    runBackupUploadForProvider: (...args: unknown[]) => mockRunBackupUploadForProvider(...args),
  }),
}));

jest.mock('@/lib/sync/credential-storage', () => ({
  hasStoredCredentials: (...args: unknown[]) => mockHasStoredCredentials(...args),
}));

jest.mock('@/stores/sync', () => ({
  useSyncStore: {
    getState: () => mockSyncStoreState,
  },
}));

// Mocks for new executors
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

const mockGetProxyProviderModel = jest.fn().mockReturnValue('mock-model-instance');
jest.mock('@/lib/ai/core/proxy-client', () => ({
  getProxyProviderModel: (...args: unknown[]) => mockGetProxyProviderModel(...args),
}));

const mockSettingsState = {
  defaultProvider: 'openai',
  providerSettings: {
    openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com', defaultModel: 'gpt-4o' },
  },
};
jest.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: () => mockSettingsState,
  },
}));

const mockAppendMessage = jest.fn();
jest.mock('@/stores/chat', () => ({
  useChatStore: {
    getState: () => ({
      appendMessage: mockAppendMessage,
    }),
  },
  useSessionStore: {
    getState: () => ({
      createSession: jest.fn().mockReturnValue({ id: 'new-session-1' }),
      setActiveSession: jest.fn(),
    }),
  },
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-123',
}));

const mockSchedulerDbTasks = { count: jest.fn().mockResolvedValue(5) };
jest.mock('../scheduler-db', () => ({
  schedulerDb: {
    tasks: mockSchedulerDbTasks,
  },
}));

function createTask(payload: Record<string, unknown>): ScheduledTask {
  return {
    id: 'task-1',
    name: 'Workflow Task',
    type: 'workflow',
    trigger: { type: 'interval', intervalMs: 60000 },
    payload,
    config: {
      timeout: 300000,
      maxRetries: 3,
      retryDelay: 1000,
      runMissedOnStartup: false,
      allowConcurrent: false,
    },
    notification: {
      onStart: false,
      onComplete: false,
      onError: true,
    },
    status: 'active',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

function createExecution(): TaskExecution {
  return {
    id: 'exec-1',
    taskId: 'task-1',
    taskName: 'Workflow Task',
    taskType: 'workflow',
    status: 'running',
    retryAttempt: 0,
    startedAt: new Date('2025-01-01T00:00:00.000Z'),
    logs: [],
  };
}

function createVisualWorkflow(id: string) {
  return {
    id,
    name: `Workflow ${id}`,
    settings: {},
    nodes: [],
    edges: [],
  } as unknown;
}

function createRuntimeResult(overrides?: Partial<Record<string, unknown>>) {
  return {
    executionId: 'wf-exec-1',
    workflowId: 'wf-1',
    runtime: 'browser',
    status: 'completed',
    input: { foo: 'bar' },
    output: { ok: true },
    nodeStates: {
      node1: { status: 'completed' },
      node2: { status: 'failed' },
    },
    triggerId: 'trigger-1',
    ...overrides,
  };
}

describe('executeWorkflowTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads workflow by workflowId and runs through orchestrator with trigger/options', async () => {
    const persistedWorkflow = createVisualWorkflow('wf-1');
    const result = createRuntimeResult();
    mockGetById.mockResolvedValue(persistedWorkflow);
    mockRun.mockResolvedValue(result);
    mockPersistExecution.mockResolvedValue(undefined);

    const task = createTask({
      workflowId: 'wf-1',
      input: { foo: 'bar' },
      options: {
        triggerId: 'schedule-trigger-1',
        isReplay: true,
      },
    });

    const execution = createExecution();
    const response = await executeWorkflowTask(task, execution);

    expect(mockGetById).toHaveBeenCalledWith('wf-1');
    expect(mockDefinitionToVisual).not.toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith({
      workflow: persistedWorkflow,
      input: { foo: 'bar' },
      triggerId: 'schedule-trigger-1',
      isReplay: true,
    });
    expect(mockPersistExecution).toHaveBeenCalledWith({ result });
    expect(response).toEqual({
      success: true,
      output: {
        workflowId: 'wf-1',
        executionId: 'wf-exec-1',
        runtime: 'browser',
        status: 'completed',
        completedSteps: 1,
        failedSteps: 1,
        totalSteps: 2,
        triggerId: 'trigger-1',
        output: { ok: true },
      },
      error: undefined,
    });
  });

  it('falls back to workflowDefinition when workflowId is missing', async () => {
    const workflowDefinition = { id: 'wf-def-primary' };
    const fallbackDefinition = { id: 'wf-def-fallback' };
    const visualFromDefinition = createVisualWorkflow('wf-def-primary');

    mockDefinitionToVisual.mockReturnValue(visualFromDefinition);
    mockRun.mockResolvedValue(createRuntimeResult({ workflowId: 'wf-def-primary' }));
    mockPersistExecution.mockResolvedValue(undefined);

    const task = createTask({
      workflowDefinition,
      definition: fallbackDefinition,
      input: {},
      triggerId: 'legacy-trigger-id',
    });

    const response = await executeWorkflowTask(task, createExecution());

    expect(mockDefinitionToVisual).toHaveBeenCalledWith(workflowDefinition);
    expect(mockRun).toHaveBeenCalledWith({
      workflow: visualFromDefinition,
      input: {},
      triggerId: 'legacy-trigger-id',
      isReplay: undefined,
    });
    expect(response.success).toBe(true);
  });

  it('falls back to definition conversion when workflowId is not found', async () => {
    const definition = { id: 'wf-def-1' };
    const visual = createVisualWorkflow('wf-def-1');

    mockGetById.mockResolvedValue(undefined);
    mockDefinitionToVisual.mockReturnValue(visual);
    mockRun.mockResolvedValue(createRuntimeResult({ workflowId: 'wf-def-1' }));
    mockPersistExecution.mockResolvedValue(undefined);

    const task = createTask({
      workflowId: 'missing-workflow',
      definition,
    });

    const response = await executeWorkflowTask(task, createExecution());

    expect(mockGetById).toHaveBeenCalledWith('missing-workflow');
    expect(mockDefinitionToVisual).toHaveBeenCalledWith(definition);
    expect(response.success).toBe(true);
  });

  it('does not fail execution when persistence fails', async () => {
    const persistedWorkflow = createVisualWorkflow('wf-1');
    mockGetById.mockResolvedValue(persistedWorkflow);
    mockRun.mockResolvedValue(createRuntimeResult());
    mockPersistExecution.mockRejectedValue(new Error('db down'));

    const response = await executeWorkflowTask(
      createTask({
        workflowId: 'wf-1',
      }),
      createExecution()
    );

    expect(response.success).toBe(true);
    expect(loggers.app.warn).toHaveBeenCalledWith(
      'Failed to persist scheduled workflow execution',
      expect.objectContaining({
        taskId: 'task-1',
      })
    );
  });

  it('returns failed result when workflow ends with non-completed status', async () => {
    const persistedWorkflow = createVisualWorkflow('wf-1');
    mockGetById.mockResolvedValue(persistedWorkflow);
    mockRun.mockResolvedValue(
      createRuntimeResult({
        status: 'failed',
        error: 'runtime failed',
        nodeStates: {
          node1: { status: 'failed' },
        },
      })
    );
    mockPersistExecution.mockResolvedValue(undefined);

    const response = await executeWorkflowTask(
      createTask({
        workflowId: 'wf-1',
      }),
      createExecution()
    );

    expect(response.success).toBe(false);
    expect(response.error).toBe('runtime failed');
    expect(response.output).toEqual(
      expect.objectContaining({
        failedSteps: 1,
        completedSteps: 0,
        totalSteps: 1,
        status: 'failed',
      })
    );
  });
});

describe('executeBackupTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFullBackup.mockResolvedValue({
      version: '3.0',
      manifest: {
        exportedAt: '2026-01-01T00:00:00.000Z',
      },
      payload: {
        sessions: [],
        messages: [],
        projects: [],
        summaries: [],
      },
    });
    mockExportToJSON.mockResolvedValue('{"version":"3.0"}');
    mockRunBackupUploadForProvider.mockResolvedValue({ success: true });
    mockHasStoredCredentials.mockResolvedValue(true);
    mockSyncStoreState.webdavConfig.enabled = true;
    mockSyncStoreState.githubConfig.enabled = true;
    mockSyncStoreState.googleDriveConfig.enabled = true;
  });

  it('executes googledrive destination backup', async () => {
    const backupTask = {
      ...createTask({
        backupType: 'full',
        destination: 'googledrive',
        options: {},
      }),
      type: 'backup' as const,
    };

    const result = await executeBackupTask(backupTask, createExecution());

    expect(result.success).toBe(true);
    expect(mockRunBackupUploadForProvider).toHaveBeenCalledWith('googledrive');
  });

  it('fails when any configured provider fails for all destination', async () => {
    mockHasStoredCredentials.mockImplementation(async (provider: string) => provider !== 'github');
    mockRunBackupUploadForProvider.mockImplementation(async (provider: string) =>
      provider === 'googledrive'
        ? { success: false, error: 'upload failed' }
        : { success: true }
    );

    const backupTask = {
      ...createTask({
        backupType: 'full',
        destination: 'all',
      }),
      type: 'backup' as const,
    };

    const result = await executeBackupTask(backupTask, createExecution());

    expect(result.success).toBe(false);
    expect(result.output).toEqual(
      expect.objectContaining({
        syncResult: expect.objectContaining({
          successfulProviders: ['webdav'],
          skippedProviders: ['github'],
          failedProviders: [{ provider: 'googledrive', error: 'upload failed' }],
        }),
      })
    );
  });
});

describe('executeAIGenerationTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when prompt is missing', async () => {
    const task = { ...createTask({}), type: 'ai-generation' as const };
    const result = await executeAIGenerationTask(task, createExecution());
    expect(result.success).toBe(false);
    expect(result.error).toContain('No prompt specified');
  });

  it('calls generateText with correct model and prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'Generated summary text' });

    const task = {
      ...createTask({
        prompt: 'Summarize this',
        generationType: 'summary',
      }),
      type: 'ai-generation' as const,
    };

    const result = await executeAIGenerationTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(mockGetProxyProviderModel).toHaveBeenCalledWith(
      'openai', 'gpt-4o', 'test-key', 'https://api.openai.com', true
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock-model-instance',
        prompt: 'Summarize this',
        system: 'You are a helpful assistant that creates concise summaries.',
      })
    );
    expect(result.output).toEqual(
      expect.objectContaining({
        generationType: 'summary',
        provider: 'openai',
        model: 'gpt-4o',
        content: 'Generated summary text',
      })
    );
  });

  it('uses custom provider and model from payload', async () => {
    mockGenerateText.mockResolvedValue({ text: 'result' });
    mockSettingsState.providerSettings.openai = {
      apiKey: 'custom-key',
      baseURL: 'https://custom.api',
      defaultModel: 'gpt-4o',
    };

    const task = {
      ...createTask({
        prompt: 'test',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
      type: 'ai-generation' as const,
    };

    await executeAIGenerationTask(task, createExecution());

    expect(mockGetProxyProviderModel).toHaveBeenCalledWith(
      'openai', 'gpt-4o-mini', 'custom-key', 'https://custom.api', true
    );
  });

  it('handles generateText errors gracefully', async () => {
    mockGenerateText.mockRejectedValue(new Error('API rate limit'));

    const task = {
      ...createTask({ prompt: 'test' }),
      type: 'ai-generation' as const,
    };

    const result = await executeAIGenerationTask(task, createExecution());

    expect(result.success).toBe(false);
    expect(result.error).toBe('API rate limit');
  });

  it('does not set system prompt for custom generationType', async () => {
    mockGenerateText.mockResolvedValue({ text: 'result' });

    const task = {
      ...createTask({
        prompt: 'Do something custom',
        generationType: 'custom',
      }),
      type: 'ai-generation' as const,
    };

    await executeAIGenerationTask(task, createExecution());

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.not.objectContaining({ system: expect.anything() })
    );
  });
});

describe('executeChatTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when message is missing', async () => {
    const task = { ...createTask({}), type: 'chat' as const };
    const result = await executeChatTask(task, createExecution());
    expect(result.success).toBe(false);
    expect(result.error).toContain('No message specified');
  });

  it('sends message to chat store', async () => {
    const task = {
      ...createTask({ message: 'Hello world' }),
      type: 'chat' as const,
    };

    const result = await executeChatTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'Hello world',
        parts: [{ type: 'text', content: 'Hello world' }],
      })
    );
    expect(result.output).toEqual(
      expect.objectContaining({
        messageSent: true,
        messageLength: 11,
      })
    );
  });

  it('creates new session when sessionId is not provided', async () => {
    const task = {
      ...createTask({ message: 'Hello' }),
      type: 'chat' as const,
    };

    const result = await executeChatTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(result.output).toEqual(
      expect.objectContaining({
        sessionId: 'new-session-1',
      })
    );
  });

  it('generates auto-reply when autoReply is enabled', async () => {
    mockGenerateText.mockResolvedValue({ text: 'AI response' });

    const task = {
      ...createTask({
        message: 'What is 2+2?',
        autoReply: true,
      }),
      type: 'chat' as const,
    };

    const result = await executeChatTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalled();
    expect(mockAppendMessage).toHaveBeenCalledTimes(2); // user + assistant
    expect(result.output).toEqual(
      expect.objectContaining({
        autoReply: true,
        replyLength: 11,
      })
    );
  });

  it('does not generate auto-reply when autoReply is false', async () => {
    const task = {
      ...createTask({ message: 'Hello', autoReply: false }),
      type: 'chat' as const,
    };

    await executeChatTask(task, createExecution());

    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(mockAppendMessage).toHaveBeenCalledTimes(1); // user only
  });
});

describe('executeTestTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs health-check by default', async () => {
    const task = {
      ...createTask({}),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.output).toEqual(
      expect.objectContaining({
        testType: 'health-check',
        checks: expect.objectContaining({
          indexedDB: expect.any(Boolean),
          localStorage: expect.any(Boolean),
        }),
      })
    );
  });

  it('api-ping returns error when URL is missing', async () => {
    const task = {
      ...createTask({ testType: 'api-ping' }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(false);
    expect(result.error).toContain('No URL specified');
  });

  it('api-ping makes HEAD request to specified URL', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ status: 200 });
    global.fetch = mockFetch;

    const task = {
      ...createTask({
        testType: 'api-ping',
        url: 'https://example.com/health',
        expectedStatus: 200,
      }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/health',
      expect.objectContaining({ method: 'HEAD' })
    );
    expect(result.output).toEqual(
      expect.objectContaining({
        url: 'https://example.com/health',
        statusCode: 200,
        healthy: true,
      })
    );
  });

  it('api-ping reports failure on status mismatch', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 503 });

    const task = {
      ...createTask({
        testType: 'api-ping',
        url: 'https://example.com/health',
        expectedStatus: 200,
      }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(false);
    expect(result.output).toEqual(
      expect.objectContaining({ healthy: false, statusCode: 503 })
    );
  });

  it('api-ping handles fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const task = {
      ...createTask({
        testType: 'api-ping',
        url: 'https://unreachable.example.com',
      }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(false);
    expect(result.output).toEqual(
      expect.objectContaining({ healthy: false })
    );
    expect(result.error).toBe('Network error');
  });

  it('provider-check returns configured provider status', async () => {
    const task = {
      ...createTask({ testType: 'provider-check' }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(result.output).toEqual(
      expect.objectContaining({
        testType: 'provider-check',
        providers: expect.any(Object),
        configuredCount: expect.any(Number),
        totalCount: expect.any(Number),
      })
    );
  });

  it('script test returns error when script is missing', async () => {
    const task = {
      ...createTask({ testType: 'script' }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(false);
    expect(result.error).toContain('Script and language are required');
  });

  it('script test executes script via executeScript', async () => {
    mockExecuteScript.mockResolvedValue({
      success: true,
      exit_code: 0,
      stdout: 'ok',
      stderr: '',
    });

    const task = {
      ...createTask({
        testType: 'script',
        script: 'echo hello',
        language: 'bash',
        timeout: 10000,
      }),
      type: 'test' as const,
    };

    const result = await executeTestTask(task, createExecution());

    expect(result.success).toBe(true);
    expect(mockExecuteScript).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'execute_script',
        language: 'bash',
        code: 'echo hello',
        timeout_secs: 10,
      })
    );
  });
});
