/**
 * Unit tests for ProviderChart component
 */

import { render, screen } from '@testing-library/react';
import { ProviderChart } from './provider-chart';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />,
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

describe('ProviderChart', () => {
  const mockData = [
    { provider: 'openai', tokens: 15000, cost: 0.75, requests: 150, percentage: 60 },
    { provider: 'anthropic', tokens: 8000, cost: 0.4, requests: 80, percentage: 32 },
    { provider: 'google', tokens: 2000, cost: 0.1, requests: 20, percentage: 8 },
  ];

  it('renders the chart card', () => {
    render(<ProviderChart data={mockData} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders pie chart components', () => {
    render(<ProviderChart data={mockData} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<ProviderChart data={[]} />);
    expect(screen.getByText('noData')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ProviderChart data={mockData} title="Custom Provider Title" />);
    expect(screen.getByText('Custom Provider Title')).toBeInTheDocument();
  });

  it('renders with tokens dataKey by default', () => {
    render(<ProviderChart data={mockData} />);
    expect(screen.getByText('tokensByProvider')).toBeInTheDocument();
  });

  it('renders with cost dataKey', () => {
    render(<ProviderChart data={mockData} dataKey="cost" />);
    expect(screen.getByText('costByProvider')).toBeInTheDocument();
  });

  it('renders with requests dataKey', () => {
    render(<ProviderChart data={mockData} dataKey="requests" />);
    expect(screen.getByText('requestsByProvider')).toBeInTheDocument();
  });

  it('renders legend', () => {
    render(<ProviderChart data={mockData} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('renders tooltip', () => {
    render(<ProviderChart data={mockData} />);
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });
});
