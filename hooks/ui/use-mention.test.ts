/**
 * Tests for useMention hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMention } from './use-mention';

// Mock MCP store
const mockServers = [
  {
    id: 'server1',
    name: 'Test Server',
    status: 'connected',
    tools: [
      { name: 'search', description: 'Search tool' },
      { name: 'fetch', description: 'Fetch tool' },
    ],
    resources: [{ name: 'docs', description: 'Documentation' }],
    prompts: [{ name: 'greeting', description: 'Greeting prompt' }],
  },
];

jest.mock('@/stores/mcp', () => ({
  useMcpStore: (selector: (state: unknown) => unknown) => {
    const state = {
      servers: mockServers,
      isInitialized: true,
      initialize: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock MCP types
jest.mock('@/types/mcp', () => ({
  createToolMention: (
    serverId: string,
    serverName: string,
    tool: { name: string; description: string }
  ) => ({
    type: 'tool',
    serverId,
    serverName,
    label: tool.name,
    description: tool.description,
  }),
  createResourceMention: (
    serverId: string,
    serverName: string,
    resource: { name: string; description: string }
  ) => ({
    type: 'resource',
    serverId,
    serverName,
    label: resource.name,
    description: resource.description,
  }),
  createPromptMention: (
    serverId: string,
    serverName: string,
    prompt: { name: string; description: string }
  ) => ({
    type: 'prompt',
    serverId,
    serverName,
    label: prompt.name,
    description: prompt.description,
  }),
  createServerMention: (serverId: string, serverName: string, toolCount: number) => ({
    type: 'server',
    serverId,
    serverName,
    label: serverName,
    description: `${toolCount} tools`,
  }),
  formatMentionDisplay: (item: { serverId: string; label: string }) =>
    `@${item.serverId}:${item.label}`,
  isServerConnected: (status: string) => status === 'connected',
}));

describe('useMention', () => {
  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMention());

      expect(result.current.mentionState.isOpen).toBe(false);
      expect(result.current.mentionState.query).toBe('');
      expect(result.current.currentText).toBe('');
    });

    it('should have allMentions populated from servers', () => {
      const { result } = renderHook(() => useMention());

      // Should have server, tools, resources, and prompts
      expect(result.current.allMentions.length).toBeGreaterThan(0);
    });

    it('should detect MCP availability', () => {
      const { result } = renderHook(() => useMention());

      expect(result.current.isMcpAvailable).toBe(true);
    });
  });

  describe('handleTextChange', () => {
    it('should open mention popover when @ is typed', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      expect(result.current.mentionState.isOpen).toBe(true);
      expect(result.current.mentionState.triggerPosition).toBe(0);
    });

    it('should update query when typing after @', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@sea', 4);
      });

      expect(result.current.mentionState.isOpen).toBe(true);
      expect(result.current.mentionState.query).toBe('sea');
    });

    it('should close popover when @ is part of another word', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('email@test', 10);
      });

      expect(result.current.mentionState.isOpen).toBe(false);
    });

    it('should close popover when space is typed after query', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@search ', 8);
      });

      expect(result.current.mentionState.isOpen).toBe(false);
    });

    it('should close popover when no @ is present', () => {
      const { result } = renderHook(() => useMention());

      // First open it
      act(() => {
        result.current.handleTextChange('@', 1);
      });
      expect(result.current.mentionState.isOpen).toBe(true);

      // Then remove @
      act(() => {
        result.current.handleTextChange('hello', 5);
      });
      expect(result.current.mentionState.isOpen).toBe(false);
    });
  });

  describe('filteredMentions', () => {
    it('should return all mentions when query is empty', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      expect(result.current.filteredMentions.length).toBe(result.current.allMentions.length);
    });

    it('should filter mentions by query', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@search', 7);
      });

      expect(result.current.filteredMentions.length).toBeGreaterThan(0);
      expect(result.current.filteredMentions.some((m) => m.label.includes('search'))).toBe(true);
    });
  });

  describe('groupedMentions', () => {
    it('should group mentions by server name', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      expect(result.current.groupedMentions.size).toBeGreaterThan(0);
      expect(result.current.groupedMentions.has('Test Server')).toBe(true);
    });
  });

  describe('selectMention', () => {
    it('should insert mention into text', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      const mentionItem = result.current.allMentions[0];
      let newTextResult: { newText: string; newCursorPosition: number } | undefined;

      act(() => {
        newTextResult = result.current.selectMention(mentionItem);
      });

      expect(newTextResult).toBeDefined();
      expect(newTextResult!.newText).toContain('@');
      expect(result.current.mentionState.isOpen).toBe(false);
    });

    it('should add to selectedMentions', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      const mentionItem = result.current.allMentions[0];

      act(() => {
        result.current.selectMention(mentionItem);
      });

      expect(result.current.mentionState.selectedMentions.length).toBe(1);
    });
  });

  describe('closeMention', () => {
    it('should close the mention popover', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleTextChange('@', 1);
      });
      expect(result.current.mentionState.isOpen).toBe(true);

      act(() => {
        result.current.closeMention();
      });
      expect(result.current.mentionState.isOpen).toBe(false);
    });
  });

  describe('openMention', () => {
    it('should open the mention popover at specified position', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.openMention(5);
      });

      expect(result.current.mentionState.isOpen).toBe(true);
      expect(result.current.mentionState.triggerPosition).toBe(5);
    });
  });

  describe('parseToolCalls', () => {
    it('should parse tool mentions from text', () => {
      const { result } = renderHook(() => useMention());

      const toolCalls = result.current.parseToolCalls('@server1:search some query');

      expect(toolCalls.length).toBe(1);
      expect(toolCalls[0].serverId).toBe('server1');
      expect(toolCalls[0].toolName).toBe('search');
    });

    it('should return empty array for text without tool mentions', () => {
      const { result } = renderHook(() => useMention());

      const toolCalls = result.current.parseToolCalls('Hello world');

      expect(toolCalls.length).toBe(0);
    });
  });

  describe('onMentionsChange callback', () => {
    it('should accept onMentionsChange option', () => {
      const onMentionsChange = jest.fn();
      const { result } = renderHook(() => useMention({ onMentionsChange }));

      // Just verify the hook accepts the callback option
      expect(result.current).toBeDefined();
    });
  });
});
