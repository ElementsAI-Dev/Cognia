/**
 * CostAnalysis Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CostAnalysis } from './cost-analysis';
import type { MetricsData, TimeRange } from './observability-dashboard';

const mockMetrics: MetricsData = {
  totalRequests: 100,
  totalTokens: 50000,
  totalCost: 5.50,
  averageLatency: 1200,
  errorRate: 0.01,
  requestsByProvider: {
    openai: 60,
    anthropic: 40,
  },
  requestsByModel: {
    'gpt-4': 40,
    'claude-3': 40,
    'gpt-3.5-turbo': 20,
  },
  tokensByProvider: {
    openai: 30000,
    anthropic: 20000,
  },
  costByProvider: {
    openai: 3.50,
    anthropic: 2.00,
  },
  latencyPercentiles: {
    p50: 1000,
    p90: 2000,
    p99: 4000,
  },
};

describe('CostAnalysis', () => {
  const defaultProps = {
    metrics: mockMetrics,
    timeRange: '24h' as TimeRange,
  };

  it('should render cost analysis panel', () => {
    render(<CostAnalysis {...defaultProps} />);
    expect(screen.getAllByText(/cost/i).length).toBeGreaterThan(0);
  });

  it('should display total cost', () => {
    render(<CostAnalysis {...defaultProps} />);
    // Component formats cost as $5.5000
    expect(screen.getAllByText(/5\.5/).length).toBeGreaterThan(0);
  });

  it('should display cost by provider', () => {
    render(<CostAnalysis {...defaultProps} />);
    expect(screen.getAllByText(/openai/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/anthropic/i).length).toBeGreaterThan(0);
  });

  it('should handle null metrics', () => {
    render(<CostAnalysis metrics={null} timeRange="24h" />);
    expect(screen.getByText(/no cost data/i)).toBeInTheDocument();
  });
});

describe('CostAnalysis with different time ranges', () => {
  it('should render with 1h time range', () => {
    render(<CostAnalysis metrics={mockMetrics} timeRange="1h" />);
    expect(screen.getByText(/last hour/i)).toBeInTheDocument();
  });

  it('should render with 7d time range', () => {
    render(<CostAnalysis metrics={mockMetrics} timeRange="7d" />);
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
  });

  it('should render with 30d time range', () => {
    render(<CostAnalysis metrics={mockMetrics} timeRange="30d" />);
    expect(screen.getByText(/30 days/i)).toBeInTheDocument();
  });
});

describe('CostAnalysis edge cases', () => {
  it('should handle zero requests (costPerRequest = 0)', () => {
    const zeroRequestsMetrics: MetricsData = {
      ...mockMetrics,
      totalRequests: 0,
      totalCost: 0,
    };
    render(<CostAnalysis metrics={zeroRequestsMetrics} timeRange="24h" />);
    // Multiple $0.0000 values expected for total cost and cost per request
    expect(screen.getAllByText('$0.0000').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle zero tokens (costPerToken = 0)', () => {
    const zeroTokensMetrics: MetricsData = {
      ...mockMetrics,
      totalTokens: 0,
    };
    render(<CostAnalysis metrics={zeroTokensMetrics} timeRange="24h" />);
    expect(screen.getAllByText(/cost/i).length).toBeGreaterThan(0);
  });

  it('should handle empty costByProvider', () => {
    const emptyProviderMetrics: MetricsData = {
      ...mockMetrics,
      costByProvider: {},
    };
    render(<CostAnalysis metrics={emptyProviderMetrics} timeRange="24h" />);
    expect(screen.getAllByText(/no cost data/i).length).toBeGreaterThan(0);
  });

  it('should calculate projected monthly cost correctly for 1h', () => {
    const hourlyMetrics: MetricsData = {
      ...mockMetrics,
      totalCost: 1.0,
    };
    render(<CostAnalysis metrics={hourlyMetrics} timeRange="1h" />);
    // 1.0 * 24 * 30 = 720
    expect(screen.getByText('$720.00')).toBeInTheDocument();
  });

  it('should display cost per 1k tokens', () => {
    render(<CostAnalysis metrics={mockMetrics} timeRange="24h" />);
    // costPerToken = 5.50 / 50000 = 0.00011, * 1000 = 0.11
    expect(screen.getByText('$0.1100')).toBeInTheDocument();
  });

  it('should display provider percentage', () => {
    render(<CostAnalysis metrics={mockMetrics} timeRange="24h" />);
    // openai: 3.50 / 5.50 = 63.6%
    expect(screen.getByText(/63\.6/)).toBeInTheDocument();
  });
});
