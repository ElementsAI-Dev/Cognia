/**
 * Tests for mcp-tools-sync.ts
 * MCP tools synchronization to context files
 */

import {
  syncMcpTool,
  syncMcpServer,
  readMcpToolDescription,
  getSyncedToolsForServer,
  searchMcpTools,
  getMcpToolRefs,
  getMcpServerStatuses,
  generateMcpStaticPrompt,
  updateMcpServerStatus,
  clearMcpServerTools,
  type McpServerStatus,
  type McpToolRef,
} from './mcp-tools-sync';
import * as contextFs from './context-fs';
import type { McpTool } from '@/types/mcp';
import type { ContextFile, McpToolDescriptionFile } from '@/types/system/context';

// Mock context-fs module
jest.mock('./context-fs');

const mockedContextFs = contextFs as jest.Mocked<typeof contextFs>;

// Mock MCP tool
const createMockTool = (name: string, description: string = ''): McpTool => ({
  name,
  description,
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
    },
  },
});

// Mock context file
const createMockContextFile = (content: string, path: string = '', filename?: string): ContextFile => ({
  path,
  content,
  metadata: {
    id: 'test-id',
    category: 'mcp',
    source: 'test-server',
    tags: ['mcp-tool'],
    sizeBytes: content.length,
    estimatedTokens: Math.ceil(content.length / 4),
    createdAt: new Date(),
    accessedAt: new Date(),
    ...(filename && { filename }),
  },
});

describe('mcp-tools-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncMcpTool', () => {
    it('should sync a tool to a context file', async () => {
      const mockFile = createMockContextFile('{}', '.cognia/context/mcp/test_tool.json');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const tool = createMockTool('testTool', 'Test tool description');
      const result = await syncMcpTool('test-server', 'Test Server', tool);

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          category: 'mcp',
          source: 'test-server',
          filename: 'test-server_testTool.json',
          tags: expect.arrayContaining(['mcp-tool', 'test-server', 'connected']),
        })
      );
      expect(result).toBe(mockFile);
    });

    it('should include server status in tags', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const tool = createMockTool('testTool');
      await syncMcpTool('server', 'Server', tool, 'auth-required');

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.arrayContaining(['auth-required']),
        })
      );
    });

    it('should serialize tool description correctly', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const tool = createMockTool('myTool', 'My tool does things');
      await syncMcpTool('my-server', 'My Server', tool, 'connected');

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = JSON.parse(writeCall[0]);

      expect(content).toMatchObject({
        serverId: 'my-server',
        serverName: 'My Server',
        toolName: 'myTool',
        description: 'My tool does things',
        serverStatus: 'connected',
      });
      expect(content.parametersSchema).toBeDefined();
    });
  });

  describe('syncMcpServer', () => {
    it('should sync all tools from a server', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const tools = [
        createMockTool('tool1', 'Tool 1'),
        createMockTool('tool2', 'Tool 2'),
        createMockTool('tool3', 'Tool 3'),
      ];

      const result = await syncMcpServer('server-id', 'Server Name', tools);

      expect(result.toolsSynced).toBe(3);
      expect(result.filesWritten).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      // +1 for status file
      expect(mockedContextFs.writeContextFile).toHaveBeenCalledTimes(4);
    });

    it('should handle sync errors gracefully', async () => {
      mockedContextFs.writeContextFile
        .mockResolvedValueOnce(createMockContextFile('{}'))
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce(createMockContextFile('{}'))
        .mockResolvedValueOnce(createMockContextFile('{}')); // Status file

      const tools = [
        createMockTool('tool1'),
        createMockTool('tool2'),
        createMockTool('tool3'),
      ];

      const result = await syncMcpServer('server', 'Server', tools);

      expect(result.toolsSynced).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].tool).toBe('tool2');
    });

    it('should write server status file', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncMcpServer('my-server', 'My Server', [createMockTool('tool1')], 'connected');

      // Last call should be the status file
      const lastCall = mockedContextFs.writeContextFile.mock.calls.at(-1);
      expect(lastCall?.[1]).toMatchObject({
        filename: 'my-server_status.json',
        tags: expect.arrayContaining(['mcp-server', 'status', 'connected']),
      });
    });

    it('should return empty result for empty tools array', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const result = await syncMcpServer('server', 'Server', []);

      expect(result.toolsSynced).toBe(0);
      expect(result.filesWritten).toHaveLength(0);
      // Only status file should be written
      expect(mockedContextFs.writeContextFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('readMcpToolDescription', () => {
    it('should read and parse tool description', async () => {
      const toolDesc: McpToolDescriptionFile = {
        serverId: 'server',
        serverName: 'Server',
        toolName: 'tool',
        description: 'Description',
        parametersSchema: {},
        requiresApproval: false,
        serverStatus: 'connected',
        lastUpdated: new Date(),
      };
      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(toolDesc))
      );

      const result = await readMcpToolDescription('server', 'tool');

      expect(result).toMatchObject({
        serverId: 'server',
        toolName: 'tool',
        description: 'Description',
      });
    });

    it('should return null if file not found', async () => {
      mockedContextFs.readContextFile.mockResolvedValue(null);

      const result = await readMcpToolDescription('server', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile('invalid json')
      );

      const result = await readMcpToolDescription('server', 'tool');

      expect(result).toBeNull();
    });
  });

  describe('getSyncedToolsForServer', () => {
    it('should return all synced tools for a server', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server', filename: 'server_tool1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'tool2', category: 'mcp', source: 'server', filename: 'server_tool2.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const tool1: McpToolDescriptionFile = {
        serverId: 'server', serverName: 'Server', toolName: 'tool1',
        description: 'Tool 1', parametersSchema: {}, requiresApproval: false,
        serverStatus: 'connected', lastUpdated: new Date(),
      };
      const tool2: McpToolDescriptionFile = {
        serverId: 'server', serverName: 'Server', toolName: 'tool2',
        description: 'Tool 2', parametersSchema: {}, requiresApproval: false,
        serverStatus: 'connected', lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(tool1)))
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(tool2)));

      const result = await getSyncedToolsForServer('server');

      expect(result).toHaveLength(2);
      expect(result[0].toolName).toBe('tool1');
      expect(result[1].toolName).toBe('tool2');
    });

    it('should skip status files', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server', filename: 'server_tool1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'status', category: 'mcp', source: 'server', filename: 'server_status.json', tags: ['status'], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const tool: McpToolDescriptionFile = {
        serverId: 'server', serverName: 'Server', toolName: 'tool1',
        description: 'Tool 1', parametersSchema: {}, requiresApproval: false,
        serverStatus: 'connected', lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(tool))
      );

      const result = await getSyncedToolsForServer('server');

      expect(result).toHaveLength(1);
    });
  });

  describe('searchMcpTools', () => {
    it('should search tools by keyword', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: '.cognia/context/mcp/server_tool1.json', lineNumber: 1, content: 'file handling' },
      ]);

      const tool: McpToolDescriptionFile = {
        serverId: 'server', serverName: 'Server', toolName: 'tool1',
        description: 'File handling tool', parametersSchema: {},
        requiresApproval: false, serverStatus: 'connected', lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(tool))
      );

      const result = await searchMcpTools('file handling');

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'file handling',
        expect.objectContaining({ category: 'mcp', ignoreCase: true })
      );
      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('tool1');
    });

    it('should filter by server ID', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await searchMcpTools('query', { serverId: 'specific-server' });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'query',
        expect.objectContaining({ source: 'specific-server' })
      );
    });

    it('should respect limit option', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await searchMcpTools('query', { limit: 5 });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'query',
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('getMcpToolRefs', () => {
    it('should return minimal tool references', async () => {
      mockedContextFs.getFilesByCategory.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server', filename: 'server_tool1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const tool: McpToolDescriptionFile = {
        serverId: 'server', serverName: 'Server', toolName: 'myTool',
        description: 'This is a tool description\nWith multiple lines',
        parametersSchema: {}, requiresApproval: false,
        serverStatus: 'connected', lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(tool))
      );

      const result = await getMcpToolRefs();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        fullName: 'mcp_server_myTool',
        toolName: 'myTool',
        serverId: 'server',
        serverName: 'Server',
        briefDescription: 'This is a tool description',
      });
    });

    it('should filter by server IDs', async () => {
      mockedContextFs.getFilesByCategory.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server1', filename: 'f.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'tool2', category: 'mcp', source: 'server2', filename: 'f.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const tool: McpToolDescriptionFile = {
        serverId: 'server1', serverName: 'Server 1', toolName: 'tool',
        description: 'Description', parametersSchema: {},
        requiresApproval: false, serverStatus: 'connected', lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(tool))
      );

      const result = await getMcpToolRefs(['server1']);

      expect(result).toHaveLength(1);
      expect(result[0].serverId).toBe('server1');
    });

    it('should skip status files', async () => {
      mockedContextFs.getFilesByCategory.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server', filename: 'f.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'status', category: 'mcp', source: 'server', filename: 's.json', tags: ['status'], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const tool: McpToolDescriptionFile = {
        serverId: 'server', serverName: 'Server', toolName: 'tool',
        description: 'Description', parametersSchema: {},
        requiresApproval: false, serverStatus: 'connected', lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(tool))
      );

      const result = await getMcpToolRefs();

      expect(result).toHaveLength(1);
    });
  });

  describe('getMcpServerStatuses', () => {
    it('should return server statuses', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'status', category: 'mcp', source: 'server1', filename: 'server1_status.json', tags: ['status'], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const status: McpServerStatus = {
        serverId: 'server1',
        serverName: 'Server 1',
        status: 'connected',
        toolCount: 5,
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(status))
      );

      const result = await getMcpServerStatuses();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        serverId: 'server1',
        status: 'connected',
        toolCount: 5,
      });
    });

    it('should search for status files', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);

      await getMcpServerStatuses();

      expect(mockedContextFs.searchContextFiles).toHaveBeenCalledWith({
        category: 'mcp',
        tags: ['status'],
      });
    });
  });

  describe('generateMcpStaticPrompt', () => {
    it('should return empty string for no refs', () => {
      const result = generateMcpStaticPrompt([]);
      expect(result).toBe('');
    });

    it('should generate prompt with tool listings', () => {
      const refs: McpToolRef[] = [
        { fullName: 'mcp_server1_tool1', toolName: 'tool1', serverId: 'server1', serverName: 'Server 1', briefDescription: 'Tool 1 desc' },
        { fullName: 'mcp_server1_tool2', toolName: 'tool2', serverId: 'server1', serverName: 'Server 1', briefDescription: 'Tool 2 desc' },
        { fullName: 'mcp_server2_tool3', toolName: 'tool3', serverId: 'server2', serverName: 'Server 2', briefDescription: 'Tool 3 desc' },
      ];

      const result = generateMcpStaticPrompt(refs);

      expect(result).toContain('## MCP Tools Available');
      expect(result).toContain('### Server 1 (2 tools)');
      expect(result).toContain('### Server 2 (1 tools)');
      expect(result).toContain('`mcp_server1_tool1`');
      expect(result).toContain('Tool 1 desc');
      expect(result).toContain('read_context_file');
      expect(result).toContain('grep_context');
    });

    it('should group tools by server', () => {
      const refs: McpToolRef[] = [
        { fullName: 'mcp_a_t1', toolName: 't1', serverId: 'a', serverName: 'A', briefDescription: 'd1' },
        { fullName: 'mcp_b_t2', toolName: 't2', serverId: 'b', serverName: 'B', briefDescription: 'd2' },
        { fullName: 'mcp_a_t3', toolName: 't3', serverId: 'a', serverName: 'A', briefDescription: 'd3' },
      ];

      const result = generateMcpStaticPrompt(refs);

      // Count occurrences of server headers
      const serverAMatches = result.match(/### A \(2 tools\)/g);
      const serverBMatches = result.match(/### B \(1 tools\)/g);
      
      expect(serverAMatches).toHaveLength(1);
      expect(serverBMatches).toHaveLength(1);
    });
  });

  describe('updateMcpServerStatus', () => {
    it('should update server status file', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);
      mockedContextFs.readContextFile.mockResolvedValue(null);
      mockedContextFs.writeContextFile.mockResolvedValue(createMockContextFile('{}'));

      await updateMcpServerStatus('server', 'Server', 'disconnected', 'Connection lost');

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = JSON.parse(writeCall[0]);
      expect(content.status).toBe('disconnected');
      expect(writeCall[1]).toMatchObject({
        category: 'mcp',
        source: 'server',
        filename: 'server_status.json',
        tags: ['mcp-server', 'status', 'disconnected'],
      });
    });

    it('should include message in status', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);
      mockedContextFs.readContextFile.mockResolvedValue(null);
      mockedContextFs.writeContextFile.mockResolvedValue(createMockContextFile('{}'));

      await updateMcpServerStatus('server', 'Server', 'error', 'API Error');

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = JSON.parse(writeCall[0]);
      
      expect(content.message).toBe('API Error');
    });
  });

  describe('clearMcpServerTools', () => {
    it('should delete all tools for a server', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server', filename: 'f1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'tool2', category: 'mcp', source: 'server', filename: 'f2.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);
      mockedContextFs.deleteContextFile.mockResolvedValue(true);

      const result = await clearMcpServerTools('server');

      expect(result).toBe(2);
      expect(mockedContextFs.deleteContextFile).toHaveBeenCalledTimes(2);
    });

    it('should return count of successfully deleted files', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'tool1', category: 'mcp', source: 'server', filename: 'f1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'tool2', category: 'mcp', source: 'server', filename: 'f2.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);
      mockedContextFs.deleteContextFile
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await clearMcpServerTools('server');

      expect(result).toBe(1);
    });

    it('should return 0 for empty server', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);

      const result = await clearMcpServerTools('empty-server');

      expect(result).toBe(0);
      expect(mockedContextFs.deleteContextFile).not.toHaveBeenCalled();
    });
  });
});
