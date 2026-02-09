/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  UsageAnalyticsCard,
  UsageSummaryBadge,
  UsageStatsMini,
} from './usage-analytics-card';

// Mock the hooks
jest.mock('@/hooks/chat/use-usage-analytics', () => ({
  useUsageAnalytics: jest.fn(() => ({
    statistics: {
      totalTokens: 15000,
      totalCost: 0.25,
      totalRequests: 10,
      averageTokensPerRequest: 1500,
      averageCostPerRequest: 0.025,
      inputTokens: 10000,
      outputTokens: 5000,
      inputOutputRatio: 2,
    },
    modelBreakdown: [
      { model: 'gpt-4o', tokens: 10000, cost: 0.2, requests: 7, percentage: 66.7 },
      { model: 'gpt-4o-mini', tokens: 5000, cost: 0.05, requests: 3, percentage: 33.3 },
    ],
    providerBreakdown: [
      { provider: 'openai', tokens: 15000, cost: 0.25, requests: 10, percentage: 100 },
    ],
    trend: {
      period: 'week',
      dataPoints: [],
      totalTokens: 15000,
      totalCost: 0.25,
      averageDaily: 2142,
      trend: 'stable',
      percentChange: 5,
    },
    efficiency: {
      costPerKToken: 0.0167,
      tokensPerDollar: 60000,
      mostEfficientModel: 'gpt-4o-mini',
      leastEfficientModel: 'gpt-4o',
      potentialSavings: 0.1,
    },
    dailySummary: {
      today: { totalTokens: 3000, totalCost: 0.05, totalRequests: 2, averageTokensPerRequest: 1500, averageCostPerRequest: 0.025, inputTokens: 2000, outputTokens: 1000, inputOutputRatio: 2 },
      yesterday: { totalTokens: 2500, totalCost: 0.04, totalRequests: 2, averageTokensPerRequest: 1250, averageCostPerRequest: 0.02, inputTokens: 1500, outputTokens: 1000, inputOutputRatio: 1.5 },
      thisWeek: { totalTokens: 15000, totalCost: 0.25, totalRequests: 10, averageTokensPerRequest: 1500, averageCostPerRequest: 0.025, inputTokens: 10000, outputTokens: 5000, inputOutputRatio: 2 },
      thisMonth: { totalTokens: 50000, totalCost: 0.8, totalRequests: 30, averageTokensPerRequest: 1666, averageCostPerRequest: 0.027, inputTokens: 33000, outputTokens: 17000, inputOutputRatio: 1.9 },
    },
    topSessions: [],
    recommendations: ['Usage patterns look healthy. Keep up the good work!'],
    performanceMetrics: {
      avgLatency: 0,
      p95Latency: 0,
      avgTimeToFirstToken: 0,
      errorRate: 0,
      successRate: 1,
      avgTokensPerSecond: 0,
      totalErrors: 0,
      totalSuccesses: 0,
    },
    recordCount: 10,
    isLoading: false,
    refresh: jest.fn(),
  })),
  useUsageSummary: jest.fn(() => ({
    totalTokens: 15000,
    totalCost: 0.25,
    totalRequests: 10,
    todayTokens: 3000,
    todayCost: 0.05,
    trend: 'stable',
    percentChange: 5,
  })),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useCurrencyFormat
jest.mock('@/hooks/ui/use-currency-format', () => ({
  useCurrencyFormat: () => ({
    formatCost: (value: number) => `$${value.toFixed(3)}`,
    currency: 'USD',
  }),
}));

describe('UsageAnalyticsCard', () => {
  describe('UsageAnalyticsCard component', () => {
    it('renders without crashing', () => {
      render(<UsageAnalyticsCard />);
      expect(screen.getByText('usageAnalytics')).toBeInTheDocument();
    });

    it('displays usage statistics', () => {
      render(<UsageAnalyticsCard />);
      expect(screen.getByText('15.0K')).toBeInTheDocument();
      expect(screen.getByText('$0.250')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows model breakdown when enabled', () => {
      render(<UsageAnalyticsCard showBreakdown />);
      expect(screen.getByText('modelUsage')).toBeInTheDocument();
      expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    });

    it('hides model breakdown when disabled', () => {
      render(<UsageAnalyticsCard showBreakdown={false} />);
      expect(screen.queryByText('modelUsage')).not.toBeInTheDocument();
    });

    it('shows recommendations when enabled', () => {
      render(<UsageAnalyticsCard showRecommendations />);
      expect(screen.getByText('recommendations')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      render(<UsageAnalyticsCard compact />);
      // Compact mode should not show the full card content
      expect(screen.queryByText('usageAnalytics')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<UsageAnalyticsCard className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('UsageSummaryBadge component', () => {
    it('renders without crashing', () => {
      render(<UsageSummaryBadge />);
    });

    it('displays token and cost badges', () => {
      render(<UsageSummaryBadge />);
      expect(screen.getByText('15.0K')).toBeInTheDocument();
      expect(screen.getByText('$0.250')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<UsageSummaryBadge className="custom-badge" />);
      expect(container.querySelector('.custom-badge')).toBeInTheDocument();
    });
  });

  describe('UsageStatsMini component', () => {
    it('renders without crashing', () => {
      render(<UsageStatsMini />);
    });

    it('displays today stats', () => {
      render(<UsageStatsMini />);
      expect(screen.getByText('3.0K')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<UsageStatsMini className="custom-mini" />);
      expect(container.querySelector('.custom-mini')).toBeInTheDocument();
    });
  });
});
