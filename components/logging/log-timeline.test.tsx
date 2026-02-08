import { render, screen, fireEvent } from '@testing-library/react';
import { LogTimeline } from './log-timeline';
import type { StructuredLogEntry } from '@/lib/logger';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'timeline.title': 'Timeline',
      'timeline.total': 'Total',
      'timeline.errors': 'Errors',
      'timeline.warnings': 'Warnings',
    };
    return translations[key] || key;
  },
}));

const createMockLog = (overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry => ({
  id: `log-${Math.random().toString(36).slice(2)}`,
  timestamp: new Date().toISOString(),
  level: 'info',
  module: 'test',
  message: 'Test log message',
  ...overrides,
});

describe('LogTimeline', () => {
  describe('Empty State', () => {
    it('renders nothing when no logs provided', () => {
      const { container } = render(<LogTimeline logs={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('With Data', () => {
    const now = Date.now();
    const logs = [
      createMockLog({ level: 'info', timestamp: new Date(now - 60000).toISOString() }),
      createMockLog({ level: 'warn', timestamp: new Date(now - 30000).toISOString() }),
      createMockLog({ level: 'error', timestamp: new Date(now - 10000).toISOString() }),
      createMockLog({ level: 'info', timestamp: new Date(now).toISOString() }),
    ];

    it('renders timeline title', () => {
      render(<LogTimeline logs={logs} />);
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    it('renders legend labels', () => {
      render(<LogTimeline logs={logs} />);
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Warn')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('renders timeline buckets as buttons', () => {
      render(<LogTimeline logs={logs} bucketCount={10} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(10);
    });

    it('calls onTimeRangeClick when a bucket is clicked', () => {
      const onClick = jest.fn();
      render(<LogTimeline logs={logs} bucketCount={10} onTimeRangeClick={onClick} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
    });

    it('renders correct number of buckets with custom bucketCount', () => {
      render(<LogTimeline logs={logs} bucketCount={20} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(20);
    });
  });

  describe('Props', () => {
    const logs = [createMockLog()];

    it('applies custom className', () => {
      const { container } = render(<LogTimeline logs={logs} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
