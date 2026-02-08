import { render, screen } from '@testing-library/react';
import { LogStatsDashboard } from './log-stats-dashboard';
import type { StructuredLogEntry } from '@/lib/logger';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'dashboard.noData': 'No log data available for visualization',
      'dashboard.totalLogs': 'Total Logs',
      'dashboard.errorRate': 'Error Rate',
      'dashboard.errors': 'errors',
      'dashboard.topModule': 'Most Active Module',
      'dashboard.timeSpan': 'Time Span',
      'dashboard.levelDistribution': 'Level Distribution',
      'dashboard.logVolume': 'Log Volume Over Time',
      'dashboard.moduleActivity': 'Module Activity',
      'panel.logs': 'logs',
    };
    return translations[key] || key;
  },
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const createMockLog = (overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry => ({
  id: `log-${Math.random().toString(36).slice(2)}`,
  timestamp: new Date().toISOString(),
  level: 'info',
  module: 'test',
  message: 'Test log message',
  ...overrides,
});

describe('LogStatsDashboard', () => {
  describe('Empty State', () => {
    it('renders empty state when no logs provided', () => {
      render(<LogStatsDashboard logs={[]} />);
      expect(screen.getByText('No log data available for visualization')).toBeInTheDocument();
    });
  });

  describe('With Data', () => {
    const logs = [
      createMockLog({ level: 'info', module: 'app', timestamp: new Date(Date.now() - 60000).toISOString() }),
      createMockLog({ level: 'info', module: 'app', timestamp: new Date(Date.now() - 50000).toISOString() }),
      createMockLog({ level: 'warn', module: 'chat', timestamp: new Date(Date.now() - 40000).toISOString() }),
      createMockLog({ level: 'error', module: 'api', timestamp: new Date(Date.now() - 30000).toISOString() }),
      createMockLog({ level: 'debug', module: 'app', timestamp: new Date().toISOString() }),
    ];

    it('renders summary stat cards', () => {
      render(<LogStatsDashboard logs={logs} />);

      expect(screen.getByText('Total Logs')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('Most Active Module')).toBeInTheDocument();
      expect(screen.getByText('Time Span')).toBeInTheDocument();
    });

    it('renders level distribution chart', () => {
      render(<LogStatsDashboard logs={logs} />);
      expect(screen.getByText('Level Distribution')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('renders log volume timeline chart', () => {
      render(<LogStatsDashboard logs={logs} />);
      expect(screen.getByText('Log Volume Over Time')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('renders module activity chart', () => {
      render(<LogStatsDashboard logs={logs} />);
      expect(screen.getByText('Module Activity')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('calculates correct error rate', () => {
      render(<LogStatsDashboard logs={logs} />);
      // 1 error out of 5 logs = 20.0%
      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });

    it('identifies the most active module', () => {
      render(<LogStatsDashboard logs={logs} />);
      // 'app' has 3 logs, most active
      expect(screen.getByText('app')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <LogStatsDashboard logs={[createMockLog()]} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
