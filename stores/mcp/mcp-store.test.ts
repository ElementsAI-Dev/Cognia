/**
 * Tests for MCP Store
 */

import { useMcpStore } from './mcp-store';
import { act } from '@testing-library/react';
import type {
  McpServerConfig,
  McpServerState,
  McpServerStatus,
  ToolUsageRecord,
} from '@/types/mcp';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';

// Mock Tauri environment
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {},
  writable: true,
});

// Mock plugin event hooks
const mockDispatchMCPServerConnect = jest.fn();
const mockDispatchMCPServerDisconnect = jest.fn();
const mockDispatchMCPToolCall = jest.fn();
const mockDispatchMCPToolResult = jest.fn();
jest.mock('@/lib/plugin', () => ({
  getPluginEventHooks: () => ({
    dispatchMCPServerConnect: mockDispatchMCPServerConnect,
    dispatchMCPServerDisconnect: mockDispatchMCPServerDisconnect,
    dispatchMCPToolCall: mockDispatchMCPToolCall,
    dispatchMCPToolResult: mockDispatchMCPToolResult,
  }),
}));

// Mock Tauri APIs
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockResolvedValue(jest.fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;

// Helper to create mock server config
const createMockConfig = (name: string): McpServerConfig => ({
  name,
  command: 'npx',
  args: ['server'],
  env: {},
  connectionType: 'stdio',
  enabled: true,
  autoStart: false,
});

// Helper to create mock server state
const createMockServerState = (
  id: string,
  name: string,
  status: McpServerStatus = { type: 'disconnected' }
): McpServerState => ({
  id,
  name,
  config: createMockConfig(name),
  status,
  tools: [],
  resources: [],
  prompts: [],
  reconnectAttempts: 0,
});

describe('useMcpStore', () => {
  beforeEach(() => {
    // Reset store state
    useMcpStore.setState({
      servers: [],
      isLoading: false,
      error: null,
      isInitialized: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useMcpStore.getState();
      expect(state.servers).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('sets up event listeners and loads servers', async () => {
      const mockServers = [createMockServerState('test-server', 'Test Server')];

      mockInvoke.mockResolvedValueOnce(mockServers);

      await act(async () => {
        await useMcpStore.getState().initialize();
      });

      expect(mockListen).toHaveBeenCalledWith('mcp:server-update', expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith('mcp:servers-changed', expect.any(Function));
      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_servers');
      expect(useMcpStore.getState().isInitialized).toBe(true);
    });

    it('does not re-initialize if already initialized', async () => {
      useMcpStore.setState({ isInitialized: true });

      await act(async () => {
        await useMcpStore.getState().initialize();
      });

      expect(mockListen).not.toHaveBeenCalled();
    });

    it('sets error on initialization failure', async () => {
      mockListen.mockRejectedValueOnce(new Error('Init failed'));

      await act(async () => {
        await useMcpStore.getState().initialize();
      });

      expect(useMcpStore.getState().error).toBe('Error: Init failed');
    });
  });

  describe('loadServers', () => {
    it('loads servers from backend', async () => {
      const mockServers = [
        {
          ...createMockServerState('server-1', 'Server 1', { type: 'connected' }),
          tools: [{ name: 'tool1', description: 'Test tool', inputSchema: {} }],
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockServers);

      await act(async () => {
        await useMcpStore.getState().loadServers();
      });

      expect(useMcpStore.getState().servers).toEqual(mockServers);
      expect(useMcpStore.getState().isLoading).toBe(false);
    });

    it('sets error on load failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Load failed'));

      await act(async () => {
        await useMcpStore.getState().loadServers();
      });

      expect(useMcpStore.getState().error).toBe('Error: Load failed');
      expect(useMcpStore.getState().isLoading).toBe(false);
    });
  });

  describe('addServer', () => {
    it('adds a new server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // mcp_add_server
      mockInvoke.mockResolvedValueOnce([]); // loadServers

      await act(async () => {
        await useMcpStore.getState().addServer('new-server', createMockConfig('New Server'));
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_add_server', {
        id: 'new-server',
        config: expect.objectContaining({ name: 'New Server' }),
      });
    });

    it('throws error on add failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Add failed'));

      await expect(
        useMcpStore.getState().addServer('new-server', createMockConfig('New Server'))
      ).rejects.toThrow('Add failed');

      expect(useMcpStore.getState().error).toBe('Error: Add failed');
    });
  });

  describe('removeServer', () => {
    it('removes a server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // mcp_remove_server
      mockInvoke.mockResolvedValueOnce([]); // loadServers

      await act(async () => {
        await useMcpStore.getState().removeServer('server-to-remove');
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_remove_server', { id: 'server-to-remove' });
    });
  });

  describe('connectServer', () => {
    it('connects to a server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useMcpStore.getState().connectServer('server-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_connect_server', { id: 'server-1' });
    });
  });

  describe('disconnectServer', () => {
    it('disconnects from a server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useMcpStore.getState().disconnectServer('server-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_disconnect_server', { id: 'server-1' });
    });
  });

  describe('callTool', () => {
    it('calls a tool on a server', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Tool result' }],
        isError: false,
      };
      mockInvoke.mockResolvedValueOnce(mockResult);

      const result = await useMcpStore
        .getState()
        .callTool('server-1', 'test-tool', { arg: 'value' });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_call_tool', {
        serverId: 'server-1',
        toolName: 'test-tool',
        arguments: { arg: 'value' },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('readResource', () => {
    it('reads a resource from a server', async () => {
      const mockContent = {
        uri: 'file://test.txt',
        mimeType: 'text/plain',
        text: 'File content',
      };
      mockInvoke.mockResolvedValueOnce(mockContent);

      const result = await useMcpStore.getState().readResource('server-1', 'file://test.txt');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_read_resource', {
        serverId: 'server-1',
        uri: 'file://test.txt',
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('getPrompt', () => {
    it('gets a prompt from a server', async () => {
      const mockPrompt = {
        messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
      };
      mockInvoke.mockResolvedValueOnce(mockPrompt);

      const result = await useMcpStore
        .getState()
        .getPrompt('server-1', 'greeting', { name: 'Test' });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_prompt', {
        serverId: 'server-1',
        name: 'greeting',
        arguments: { name: 'Test' },
      });
      expect(result).toEqual(mockPrompt);
    });
  });

  describe('getAllTools', () => {
    it('gets all tools from all servers', async () => {
      const mockTools = [
        ['server-1', { name: 'tool1', description: 'Tool 1' }],
        ['server-2', { name: 'tool2', description: 'Tool 2' }],
      ];
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'mcp_get_all_tools') {
          return Promise.resolve(mockTools);
        }
        return Promise.resolve(undefined);
      });

      const result = await useMcpStore.getState().getAllTools();

      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_all_tools');
      expect(result).toEqual([
        { serverId: 'server-1', tool: { name: 'tool1', description: 'Tool 1' } },
        { serverId: 'server-2', tool: { name: 'tool2', description: 'Tool 2' } },
      ]);
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      useMcpStore.setState({ error: 'Some error' });

      act(() => {
        useMcpStore.getState().clearError();
      });

      expect(useMcpStore.getState().error).toBeNull();
    });
  });

  describe('internal state updates', () => {
    it('_updateServer updates a specific server', () => {
      const initialServers = [
        createMockServerState('server-1', 'Server 1'),
        createMockServerState('server-2', 'Server 2'),
      ];
      useMcpStore.setState({ servers: initialServers });

      act(() => {
        useMcpStore.getState()._updateServer({
          ...createMockServerState('server-1', 'Server 1', { type: 'connected' }),
          tools: [{ name: 'new-tool', inputSchema: {} }],
        });
      });

      const state = useMcpStore.getState();
      expect(state.servers[0].status).toEqual({ type: 'connected' });
      expect(state.servers[0].tools).toHaveLength(1);
      expect(state.servers[1].status).toEqual({ type: 'disconnected' });
    });

    it('_setServers replaces all servers', () => {
      useMcpStore.setState({ servers: [createMockServerState('old', 'Old Server')] });

      const newServers = [
        createMockServerState('new-1', 'New Server 1', { type: 'connected' }),
        createMockServerState('new-2', 'New Server 2'),
      ];

      act(() => {
        useMcpStore.getState()._setServers(newServers);
      });

      expect(useMcpStore.getState().servers).toEqual(newServers);
    });
  });

  // =========================================================================
  // Tool Selection State Tests
  // =========================================================================

  describe('tool selection config', () => {
    beforeEach(() => {
      useMcpStore.setState({
        toolSelectionConfig: { ...DEFAULT_TOOL_SELECTION_CONFIG },
        toolUsageHistory: new Map<string, ToolUsageRecord>(),
        lastToolSelection: null,
      });
    });

    it('has default tool selection config', () => {
      const state = useMcpStore.getState();
      expect(state.toolSelectionConfig).toEqual(DEFAULT_TOOL_SELECTION_CONFIG);
    });

    it('setToolSelectionConfig updates config partially', () => {
      act(() => {
        useMcpStore.getState().setToolSelectionConfig({ maxTools: 30 });
      });

      const state = useMcpStore.getState();
      expect(state.toolSelectionConfig.maxTools).toBe(30);
      expect(state.toolSelectionConfig.strategy).toBe(DEFAULT_TOOL_SELECTION_CONFIG.strategy);
    });

    it('setToolSelectionConfig merges multiple updates', () => {
      act(() => {
        useMcpStore.getState().setToolSelectionConfig({ maxTools: 25 });
        useMcpStore.getState().setToolSelectionConfig({ strategy: 'manual' });
      });

      const state = useMcpStore.getState();
      expect(state.toolSelectionConfig.maxTools).toBe(25);
      expect(state.toolSelectionConfig.strategy).toBe('manual');
    });
  });

  describe('tool usage history', () => {
    beforeEach(() => {
      useMcpStore.setState({
        toolUsageHistory: new Map<string, ToolUsageRecord>(),
      });
    });

    it('recordToolUsage creates new record', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 100);
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record).toBeDefined();
      expect(record?.usageCount).toBe(1);
      expect(record?.successCount).toBe(1);
      expect(record?.failureCount).toBe(0);
      expect(record?.avgExecutionTime).toBe(100);
    });

    it('recordToolUsage updates existing record', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 100);
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 200);
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record?.usageCount).toBe(2);
      expect(record?.successCount).toBe(2);
      expect(record?.avgExecutionTime).toBe(150); // (100 + 200) / 2
    });

    it('recordToolUsage tracks failures', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 100);
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', false, 50);
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record?.usageCount).toBe(2);
      expect(record?.successCount).toBe(1);
      expect(record?.failureCount).toBe(1);
    });

    it('recordToolUsage updates lastUsedAt', () => {
      const beforeTime = Date.now();

      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true);
      });

      const afterTime = Date.now();
      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record?.lastUsedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(record?.lastUsedAt).toBeLessThanOrEqual(afterTime);
    });

    it('resetToolUsageHistory clears all history', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('tool1', true);
        useMcpStore.getState().recordToolUsage('tool2', true);
        useMcpStore.getState().resetToolUsageHistory();
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      expect(history.size).toBe(0);
    });
  });

  describe('last tool selection', () => {
    it('setLastToolSelection stores selection result', () => {
      const selection = {
        selectedToolNames: ['tool1', 'tool2'],
        excludedToolNames: ['tool3'],
        totalAvailable: 3,
        selectionReason: 'Test selection',
        relevanceScores: { tool1: 0.8, tool2: 0.6 },
        wasLimited: true,
      };

      act(() => {
        useMcpStore.getState().setLastToolSelection(selection);
      });

      expect(useMcpStore.getState().lastToolSelection).toEqual(selection);
    });

    it('setLastToolSelection can clear selection', () => {
      act(() => {
        useMcpStore.getState().setLastToolSelection({
          selectedToolNames: ['tool1'],
          excludedToolNames: [],
          totalAvailable: 1,
          selectionReason: 'Test',
          relevanceScores: {},
          wasLimited: false,
        });
        useMcpStore.getState().setLastToolSelection(null);
      });

      expect(useMcpStore.getState().lastToolSelection).toBeNull();
    });
  });

  // =========================================================================
  // Log Management Tests
  // =========================================================================

  describe('log management', () => {
    beforeEach(() => {
      useMcpStore.setState({ logs: [] });
    });

    it('has empty logs initially', () => {
      expect(useMcpStore.getState().logs).toEqual([]);
    });

    it('addLog adds a new log entry', () => {
      act(() => {
        useMcpStore.getState().addLog({
          level: 'info',
          message: 'Test log message',
          serverId: 'server-1',
          serverName: 'Test Server',
        });
      });

      const logs = useMcpStore.getState().logs;
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].level).toBe('info');
      expect(logs[0].serverId).toBe('server-1');
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('addLog prepends new entries (newest first)', () => {
      act(() => {
        useMcpStore.getState().addLog({ level: 'info', message: 'First' });
        useMcpStore.getState().addLog({ level: 'info', message: 'Second' });
      });

      const logs = useMcpStore.getState().logs;
      expect(logs[0].message).toBe('Second');
      expect(logs[1].message).toBe('First');
    });

    it('addLog respects max log entries limit', () => {
      act(() => {
        for (let i = 0; i < 510; i++) {
          useMcpStore.getState().addLog({ level: 'info', message: `Log ${i}` });
        }
      });

      const logs = useMcpStore.getState().logs;
      expect(logs.length).toBeLessThanOrEqual(500);
    });

    it('clearLogs removes all logs', () => {
      act(() => {
        useMcpStore.getState().addLog({ level: 'info', message: 'Test 1' });
        useMcpStore.getState().addLog({ level: 'error', message: 'Test 2' });
        useMcpStore.getState().clearLogs();
      });

      expect(useMcpStore.getState().logs).toEqual([]);
    });
  });

  // =========================================================================
  // Test Connection Tests
  // =========================================================================

  describe('testConnection', () => {
    it('calls mcp_test_connection command', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await useMcpStore.getState().testConnection('server-1');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_test_connection', { serverId: 'server-1' });
      expect(result).toBe(true);
    });

    it('returns false for disconnected server', async () => {
      mockInvoke.mockResolvedValueOnce(false);

      const result = await useMcpStore.getState().testConnection('server-1');

      expect(result).toBe(false);
    });
  });

  describe('pingServer', () => {
    it('calls mcp_ping_server and returns latency', async () => {
      mockInvoke.mockResolvedValueOnce(42);

      const result = await useMcpStore.getState().pingServer('server-1');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_ping_server', { serverId: 'server-1' });
      expect(result).toBe(42);
    });
  });

  // =========================================================================
  // Scheme 1: subscribeResource / unsubscribeResource
  // =========================================================================

  describe('subscribeResource', () => {
    it('calls mcp_subscribe_resource command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useMcpStore.getState().subscribeResource('server-1', 'file://test.txt');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_subscribe_resource', {
        serverId: 'server-1',
        uri: 'file://test.txt',
      });
    });
  });

  describe('unsubscribeResource', () => {
    it('calls mcp_unsubscribe_resource command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useMcpStore.getState().unsubscribeResource('server-1', 'file://test.txt');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_unsubscribe_resource', {
        serverId: 'server-1',
        uri: 'file://test.txt',
      });
    });
  });

  // =========================================================================
  // Scheme 2: Server health tracking
  // =========================================================================

  describe('server health tracking', () => {
    it('has empty serverHealthMap initially', () => {
      const state = useMcpStore.getState();
      expect(state.serverHealthMap.size).toBe(0);
    });

    it('getServerHealth returns undefined for unknown server', () => {
      const health = useMcpStore.getState().getServerHealth('unknown');
      expect(health).toBeUndefined();
    });

    it('getAllServerHealth returns empty array initially', () => {
      const healths = useMcpStore.getState().getAllServerHealth();
      expect(healths).toEqual([]);
    });

    it('getServerHealth returns health after state update', () => {
      const mockHealth = {
        serverId: 'server-1',
        isHealthy: true,
        lastPingAt: Date.now(),
        pingLatencyMs: 15,
        failedPings: 0,
      };

      useMcpStore.setState({
        serverHealthMap: new Map([['server-1', mockHealth]]),
      });

      const health = useMcpStore.getState().getServerHealth('server-1');
      expect(health).toEqual(mockHealth);
      expect(health?.isHealthy).toBe(true);
    });

    it('getAllServerHealth returns all health entries', () => {
      const health1 = {
        serverId: 'server-1',
        isHealthy: true,
        failedPings: 0,
      };
      const health2 = {
        serverId: 'server-2',
        isHealthy: false,
        failedPings: 3,
      };

      useMcpStore.setState({
        serverHealthMap: new Map([
          ['server-1', health1 as never],
          ['server-2', health2 as never],
        ]),
      });

      const healths = useMcpStore.getState().getAllServerHealth();
      expect(healths).toHaveLength(2);
    });
  });

  // =========================================================================
  // Scheme 5: cancelRequest
  // =========================================================================

  describe('cancelRequest', () => {
    it('calls mcp_cancel_request command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useMcpStore.getState().cancelRequest('server-1', 'req-123', 'user cancelled');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_cancel_request', {
        serverId: 'server-1',
        requestId: 'req-123',
        reason: 'user cancelled',
      });
    });

    it('calls mcp_cancel_request without reason', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useMcpStore.getState().cancelRequest('server-1', 'req-456');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_cancel_request', {
        serverId: 'server-1',
        requestId: 'req-456',
        reason: undefined,
      });
    });
  });

  // =========================================================================
  // Scheme 6: listResourceTemplates
  // =========================================================================

  describe('listResourceTemplates', () => {
    it('calls mcp_list_resource_templates and returns templates', async () => {
      const mockTemplates = [
        { uriTemplate: 'file:///{path}', name: 'File', description: 'A file' },
        { uriTemplate: 'db://{table}/{id}', name: 'DB Record' },
      ];
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const result = await useMcpStore.getState().listResourceTemplates('server-1');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_list_resource_templates', {
        serverId: 'server-1',
      });
      expect(result).toEqual(mockTemplates);
      expect(result).toHaveLength(2);
    });
  });

  // =========================================================================
  // Scheme 7: complete
  // =========================================================================

  describe('complete', () => {
    it('calls mcp_complete with correct parameters', async () => {
      const mockResult = {
        completion: { values: ['option1', 'option2'], hasMore: false, total: 2 },
      };
      mockInvoke.mockResolvedValueOnce(mockResult);

      const result = await useMcpStore
        .getState()
        .complete('server-1', 'ref/prompt', 'my-prompt', 'arg1', 'val');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_complete', {
        serverId: 'server-1',
        refType: 'ref/prompt',
        refName: 'my-prompt',
        argumentName: 'arg1',
        argumentValue: 'val',
      });
      expect(result).toEqual(mockResult);
    });
  });

  // =========================================================================
  // Scheme 8: setRoots / getRoots
  // =========================================================================

  describe('setRoots', () => {
    it('calls mcp_set_roots command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const roots = [
        { uri: 'file:///project', name: 'Project' },
        { uri: 'file:///docs' },
      ];

      await useMcpStore.getState().setRoots('server-1', roots);

      expect(mockInvoke).toHaveBeenCalledWith('mcp_set_roots', {
        serverId: 'server-1',
        roots,
      });
    });
  });

  describe('getRoots', () => {
    it('calls mcp_get_roots and returns roots', async () => {
      const mockRoots = [
        { uri: 'file:///project', name: 'Project' },
      ];
      mockInvoke.mockResolvedValueOnce(mockRoots);

      const result = await useMcpStore.getState().getRoots('server-1');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_roots', { serverId: 'server-1' });
      expect(result).toEqual(mockRoots);
    });
  });

  // =========================================================================
  // Scheme 9: respondToSampling
  // =========================================================================

  describe('respondToSampling', () => {
    it('calls mcp_respond_sampling command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const result = {
        role: 'assistant',
        content: { type: 'text', text: 'Hello!' },
        model: 'gpt-4',
      };

      await useMcpStore.getState().respondToSampling('server-1', 'req-789', result);

      expect(mockInvoke).toHaveBeenCalledWith('mcp_respond_sampling', {
        serverId: 'server-1',
        requestId: 'req-789',
        result,
      });
    });
  });

  // =========================================================================
  // Plugin Hook Dispatches
  // =========================================================================

  describe('plugin hook dispatches', () => {
    it('should dispatch onMCPServerConnect after successful connect', async () => {
      useMcpStore.setState({
        servers: [createMockServerState('server-1', 'Test Server')],
      });
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useMcpStore.getState().connectServer('server-1');
      });

      expect(mockDispatchMCPServerConnect).toHaveBeenCalledWith('server-1', 'Test Server');
    });

    it('should not dispatch onMCPServerConnect on connect failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        useMcpStore.getState().connectServer('server-1')
      ).rejects.toThrow();

      expect(mockDispatchMCPServerConnect).not.toHaveBeenCalled();
    });

    it('should dispatch onMCPServerDisconnect after successful disconnect', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useMcpStore.getState().disconnectServer('server-1');
      });

      expect(mockDispatchMCPServerDisconnect).toHaveBeenCalledWith('server-1');
    });

    it('should dispatch onMCPToolCall before tool execution', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'result' }],
        isError: false,
      };
      mockInvoke.mockResolvedValueOnce(mockResult);

      await useMcpStore.getState().callTool('server-1', 'read_file', { path: '/tmp/test' });

      expect(mockDispatchMCPToolCall).toHaveBeenCalledWith('server-1', 'read_file', { path: '/tmp/test' });
    });

    it('should dispatch onMCPToolResult after tool execution', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'file content' }],
        isError: false,
      };
      mockInvoke.mockResolvedValueOnce(mockResult);

      await useMcpStore.getState().callTool('server-1', 'read_file', { path: '/tmp/test' });

      expect(mockDispatchMCPToolResult).toHaveBeenCalledWith('server-1', 'read_file', mockResult);
    });
  });
});
