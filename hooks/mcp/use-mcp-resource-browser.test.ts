/**
 * Tests for useMcpResourceBrowser hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpResourceBrowser } from './use-mcp-resource-browser';
import type { McpServerState } from '@/types/mcp';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock the MCP store with selector support
const mockStoreState: Record<string, unknown> = {};
jest.mock('@/stores', () => ({
  useMcpStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  }),
}));

describe('useMcpResourceBrowser', () => {
  const mockReadResource = jest.fn();
  const mockSubscribeResource = jest.fn();
  const mockUnsubscribeResource = jest.fn();
  const mockListResourceTemplates = jest.fn();

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
    resources: [
      { uri: 'file:///test.txt', name: 'test.txt', mimeType: 'text/plain' },
      { uri: 'file:///data.json', name: 'data.json', mimeType: 'application/json' },
    ],
    prompts: [],
    reconnectAttempts: 0,
    ...overrides,
  });

  const setMockStore = (overrides: Record<string, unknown> = {}) => {
    Object.assign(mockStoreState, {
      servers: [createServer()],
      readResource: mockReadResource,
      subscribeResource: mockSubscribeResource,
      unsubscribeResource: mockUnsubscribeResource,
      listResourceTemplates: mockListResourceTemplates,
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    for (const key of Object.keys(mockStoreState)) delete mockStoreState[key];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial state values', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.selectedResource).toBeNull();
      expect(result.current.resourceContent).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.copiedUri).toBe(false);
      expect(result.current.copiedContent).toBe(false);
      expect(result.current.subscribedUris.size).toBe(0);
      expect(result.current.templates).toEqual([]);
      expect(result.current.showTemplates).toBe(false);
    });
  });

  describe('connectedServers', () => {
    it('should filter to only connected servers with resources', () => {
      const servers = [
        createServer({ id: 'srv-1', status: { type: 'connected' } }),
        createServer({ id: 'srv-2', status: { type: 'disconnected' } }),
        createServer({ id: 'srv-3', status: { type: 'connected' }, resources: [] }),
      ];
      setMockStore({ servers });

      const { result } = renderHook(() => useMcpResourceBrowser());

      expect(result.current.connectedServers).toHaveLength(1);
      expect(result.current.connectedServers[0].id).toBe('srv-1');
    });

    it('should filter by serverId when provided', () => {
      const servers = [
        createServer({ id: 'srv-1' }),
        createServer({ id: 'srv-2' }),
      ];
      setMockStore({ servers });

      const { result } = renderHook(() => useMcpResourceBrowser({ serverId: 'srv-2' }));

      expect(result.current.connectedServers).toHaveLength(1);
      expect(result.current.connectedServers[0].id).toBe('srv-2');
    });
  });

  describe('allResources', () => {
    it('should flatten resources from all connected servers', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      expect(result.current.allResources).toHaveLength(2);
      expect(result.current.allResources[0].resource.name).toBe('test.txt');
      expect(result.current.allResources[1].resource.name).toBe('data.json');
    });

    it('should filter resources by search query', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      act(() => {
        result.current.setSearchQuery('json');
      });

      expect(result.current.allResources).toHaveLength(1);
      expect(result.current.allResources[0].resource.name).toBe('data.json');
    });

    it('should search by URI', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      act(() => {
        result.current.setSearchQuery('test.txt');
      });

      expect(result.current.allResources).toHaveLength(1);
    });
  });

  describe('handleReadResource', () => {
    it('should read a resource and set content', async () => {
      const mockContent = { contents: [{ uri: 'file:///test.txt', text: 'hello' }] };
      mockReadResource.mockResolvedValue(mockContent);
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());
      const resource = { uri: 'file:///test.txt', name: 'test.txt', mimeType: 'text/plain' };

      await act(async () => {
        await result.current.handleReadResource('server-1', resource);
      });

      expect(mockReadResource).toHaveBeenCalledWith('server-1', 'file:///test.txt');
      expect(result.current.resourceContent).toEqual(mockContent);
      expect(result.current.selectedResource).toEqual({
        serverId: 'server-1',
        resource,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle read errors', async () => {
      mockReadResource.mockRejectedValue(new Error('Read failed'));
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());
      const resource = { uri: 'file:///test.txt', name: 'test.txt' };

      await act(async () => {
        await result.current.handleReadResource('server-1', resource);
      });

      expect(result.current.error).toBe('Read failed');
      expect(result.current.resourceContent).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('handleToggleSubscription', () => {
    it('should subscribe to a resource', async () => {
      mockSubscribeResource.mockResolvedValue(undefined);
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      await act(async () => {
        await result.current.handleToggleSubscription('server-1', 'file:///test.txt');
      });

      expect(mockSubscribeResource).toHaveBeenCalledWith('server-1', 'file:///test.txt');
      expect(result.current.subscribedUris.has('file:///test.txt')).toBe(true);
    });

    it('should not throw when subscription fails', async () => {
      mockSubscribeResource.mockRejectedValue(new Error('sub failed'));
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      await expect(
        act(async () => {
          await result.current.handleToggleSubscription('server-1', 'file:///test.txt');
        })
      ).resolves.not.toThrow();
    });
  });

  describe('handleLoadTemplates', () => {
    it('should load templates and show them', async () => {
      const mockTemplates = [
        { uriTemplate: 'file:///{path}', name: 'File', mimeType: 'text/plain' },
      ];
      mockListResourceTemplates.mockResolvedValue(mockTemplates);
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      await act(async () => {
        await result.current.handleLoadTemplates('server-1');
      });

      expect(result.current.templates).toEqual(mockTemplates);
      expect(result.current.showTemplates).toBe(true);
    });

    it('should clear templates on error', async () => {
      mockListResourceTemplates.mockRejectedValue(new Error('failed'));
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      await act(async () => {
        await result.current.handleLoadTemplates('server-1');
      });

      expect(result.current.templates).toEqual([]);
    });
  });

  describe('handleCopyUri', () => {
    it('should copy URI to clipboard', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      act(() => {
        result.current.handleCopyUri('file:///test.txt');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('file:///test.txt');
      expect(result.current.copiedUri).toBe(true);
    });

    it('should reset copiedUri after timeout', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      act(() => {
        result.current.handleCopyUri('file:///test.txt');
      });

      expect(result.current.copiedUri).toBe(true);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.copiedUri).toBe(false);
    });
  });

  describe('handleCopyContent', () => {
    it('should copy content to clipboard', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpResourceBrowser());

      act(() => {
        result.current.handleCopyContent('test content');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test content');
      expect(result.current.copiedContent).toBe(true);
    });
  });
});
