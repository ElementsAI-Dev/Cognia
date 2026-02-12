/**
 * Tests for useMcpServerHealth hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpServerHealth } from './use-mcp-server-health';
import type { McpServerState } from '@/types/mcp';

// Mock format-utils
jest.mock('@/lib/mcp/format-utils', () => ({
  formatLatency: jest.fn((ms?: number) => {
    if (ms === undefined) return '-';
    if (ms < 1) return '<1ms';
    return `${Math.round(ms)}ms`;
  }),
  formatRelativeTimestamp: jest.fn((ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return '<1m ago';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }),
}));

// Mock the MCP store with selector support
const mockStoreState: Record<string, unknown> = {};
jest.mock('@/stores', () => ({
  useMcpStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  }),
}));

describe('useMcpServerHealth', () => {
  const mockPingServer = jest.fn();
  const mockConnectServer = jest.fn();
  const mockDisconnectServer = jest.fn();

  const createServer = (overrides: Partial<McpServerState> = {}): McpServerState => ({
    id: 'server-1',
    name: 'Test Server',
    config: {
      name: 'Test Server',
      command: 'test',
      args: [],
      env: {},
      connectionType: 'stdio',
      url: '',
      enabled: true,
      autoStart: false,
    },
    status: { type: 'connected' },
    tools: [],
    resources: [],
    prompts: [],
    reconnectAttempts: 0,
    ...overrides,
  });

  const setMockStore = (overrides: Record<string, unknown> = {}) => {
    Object.assign(mockStoreState, {
      servers: [createServer()],
      serverHealthMap: new Map(),
      pingServer: mockPingServer,
      connectServer: mockConnectServer,
      disconnectServer: mockDisconnectServer,
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockStoreState)) delete mockStoreState[key];
  });

  describe('initial state', () => {
    it('should return servers and health data', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.servers).toHaveLength(1);
      expect(result.current.serverHealthMap.size).toBe(0);
      expect(result.current.pingingServers.size).toBe(0);
      expect(typeof result.current.handlePing).toBe('function');
      expect(typeof result.current.handlePingAll).toBe('function');
      expect(typeof result.current.getHealthStatus).toBe('function');
      expect(typeof result.current.getLatencyDisplay).toBe('function');
      expect(typeof result.current.getTimestampDisplay).toBe('function');
      expect(typeof result.current.getLatencyColor).toBe('function');
    });
  });

  describe('connectedServers', () => {
    it('should filter to only connected servers', () => {
      const servers = [
        createServer({ id: 'srv-1', status: { type: 'connected' } }),
        createServer({ id: 'srv-2', status: { type: 'disconnected' } }),
        createServer({ id: 'srv-3', status: { type: 'connected' } }),
      ];
      setMockStore({ servers });

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.connectedServers).toHaveLength(2);
      expect(result.current.connectedServers.map((s) => s.id)).toEqual(['srv-1', 'srv-3']);
    });
  });

  describe('handlePing', () => {
    it('should call pingServer and manage pinging state', async () => {
      mockPingServer.mockResolvedValue(undefined);
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      await act(async () => {
        await result.current.handlePing('server-1');
      });

      expect(mockPingServer).toHaveBeenCalledWith('server-1');
      expect(result.current.pingingServers.has('server-1')).toBe(false);
    });

    it('should handle ping errors gracefully', async () => {
      mockPingServer.mockRejectedValue(new Error('ping failed'));
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      await expect(
        act(async () => {
          await result.current.handlePing('server-1');
        })
      ).resolves.not.toThrow();

      expect(result.current.pingingServers.has('server-1')).toBe(false);
    });
  });

  describe('handlePingAll', () => {
    it('should ping all connected servers', async () => {
      mockPingServer.mockResolvedValue(undefined);
      const servers = [
        createServer({ id: 'srv-1', status: { type: 'connected' } }),
        createServer({ id: 'srv-2', status: { type: 'connected' } }),
      ];
      setMockStore({ servers });

      const { result } = renderHook(() => useMcpServerHealth());

      await act(async () => {
        await result.current.handlePingAll();
      });

      expect(mockPingServer).toHaveBeenCalledTimes(2);
      expect(mockPingServer).toHaveBeenCalledWith('srv-1');
      expect(mockPingServer).toHaveBeenCalledWith('srv-2');
    });
  });

  describe('getHealthStatus', () => {
    it('should return "unknown" when no health data', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getHealthStatus('server-1')).toBe('unknown');
    });

    it('should return "healthy" when isHealthy is true', () => {
      const healthMap = new Map([
        ['server-1', { isHealthy: true, pingLatencyMs: 50, failedPings: 0, lastPingAt: Date.now() }],
      ]);
      setMockStore({ serverHealthMap: healthMap });

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getHealthStatus('server-1')).toBe('healthy');
    });

    it('should return "unhealthy" when isHealthy is false', () => {
      const healthMap = new Map([
        ['server-1', { isHealthy: false, pingLatencyMs: 5000, failedPings: 3, lastPingAt: Date.now() }],
      ]);
      setMockStore({ serverHealthMap: healthMap });

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getHealthStatus('server-1')).toBe('unhealthy');
    });
  });

  describe('getLatencyDisplay', () => {
    it('should format latency from format-utils', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getLatencyDisplay(150)).toBe('150ms');
      expect(result.current.getLatencyDisplay(undefined)).toBe('-');
      expect(result.current.getLatencyDisplay(0.5)).toBe('<1ms');
    });
  });

  describe('getTimestampDisplay', () => {
    it('should return "-" for falsy timestamp', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getTimestampDisplay(undefined)).toBe('-');
      expect(result.current.getTimestampDisplay(0)).toBe('-');
    });

    it('should format timestamp from format-utils', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getTimestampDisplay(Date.now() - 30000)).toBe('<1m ago');
    });
  });

  describe('getLatencyColor', () => {
    it('should return muted color for undefined', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getLatencyColor(undefined)).toBe('text-muted-foreground');
    });

    it('should return green for low latency', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getLatencyColor(50)).toBe('text-green-600');
    });

    it('should return yellow for medium latency', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getLatencyColor(300)).toBe('text-yellow-600');
    });

    it('should return destructive for high latency', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      expect(result.current.getLatencyColor(1000)).toBe('text-destructive');
    });
  });

  describe('connectServer / disconnectServer', () => {
    it('should delegate connectServer to store', async () => {
      mockConnectServer.mockResolvedValue(undefined);
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      await act(async () => {
        await result.current.connectServer('server-1');
      });

      expect(mockConnectServer).toHaveBeenCalledWith('server-1');
    });

    it('should delegate disconnectServer to store', async () => {
      mockDisconnectServer.mockResolvedValue(undefined);
      setMockStore();

      const { result } = renderHook(() => useMcpServerHealth());

      await act(async () => {
        await result.current.disconnectServer('server-1');
      });

      expect(mockDisconnectServer).toHaveBeenCalledWith('server-1');
    });
  });
});
