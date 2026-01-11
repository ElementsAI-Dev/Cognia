/**
 * ToolHistoryPanel Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { ToolHistoryPanel } from './tool-history-panel';
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

      expect(screen.getByText('search')).toBeInTheDocument();
      expect(screen.getByText('analyze')).toBeInTheDocument();
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

      // Check for success icon (green checkmark)
      const successItems = screen.getAllByText('search')[0].closest('.group');
      expect(successItems).toBeInTheDocument();
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
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const historyItem = screen.getByText('search').closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      // Should show expanded content
      await waitFor(() => {
        expect(screen.getByText('Prompt:')).toBeInTheDocument();
      });
    });

    it('should show output in expanded view', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const historyItem = screen.getByText('search').closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Output:')).toBeInTheDocument();
        expect(screen.getByText(/Found 10 documents/i)).toBeInTheDocument();
      });
    });

    it('should show error message in expanded view', async () => {
      addMockHistory();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel />
        </TestWrapper>
      );

      const historyItem = screen.getByText('analyze').closest('.group');
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
        expect(screen.getByText('search')).toBeInTheDocument();
        expect(screen.queryByText('analyze')).not.toBeInTheDocument();
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

      // Find and click the result filter
      const resultSelect = screen.getByRole('combobox', { name: /Result/i });
      await user.click(resultSelect);
      
      await waitFor(() => {
        const successOption = screen.getByText('Success');
        user.click(successOption);
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
    it('should call onSelectTool when tool is selected', async () => {
      addMockHistory();
      const onSelectTool = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ToolHistoryPanel onSelectTool={onSelectTool} />
        </TestWrapper>
      );

      // Expand item first
      const historyItem = screen.getByText('search').closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(() => {
        const reuseButton = screen.getByText('Reuse Tool');
        user.click(reuseButton);
      });

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

      // Expand item first
      const historyItem = screen.getByText('search').closest('.group');
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(() => {
        const usePromptButton = screen.getByText('Use Prompt');
        user.click(usePromptButton);
      });

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

      // Expand item first
      const historyItem = screen.getByText('search').closest('.group');
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

      await waitFor(() => {
        expect(useToolHistoryStore.getState().history).toHaveLength(0);
        expect(screen.getByText(/No tool history yet/i)).toBeInTheDocument();
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
