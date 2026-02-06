/**
 * Unit tests for ModelChart component
 */

import { render, screen } from '@testing-library/react';
import { ModelChart } from './model-chart';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
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

describe('ModelChart', () => {
  const mockData = [
    { model: 'gpt-4', tokens: 10000, cost: 0.5, requests: 100, percentage: 50 },
    { model: 'claude-3', tokens: 8000, cost: 0.4, requests: 80, percentage: 40 },
    { model: 'gemini-pro', tokens: 2000, cost: 0.1, requests: 20, percentage: 10 },
  ];

  it('renders the chart card', () => {
    render(<ModelChart data={mockData} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders chart components', () => {
    render(<ModelChart data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<ModelChart data={[]} />);
    expect(screen.getByText('noData')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ModelChart data={mockData} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('renders with tokens dataKey by default', () => {
    render(<ModelChart data={mockData} />);
    expect(screen.getByText('tokensByModel')).toBeInTheDocument();
  });

  it('renders with cost dataKey', () => {
    render(<ModelChart data={mockData} dataKey="cost" />);
    expect(screen.getByText('costByModel')).toBeInTheDocument();
  });

  it('renders with requests dataKey', () => {
    render(<ModelChart data={mockData} dataKey="requests" />);
    expect(screen.getByText('requestsByModel')).toBeInTheDocument();
  });

  it('limits models to maxModels prop', () => {
    const manyModels = Array.from({ length: 15 }, (_, i) => ({
      model: `model-${i}`,
      tokens: 1000,
      cost: 0.1,
      requests: 10,
      percentage: 6.67,
    }));
    render(<ModelChart data={manyModels} maxModels={5} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders with custom height', () => {
    render(<ModelChart data={mockData} height={400} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
