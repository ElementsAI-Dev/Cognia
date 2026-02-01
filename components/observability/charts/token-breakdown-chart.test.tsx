/**
 * TokenBreakdownChart Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TokenBreakdownChart } from './token-breakdown-chart';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockTokenData = {
  inputTokens: 300000,
  outputTokens: 200000,
};

describe('TokenBreakdownChart', () => {
  it('should render the pie chart container', () => {
    render(<TokenBreakdownChart data={mockTokenData} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should render chart title', () => {
    render(<TokenBreakdownChart data={mockTokenData} />);
    
    expect(screen.getByText(/Token Breakdown/i)).toBeInTheDocument();
  });

  it('should display I/O ratio label', () => {
    render(<TokenBreakdownChart data={mockTokenData} />);
    
    // I/O Ratio label is present
    expect(screen.getByText(/I\/O Ratio/i)).toBeInTheDocument();
  });

  it('should render with custom height', () => {
    const { container } = render(
      <TokenBreakdownChart data={mockTokenData} height={300} />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle zero input tokens', () => {
    const zeroInputData = { inputTokens: 0, outputTokens: 100000 };
    render(<TokenBreakdownChart data={zeroInputData} />);
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should handle zero output tokens', () => {
    const zeroOutputData = { inputTokens: 100000, outputTokens: 0 };
    render(<TokenBreakdownChart data={zeroOutputData} />);
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should handle equal input and output', () => {
    const equalData = { inputTokens: 100000, outputTokens: 100000 };
    render(<TokenBreakdownChart data={equalData} />);
    
    // Both should show 100.0K
    expect(screen.getAllByText('100.0K').length).toBe(2);
  });
});
