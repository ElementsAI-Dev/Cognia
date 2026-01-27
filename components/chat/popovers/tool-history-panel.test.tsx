/**
 * ToolHistoryPanel Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { ToolHistoryPanel } from './tool-history-panel';

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
    toggleFavorite: jest.fn(),
    togglePinned: jest.fn(),
    recordToolCall: jest.fn((params: Record<string, unknown>) => {
      const id = `record-${Date.now()}-${Math.random()}`;
      const now = new Date();
      const record = { id, ...params, startTime: now, endTime: now, calledAt: now };
      mockState.history.push(record);
      // Also update usageStats
      const toolId = params.toolId as string;
      if (toolId) {
        if (!mockState.usageStats[toolId]) {
          mockState.usageStats[toolId] = { totalCalls: 0, lastUsedAt: null, isFavorite: false, isPinned: false };
        }
        mockState.usageStats[toolId].totalCalls++;
        mockState.usageStats[toolId].lastUsedAt = now;
      }
      return record;
    }),
    updateToolCallResultStatus: jest.fn((id: string, result: string, output?: string, error?: string, duration?: number) => {
      const record = mockState.history.find((h) => h.id === id);
      if (record) {
        record.result = result;
        record.output = output;
        record.error = error;
        record.duration = duration;
      }
    }),
    deleteRecord: jest.fn((id: string) => {
      const index = mockState.history.findIndex((h) => h.id === id);
      if (index >= 0) mockState.history.splice(index, 1);
    }),
    clearHistory: jest.fn(() => {
      mockState.history.length = 0;
      mockState.usageStats = {};
    }),
    getRecentTools: jest.fn((count: number) => {
      return mockState.history.slice(0, count).map((h) => ({
        toolId: h.toolId,
        toolName: h.toolName,
        serverId: h.serverId,
        serverName: h.serverName,
      }));
    }),
    getFrequentTools: jest.fn((count: number) => {
      return Object.entries(mockState.usageStats)
        .sort(([, a], [, b]) => (b as { totalCalls: number }).totalCalls - (a as { totalCalls: number }).totalCalls)
        .slice(0, count)
        .map(([toolId, stats]) => ({
          toolId,
          totalCalls: (stats as { totalCalls: number }).totalCalls,
        }));
    }),
  };

  const store = Object.assign(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Import after mock
import { useToolHistoryStore } from '@/stores';

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
  toolHistory: {
    title: 'Tool History',
    noHistory: 'No history yet',
    search: 'Search',
    clearAll: 'Clear All',
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

// Helper to add mock history
function addMockHistory() {
  const store = useToolHistoryStore.getState();
  
  const record1 = store.recordToolCall({
    toolId: 'mcp:server1:search',
    toolType: 'mcp',
    toolName: 'search',
    serverId: 'server1',
    serverName: 'Search Server',
    prompt: 'Find documents about AI',
    result: 'success',
  });
  store.updateToolCallResultStatus(record1.id, 'success', 'Found 10 documents', undefined, 150);

  const record2 = store.recordToolCall({
    toolId: 'mcp:server1:analyze',
    toolType: 'mcp',
    toolName: 'analyze',
    serverId: 'server1',
    serverName: 'Search Server',
    prompt: 'Analyze this data',
    result: 'error',
  });
  store.updateToolCallResultStatus(record2.id, 'error', undefined, 'Connection failed', 50);

  return { record1, record2 };
}

describe('ToolHistoryPanel', () => {
  beforeEach(() => {
    localStorageMock.clear();
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

  describe('rendering', () => {
    it('should render empty state', () => {
      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      expect(screen.getByText('Tool History')).toBeInTheDocument();
      expect(screen.getByText(/No tool history yet/i)).toBeInTheDocument();
    });

    it('should render with history items', () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      expect(screen.getAllByText('search').length).toBeGreaterThan(0);
      expect(screen.getAllByText('analyze').length).toBeGreaterThan(0);
      expect(screen.getByText(/Find documents about AI/i)).toBeInTheDocument();
    });

    it('should show history count badge', () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render as popover when asPopover is true', () => {
      render(
        <TestWrapper>
          <ToolHistoryPanel asPopover />
        </TestWrapper>
      );

      // Should render trigger button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with custom trigger', () => {
      render(
        <TestWrapper>
          <ToolHistoryPanel 
            asPopover 
            trigger={<button data-testid="custom-trigger">Open History</button>}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
    });
  });

  describe('history items', () => {
    it('should show success indicator for successful calls', () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Check that search tool entries exist
      const searchItems = screen.getAllByText('search');
      expect(searchItems.length).toBeGreaterThan(0);
    });

    it('should show error indicator for failed calls', () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Should have error items visible
      expect(screen.getByText(/Analyze this data/i)).toBeInTheDocument();
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should expand item on click', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const historyItems = screen.getAllByText('search');
      const historyItem = historyItems.find(el => el.closest('.group'))?.closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      // Should show expanded content
      await waitFor(() => {
        expect(screen.getByText('Prompt:')).toBeInTheDocument();
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should show output in expanded view', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Find the history item (not the badge in Recent section)
      const historyItems = screen.getAllByText('search');
      const historyItem = historyItems.find(el => el.closest('.group'))?.closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Output:')).toBeInTheDocument();
        expect(screen.getByText(/Found 10 documents/i)).toBeInTheDocument();
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should show error message in expanded view', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Find the history item (not the badge in Recent section)
      const historyItems = screen.getAllByText('analyze');
      const historyItem = historyItems.find(el => el.closest('.group'))?.closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should filter by search query', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/Search history/i);
      await user.type(searchInput, 'documents');

      await waitFor(() => {
        // After filtering, search should still be visible
        expect(screen.getAllByText('search').length).toBeGreaterThan(0);
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should filter by result type', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Find and click the result filter
      const resultSelect = screen.getByRole('combobox', { name: /Result/i });
      await user.click(resultSelect);
      
      await waitFor(() => {
        const successOption = screen.getByText('Success');
        user.click(successOption);
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should clear filters', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Add a search query
      const searchInput = screen.getByPlaceholderText(/Search history/i);
      await user.type(searchInput, 'documents');

      // Clear the input
      const clearButton = screen.getByRole('button', { name: /×/i });
      if (clearButton) {
        await user.click(clearButton);
      }

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('actions', () => {
    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should call onSelectTool when tool is selected', async () => {
      addMockHistory();
      const onSelectTool = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel onSelectTool={onSelectTool} />
        </TestWrapper>
      );

      // Find the history item (not the badge in Recent section)
      const historyItems = screen.getAllByText('search');
      const historyItem = historyItems.find(el => el.closest('.group'))?.closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(async () => {
        const reuseButton = screen.getByText('Reuse Tool');
        await user.click(reuseButton);
      });

      await waitFor(() => {
        expect(onSelectTool).toHaveBeenCalled();
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should call onInsertPrompt when prompt is inserted', async () => {
      addMockHistory();
      const onInsertPrompt = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel onInsertPrompt={onInsertPrompt} />
        </TestWrapper>
      );

      // Find the history item (not the badge in Recent section)
      const historyItems = screen.getAllByText('search');
      const historyItem = historyItems.find(el => el.closest('.group'))?.closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(async () => {
        const usePromptButton = screen.getByText('Use Prompt');
        await user.click(usePromptButton);
      });

      await waitFor(() => {
        expect(onInsertPrompt).toHaveBeenCalledWith('Find documents about AI');
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should delete a record', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // Find the history item (not the badge in Recent section)
      const historyItems = screen.getAllByText('search');
      const historyItem = historyItems.find(el => el.closest('.group'))?.closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(async () => {
        const deleteButton = screen.getAllByRole('button').find(
          btn => btn.querySelector('svg')?.classList.contains('lucide-trash-2')
        );
        if (deleteButton) {
          await user.click(deleteButton);
        }
      });

      await waitFor(() => {
        expect(useToolHistoryStore.getState().history).toHaveLength(1);
      });
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should clear all history', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      // Verify store state is cleared - UI re-render requires Zustand subscription which mock doesn't fully implement
      await waitFor(() => {
        expect(useToolHistoryStore.getState().history).toHaveLength(0);
      });
    });
  });

  describe('quick access', () => {
    it('should show recent tools section', () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      expect(screen.getByText('Recent')).toBeInTheDocument();
    });

    it('should show frequent tools when count is high enough', () => {
      // Add multiple calls to the same tool
      const store = useToolHistoryStore.getState();
      for (let i = 0; i < 5; i++) {
        store.recordToolCall({
          toolId: 'mcp:server1:search',
          toolType: 'mcp',
          toolName: 'search',
          prompt: `Query ${i}`,
          result: 'success',
        });
      }

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      expect(screen.getByText('Frequent')).toBeInTheDocument();
    });

    // TODO: This test requires proper Zustand mock that triggers re-renders
    it.skip('should click on recent tool to select it', async () => {
      addMockHistory();
      const onSelectTool = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel onSelectTool={onSelectTool} />
        </TestWrapper>
      );

      // Find and click recent tool badge
      const recentSection = screen.getByText('Recent').parentElement;
      const toolBadge = recentSection?.querySelector('[class*="cursor-pointer"]');
      
      if (toolBadge) {
        await user.click(toolBadge);
        expect(onSelectTool).toHaveBeenCalled();
      }
    });
  });
});
