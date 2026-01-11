/**
 * Tests for Agent Context Tools
 */

import {
  createReadContextFileTool,
  createTailContextFileTool,
  createGrepContextTool,
  createListContextFilesTool,
  createContextStatsTool,
  createContextTools,
  getContextToolsPrompt,
} from './agent-context-tools';
import {
  readContextFile,
  tailContextFile,
  searchContextFiles,
  grepContextFiles,
  getContextStats,
} from './context-fs';

// Mock context-fs functions
jest.mock('./context-fs', () => ({
  readContextFile: jest.fn(),
  tailContextFile: jest.fn(),
  searchContextFiles: jest.fn(),
  grepContextFiles: jest.fn(),
  getContextStats: jest.fn(),
}));

const mockReadContextFile = readContextFile as jest.MockedFunction<typeof readContextFile>;
const mockTailContextFile = tailContextFile as jest.MockedFunction<typeof tailContextFile>;
const mockSearchContextFiles = searchContextFiles as jest.MockedFunction<typeof searchContextFiles>;
const mockGrepContextFiles = grepContextFiles as jest.MockedFunction<typeof grepContextFiles>;
const mockGetContextStats = getContextStats as jest.MockedFunction<typeof getContextStats>;

describe('agent-context-tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReadContextFileTool', () => {
    it('should create a valid AgentTool', () => {
      const tool = createReadContextFileTool();

      expect(tool.name).toBe('read_context_file');
      expect(tool.description).toContain('Read content from a context file');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should read file content successfully', async () => {
      const tool = createReadContextFileTool();
      mockReadContextFile.mockResolvedValue({
        path: 'context/tool-output/test.txt',
        content: 'file content here',
        metadata: {
          sizeBytes: 100,
          estimatedTokens: 25,
          source: 'test-tool',
          createdAt: new Date('2024-01-15'),
        },
      });

      const result = await tool.execute({ path: 'context/tool-output/test.txt' });

      expect(result.path).toBe('context/tool-output/test.txt');
      expect(result.content).toBe('file content here');
      expect(result.metadata.totalSize).toBe(100);
      expect(mockReadContextFile).toHaveBeenCalledWith('context/tool-output/test.txt', {
        startLine: undefined,
        endLine: undefined,
      });
    });

    it('should read with line range', async () => {
      const tool = createReadContextFileTool();
      mockReadContextFile.mockResolvedValue({
        path: 'test.txt',
        content: 'lines 10-20',
        metadata: {
          sizeBytes: 50,
          estimatedTokens: 12,
          source: 'test',
          createdAt: new Date(),
        },
      });

      await tool.execute({ path: 'test.txt', startLine: 10, endLine: 20 });

      expect(mockReadContextFile).toHaveBeenCalledWith('test.txt', {
        startLine: 10,
        endLine: 20,
      });
    });

    it('should return error for non-existent file', async () => {
      const tool = createReadContextFileTool();
      mockReadContextFile.mockResolvedValue(null);

      const result = await tool.execute({ path: 'non-existent.txt' });

      expect(result.error).toContain('File not found');
    });
  });

  describe('createTailContextFileTool', () => {
    it('should create a valid AgentTool', () => {
      const tool = createTailContextFileTool();

      expect(tool.name).toBe('tail_context_file');
      expect(tool.description).toContain('Read the last N lines');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should read last N lines', async () => {
      const tool = createTailContextFileTool();
      mockTailContextFile.mockResolvedValue({
        path: 'test.txt',
        content: 'line 48\nline 49\nline 50',
        metadata: {
          sizeBytes: 200,
          source: 'test',
          createdAt: new Date(),
        },
      });

      const result = await tool.execute({ path: 'test.txt', lineCount: 50 });

      expect(result.path).toBe('test.txt');
      expect(result.linesReturned).toBe(3);
      expect(mockTailContextFile).toHaveBeenCalledWith('test.txt', 50);
    });

    it('should use default line count', async () => {
      const tool = createTailContextFileTool();
      mockTailContextFile.mockResolvedValue({
        path: 'test.txt',
        content: 'content',
        metadata: { sizeBytes: 10, source: 'test', createdAt: new Date() },
      });

      await tool.execute({ path: 'test.txt' });

      // Default is 50 lines
      expect(mockTailContextFile).toHaveBeenCalledWith('test.txt', expect.any(Number));
    });

    it('should return error for non-existent file', async () => {
      const tool = createTailContextFileTool();
      mockTailContextFile.mockResolvedValue(null);

      const result = await tool.execute({ path: 'missing.txt', lineCount: 10 });

      expect(result.error).toContain('File not found');
    });
  });

  describe('createGrepContextTool', () => {
    it('should create a valid AgentTool', () => {
      const tool = createGrepContextTool();

      expect(tool.name).toBe('grep_context');
      expect(tool.description).toContain('Search for patterns');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should search with pattern', async () => {
      const tool = createGrepContextTool();
      mockGrepContextFiles.mockResolvedValue([
        { path: 'file1.txt', lineNumber: 10, content: 'matching line 1' },
        { path: 'file2.txt', lineNumber: 5, content: 'matching line 2' },
      ]);

      const result = await tool.execute({
        pattern: 'matching',
        ignoreCase: true,
        limit: 20,
      });

      expect(result.matchCount).toBe(2);
      expect(result.matches).toHaveLength(2);
      expect(mockGrepContextFiles).toHaveBeenCalledWith('matching', {
        category: undefined,
        isRegex: false,
        ignoreCase: true,
        limit: 20,
      });
    });

    it('should filter by category', async () => {
      const tool = createGrepContextTool();
      mockGrepContextFiles.mockResolvedValue([]);

      await tool.execute({
        pattern: 'test',
        category: 'tool-output',
      });

      expect(mockGrepContextFiles).toHaveBeenCalledWith('test', expect.objectContaining({
        category: 'tool-output',
      }));
    });

    it('should support regex patterns', async () => {
      const tool = createGrepContextTool();
      mockGrepContextFiles.mockResolvedValue([]);

      await tool.execute({
        pattern: 'error.*failed',
        isRegex: true,
      });

      expect(mockGrepContextFiles).toHaveBeenCalledWith('error.*failed', expect.objectContaining({
        isRegex: true,
      }));
    });
  });

  describe('createListContextFilesTool', () => {
    it('should create a valid AgentTool', () => {
      const tool = createListContextFilesTool();

      expect(tool.name).toBe('list_context_files');
      expect(tool.description).toContain('List available context files');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should list files with metadata', async () => {
      const tool = createListContextFilesTool();
      mockSearchContextFiles.mockResolvedValue([
        {
          id: 'file-1',
          category: 'tool-output',
          source: 'web-search',
          sizeBytes: 500,
          estimatedTokens: 125,
          createdAt: new Date('2024-01-15'),
          tags: ['search'],
        },
        {
          id: 'file-2',
          category: 'terminal',
          source: 'bash',
          sizeBytes: 200,
          estimatedTokens: 50,
          createdAt: new Date('2024-01-14'),
          tags: ['terminal'],
        },
      ]);

      const result = await tool.execute({ limit: 20 });

      expect(result.fileCount).toBe(2);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].category).toBe('tool-output');
    });

    it('should filter by category', async () => {
      const tool = createListContextFilesTool();
      mockSearchContextFiles.mockResolvedValue([]);

      await tool.execute({ category: 'terminal', limit: 10 });

      expect(mockSearchContextFiles).toHaveBeenCalledWith({
        category: 'terminal',
        source: undefined,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should filter by source', async () => {
      const tool = createListContextFilesTool();
      mockSearchContextFiles.mockResolvedValue([]);

      await tool.execute({ source: 'web-search', limit: 5 });

      expect(mockSearchContextFiles).toHaveBeenCalledWith(expect.objectContaining({
        source: 'web-search',
      }));
    });
  });

  describe('createContextStatsTool', () => {
    it('should create a valid AgentTool', () => {
      const tool = createContextStatsTool();

      expect(tool.name).toBe('context_stats');
      expect(tool.description).toContain('statistics');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should return context statistics', async () => {
      const tool = createContextStatsTool();
      mockGetContextStats.mockResolvedValue({
        filesByCategory: {
          'tool-output': 10,
          'terminal': 5,
          'history': 3,
        },
        totalSizeBytes: 50000,
        estimatedTotalTokens: 12500,
        oldestFile: new Date('2024-01-01'),
        lastAccessed: new Date('2024-01-15'),
      });

      const result = await tool.execute({});

      expect(result.filesByCategory).toEqual({
        'tool-output': 10,
        'terminal': 5,
        'history': 3,
      });
      expect(result.totalSize).toBe(50000);
      expect(result.estimatedTokens).toBe(12500);
    });

    it('should handle missing optional fields', async () => {
      const tool = createContextStatsTool();
      mockGetContextStats.mockResolvedValue({
        filesByCategory: {},
        totalSizeBytes: 0,
        estimatedTotalTokens: 0,
        oldestFile: undefined,
        lastAccessed: undefined,
      });

      const result = await tool.execute({});

      expect(result.oldestFile).toBeUndefined();
      expect(result.lastAccessed).toBeUndefined();
    });
  });

  describe('createContextTools', () => {
    it('should return all context tools as a record', () => {
      const tools = createContextTools();

      expect(tools).toHaveProperty('read_context_file');
      expect(tools).toHaveProperty('tail_context_file');
      expect(tools).toHaveProperty('grep_context');
      expect(tools).toHaveProperty('list_context_files');
      expect(tools).toHaveProperty('context_stats');
      expect(Object.keys(tools)).toHaveLength(5);
    });

    it('should have valid tool definitions', () => {
      const tools = createContextTools();

      for (const [name, tool] of Object.entries(tools)) {
        expect(tool.name).toBe(name);
        expect(tool.execute).toBeInstanceOf(Function);
        expect(tool.description).toBeDefined();
      }
    });
  });

  describe('getContextToolsPrompt', () => {
    it('should return documentation string', () => {
      const prompt = getContextToolsPrompt();

      expect(prompt).toContain('Dynamic Context Access');
      expect(prompt).toContain('read_context_file');
      expect(prompt).toContain('tail_context_file');
      expect(prompt).toContain('grep_context');
      expect(prompt).toContain('list_context_files');
    });

    it('should include best practices', () => {
      const prompt = getContextToolsPrompt();

      expect(prompt).toContain('Best Practice');
    });
  });
});
