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
  createCheckProgramTool,
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
      expect(tools.check_program_allowed).toBeDefined();
      expect(tools.terminate_process).toBeDefined();
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
      expect(tools.terminate_process).toBeUndefined();
    });

    it('returns default tools when no config provided', () => {
      const tools = initializeProcessTools();

      // All should be enabled by default
      expect(tools.list_processes).toBeDefined();
      expect(tools.search_processes).toBeDefined();
      expect(tools.get_process).toBeDefined();
      expect(tools.start_process).toBeDefined();
      expect(tools.terminate_process).toBeDefined();
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

  describe('getProcessToolsSystemPrompt', () => {
    it('returns a non-empty string', () => {
      const prompt = getProcessToolsSystemPrompt();

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('Process Management');
    });
  });

  describe('getProcessToolsPromptSnippet', () => {
    it('returns a non-empty string', () => {
      const snippet = getProcessToolsPromptSnippet();

      expect(typeof snippet).toBe('string');
      expect(snippet.length).toBeGreaterThan(0);
      expect(snippet).toContain('Process Management');
    });
  });

  describe('Tool Security Properties', () => {
    it('read-only tools do not require approval', () => {
      expect(createListProcessesTool().requiresApproval).toBe(false);
      expect(createGetProcessTool().requiresApproval).toBe(false);
      expect(createSearchProcessesTool().requiresApproval).toBe(false);
      expect(createTopMemoryProcessesTool().requiresApproval).toBe(false);
      expect(createCheckProgramTool().requiresApproval).toBe(false);
    });

    it('write tools require approval', () => {
      expect(createStartProcessTool().requiresApproval).toBe(true);
      expect(createTerminateProcessTool().requiresApproval).toBe(true);
    });
  });
});
