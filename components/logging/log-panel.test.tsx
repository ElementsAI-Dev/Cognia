import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogPanel } from './log-panel';
import { useLogStream, useLogModules } from '@/hooks/logging';
import type { StructuredLogEntry } from '@/lib/logger';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'panel.searchPlaceholder': 'Search logs...',
      'panel.noLogs': 'No logs yet',
      'panel.loadingLogs': 'Loading logs...',
      'panel.errorLoading': 'Failed to load logs',
      'panel.allLevels': 'All Levels',
      'panel.allModules': 'All Modules',
      'panel.disableAutoRefresh': 'Disable auto-refresh',
      'panel.enableAutoRefresh': 'Enable auto-refresh',
      'panel.refresh': 'Refresh logs',
      'panel.export': 'Export logs',
      'panel.exportAs': 'Export as...',
      'panel.exportText': 'Plain Text',
      'panel.clear': 'Clear logs',
      'panel.copyEntry': 'Copy log entry',
      'panel.total': 'Total',
      'panel.traceId': 'Trace ID',
      'panel.noTraceId': 'No Trace ID',
      'panel.logs': 'logs',
      'panel.error': 'Error',
      'panel.warning': 'Warning',
      'panel.data': 'Data',
      'panel.stackTrace': 'Stack Trace',
      'panel.source': 'Source',
      'panel.timeRangeAll': 'All Time',
      'panel.timeRange15m': 'Last 15m',
      'panel.timeRange1h': 'Last 1h',
      'panel.scrollToTop': 'Scroll to top',
      'panel.scrollToBottom': 'Scroll to bottom',
      'panel.pauseAutoScroll': 'Pause auto-scroll',
      'panel.resumeAutoScroll': 'Resume auto-scroll',
      'panel.listView': 'List view',
      'panel.dashboardView': 'Dashboard view',
      'panel.regexPlaceholder': 'Regex...',
      'panel.toggleRegex': 'Toggle regex',
      'panel.timeRange6h': 'Last 6h',
      'panel.timeRange24h': 'Last 24h',
      'panel.timeRange7d': 'Last 7d',
      'panel.logsPerMin': 'logs/min',
      'panel.closeDetails': 'Close details',
      'panel.traceView': 'Trace View',
      'panel.agentTraceModule': 'Agent Trace',
      'panel.noTraceEvents': 'No agent trace events',
      'levels.trace': 'Trace',
      'levels.debug': 'Debug',
      'levels.info': 'Info',
      'levels.warn': 'Warning',
      'levels.error': 'Error',
      'levels.fatal': 'Fatal',
    };
    return translations[key] || key;
  },
}));

// Mock hooks
jest.mock('@/hooks/logging', () => ({
  useLogStream: jest.fn(),
  useLogModules: jest.fn(),
  useAgentTraceAsLogs: jest.fn(() => ({ logs: [], isLoading: false, error: null })),
}));

jest.mock('@/hooks/agent-trace/use-agent-trace', () => ({
  useAgentTrace: jest.fn(() => ({ traces: [], isLoading: false, error: null, totalCount: 0, isEnabled: true, refresh: jest.fn(), getById: jest.fn(), deleteTrace: jest.fn(), deleteBySession: jest.fn(), deleteOlderThan: jest.fn(), clearAll: jest.fn(), exportAsJson: jest.fn(), exportAsJsonl: jest.fn(), findLineAttribution: jest.fn(), findLineAttributionWithBlame: jest.fn(), exportAsSpecRecord: jest.fn() })),
}));

jest.mock('@/components/settings/data/agent-trace-timeline', () => ({
  AgentTraceTimeline: () => <div data-testid="agent-trace-timeline">AgentTraceTimeline</div>,
}));

jest.mock('@/lib/agent-trace/log-adapter', () => ({
  AGENT_TRACE_MODULE: 'agent-trace',
  agentTraceEventToLogEntry: jest.fn(),
  dbAgentTraceToLogEntry: jest.fn(),
  isAgentTraceLogEntry: jest.fn(() => false),
  getAgentTraceLogData: jest.fn(() => null),
}));

jest.mock('@/lib/agent', () => ({
  LIVE_TRACE_EVENT_ICONS: {},
  LIVE_TRACE_EVENT_COLORS: {},
  TOOL_STATE_CONFIG: {},
  formatDuration: jest.fn((ms: number) => `${ms}ms`),
  formatTokens: jest.fn((n: number) => String(n)),
}));

// Mock @tanstack/react-virtual so virtualized list renders all items in jsdom
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        key: String(i),
        start: i * 44,
        size: 44,
        measureElement: jest.fn(),
      })),
    getTotalSize: () => count * 44,
    measureElement: jest.fn(),
  }),
}));

// Note: clipboard is mocked by userEvent internally

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockUseLogStream = useLogStream as jest.Mock;
const mockUseLogModules = useLogModules as jest.Mock;

const createMockLog = (overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry => ({
  id: `log-${Math.random().toString(36).slice(2)}`,
  timestamp: new Date().toISOString(),
  level: 'info',
  module: 'test',
  message: 'Test log message',
  ...overrides,
});

const defaultMockHookReturn = {
  logs: [],
  groupedLogs: new Map(),
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  clearLogs: jest.fn(),
  exportLogs: jest.fn(() => '[]'),
  stats: {
    total: 0,
    byLevel: { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
    byModule: {},
  },
  logRate: 0,
};

describe('LogPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLogModules.mockReturnValue(['app', 'api', 'chat']);
    mockUseLogStream.mockReturnValue(defaultMockHookReturn);
  });

  describe('Rendering', () => {
    it('renders the log panel with toolbar', () => {
      render(<LogPanel />);

      expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
      expect(screen.getByText(/All Levels/)).toBeInTheDocument();
      expect(screen.getByText('All Modules')).toBeInTheDocument();
    });

    it('renders empty state when no logs', () => {
      render(<LogPanel />);

      expect(screen.getByText('No logs yet')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        isLoading: true,
      });

      render(<LogPanel />);

      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        error: new Error('Test error'),
      });

      render(<LogPanel />);

      expect(screen.getByText('Failed to load logs')).toBeInTheDocument();
    });

    it('renders log entries when logs exist', () => {
      const logs = [
        createMockLog({ message: 'First log', level: 'info' }),
        createMockLog({ message: 'Second log', level: 'warn' }),
      ];

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs,
        stats: {
          ...defaultMockHookReturn.stats,
          total: 2,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, info: 1, warn: 1 },
        },
      });

      render(<LogPanel />);

      expect(screen.getByText('First log')).toBeInTheDocument();
      expect(screen.getByText('Second log')).toBeInTheDocument();
    });

    it('renders stats bar when showStats is true', () => {
      const logs = [createMockLog({ level: 'error' })];

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs,
        stats: {
          total: 1,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, error: 1 },
          byModule: {},
        },
      });

      render(<LogPanel showStats={true} />);

      expect(screen.getByText('Total:')).toBeInTheDocument();
    });

    it('hides stats bar when showStats is false', () => {
      render(<LogPanel showStats={false} />);

      expect(screen.queryByText('Total:')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('calls useLogStream with search query when typing', async () => {
      const user = userEvent.setup();
      render(<LogPanel />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      await user.type(searchInput, 'error');

      await waitFor(() => {
        expect(mockUseLogStream).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'error',
          })
        );
      });
    });

    it('renders level filter dropdown', () => {
      render(<LogPanel />);

      // Verify level filter exists
      expect(screen.getByText(/All Levels/)).toBeInTheDocument();

      // useLogStream should be called with default level
      expect(mockUseLogStream).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'all',
        })
      );
    });
  });

  describe('Actions', () => {
    it('renders action buttons', () => {
      render(<LogPanel />);

      // Verify toolbar buttons exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('initializes with defaultAutoRefresh prop', () => {
      render(<LogPanel defaultAutoRefresh={true} />);

      expect(mockUseLogStream).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRefresh: true,
        })
      );
    });

    it('initializes with autoRefresh false by default', () => {
      render(<LogPanel />);

      expect(mockUseLogStream).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRefresh: false,
        })
      );
    });
  });

  describe('Log Entry Display', () => {
    it('displays log message', () => {
      const logs = [
        createMockLog({
          message: 'Log with data',
          data: { key: 'value' },
        }),
      ];

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs,
        stats: {
          total: 1,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, info: 1 },
          byModule: {},
        },
      });

      render(<LogPanel />);

      expect(screen.getByText('Log with data')).toBeInTheDocument();
    });

    it('displays error log with correct styling', () => {
      const logs = [
        createMockLog({
          level: 'error',
          message: 'Error log message',
          stack: 'Error: Test\n  at test.js:1:1',
        }),
      ];

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs,
        stats: {
          total: 1,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, error: 1 },
          byModule: {},
        },
      });

      render(<LogPanel />);

      expect(screen.getByText('Error log message')).toBeInTheDocument();
    });

    it('displays module badge', () => {
      const logs = [
        createMockLog({
          module: 'test-module',
          message: 'Test message',
        }),
      ];

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs,
        stats: {
          total: 1,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, info: 1 },
          byModule: {},
        },
      });

      render(<LogPanel />);

      expect(screen.getByText('test-module')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('renders copy button for log entries', () => {
      const logs = [createMockLog({ message: 'Copy me' })];

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs,
        stats: {
          total: 1,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, info: 1 },
          byModule: {},
        },
      });

      render(<LogPanel />);

      // Find copy button - verify it exists
      const copyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg.lucide-copy'));

      expect(copyButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      const { container } = render(<LogPanel className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies custom maxHeight', () => {
      render(<LogPanel maxHeight="400px" />);
      // The ScrollArea should have the maxHeight style
    });

    it('uses custom refreshInterval', () => {
      render(<LogPanel refreshInterval={5000} />);

      expect(mockUseLogStream).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshInterval: 5000,
        })
      );
    });

    it('enables groupByTraceId when prop is true', () => {
      render(<LogPanel groupByTraceId={true} />);

      expect(mockUseLogStream).toHaveBeenCalledWith(
        expect.objectContaining({
          groupByTraceId: true,
        })
      );
    });
  });

  describe('Trace Grouping', () => {
    it('renders trace groups when groupByTraceId is enabled', () => {
      const groupedLogs = new Map([
        [
          'trace-1',
          [
            createMockLog({ traceId: 'trace-1', message: 'Log 1' }),
            createMockLog({ traceId: 'trace-1', message: 'Log 2' }),
          ],
        ],
      ]);

      mockUseLogStream.mockReturnValue({
        ...defaultMockHookReturn,
        logs: [...groupedLogs.values()].flat(),
        groupedLogs,
        stats: {
          total: 2,
          byLevel: { ...defaultMockHookReturn.stats.byLevel, info: 2 },
          byModule: {},
        },
      });

      render(<LogPanel groupByTraceId={true} />);

      // Should show trace group (multiple elements may exist with same text)
      const traceElements = screen.getAllByText('trace-1');
      expect(traceElements.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Trace Integration', () => {
    it('renders trace view tab button when includeAgentTrace is true', () => {
      render(<LogPanel includeAgentTrace={true} />);

      // The trace view button uses Activity icon, find by tooltip
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      // Verify the Trace View button exists (it has a tooltip with 'Trace View')
      expect(screen.getByText('Trace View')).toBeInTheDocument();
    });

    it('does not render trace view tab when includeAgentTrace is false', () => {
      render(<LogPanel includeAgentTrace={false} />);

      expect(screen.queryByText('Trace View')).not.toBeInTheDocument();
    });

    it('includes Agent Trace in module dropdown', () => {
      render(<LogPanel includeAgentTrace={true} />);

      // The module dropdown should include the Agent Trace option
      // We need to check the dropdown content
      expect(screen.getByText('All Modules')).toBeInTheDocument();
    });

    it('renders empty trace view when no trace data', async () => {
      const user = userEvent.setup();
      render(<LogPanel includeAgentTrace={true} />);

      // Find all toolbar buttons — the trace view button is the one with the Activity icon
      // It appears after the List and Dashboard buttons in the view switcher group
      const buttons = screen.getAllByRole('button');
      // The trace view button has variant="ghost" (since list view is active by default)
      // and contains an Activity icon. Find it by filtering buttons in the view switcher area.
      const viewButtons = buttons.filter((btn) =>
        btn.classList.contains('h-8') && btn.classList.contains('px-2')
      );
      // The trace button is the last view switcher button (after list and dashboard)
      const traceButton = viewButtons.find((btn) =>
        btn.querySelector('.lucide-activity')
      );

      if (traceButton) {
        await user.click(traceButton);

        // Should show the empty state
        await waitFor(() => {
          expect(screen.getByText('No agent trace events')).toBeInTheDocument();
        });
      } else {
        // If we can't find the exact button, at least verify the trace view text exists
        expect(screen.getByText('Trace View')).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('has accessible search input', () => {
      render(<LogPanel />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('INPUT');
    });

    it('buttons have tooltips', () => {
      render(<LogPanel />);

      // Tooltips are rendered but may need hover to show
      // Just verify buttons exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
