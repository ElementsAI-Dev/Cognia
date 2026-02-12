/**
 * Tests for useMcpPrompts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpPrompts } from './use-mcp-prompts';
import type { McpServerState, McpPrompt, PromptContent } from '@/types/mcp';

// Mock format-utils
jest.mock('@/lib/mcp/format-utils', () => ({
  flattenPromptMessages: jest.fn((messages) =>
    messages
      .map((m: { content: string | Array<{ type: string; text?: string }> }) => {
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          return m.content
            .map((item) => (item.type === 'text' ? item.text : JSON.stringify(item)))
            .join('\n');
        }
        return '';
      })
      .join('\n')
  ),
}));

// Mock the MCP store with selector support
const mockStoreState: Record<string, unknown> = {};
jest.mock('@/stores', () => ({
  useMcpStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  }),
}));

describe('useMcpPrompts', () => {
  const mockGetPrompt = jest.fn();

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
    prompts: [
      { name: 'greeting', description: 'A greeting prompt' },
      { name: 'code-review', description: 'Review code' },
      { name: 'translate', description: 'Translate text', arguments: [{ name: 'language', required: true }] },
    ] as McpPrompt[],
    reconnectAttempts: 0,
    ...overrides,
  });

  const setMockStore = (overrides: Record<string, unknown> = {}) => {
    Object.assign(mockStoreState, {
      servers: [createServer()],
      getPrompt: mockGetPrompt,
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockStoreState)) delete mockStoreState[key];
  });

  describe('initial state', () => {
    it('should return initial state with server data', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      expect(result.current.server).toBeDefined();
      expect(result.current.server?.id).toBe('server-1');
      expect(result.current.filteredPrompts).toHaveLength(3);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.selectedPrompt).toBeNull();
      expect(result.current.promptContent).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return undefined server when not found', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'nonexistent' }));

      expect(result.current.server).toBeUndefined();
      expect(result.current.filteredPrompts).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('should filter prompts by name', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      act(() => {
        result.current.setSearchQuery('code');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].name).toBe('code-review');
    });

    it('should filter prompts by description', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      act(() => {
        result.current.setSearchQuery('translate');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].name).toBe('translate');
    });

    it('should show all prompts with empty search', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      act(() => {
        result.current.setSearchQuery('');
      });

      expect(result.current.filteredPrompts).toHaveLength(3);
    });
  });

  describe('handleSelectPrompt', () => {
    it('should set the selected prompt', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));
      const prompt = result.current.filteredPrompts[0];

      act(() => {
        result.current.handleSelectPrompt(prompt);
      });

      expect(result.current.selectedPrompt).toBe(prompt);
      expect(result.current.promptContent).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should initialize prompt args from arguments', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));
      const translatePrompt = result.current.filteredPrompts[2]; // translate has arguments

      act(() => {
        result.current.handleSelectPrompt(translatePrompt);
      });

      expect(result.current.promptArgs).toEqual({ language: '' });
    });
  });

  describe('handlePreview', () => {
    it('should fetch prompt content', async () => {
      const mockContent: PromptContent = {
        messages: [{ role: 'user', content: 'Hello world' }],
      };
      mockGetPrompt.mockResolvedValue(mockContent);
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      act(() => {
        result.current.handleSelectPrompt(result.current.filteredPrompts[0]);
      });

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(mockGetPrompt).toHaveBeenCalledWith('server-1', 'greeting', {});
      expect(result.current.promptContent).toEqual(mockContent);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle preview errors', async () => {
      mockGetPrompt.mockRejectedValue(new Error('Preview failed'));
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      act(() => {
        result.current.handleSelectPrompt(result.current.filteredPrompts[0]);
      });

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(result.current.error).toBe('Preview failed');
      expect(result.current.promptContent).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when no prompt selected', async () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(mockGetPrompt).not.toHaveBeenCalled();
    });

    it('should pass non-empty args', async () => {
      mockGetPrompt.mockResolvedValue({ messages: [] });
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      // Select the translate prompt
      act(() => {
        result.current.handleSelectPrompt(result.current.filteredPrompts[2]);
      });

      // Set an arg value
      act(() => {
        result.current.setPromptArgs({ language: 'zh-CN' });
      });

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(mockGetPrompt).toHaveBeenCalledWith('server-1', 'translate', { language: 'zh-CN' });
    });
  });

  describe('getFlattenedContent', () => {
    it('should return empty string when no content', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      expect(result.current.getFlattenedContent()).toBe('');
    });

    it('should flatten prompt messages', async () => {
      const mockContent: PromptContent = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'World' },
        ],
      };
      mockGetPrompt.mockResolvedValue(mockContent);
      setMockStore();

      const { result } = renderHook(() => useMcpPrompts({ serverId: 'server-1' }));

      act(() => {
        result.current.handleSelectPrompt(result.current.filteredPrompts[0]);
      });

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(result.current.getFlattenedContent()).toBe('Hello\nWorld');
    });
  });
});
