/**
 * Tests for lib/ai/agent/process-tools.ts
 */

import {
  initializeProcessTools,
  createListProcessesTool,
  createGetProcessTool,
  createSearchProcessesTool,
  createTopMemoryProcessesTool,
  createStartProcessTool,
  createTerminateProcessTool,
  createStartProcessesParallelTool,
  createTerminateProcessesParallelTool,
  createStartProcessesAsyncTool,
  createTerminateProcessesAsyncTool,
  createCheckProgramTool,
  createProcessStatusTool,
  createSetProcessEnabledTool,
  createGetTrackedProcessesTool,
  createGetProcessOperationTool,
  createListProcessOperationsTool,
  getProcessToolsSystemPrompt,
  getProcessToolsPromptSnippet,
} from './process-tools';

// Mock the process service
jest.mock('@/lib/native/process', () => ({
  isProcessManagementAvailable: jest.fn(() => false),
  processService: {
    isAvailable: jest.fn(() => false),
    list: jest.fn(),
    get: jest.fn(),
    start: jest.fn(),
    terminate: jest.fn(),
    startBatch: jest.fn(),
    terminateBatch: jest.fn(),
    startBatchAsync: jest.fn(),
    terminateBatchAsync: jest.fn(),
    getOperation: jest.fn(),
    listOperations: jest.fn(),
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    isProgramAllowed: jest.fn(),
    getTracked: jest.fn(),
    isEnabled: jest.fn(),
    setEnabled: jest.fn(),
    search: jest.fn(),
    topMemory: jest.fn(),
  },
}));

describe('Process Tools', () => {
  describe('initializeProcessTools', () => {
    it('returns all tools when all options enabled', () => {
      const tools = initializeProcessTools({
        enableList: true,
        enableSearch: true,
        enableGet: true,
        enableStart: true,
        enableTerminate: true,
      });

      expect(tools.list_processes).toBeDefined();
      expect(tools.top_memory_processes).toBeDefined();
      expect(tools.search_processes).toBeDefined();
      expect(tools.get_process).toBeDefined();
      expect(tools.start_process).toBeDefined();
      expect(tools.start_processes_parallel).toBeDefined();
      expect(tools.start_processes_async).toBeDefined();
      expect(tools.check_program_allowed).toBeDefined();
      expect(tools.terminate_process).toBeDefined();
      expect(tools.terminate_processes_parallel).toBeDefined();
      expect(tools.terminate_processes_async).toBeDefined();
      expect(tools.get_process_manager_status).toBeDefined();
      expect(tools.set_process_manager_enabled).toBeDefined();
      expect(tools.get_tracked_processes).toBeDefined();
      expect(tools.get_process_operation).toBeDefined();
      expect(tools.list_process_operations).toBeDefined();
    });

    it('returns only list tools when others disabled', () => {
      const tools = initializeProcessTools({
        enableList: true,
        enableSearch: false,
        enableGet: false,
        enableStart: false,
        enableTerminate: false,
      });

      expect(tools.list_processes).toBeDefined();
      expect(tools.top_memory_processes).toBeDefined();
      expect(tools.search_processes).toBeUndefined();
      expect(tools.get_process).toBeUndefined();
      expect(tools.start_process).toBeUndefined();
      expect(tools.start_processes_parallel).toBeUndefined();
      expect(tools.start_processes_async).toBeUndefined();
      expect(tools.terminate_process).toBeUndefined();
      expect(tools.terminate_processes_parallel).toBeUndefined();
      expect(tools.terminate_processes_async).toBeUndefined();
      expect(tools.get_process_manager_status).toBeDefined();
      expect(tools.set_process_manager_enabled).toBeDefined();
      expect(tools.get_tracked_processes).toBeDefined();
      expect(tools.get_process_operation).toBeDefined();
      expect(tools.list_process_operations).toBeDefined();
    });

    it('returns default tools when no config provided', () => {
      const tools = initializeProcessTools();

      // All should be enabled by default
      expect(tools.list_processes).toBeDefined();
      expect(tools.search_processes).toBeDefined();
      expect(tools.get_process).toBeDefined();
      expect(tools.start_process).toBeDefined();
      expect(tools.start_processes_parallel).toBeDefined();
      expect(tools.start_processes_async).toBeDefined();
      expect(tools.terminate_process).toBeDefined();
      expect(tools.terminate_processes_parallel).toBeDefined();
      expect(tools.terminate_processes_async).toBeDefined();
      expect(tools.get_process_manager_status).toBeDefined();
      expect(tools.set_process_manager_enabled).toBeDefined();
      expect(tools.get_tracked_processes).toBeDefined();
      expect(tools.get_process_operation).toBeDefined();
      expect(tools.list_process_operations).toBeDefined();
    });
  });

  describe('createListProcessesTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createListProcessesTool();

      expect(tool.name).toBe('list_processes');
      expect(tool.description).toContain('List running processes');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });

    it('returns error when not in Tauri environment', async () => {
      const tool = createListProcessesTool();
      const result = await tool.execute({});

      expect(result).toMatchObject({
        success: false,
        action: 'list_processes',
        error: 'Not available in browser',
      });
    });
  });

  describe('createGetProcessTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createGetProcessTool();

      expect(tool.name).toBe('get_process');
      expect(tool.description).toContain('detailed information');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createSearchProcessesTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createSearchProcessesTool();

      expect(tool.name).toBe('search_processes');
      expect(tool.description).toContain('Search for processes');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createTopMemoryProcessesTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createTopMemoryProcessesTool();

      expect(tool.name).toBe('top_memory_processes');
      expect(tool.description).toContain('memory usage');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createStartProcessTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createStartProcessTool();

      expect(tool.name).toBe('start_process');
      expect(tool.description).toContain('Start a new process');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true); // Requires approval
    });
  });

  describe('createTerminateProcessTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createTerminateProcessTool();

      expect(tool.name).toBe('terminate_process');
      expect(tool.description).toContain('Terminate');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true); // Requires approval
    });
  });

  describe('createStartProcessesParallelTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createStartProcessesParallelTool();

      expect(tool.name).toBe('start_processes_parallel');
      expect(tool.description).toContain('parallel');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true);
    });
  });

  describe('createTerminateProcessesParallelTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createTerminateProcessesParallelTool();

      expect(tool.name).toBe('terminate_processes_parallel');
      expect(tool.description).toContain('parallel');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true);
    });
  });

  describe('createStartProcessesAsyncTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createStartProcessesAsyncTool();

      expect(tool.name).toBe('start_processes_async');
      expect(tool.description).toContain('asynchronous');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true);
    });
  });

  describe('createTerminateProcessesAsyncTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createTerminateProcessesAsyncTool();

      expect(tool.name).toBe('terminate_processes_async');
      expect(tool.description).toContain('asynchronous');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true);
    });
  });

  describe('createCheckProgramTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createCheckProgramTool();

      expect(tool.name).toBe('check_program_allowed');
      expect(tool.description).toContain('allowed');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createProcessStatusTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createProcessStatusTool();

      expect(tool.name).toBe('get_process_manager_status');
      expect(tool.description).toContain('status');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createSetProcessEnabledTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createSetProcessEnabledTool();

      expect(tool.name).toBe('set_process_manager_enabled');
      expect(tool.description).toContain('Enable or disable');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(true);
    });
  });

  describe('createGetTrackedProcessesTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createGetTrackedProcessesTool();

      expect(tool.name).toBe('get_tracked_processes');
      expect(tool.description).toContain('tracked');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createGetProcessOperationTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createGetProcessOperationTool();

      expect(tool.name).toBe('get_process_operation');
      expect(tool.description).toContain('operation');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('createListProcessOperationsTool', () => {
    it('creates a tool with correct properties', () => {
      const tool = createListProcessOperationsTool();

      expect(tool.name).toBe('list_process_operations');
      expect(tool.description).toContain('operations');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });
  });

  describe('getProcessToolsSystemPrompt', () => {
    it('returns a non-empty string', () => {
      const prompt = getProcessToolsSystemPrompt();

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('Process Management');
      expect(prompt).toContain('start_processes_parallel');
      expect(prompt).toContain('get_process_operation');
    });
  });

  describe('getProcessToolsPromptSnippet', () => {
    it('returns a non-empty string', () => {
      const snippet = getProcessToolsPromptSnippet();

      expect(typeof snippet).toBe('string');
      expect(snippet.length).toBeGreaterThan(0);
      expect(snippet).toContain('Process Management');
      expect(snippet).toContain('start_processes_async');
      expect(snippet).toContain('list_process_operations');
    });
  });

  describe('Tool Security Properties', () => {
    it('read-only tools do not require approval', () => {
      expect(createListProcessesTool().requiresApproval).toBe(false);
      expect(createGetProcessTool().requiresApproval).toBe(false);
      expect(createSearchProcessesTool().requiresApproval).toBe(false);
      expect(createTopMemoryProcessesTool().requiresApproval).toBe(false);
      expect(createCheckProgramTool().requiresApproval).toBe(false);
      expect(createProcessStatusTool().requiresApproval).toBe(false);
      expect(createGetTrackedProcessesTool().requiresApproval).toBe(false);
      expect(createGetProcessOperationTool().requiresApproval).toBe(false);
      expect(createListProcessOperationsTool().requiresApproval).toBe(false);
    });

    it('write tools require approval', () => {
      expect(createStartProcessTool().requiresApproval).toBe(true);
      expect(createTerminateProcessTool().requiresApproval).toBe(true);
      expect(createStartProcessesParallelTool().requiresApproval).toBe(true);
      expect(createTerminateProcessesParallelTool().requiresApproval).toBe(true);
      expect(createStartProcessesAsyncTool().requiresApproval).toBe(true);
      expect(createTerminateProcessesAsyncTool().requiresApproval).toBe(true);
      expect(createSetProcessEnabledTool().requiresApproval).toBe(true);
    });
  });
});
