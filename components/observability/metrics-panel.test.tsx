/**
 * MetricsPanel Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsPanel } from './metrics-panel';
import type { MetricsData, TimeRange } from '@/types/observability';

const mockMetrics: MetricsData = {
  totalRequests: 1000,
  totalTokens: 500000,
  totalCost: 25.5,
  averageLatency: 1500,
  errorRate: 0.02,
  requestsByProvider: {
    openai: 600,
    anthropic: 400,
  },
  requestsByModel: {
    'gpt-4': 400,
    'gpt-3.5-turbo': 200,
    'claude-3': 400,
  },
  tokensByProvider: {
    openai: 300000,
    anthropic: 200000,
  },
  costByProvider: {
    openai: 15.0,
    anthropic: 10.5,
  },
  latencyPercentiles: {
    p50: 1000,
    p90: 2500,
    p99: 5000,
  },
};

describe('MetricsPanel', () => {
  const defaultProps = {
    metrics: mockMetrics,
    timeRange: '24h' as TimeRange,
  };

  it('should render metrics panel', () => {
    render(<MetricsPanel {...defaultProps} />);

    expect(screen.getByText(/metrics/i)).toBeInTheDocument();
  });

  it('should display total requests', () => {
    render(<MetricsPanel {...defaultProps} />);

    // 1000 requests formatted with locale
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('should display total tokens', () => {
    render(<MetricsPanel {...defaultProps} />);

    // 500000 tokens formatted with locale
    expect(screen.getByText('500,000')).toBeInTheDocument();
  });

  it('should display average latency', () => {
    render(<MetricsPanel {...defaultProps} />);

    // 1500ms average latency
    expect(screen.getByText('1500ms')).toBeInTheDocument();
  });

  it('should display error rate', () => {
    render(<MetricsPanel {...defaultProps} />);

    // 0.02 * 100 = 2.0%
    expect(screen.getByText('2.0%')).toBeInTheDocument();
  });

  it('should display latency percentiles', () => {
    render(<MetricsPanel {...defaultProps} />);

    expect(screen.getByText('1000ms')).toBeInTheDocument(); // p50
    expect(screen.getByText('2500ms')).toBeInTheDocument(); // p90
    expect(screen.getByText('5000ms')).toBeInTheDocument(); // p99
  });

  it('should display provider breakdown', () => {
    render(<MetricsPanel {...defaultProps} />);

    // Provider names appear in multiple sections
    expect(screen.getAllByText('openai').length).toBeGreaterThan(0);
    expect(screen.getAllByText('anthropic').length).toBeGreaterThan(0);
  });

  it('should handle null metrics', () => {
    render(<MetricsPanel metrics={null} timeRange="24h" />);

    // Should render without crashing, showing empty state
    expect(screen.getByText(/no metrics data/i)).toBeInTheDocument();
  });

  it('should display model breakdown', () => {
    render(<MetricsPanel {...defaultProps} />);

    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude-3')).toBeInTheDocument();
  });
});

describe('MetricsPanel with different time ranges', () => {
  it('should render with 1h time range', () => {
    render(<MetricsPanel metrics={mockMetrics} timeRange="1h" />);
    expect(screen.getByText(/last hour/i)).toBeInTheDocument();
  });

  it('should render with 7d time range', () => {
    render(<MetricsPanel metrics={mockMetrics} timeRange="7d" />);
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
  });

  it('should render with 30d time range', () => {
    render(<MetricsPanel metrics={mockMetrics} timeRange="30d" />);
    expect(screen.getByText(/30 days/i)).toBeInTheDocument();
  });
});
