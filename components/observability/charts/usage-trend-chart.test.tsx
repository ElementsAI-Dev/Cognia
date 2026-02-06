/**
 * Unit tests for UsageTrendChart component
 */

import { render, screen } from '@testing-library/react';
import { UsageTrendChart } from './usage-trend-chart';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

describe('UsageTrendChart', () => {
  const mockData = [
    { timestamp: 1704067200000, date: '2024-01-01', tokens: 10000, cost: 0.5, requests: 100 },
    { timestamp: 1704153600000, date: '2024-01-02', tokens: 15000, cost: 0.75, requests: 150 },
    { timestamp: 1704240000000, date: '2024-01-03', tokens: 12000, cost: 0.6, requests: 120 },
  ];

  it('renders the chart card', () => {
    render(<UsageTrendChart data={mockData} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders area chart components', () => {
    render(<UsageTrendChart data={mockData} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<UsageTrendChart data={[]} />);
    expect(screen.getByText('noData')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<UsageTrendChart data={mockData} title="Custom Trend Title" />);
    expect(screen.getByText('Custom Trend Title')).toBeInTheDocument();
  });

  it('renders default title when not provided', () => {
    render(<UsageTrendChart data={mockData} />);
    expect(screen.getByText('usageTrend')).toBeInTheDocument();
  });

  it('renders legend', () => {
    render(<UsageTrendChart data={mockData} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('renders with showCost disabled', () => {
    render(<UsageTrendChart data={mockData} showCost={false} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders with showTokens disabled', () => {
    render(<UsageTrendChart data={mockData} showTokens={false} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders with custom height', () => {
    render(<UsageTrendChart data={mockData} height={400} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
