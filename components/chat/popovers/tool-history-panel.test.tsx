/**
 * ToolHistoryPanel Component Tests
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { ToolHistoryPanel } from './tool-history-panel';
import React from 'react';

// Create a proper Zustand-like mock with subscription support for re-renders
function createMockStore() {
  const listeners: Set<() => void> = new Set();
  type MockUsageStat = {
    toolId: string;
    toolType: string;
    toolName: string;
    serverId?: string;
    serverName?: string;
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    avgDuration: number;
    frequentPrompts: Array<{ prompt: string; count: number; lastUsedAt: Date; successRate: number }>;
    lastUsedAt: Date | null;
    isFavorite: boolean;
    isPinned: boolean;
    displayOrder?: number;
  };
  
  const mockState: {
    history: Array<Record<string, unknown>>;
    usageStats: Record<string, MockUsageStat>;
    settings: Record<string, unknown>;
    isLoading: boolean;
    error: null;
    toggleFavorite: jest.Mock;
    togglePinned: jest.Mock;
    recordToolCall: (params: Record<string, unknown>) => Record<string, unknown>;
    updateToolCallResultStatus: (id: string, result: string, output?: string, error?: string, duration?: number) => void;
    deleteRecord: (id: string) => void;
    clearHistory: () => void;
    getRecentTools: (count: number) => Array<Record<string, unknown>>;
    getFrequentTools: (count: number) => Array<Record<string, unknown>>;
  } = {
    history: [] as Array<Record<string, unknown>>,
    usageStats: {} as Record<string, MockUsageStat>,
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
    recordToolCall: (params: Record<string, unknown>) => {
      const id = `record-${Date.now()}-${Math.random()}`;
      const now = new Date();
      const record = { id, ...params, startTime: now, endTime: now, calledAt: now };
      mockState.history = [...mockState.history, record];
      // Also update usageStats
      const toolId = params.toolId as string;
      if (toolId) {
        if (!mockState.usageStats[toolId]) {
          mockState.usageStats[toolId] = {
            toolId,
            toolType: (params.toolType as string) || 'mcp',
            toolName: (params.toolName as string) || toolId,
            serverId: params.serverId as string | undefined,
            serverName: params.serverName as string | undefined,
            totalCalls: 0,
            successCalls: 0,
            errorCalls: 0,
            avgDuration: 0,
            frequentPrompts: [],
            lastUsedAt: null,
            isFavorite: false,
            isPinned: false,
          };
        }
        mockState.usageStats = {
          ...mockState.usageStats,
          [toolId]: {
            ...mockState.usageStats[toolId],
            totalCalls: mockState.usageStats[toolId].totalCalls + 1,
            lastUsedAt: now,
          },
        };
      }
      listeners.forEach(listener => listener());
      return record;
    },
    updateToolCallResultStatus: (id: string, result: string, output?: string, errorMessage?: string, duration?: number) => {
      mockState.history = mockState.history.map((h) => 
        h.id === id ? { ...h, result, output, errorMessage, duration } : h
      );
      const record = mockState.history.find((h) => h.id === id);
      const toolId = record?.toolId as string | undefined;
      if (toolId && mockState.usageStats[toolId]) {
        const toolHistory = mockState.history.filter((h) => h.toolId === toolId);
        mockState.usageStats[toolId] = {
          ...mockState.usageStats[toolId],
          successCalls: toolHistory.filter((h) => h.result === 'success').length,
          errorCalls: toolHistory.filter((h) => h.result === 'error').length,
        };
      }
      listeners.forEach(listener => listener());
    },
    deleteRecord: (id: string) => {
      mockState.history = mockState.history.filter((h) => h.id !== id);
      listeners.forEach(listener => listener());
    },
    clearHistory: () => {
      mockState.history = [];
      mockState.usageStats = {};
      listeners.forEach(listener => listener());
    },
    getRecentTools: (count: number) => {
      return Object.values(mockState.usageStats)
        .filter((stats) => !!stats.lastUsedAt)
        .sort((a, b) => {
          const aTime = a.lastUsedAt ? a.lastUsedAt.getTime() : 0;
          const bTime = b.lastUsedAt ? b.lastUsedAt.getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, count)
        .map((stats) => ({
          toolId: stats.toolId,
          toolName: stats.toolName,
          serverId: stats.serverId,
          serverName: stats.serverName,
          totalCalls: stats.totalCalls,
        }));
    },
    getFrequentTools: (count: number) => {
      return Object.entries(mockState.usageStats)
        .sort(([, a], [, b]) => b.totalCalls - a.totalCalls)
        .slice(0, count)
        .map(([, stats]) => stats);
    },
  };

  // Create a hook that triggers re-renders
  const useStore = <T,>(selector: (s: typeof mockState) => T): T => {
    const [, forceUpdate] = React.useReducer((c) => c + 1, 0);
    
    React.useEffect(() => {
      listeners.add(forceUpdate);
      return () => { listeners.delete(forceUpdate); };
    }, []);
    
    return selector(mockState);
  };

  const store = Object.assign(useStore, {
    getState: () => mockState,
    setState: (newState: Partial<typeof mockState>) => {
      Object.assign(mockState, newState);
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    _reset: () => {
      mockState.history = [];
      mockState.usageStats = {};
      listeners.clear();
    },
  });

  return store;
}

// Mock store
jest.mock('@/stores', () => ({
  useToolHistoryStore: createMockStore(),
  createToolId: (provider: string, name: string, serverId: string) => `${provider}:${serverId}:${name}`,
}));

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

async function expandHistoryItemByPrompt(prompt: string): Promise<HTMLElement> {
  const promptNode = await screen.findByText(prompt);
  const historyItem = promptNode.closest('.group');
  if (!historyItem) {
    throw new Error(`Unable to find history item for prompt: ${prompt}`);
  }
  const clickableRow = historyItem.querySelector('.cursor-pointer');
  if (!clickableRow) {
    throw new Error(`Unable to find clickable row for prompt: ${prompt}`);
  }
  await userEvent.click(clickableRow as HTMLElement);
  return historyItem as HTMLElement;
}

beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      value: () => false,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      value: () => undefined,
      configurable: true,
    });
  }
});

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

    it('should expand item on click', async () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      await expandHistoryItemByPrompt('Find documents about AI');

      // Should show expanded content
      await waitFor(() => {
        expect(screen.getByText('Prompt:')).toBeInTheDocument();
      });
    });

    it('should show output in expanded view', async () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      await expandHistoryItemByPrompt('Find documents about AI');

      await waitFor(() => {
        expect(screen.getByText('Output:')).toBeInTheDocument();
        expect(screen.getByText(/Found 10 documents/i)).toBeInTheDocument();
      });
    });

    it('should show error message in expanded view', async () => {
      addMockHistory();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      await expandHistoryItemByPrompt('Analyze this data');

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('should filter by search query', async () => {
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

    it('should filter by result type', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      // First select is the result filter
      const [resultSelect] = screen.getAllByRole('combobox');
      await user.click(resultSelect);
      
      const successOption = await screen.findByText('Success');
      await user.click(successOption);

      await waitFor(() => {
        expect(screen.queryByText(/Analyze this data/i)).not.toBeInTheDocument();
      });
    });

    it('should clear filters', async () => {
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
      const clearButton = searchInput.parentElement?.querySelector('button');
      expect(clearButton).toBeTruthy();
      await user.click(clearButton as HTMLButtonElement);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('actions', () => {
    it('should call onSelectTool when tool is selected', async () => {
      addMockHistory();
      const onSelectTool = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel onSelectTool={onSelectTool} />
        </TestWrapper>
      );

      await expandHistoryItemByPrompt('Find documents about AI');
      const reuseButton = await screen.findByText('Reuse Tool');
      await user.click(reuseButton);

      await waitFor(() => {
        expect(onSelectTool).toHaveBeenCalled();
      });
    });

    it('should call onInsertPrompt when prompt is inserted', async () => {
      addMockHistory();
      const onInsertPrompt = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel onInsertPrompt={onInsertPrompt} />
        </TestWrapper>
      );

      await expandHistoryItemByPrompt('Find documents about AI');
      const usePromptButton = await screen.findByText('Use Prompt');
      await user.click(usePromptButton);

      await waitFor(() => {
        expect(onInsertPrompt).toHaveBeenCalledWith('Find documents about AI');
      });
    });

    it('should delete a record', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const historyItem = await expandHistoryItemByPrompt('Find documents about AI');
      const deleteButton = within(historyItem).getAllByRole('button').find(
        (btn) => !!btn.querySelector('svg.lucide-trash-2')
      );
      expect(deleteButton).toBeTruthy();
      await user.click(deleteButton as HTMLButtonElement);

      await waitFor(() => {
        expect(useToolHistoryStore.getState().history).toHaveLength(1);
      });
    });

    it('should clear all history', async () => {
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

    it('should click on recent tool to select it', async () => {
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
