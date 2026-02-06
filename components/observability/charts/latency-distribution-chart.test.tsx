/**
 * LatencyDistributionChart Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LatencyDistributionChart } from './latency-distribution-chart';

// Mock Recharts to avoid rendering issues in tests
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
  ReferenceLine: () => <div data-testid="reference-line" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockLatencyData = {
  p50: 100,
  p90: 250,
  p99: 500,
};

describe('LatencyDistributionChart', () => {
  it('should render the chart container', () => {
    render(<LatencyDistributionChart data={mockLatencyData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render chart title', () => {
    render(<LatencyDistributionChart data={mockLatencyData} />);

    // Title should be visible
    expect(screen.getByText(/latency/i)).toBeInTheDocument();
  });

  it('should render with custom height', () => {
    const { container } = render(<LatencyDistributionChart data={mockLatencyData} height={300} />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render with average latency reference line', () => {
    render(<LatencyDistributionChart data={mockLatencyData} averageLatency={150} />);

    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    const zeroData = { p50: 0, p90: 0, p99: 0 };
    render(<LatencyDistributionChart data={zeroData} />);

    // Zero data shows "No data available" message
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should handle high latency values', () => {
    const highData = { p50: 5000, p90: 10000, p99: 20000 };
    render(<LatencyDistributionChart data={highData} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
