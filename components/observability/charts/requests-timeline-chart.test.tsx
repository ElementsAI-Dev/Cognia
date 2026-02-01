/**
 * RequestsTimelineChart Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RequestsTimelineChart } from './requests-timeline-chart';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  defs: ({ children }: { children: React.ReactNode }) => <defs>{children}</defs>,
  linearGradient: ({ children }: { children: React.ReactNode }) => <linearGradient>{children}</linearGradient>,
  stop: () => <stop />,
}));

const mockTimeSeriesData: TimeSeriesDataPoint[] = [
  { date: '2024-01-01', tokens: 10000, cost: 0.5, requests: 50 },
  { date: '2024-01-02', tokens: 15000, cost: 0.75, requests: 75 },
  { date: '2024-01-03', tokens: 12000, cost: 0.6, requests: 60 },
  { date: '2024-01-04', tokens: 20000, cost: 1.0, requests: 100 },
  { date: '2024-01-05', tokens: 18000, cost: 0.9, requests: 90 },
];

describe('RequestsTimelineChart', () => {
  it('should render the composed chart container', () => {
    render(<RequestsTimelineChart data={mockTimeSeriesData} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('should render chart title', () => {
    render(<RequestsTimelineChart data={mockTimeSeriesData} />);
    
    expect(screen.getByText(/requests/i)).toBeInTheDocument();
  });

  it('should render with cost line when showCost is true', () => {
    render(<RequestsTimelineChart data={mockTimeSeriesData} showCost />);
    
    expect(screen.getByTestId('line')).toBeInTheDocument();
  });

  it('should render with custom height', () => {
    const { container } = render(
      <RequestsTimelineChart data={mockTimeSeriesData} height={300} />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<RequestsTimelineChart data={[]} />);
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singlePoint = [mockTimeSeriesData[0]];
    render(<RequestsTimelineChart data={singlePoint} />);
    
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('should handle data with zero requests', () => {
    const zeroData = mockTimeSeriesData.map(d => ({ ...d, requests: 0 }));
    render(<RequestsTimelineChart data={zeroData} />);
    
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });
});
