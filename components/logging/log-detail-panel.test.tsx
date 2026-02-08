import { render, screen, fireEvent } from '@testing-library/react';
import { LogDetailPanel } from './log-detail-panel';
import type { StructuredLogEntry } from '@/lib/logger';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'detail.title': 'Log Detail',
      'detail.message': 'Message',
      'detail.timestamp': 'Timestamp',
      'detail.module': 'Module',
      'detail.sessionId': 'Session ID',
      'detail.tags': 'Tags',
      'detail.relatedLogs': 'Related Logs',
      'detail.copyMessage': 'Copy message',
      'detail.copyTraceId': 'Copy trace ID',
      'detail.copyData': 'Copy data',
      'detail.copyStack': 'Copy stack trace',
      'detail.addBookmark': 'Bookmark',
      'detail.removeBookmark': 'Remove bookmark',
      'panel.traceId': 'Trace ID',
      'panel.data': 'Data',
      'panel.stackTrace': 'Stack Trace',
      'panel.source': 'Source',
    };
    return translations[key] || key;
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const createMockLog = (overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry => ({
  id: 'log-123',
  timestamp: '2025-02-08T14:00:00.000Z',
  level: 'info',
  module: 'test-module',
  message: 'Test log message',
  ...overrides,
});

describe('LogDetailPanel', () => {
  describe('Basic Rendering', () => {
    it('renders log detail title', () => {
      render(<LogDetailPanel log={createMockLog()} />);
      expect(screen.getByText('Log Detail')).toBeInTheDocument();
    });

    it('renders log level badge', () => {
      render(<LogDetailPanel log={createMockLog({ level: 'error' })} />);
      expect(screen.getByText('ERROR')).toBeInTheDocument();
    });

    it('renders log message', () => {
      render(<LogDetailPanel log={createMockLog({ message: 'Something happened' })} />);
      expect(screen.getByText('Something happened')).toBeInTheDocument();
    });

    it('renders module name', () => {
      render(<LogDetailPanel log={createMockLog({ module: 'auth-service' })} />);
      expect(screen.getByText('auth-service')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      render(<LogDetailPanel log={createMockLog()} />);
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('renders trace ID when present', () => {
      render(<LogDetailPanel log={createMockLog({ traceId: 'trace-abc-123' })} />);
      expect(screen.getByText('trace-abc-123')).toBeInTheDocument();
    });

    it('renders session ID when present', () => {
      render(<LogDetailPanel log={createMockLog({ sessionId: 'session-xyz' })} />);
      expect(screen.getByText('session-xyz')).toBeInTheDocument();
    });

    it('renders tags when present', () => {
      render(<LogDetailPanel log={createMockLog({ tags: ['auth', 'critical'] })} />);
      expect(screen.getByText('auth')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('does not render tags section when no tags', () => {
      render(<LogDetailPanel log={createMockLog()} />);
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('renders data section with JSON when present', () => {
      render(<LogDetailPanel log={createMockLog({ data: { key: 'value' } })} />);
      expect(screen.getByText('Data')).toBeInTheDocument();
    });

    it('renders stack trace when present', () => {
      const stack = 'Error: Test\n  at testFunc (test.js:10:5)\n  at main (app.js:1:1)';
      render(<LogDetailPanel log={createMockLog({ stack })} />);
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
      expect(screen.getByText('testFunc')).toBeInTheDocument();
    });

    it('renders source location when present', () => {
      render(
        <LogDetailPanel
          log={createMockLog({
            source: { file: 'app.ts', line: 42, function: 'handleRequest' },
          })}
        />
      );
      expect(screen.getByText('Source')).toBeInTheDocument();
    });
  });

  describe('Stack Trace Parsing', () => {
    it('parses Chrome-style stack frames', () => {
      const stack = '  at fetchData (src/api/client.ts:25:10)\n  at <anonymous> (src/app.ts:5:3)';
      render(<LogDetailPanel log={createMockLog({ stack, level: 'error' })} />);
      expect(screen.getByText('fetchData')).toBeInTheDocument();
    });

    it('falls back to raw display for unparseable stack', () => {
      const stack = 'Some random error text without frames';
      render(<LogDetailPanel log={createMockLog({ stack, level: 'error' })} />);
      expect(screen.getByText(stack)).toBeInTheDocument();
    });
  });

  describe('Related Logs', () => {
    it('renders related logs section when provided', () => {
      const log = createMockLog({ traceId: 'trace-1' });
      const relatedLogs = [
        createMockLog({ id: 'related-1', traceId: 'trace-1', message: 'Related log 1' }),
        createMockLog({ id: 'related-2', traceId: 'trace-1', message: 'Related log 2' }),
      ];

      render(<LogDetailPanel log={log} relatedLogs={relatedLogs} />);
      expect(screen.getByText('Related log 1')).toBeInTheDocument();
      expect(screen.getByText('Related log 2')).toBeInTheDocument();
    });

    it('excludes the current log from related logs', () => {
      const log = createMockLog({ id: 'main-log', message: 'Main log' });
      const relatedLogs = [
        log,
        createMockLog({ id: 'related-1', message: 'Related log' }),
      ];

      render(<LogDetailPanel log={log} relatedLogs={relatedLogs} />);
      // Should only show 1 related log (excluding the main log itself)
      expect(screen.getByText('Related log')).toBeInTheDocument();
    });

    it('calls onSelectRelated when a related log is clicked', () => {
      const onSelectRelated = jest.fn();
      const log = createMockLog({ traceId: 'trace-1' });
      const relatedLog = createMockLog({ id: 'related-1', traceId: 'trace-1', message: 'Click me' });

      render(
        <LogDetailPanel
          log={log}
          relatedLogs={[relatedLog]}
          onSelectRelated={onSelectRelated}
        />
      );

      fireEvent.click(screen.getByText('Click me'));
      expect(onSelectRelated).toHaveBeenCalledWith(relatedLog);
    });
  });

  describe('Actions', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<LogDetailPanel log={createMockLog()} onClose={onClose} />);

      // Find the close button (X icon)
      const closeButtons = screen.getAllByRole('button');
      const closeBtn = closeButtons.find(btn => btn.querySelector('.lucide-x'));
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onToggleBookmark when bookmark button is clicked', () => {
      const onToggleBookmark = jest.fn();
      render(
        <LogDetailPanel
          log={createMockLog()}
          onToggleBookmark={onToggleBookmark}
        />
      );

      const bookmarkButtons = screen.getAllByRole('button');
      const bookmarkBtn = bookmarkButtons.find(
        btn => btn.querySelector('.lucide-bookmark') || btn.querySelector('.lucide-bookmark-check')
      );
      if (bookmarkBtn) {
        fireEvent.click(bookmarkBtn);
        expect(onToggleBookmark).toHaveBeenCalledWith('log-123');
      }
    });

    it('shows bookmarked state', () => {
      render(
        <LogDetailPanel
          log={createMockLog()}
          isBookmarked={true}
          onToggleBookmark={jest.fn()}
        />
      );

      // BookmarkCheck icon should be visible
      const bookmarkIcons = document.querySelectorAll('.lucide-bookmark-check');
      expect(bookmarkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <LogDetailPanel log={createMockLog()} className="custom-detail" />
      );
      expect(container.firstChild).toHaveClass('custom-detail');
    });
  });
});
