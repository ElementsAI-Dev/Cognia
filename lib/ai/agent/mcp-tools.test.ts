/**
 * Tests for MCP Tools Adapter
 */

import { z } from 'zod';
import {
  convertMcpToolToAgentTool,
  convertMcpServerTools,
  convertAllMcpTools,
  createMcpToolsFromStore,
  createMcpToolsFromBackend,
  getMcpToolDescriptions,
  filterMcpToolsByServers,
  getMcpToolByOriginalName,
  formatMcpToolResult,
  scoreMcpToolRelevance,
  selectMcpToolsByRelevance,
  applyToolSelection,
  getMcpToolsWithSelection,
  getRecommendedMcpTools,
  type McpToolAdapterConfig,
} from './mcp-tools';
import type { McpTool, McpServerState, ToolCallResult, McpServerConfig, ToolUsageRecord } from '@/types/mcp';
import type { AgentTool } from './agent-executor';

const createMockServerConfig = (): McpServerConfig => ({
  name: 'Test',
  command: 'test',
  args: [],
  env: {},
  connectionType: 'stdio',
  enabled: true,
  autoStart: false,
});

const createMockServer = (overrides: Partial<McpServerState> & Pick<McpServerState, 'id' | 'name' | 'status' | 'tools'>): McpServerState => ({
  config: createMockServerConfig(),
  resources: [],
  prompts: [],
  reconnectAttempts: 0,
  ...overrides,
});

describe('formatMcpToolResult', () => {
  it('formats text content', () => {
    const result: ToolCallResult = {
      content: [{ type: 'text', text: 'Hello world' }],
      isError: false,
    };

    expect(formatMcpToolResult(result)).toBe('Hello world');
  });

  it('formats image content', () => {
    const result: ToolCallResult = {
      content: [{ type: 'image', mimeType: 'image/png', data: 'base64data' }],
      isError: false,
    };

    expect(formatMcpToolResult(result)).toBe('[Image: image/png]');
  });

  it('formats resource content with text', () => {
    const result: ToolCallResult = {
      content: [
        {
          type: 'resource',
          resource: { uri: 'file://test.txt', text: 'Resource content' },
        },
      ],
      isError: false,
    };

    expect(formatMcpToolResult(result)).toBe('Resource content');
  });

  it('formats resource content without text', () => {
    const result: ToolCallResult = {
      content: [
        {
          type: 'resource',
          resource: { uri: 'file://test.txt' },
        },
      ],
      isError: false,
    };

    expect(formatMcpToolResult(result)).toBe('[Resource: file://test.txt]');
  });

  it('formats multiple content items', () => {
    const result: ToolCallResult = {
      content: [
        { type: 'text', text: 'Line 1' },
        { type: 'text', text: 'Line 2' },
      ],
      isError: false,
    };

    expect(formatMcpToolResult(result)).toBe('Line 1\nLine 2');
  });

  it('handles unknown content type', () => {
    const result = {
      content: [{ type: 'unknown' }],
      isError: false,
    } as unknown as ToolCallResult;

    expect(formatMcpToolResult(result)).toBe('[Unknown content]');
  });
});

describe('convertMcpToolToAgentTool', () => {
  const mockCallTool = jest.fn();

  const baseMcpTool: McpTool = {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
  };

  const baseConfig: McpToolAdapterConfig = {
    callTool: mockCallTool,
    requireApproval: false,
    timeout: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates agent tool with correct name format', () => {
    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      baseConfig
    );

    expect(agentTool.name).toBe('mcp_server_1_test_tool');
  });

  it('includes server name in description', () => {
    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      baseConfig
    );

    expect(agentTool.description).toContain('[MCP: Test Server]');
    expect(agentTool.description).toContain('A test tool');
  });

  it('respects requireApproval setting', () => {
    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      { ...baseConfig, requireApproval: true }
    );

    expect(agentTool.requiresApproval).toBe(true);
  });

  it('executes tool call successfully', async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'Success result' }],
      isError: false,
    });

    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      baseConfig
    );

    const result = await agentTool.execute({ query: 'test' });

    expect(mockCallTool).toHaveBeenCalledWith('server-1', 'test_tool', { query: 'test' });
    expect(result).toMatchObject({
      success: true,
      result: 'Success result',
      serverId: 'server-1',
      serverName: 'Test Server',
      toolName: 'test_tool',
    });
  });

  it('handles error response from tool', async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'Error message' }],
      isError: true,
    });

    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      baseConfig
    );

    const result = await agentTool.execute({ query: 'test' });

    expect(result).toMatchObject({
      success: false,
      error: 'Error message',
    });
  });

  it('handles execution timeout', async () => {
    mockCallTool.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );

    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      { ...baseConfig, timeout: 100 }
    );

    const result = await agentTool.execute({ query: 'test' }) as { success: boolean; error?: string };

    expect(result).toMatchObject({
      success: false,
    });
    expect(result.error).toContain('timeout');
  });

  it('calls onError callback on failure', async () => {
    const onError = jest.fn();
    mockCallTool.mockRejectedValue(new Error('Connection failed'));

    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      baseMcpTool,
      { ...baseConfig, onError }
    );

    await agentTool.execute({ query: 'test' });

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      'server-1',
      'test_tool'
    );
  });

  it('handles tool with enum type in schema', () => {
    const toolWithEnum: McpTool = {
      name: 'enum_tool',
      description: 'Tool with enum',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['fast', 'slow'] },
        },
      },
    };

    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      toolWithEnum,
      baseConfig
    );

    expect(agentTool.parameters).toBeDefined();
  });

  it('handles tool with array type in schema', () => {
    const toolWithArray: McpTool = {
      name: 'array_tool',
      description: 'Tool with array',
      inputSchema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
        },
      },
    };

    const agentTool = convertMcpToolToAgentTool(
      'server-1',
      'Test Server',
      toolWithArray,
      baseConfig
    );

    expect(agentTool.parameters).toBeDefined();
  });
});

describe('convertMcpServerTools', () => {
  const mockCallTool = jest.fn();

  it('returns empty object for disconnected server', () => {
    const server = createMockServer({
      id: 'server-1',
      name: 'Test Server',
      status: { type: 'disconnected' },
      tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: {} }],
    });

    const tools = convertMcpServerTools(server, { callTool: mockCallTool });

    expect(Object.keys(tools)).toHaveLength(0);
  });

  it('returns empty object for server without tools', () => {
    const server = createMockServer({
      id: 'server-1',
      name: 'Test Server',
      status: { type: 'connected' },
      tools: [],
    });

    const tools = convertMcpServerTools(server, { callTool: mockCallTool });

    expect(Object.keys(tools)).toHaveLength(0);
  });

  it('converts all tools from connected server', () => {
    const server = createMockServer({
      id: 'server-1',
      name: 'Test Server',
      status: { type: 'connected' },
      tools: [
        { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } },
        { name: 'tool2', description: 'Tool 2', inputSchema: { type: 'object' } },
      ],
    });

    const tools = convertMcpServerTools(server, { callTool: mockCallTool });

    expect(Object.keys(tools)).toHaveLength(2);
    expect(tools.mcp_server_1_tool1).toBeDefined();
    expect(tools.mcp_server_1_tool2).toBeDefined();
  });
});

describe('convertAllMcpTools', () => {
  const mockCallTool = jest.fn();

  it('converts tools from multiple servers', () => {
    const servers: McpServerState[] = [
      createMockServer({
        id: 'server-1',
        name: 'Server 1',
        status: { type: 'connected' },
        tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } }],
      }),
      createMockServer({
        id: 'server-2',
        name: 'Server 2',
        status: { type: 'connected' },
        tools: [{ name: 'tool2', description: 'Tool 2', inputSchema: { type: 'object' } }],
      }),
    ];

    const tools = convertAllMcpTools(servers, { callTool: mockCallTool });

    expect(Object.keys(tools)).toHaveLength(2);
    expect(tools.mcp_server_1_tool1).toBeDefined();
    expect(tools.mcp_server_2_tool2).toBeDefined();
  });

  it('skips disconnected servers', () => {
    const servers: McpServerState[] = [
      createMockServer({
        id: 'server-1',
        name: 'Server 1',
        status: { type: 'connected' },
        tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } }],
      }),
      createMockServer({
        id: 'server-2',
        name: 'Server 2',
        status: { type: 'disconnected' },
        tools: [{ name: 'tool2', description: 'Tool 2', inputSchema: { type: 'object' } }],
      }),
    ];

    const tools = convertAllMcpTools(servers, { callTool: mockCallTool });

    expect(Object.keys(tools)).toHaveLength(1);
    expect(tools.mcp_server_1_tool1).toBeDefined();
    expect(tools.mcp_server_2_tool2).toBeUndefined();
  });
});

describe('createMcpToolsFromStore', () => {
  it('creates tools with default options', () => {
    const mockCallTool = jest.fn();
    const servers: McpServerState[] = [
      createMockServer({
        id: 'server-1',
        name: 'Server 1',
        status: { type: 'connected' },
        tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } }],
      }),
    ];

    const tools = createMcpToolsFromStore(servers, mockCallTool);

    expect(tools.mcp_server_1_tool1).toBeDefined();
    expect(tools.mcp_server_1_tool1.requiresApproval).toBe(false);
  });

  it('respects requireApproval option', () => {
    const mockCallTool = jest.fn();
    const servers: McpServerState[] = [
      createMockServer({
        id: 'server-1',
        name: 'Server 1',
        status: { type: 'connected' },
        tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } }],
      }),
    ];

    const tools = createMcpToolsFromStore(servers, mockCallTool, { requireApproval: true });

    expect(tools.mcp_server_1_tool1.requiresApproval).toBe(true);
  });
});

describe('createMcpToolsFromBackend', () => {
  it('creates tools from backend API', async () => {
    const mockGetAllTools = jest.fn().mockResolvedValue([
      { serverId: 'server-1', tool: { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } } },
    ]);
    const mockCallTool = jest.fn();
    const servers: McpServerState[] = [
      createMockServer({ id: 'server-1', name: 'Server 1', status: { type: 'connected' }, tools: [] }),
    ];

    const tools = await createMcpToolsFromBackend(mockGetAllTools, mockCallTool, servers);

    expect(mockGetAllTools).toHaveBeenCalled();
    expect(tools.mcp_server_1_tool1).toBeDefined();
  });

  it('handles backend API error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockGetAllTools = jest.fn().mockRejectedValue(new Error('API error'));
    const mockCallTool = jest.fn();
    const servers: McpServerState[] = [];

    const tools = await createMcpToolsFromBackend(mockGetAllTools, mockCallTool, servers);

    expect(tools).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('uses server name from servers list', async () => {
    const mockGetAllTools = jest.fn().mockResolvedValue([
      { serverId: 'server-1', tool: { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } } },
    ]);
    const mockCallTool = jest.fn();
    const servers: McpServerState[] = [
      createMockServer({ id: 'server-1', name: 'My Custom Server', status: { type: 'connected' }, tools: [] }),
    ];

    const tools = await createMcpToolsFromBackend(mockGetAllTools, mockCallTool, servers);

    expect(tools.mcp_server_1_tool1.description).toContain('My Custom Server');
  });
});

describe('getMcpToolDescriptions', () => {
  it('returns descriptions for all server tools', () => {
    const servers: McpServerState[] = [
      createMockServer({
        id: 'server-1',
        name: 'Server 1',
        status: { type: 'connected' },
        tools: [{ name: 'tool1', description: 'Tool 1 description', inputSchema: {} }],
      }),
      createMockServer({
        id: 'server-2',
        name: 'Server 2',
        status: { type: 'disconnected' },
        tools: [{ name: 'tool2', description: 'Tool 2 description', inputSchema: {} }],
      }),
    ];

    const descriptions = getMcpToolDescriptions(servers);

    expect(descriptions).toHaveLength(2);
    expect(descriptions[0]).toEqual({
      serverId: 'server-1',
      serverName: 'Server 1',
      toolName: 'tool1',
      description: 'Tool 1 description',
      isConnected: true,
    });
    expect(descriptions[1]).toEqual({
      serverId: 'server-2',
      serverName: 'Server 2',
      toolName: 'tool2',
      description: 'Tool 2 description',
      isConnected: false,
    });
  });

  it('uses tool name as fallback description', () => {
    const servers: McpServerState[] = [
      createMockServer({
        id: 'server-1',
        name: 'Server 1',
        status: { type: 'connected' },
        tools: [{ name: 'my_tool', inputSchema: {} }],
      }),
    ];

    const descriptions = getMcpToolDescriptions(servers);

    expect(descriptions[0].description).toBe('my_tool');
  });
});

describe('filterMcpToolsByServers', () => {
  it('filters tools by server IDs', () => {
    const tools = {
      mcp_server_1_tool1: { name: 'mcp_server_1_tool1', description: 'Tool 1', parameters: z.object({}), execute: jest.fn() },
      mcp_server_2_tool2: { name: 'mcp_server_2_tool2', description: 'Tool 2', parameters: z.object({}), execute: jest.fn() },
      mcp_server_3_tool3: { name: 'mcp_server_3_tool3', description: 'Tool 3', parameters: z.object({}), execute: jest.fn() },
    };

    const filtered = filterMcpToolsByServers(tools, ['server_1', 'server_3']);

    expect(Object.keys(filtered)).toHaveLength(2);
    expect(filtered.mcp_server_1_tool1).toBeDefined();
    expect(filtered.mcp_server_3_tool3).toBeDefined();
    expect(filtered.mcp_server_2_tool2).toBeUndefined();
  });

  it('returns empty object when no matches', () => {
    const tools = {
      mcp_server_1_tool1: { name: 'mcp_server_1_tool1', description: 'Tool 1', parameters: z.object({}), execute: jest.fn() },
    };

    const filtered = filterMcpToolsByServers(tools, ['server_2']);

    expect(Object.keys(filtered)).toHaveLength(0);
  });
});

describe('getMcpToolByOriginalName', () => {
  it('finds tool by server ID and original name', () => {
    const tool = { name: 'mcp_server_1_my_tool', description: 'Tool', parameters: z.object({}), execute: jest.fn() };
    const tools = { mcp_server_1_my_tool: tool };

    const found = getMcpToolByOriginalName(tools, 'server_1', 'my_tool');

    expect(found).toBe(tool);
  });

  it('returns undefined when tool not found', () => {
    const tools = {
      mcp_server_1_other_tool: { name: 'mcp_server_1_other_tool', description: 'Tool', parameters: z.object({}), execute: jest.fn() },
    };

    const found = getMcpToolByOriginalName(tools, 'server_1', 'my_tool');

    expect(found).toBeUndefined();
  });

  it('handles special characters in names', () => {
    const tool = { name: 'mcp_server_1_my_special_tool', description: 'Tool', parameters: z.object({}), execute: jest.fn() };
    const tools = { mcp_server_1_my_special_tool: tool };

    const found = getMcpToolByOriginalName(tools, 'server-1', 'my-special-tool');

    expect(found).toBe(tool);
  });
});

// =============================================================================
// Intelligent Tool Selection Tests
// =============================================================================

const createMockAgentTool = (name: string, description: string): AgentTool => ({
  name,
  description,
  parameters: z.object({}),
  execute: jest.fn(),
});

describe('scoreMcpToolRelevance', () => {
  it('scores tool with matching description higher', () => {
    const tool = createMockAgentTool('mcp_server1_web_search', 'Search the web for information');
    const context = { query: 'search for information on the web' };

    const scored = scoreMcpToolRelevance(tool, context);

    expect(scored.relevanceScore).toBeGreaterThan(0.3);
    expect(scored.scoreBreakdown.descriptionMatch).toBeGreaterThan(0);
  });

  it('scores tool with matching name higher', () => {
    const tool = createMockAgentTool('mcp_browser_search', 'A browser tool');
    const context = { query: 'I need to search something' };

    const scored = scoreMcpToolRelevance(tool, context);

    expect(scored.scoreBreakdown.nameMatch).toBeGreaterThan(0);
  });

  it('scores unrelated tool lower', () => {
    const tool = createMockAgentTool('mcp_server1_calculator', 'Perform math calculations');
    const context = { query: 'search for images of cats' };

    const scored = scoreMcpToolRelevance(tool, context);

    expect(scored.relevanceScore).toBeLessThan(0.3);
  });

  it('applies history boost when usage history provided', () => {
    const tool = createMockAgentTool('mcp_server1_tool', 'A tool');
    const context = { query: 'any query' };
    const usageHistory = new Map<string, ToolUsageRecord>([
      ['mcp_server1_tool', {
        toolName: 'mcp_server1_tool',
        usageCount: 10,
        successCount: 9,
        failureCount: 1,
        lastUsedAt: Date.now(),
        avgExecutionTime: 100,
      }],
    ]);

    const scoredWithHistory = scoreMcpToolRelevance(tool, context, usageHistory);
    const scoredWithoutHistory = scoreMcpToolRelevance(tool, context);

    expect(scoredWithHistory.scoreBreakdown.historyBoost).toBeGreaterThan(0);
    expect(scoredWithHistory.relevanceScore).toBeGreaterThan(scoredWithoutHistory.relevanceScore);
  });

  it('applies priority boost for priority servers', () => {
    const tool = createMockAgentTool('mcp_priorityserver_tool', 'A tool');
    const context = { query: 'any query' };

    const scoredWithPriority = scoreMcpToolRelevance(tool, context, undefined, ['priorityserver']);
    const scoredWithoutPriority = scoreMcpToolRelevance(tool, context);

    expect(scoredWithPriority.scoreBreakdown.priorityBoost).toBeGreaterThan(0);
    expect(scoredWithPriority.relevanceScore).toBeGreaterThan(scoredWithoutPriority.relevanceScore);
  });
});

describe('selectMcpToolsByRelevance', () => {
  const createToolSet = () => ({
    mcp_server1_web_search: createMockAgentTool('mcp_server1_web_search', 'Search the web for information'),
    mcp_server1_file_read: createMockAgentTool('mcp_server1_file_read', 'Read files from filesystem'),
    mcp_server2_calculator: createMockAgentTool('mcp_server2_calculator', 'Perform math calculations'),
    mcp_server2_image_gen: createMockAgentTool('mcp_server2_image_gen', 'Generate images from text'),
    mcp_server3_code_run: createMockAgentTool('mcp_server3_code_run', 'Execute code snippets'),
  });

  it('selects tools by relevance when over limit', () => {
    const tools = createToolSet();
    const context = { query: 'search for web information' };

    const result = selectMcpToolsByRelevance(tools, context, { maxTools: 2, minRelevanceScore: 0 });

    expect(result.selectedToolNames.length).toBe(2);
    expect(result.wasLimited).toBe(true);
    expect(result.selectedToolNames).toContain('mcp_server1_web_search');
  });

  it('includes all tools when under limit', () => {
    const tools = createToolSet();
    const context = { query: 'any query' };

    const result = selectMcpToolsByRelevance(tools, context, { maxTools: 10, enableRelevanceScoring: false });

    expect(result.selectedToolNames.length).toBe(5);
    expect(result.wasLimited).toBe(false);
  });

  it('respects alwaysIncludeTools', () => {
    const tools = createToolSet();
    const context = { query: 'search web' };

    const result = selectMcpToolsByRelevance(tools, context, {
      maxTools: 2,
      alwaysIncludeTools: ['mcp_server2_calculator'],
    });

    expect(result.selectedToolNames).toContain('mcp_server2_calculator');
  });

  it('respects alwaysExcludeTools', () => {
    const tools = createToolSet();
    const context = { query: 'search web' };

    const result = selectMcpToolsByRelevance(tools, context, {
      maxTools: 10,
      alwaysExcludeTools: ['mcp_server1_web_search'],
    });

    expect(result.selectedToolNames).not.toContain('mcp_server1_web_search');
    expect(result.excludedToolNames).toContain('mcp_server1_web_search');
  });

  it('filters by minimum relevance score', () => {
    const tools = createToolSet();
    const context = { query: 'very specific unique query xyz123' };

    const result = selectMcpToolsByRelevance(tools, context, {
      maxTools: 10,
      enableRelevanceScoring: true,
      minRelevanceScore: 0.5,
    });

    // Most tools won't match a very specific query
    expect(result.selectedToolNames.length).toBeLessThan(5);
  });

  it('provides relevance scores in result', () => {
    const tools = createToolSet();
    const context = { query: 'search web' };

    const result = selectMcpToolsByRelevance(tools, context, { maxTools: 3 });

    expect(Object.keys(result.relevanceScores).length).toBeGreaterThan(0);
    expect(result.relevanceScores['mcp_server1_web_search']).toBeDefined();
  });
});

describe('applyToolSelection', () => {
  it('filters tools based on selection result', () => {
    const tools = {
      tool1: createMockAgentTool('tool1', 'Tool 1'),
      tool2: createMockAgentTool('tool2', 'Tool 2'),
      tool3: createMockAgentTool('tool3', 'Tool 3'),
    };

    const selection = {
      selectedToolNames: ['tool1', 'tool3'],
      excludedToolNames: ['tool2'],
      totalAvailable: 3,
      selectionReason: 'Test',
      relevanceScores: {},
      wasLimited: true,
    };

    const filtered = applyToolSelection(tools, selection);

    expect(Object.keys(filtered)).toHaveLength(2);
    expect(filtered.tool1).toBeDefined();
    expect(filtered.tool3).toBeDefined();
    expect(filtered.tool2).toBeUndefined();
  });
});

describe('getMcpToolsWithSelection', () => {
  it('returns all tools when under limit', () => {
    const tools = {
      tool1: createMockAgentTool('tool1', 'Tool 1'),
      tool2: createMockAgentTool('tool2', 'Tool 2'),
    };

    const result = getMcpToolsWithSelection(tools, { query: 'test' }, { maxTools: 10 });

    expect(Object.keys(result.tools)).toHaveLength(2);
    expect(result.selection.wasLimited).toBe(false);
  });

  it('applies selection when over limit', () => {
    const tools = {
      tool1: createMockAgentTool('tool1', 'Search the web for information'),
      tool2: createMockAgentTool('tool2', 'Search and browse websites'),
      tool3: createMockAgentTool('tool3', 'Calculate numbers'),
      tool4: createMockAgentTool('tool4', 'Generate images'),
    };

    const result = getMcpToolsWithSelection(
      tools,
      { query: 'search web information' },
      { maxTools: 2, minRelevanceScore: 0 } // Disable min score filter for this test
    );

    expect(Object.keys(result.tools)).toHaveLength(2);
    expect(result.selection.wasLimited).toBe(true);
  });

  it('returns all tools when strategy is manual', () => {
    const tools = {
      tool1: createMockAgentTool('tool1', 'Tool 1'),
      tool2: createMockAgentTool('tool2', 'Tool 2'),
      tool3: createMockAgentTool('tool3', 'Tool 3'),
    };

    const result = getMcpToolsWithSelection(
      tools,
      { query: 'test' },
      { maxTools: 1, strategy: 'manual' }
    );

    expect(Object.keys(result.tools)).toHaveLength(3);
  });
});

describe('getRecommendedMcpTools', () => {
  it('returns top N recommended tools', () => {
    const tools = {
      mcp_s1_web_search: createMockAgentTool('mcp_s1_web_search', 'Search the web'),
      mcp_s1_file_read: createMockAgentTool('mcp_s1_file_read', 'Read files'),
      mcp_s2_calculator: createMockAgentTool('mcp_s2_calculator', 'Calculate numbers'),
    };

    const recommended = getRecommendedMcpTools(tools, 'search web', 2);

    expect(recommended.length).toBe(2);
    expect(recommended[0].relevanceScore).toBeGreaterThanOrEqual(recommended[1].relevanceScore);
  });

  it('sorts by relevance score descending', () => {
    const tools = {
      mcp_s1_web_search: createMockAgentTool('mcp_s1_web_search', 'Search the web for anything'),
      mcp_s1_other: createMockAgentTool('mcp_s1_other', 'Something else entirely different'),
    };

    const recommended = getRecommendedMcpTools(tools, 'search web information', 2);

    expect(recommended[0].name).toBe('mcp_s1_web_search');
    expect(recommended[0].relevanceScore).toBeGreaterThan(recommended[1].relevanceScore);
  });

  it('respects limit parameter', () => {
    const tools = {
      tool1: createMockAgentTool('tool1', 'Tool 1'),
      tool2: createMockAgentTool('tool2', 'Tool 2'),
      tool3: createMockAgentTool('tool3', 'Tool 3'),
      tool4: createMockAgentTool('tool4', 'Tool 4'),
      tool5: createMockAgentTool('tool5', 'Tool 5'),
    };

    const recommended = getRecommendedMcpTools(tools, 'any query', 3);

    expect(recommended.length).toBe(3);
  });
});
