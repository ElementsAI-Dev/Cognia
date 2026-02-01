/**
 * EfficiencyMetricsCard Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EfficiencyMetricsCard } from './efficiency-metrics-card';
import type { CostEfficiencyMetrics } from '@/lib/ai/usage-analytics';

const mockMetrics: CostEfficiencyMetrics = {
  costPerKToken: 0.002,
  tokensPerDollar: 500000,
  mostEfficientModel: 'gpt-3.5-turbo',
  leastEfficientModel: 'gpt-4',
  potentialSavings: 5.50,
};

describe('EfficiencyMetricsCard', () => {
  it('should render the card', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} />);
    
    // "efficiency" appears multiple times (title, labels)
    expect(screen.getAllByText(/efficiency/i).length).toBeGreaterThan(0);
  });

  it('should display efficiency score badge', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} />);
    
    // Should show efficiency level (Excellent, Good, Moderate, or Needs Improvement)
    expect(
      screen.getByText(/excellent|good|moderate|needs improvement/i)
    ).toBeInTheDocument();
  });

  it('should display cost per K token', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} />);
    
    // $0.002 per K tokens
    expect(screen.getByText('$0.0020')).toBeInTheDocument();
  });

  it('should display tokens per dollar', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} />);
    
    // 500K tokens per dollar
    expect(screen.getByText('500.0K')).toBeInTheDocument();
  });

  it('should display most efficient model', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} />);
    
    expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
  });

  it('should display least efficient model', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} />);
    
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('should display potential savings when showRecommendation is true', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} showRecommendation />);
    
    expect(screen.getByText(/potential savings/i)).toBeInTheDocument();
  });

  it('should hide potential savings when showRecommendation is false', () => {
    render(<EfficiencyMetricsCard metrics={mockMetrics} showRecommendation={false} />);
    
    expect(screen.queryByText(/potential savings/i)).not.toBeInTheDocument();
  });

  it('should not show savings section when potentialSavings is 0', () => {
    const noSavingsMetrics = { ...mockMetrics, potentialSavings: 0 };
    render(<EfficiencyMetricsCard metrics={noSavingsMetrics} />);
    
    expect(screen.queryByText(/potential savings/i)).not.toBeInTheDocument();
  });

  it('should handle high cost per K token (poor efficiency)', () => {
    const expensiveMetrics: CostEfficiencyMetrics = {
      costPerKToken: 0.1,
      tokensPerDollar: 10000,
      mostEfficientModel: 'gpt-4',
      leastEfficientModel: 'gpt-4',
      potentialSavings: 0,
    };
    
    render(<EfficiencyMetricsCard metrics={expensiveMetrics} />);
    
    // Should show poor efficiency label
    expect(
      screen.getByText(/needs improvement|moderate/i)
    ).toBeInTheDocument();
  });

  it('should not show least efficient model when same as most efficient', () => {
    const sameModelMetrics: CostEfficiencyMetrics = {
      ...mockMetrics,
      mostEfficientModel: 'gpt-4',
      leastEfficientModel: 'gpt-4',
    };
    
    render(<EfficiencyMetricsCard metrics={sameModelMetrics} />);
    
    // Should only show one model reference section
    const modelTexts = screen.getAllByText('gpt-4');
    expect(modelTexts.length).toBe(1);
  });

  it('should render with custom className', () => {
    const { container } = render(
      <EfficiencyMetricsCard metrics={mockMetrics} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
