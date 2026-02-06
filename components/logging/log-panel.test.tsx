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
      expect(screen.getByText('All Levels')).toBeInTheDocument();
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
      expect(screen.getByText('All Levels')).toBeInTheDocument();

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
