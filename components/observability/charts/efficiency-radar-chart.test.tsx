/**
 * EfficiencyRadarChart Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EfficiencyRadarChart, calculateEfficiencyScores } from './efficiency-radar-chart';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  RadarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radar-chart">{children}</div>
  ),
  Radar: () => <div data-testid="radar" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockEfficiencyData = {
  costEfficiency: 85,
  tokenEfficiency: 70,
  latencyScore: 90,
  errorScore: 95,
  utilizationScore: 60,
};

describe('EfficiencyRadarChart', () => {
  it('should render the radar chart container', () => {
    render(<EfficiencyRadarChart data={mockEfficiencyData} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('should render chart title', () => {
    render(<EfficiencyRadarChart data={mockEfficiencyData} />);
    
    expect(screen.getByText(/efficiency/i)).toBeInTheDocument();
  });

  it('should display overall score', () => {
    render(<EfficiencyRadarChart data={mockEfficiencyData} />);
    
    // Score display should be present (average of all scores)
    expect(screen.getByText(/%/)).toBeInTheDocument();
  });

  it('should render with custom height', () => {
    const { container } = render(
      <EfficiencyRadarChart data={mockEfficiencyData} height={300} />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle zero data', () => {
    const zeroData = {
      costEfficiency: 0,
      tokenEfficiency: 0,
      latencyScore: 0,
      errorScore: 0,
      utilizationScore: 0,
    };
    render(<EfficiencyRadarChart data={zeroData} />);
    
    // Should show no data message
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<EfficiencyRadarChart data={mockEfficiencyData} title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});

describe('calculateEfficiencyScores', () => {
  it('should calculate efficiency scores from metrics', () => {
    const metrics = {
      costPerKToken: 0.002,
      averageLatency: 1000,
      errorRate: 0.02,
      tokensPerDollar: 500000,
      totalRequests: 100,
    };
    
    const scores = calculateEfficiencyScores(metrics);
    
    expect(scores).toHaveProperty('costEfficiency');
    expect(scores).toHaveProperty('tokenEfficiency');
    expect(scores).toHaveProperty('latencyScore');
    expect(scores).toHaveProperty('errorScore');
    expect(scores).toHaveProperty('utilizationScore');
    expect(scores.costEfficiency).toBeGreaterThanOrEqual(0);
    expect(scores.costEfficiency).toBeLessThanOrEqual(100);
  });

  it('should handle zero values', () => {
    const zeroMetrics = {
      costPerKToken: 0,
      averageLatency: 0,
      errorRate: 0,
      tokensPerDollar: 0,
      totalRequests: 0,
    };
    
    const scores = calculateEfficiencyScores(zeroMetrics);
    
    expect(scores.errorScore).toBe(100); // 0 error rate = 100% score
    expect(scores.latencyScore).toBe(100); // 0 latency = 100% score
  });

  it('should handle high cost per token', () => {
    const expensiveMetrics = {
      costPerKToken: 0.1, // Very expensive
      averageLatency: 1000,
      errorRate: 0.05,
      tokensPerDollar: 10000,
      totalRequests: 50,
    };
    
    const scores = calculateEfficiencyScores(expensiveMetrics);
    
    expect(scores.costEfficiency).toBe(0); // Max cost = 0 efficiency
  });

  it('should cap scores at 100', () => {
    const goodMetrics = {
      costPerKToken: 0.001,
      averageLatency: 100,
      errorRate: 0,
      tokensPerDollar: 1000000,
      totalRequests: 500,
    };
    
    const scores = calculateEfficiencyScores(goodMetrics);
    
    expect(scores.costEfficiency).toBeLessThanOrEqual(100);
    expect(scores.tokenEfficiency).toBeLessThanOrEqual(100);
    expect(scores.utilizationScore).toBeLessThanOrEqual(100);
  });
});
