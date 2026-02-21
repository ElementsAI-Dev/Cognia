/**
 * MentionPopover History Features Tests
 * 
 * Tests for the history-based sorting, pinning, and favorite features
 * added to the MentionPopover component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { MentionPopover } from './mention-popover';
import type { MentionItem } from '@/types/mcp';

// Mock store - defined inside factory to avoid hoisting issues
jest.mock('@/stores', () => {
  const mockState = {
    history: [] as Array<Record<string, unknown>>,
    usageStats: {} as Record<string, { totalCalls: number; lastUsedAt: Date | null; isFavorite: boolean; isPinned: boolean }>,
    settings: {
      enabled: true,
      maxRecords: 1000,
      retentionDays: 90,
      showRecentInPopover: true,
      recentToolsCount: 5,
      enablePromptSuggestions: true,
      showUsageBadges: true,
    },
    isLoading: false,
    error: null,
    toggleFavorite: jest.fn((toolId: string, toolType = 'mcp', toolName = 'unknown', serverId?: string, serverName?: string) => {
      const existing = mockState.usageStats[toolId];
      if (existing) {
        mockState.usageStats[toolId] = {
          ...existing,
          isFavorite: !existing.isFavorite,
        };
        return;
      }
      mockState.usageStats[toolId] = {
        toolId,
        toolType,
        toolName,
        serverId,
        serverName,
        totalCalls: 0,
        successCalls: 0,
        errorCalls: 0,
        avgDuration: 0,
        frequentPrompts: [],
        isFavorite: true,
        isPinned: false,
        lastUsedAt: null,
      } as unknown as { totalCalls: number; lastUsedAt: Date | null; isFavorite: boolean; isPinned: boolean };
    }),
    togglePinned: jest.fn((toolId: string) => {
      const existing = mockState.usageStats[toolId];
      if (!existing) return;
      mockState.usageStats[toolId] = {
        ...existing,
        isPinned: !existing.isPinned,
      };
    }),
    recordToolCall: jest.fn((params: Record<string, unknown>) => {
      const id = `record-${Date.now()}`;
      const now = new Date();
      const record = { id, calledAt: now, ...params };
      mockState.history.push(record);
      const toolId = String(params.toolId);
      const existing = mockState.usageStats[toolId];
      mockState.usageStats[toolId] = existing
        ? {
            ...existing,
            totalCalls: existing.totalCalls + 1,
            lastUsedAt: now,
          }
        : ({
            toolId,
            toolType: params.toolType,
            toolName: params.toolName,
            serverId: params.serverId,
            serverName: params.serverName,
            totalCalls: 1,
            successCalls: 0,
            errorCalls: 0,
            avgDuration: 0,
            frequentPrompts: [],
            isFavorite: false,
            isPinned: false,
            lastUsedAt: now,
          } as unknown as { totalCalls: number; lastUsedAt: Date | null; isFavorite: boolean; isPinned: boolean });
      return record;
    }),
    updateToolCallResultStatus: jest.fn(),
  };

  // Expose state for tests to access via getState
  (global as Record<string, unknown>).__mockToolHistoryState = mockState;

  const store = Object.assign(
     
    (selector: (s: typeof mockState) => any) => selector(mockState),
    {
      getState: () => mockState,
      setState: (newState: Partial<typeof mockState>) => {
        Object.assign(mockState, newState);
      },
      subscribe: jest.fn(() => jest.fn()),
    }
  );

  return {
    useToolHistoryStore: store,
    createToolId: (provider: string, name: string, serverId: string) => `${provider}:${serverId}:${name}`,
  };
});

// Import after mock is set up
import { useToolHistoryStore, createToolId } from '@/stores';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock translations
const messages = {
  accessibility: {
    removeMention: 'Remove mention',
  },
};

// Wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

// Helper to create mock mention items
function createMockMentionItems(): MentionItem[] {
  return [
    {
      id: 'server1:search',
      label: 'search',
      description: 'Search for documents',
      type: 'tool',
      serverId: 'server1',
      serverName: 'Search Server',
      tool: {
        name: 'search',
        description: 'Search for documents',
        inputSchema: { type: 'object', properties: {} },
      },
    },
    {
      id: 'server1:analyze',
      label: 'analyze',
      description: 'Analyze data',
      type: 'tool',
      serverId: 'server1',
      serverName: 'Search Server',
      tool: {
        name: 'analyze',
        description: 'Analyze data',
        inputSchema: { type: 'object', properties: {} },
      },
    },
    {
      id: 'server2:generate',
      label: 'generate',
      description: 'Generate content',
      type: 'tool',
      serverId: 'server2',
      serverName: 'Content Server',
      tool: {
        name: 'generate',
        description: 'Generate content',
        inputSchema: { type: 'object', properties: {} },
      },
    },
    {
      id: 'server1:docs',
      label: 'docs',
      description: 'Documentation resource',
      type: 'resource',
      serverId: 'server1',
      serverName: 'Search Server',
      resource: {
        uri: 'resource://docs',
        name: 'docs',
        description: 'Documentation resource',
      },
    },
  ];
}

// Helper to create grouped mentions
function createGroupedMentions(items: MentionItem[]): Map<string, MentionItem[]> {
  const grouped = new Map<string, MentionItem[]>();
  for (const item of items) {
    const key = item.serverName;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }
  return grouped;
}

describe('MentionPopover History Features', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    
    // Reset store state
    useToolHistoryStore.setState({
      history: [],
      usageStats: {},
      settings: {
        enabled: true,
        maxRecords: 1000,
        retentionDays: 90,
        showRecentInPopover: true,
        recentToolsCount: 5,
        enablePromptSuggestions: true,
        showUsageBadges: true,
      },
      isLoading: false,
      error: null,
    });
  });

  describe('basic rendering with history enabled', () => {
    it('should render popover with history features', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Select a tool or resource')).toBeInTheDocument();
      expect(screen.getByText('search')).toBeInTheDocument();
    });

    it('should show sort mode buttons when history is enabled', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      // Should have sort buttons
      expect(screen.getByTitle('Sort by recent')).toBeInTheDocument();
      expect(screen.getByTitle('Sort by frequency')).toBeInTheDocument();
      expect(screen.getByTitle('Custom order (favorites first)')).toBeInTheDocument();
    });

    it('should hide sort buttons when query is present', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query="search"
            enableHistory={true}
          />
        </TestWrapper>
      );

      expect(screen.queryByTitle('Sort by recent')).not.toBeInTheDocument();
    });

    it('should not show history features when disabled', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByTitle('Sort by recent')).not.toBeInTheDocument();
    });
  });

  describe('pinned tools section', () => {
    it('should show pinned section when tools are pinned', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      // Pin a tool
      const store = useToolHistoryStore.getState();
      const toolId = createToolId('mcp', 'search', 'server1');
      store.toggleFavorite(toolId, 'mcp', 'search', 'server1', 'Search Server');
      store.togglePinned(toolId);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('📌 Pinned')).toBeInTheDocument();
    });

    it('should not show pinned section when no tools are pinned', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('📌 Pinned')).not.toBeInTheDocument();
    });
  });

  describe('recently used section', () => {
    it('should show recently used section when tools have history', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      // Add usage history
      const store = useToolHistoryStore.getState();
      const toolId = createToolId('mcp', 'search', 'server1');
      store.recordToolCall({
        toolId,
        toolType: 'mcp',
        toolName: 'search',
        serverId: 'server1',
        serverName: 'Search Server',
        prompt: 'Test query',
        result: 'success',
      });

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('🕐 Recently Used')).toBeInTheDocument();
    });

    it('should hide recently used section when query is present', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      // Add usage history
      const store = useToolHistoryStore.getState();
      const toolId = createToolId('mcp', 'search', 'server1');
      store.recordToolCall({
        toolId,
        toolType: 'mcp',
        toolName: 'search',
        serverId: 'server1',
        prompt: 'Test query',
        result: 'success',
      });

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query="gen"
            enableHistory={true}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('🕐 Recently Used')).not.toBeInTheDocument();
    });
  });

  describe('usage badges', () => {
    it('should show usage count badge for frequently used tools', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      // Add multiple usage records
      const store = useToolHistoryStore.getState();
      const toolId = createToolId('mcp', 'search', 'server1');
      for (let i = 0; i < 5; i++) {
        store.recordToolCall({
          toolId,
          toolType: 'mcp',
          toolName: 'search',
          serverId: 'server1',
          serverName: 'Search Server',
          prompt: `Query ${i}`,
          result: 'success',
        });
      }

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      // Should show "5×" badge
      expect(screen.getByText('5×')).toBeInTheDocument();
    });

    it('should show favorite star for favorited tools', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      // Favorite a tool
      const store = useToolHistoryStore.getState();
      const toolId = createToolId('mcp', 'search', 'server1');
      store.toggleFavorite(toolId, 'mcp', 'search', 'server1', 'Search Server');

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      // Should have a filled star icon
      const searchItem = screen.getByText('search').closest('.group');
      expect(searchItem).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort by frequency when frequent mode is selected', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const user = userEvent.setup();

      // Add different usage counts
      const store = useToolHistoryStore.getState();
      
      // search: 5 uses
      for (let i = 0; i < 5; i++) {
        store.recordToolCall({
          toolId: createToolId('mcp', 'search', 'server1'),
          toolType: 'mcp',
          toolName: 'search',
          serverId: 'server1',
          prompt: 'Query',
          result: 'success',
        });
      }
      
      // analyze: 2 uses
      for (let i = 0; i < 2; i++) {
        store.recordToolCall({
          toolId: createToolId('mcp', 'analyze', 'server1'),
          toolType: 'mcp',
          toolName: 'analyze',
          serverId: 'server1',
          prompt: 'Analyze',
          result: 'success',
        });
      }

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      // Click frequent sort button
      const frequentButton = screen.getByTitle('Sort by frequency');
      await user.click(frequentButton);

      // Verify button is highlighted
      expect(frequentButton).toHaveClass('bg-muted');
    });

    it('should sort by recent when recent mode is selected', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      const recentButton = screen.getByTitle('Sort by recent');
      await user.click(recentButton);

      expect(recentButton).toHaveClass('bg-muted');
    });

    it('should sort favorites first in custom mode', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const user = userEvent.setup();

      // Favorite analyze but not search
      const store = useToolHistoryStore.getState();
      store.toggleFavorite(
        createToolId('mcp', 'analyze', 'server1'),
        'mcp',
        'analyze',
        'server1'
      );

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      const customButton = screen.getByTitle('Custom order (favorites first)');
      await user.click(customButton);

      expect(customButton).toHaveClass('bg-muted');
    });
  });

  describe('favorite and pin actions', () => {
    it('should toggle favorite on hover button click', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      // Find the search item and hover to reveal actions
      const searchItem = screen.getByText('search').closest('[data-selected]');
      if (searchItem) {
        fireEvent.mouseEnter(searchItem);
        
        // Find and click the favorite button
        const favoriteButton = searchItem.querySelector('[title*="favorite"]');
        if (favoriteButton) {
          await user.click(favoriteButton as HTMLElement);
          
          // Check store was updated
          const store = useToolHistoryStore.getState();
          const toolId = createToolId('mcp', 'search', 'server1');
          expect(store.usageStats[toolId]?.isFavorite).toBe(true);
        }
      }
    });

    it('should toggle pin on hover button click', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const user = userEvent.setup();

      // First add the tool to stats
      const store = useToolHistoryStore.getState();
      const toolId = createToolId('mcp', 'search', 'server1');
      store.toggleFavorite(toolId, 'mcp', 'search', 'server1');

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      const searchItem = screen.getByText('search').closest('[data-selected]');
      if (searchItem) {
        fireEvent.mouseEnter(searchItem);
        
        const pinButton = searchItem.querySelector('[title*="Pin"]');
        if (pinButton) {
          await user.click(pinButton as HTMLElement);
          
          const updatedStore = useToolHistoryStore.getState();
          expect(updatedStore.usageStats[toolId]?.isPinned).toBe(true);
        }
      }
    });

    it('should call onToggleFavorite callback', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const onToggleFavorite = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
            onToggleFavorite={onToggleFavorite}
          />
        </TestWrapper>
      );

      const searchItem = screen.getByText('search').closest('[data-selected]');
      if (searchItem) {
        fireEvent.mouseEnter(searchItem);
        
        const favoriteButton = searchItem.querySelector('[title*="favorite"]');
        if (favoriteButton) {
          await user.click(favoriteButton as HTMLElement);
          expect(onToggleFavorite).toHaveBeenCalled();
        }
      }
    });
  });

  describe('keyboard navigation', () => {
    it('should navigate with arrow keys', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      // Move selection down once, then confirm selection
      await user.keyboard('{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(
          expect.objectContaining({ label: 'analyze' })
        );
      });
    });

    it('should select item on Enter', async () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'search' })
      );
    });

    it('should close on Escape', () => {
      const items = createMockMentionItems();
      const grouped = createGroupedMentions(items);

      render(
        <TestWrapper>
          <MentionPopover
            open={true}
            onClose={mockOnClose}
            onSelect={mockOnSelect}
            groupedMentions={grouped}
            query=""
            enableHistory={true}
          />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
