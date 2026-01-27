'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AutoRouterSettings } from './auto-router-settings';

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      autoRouterSettings: {
        enabled: true,
        routingMode: 'auto',
        strategy: 'balanced',
        fallbackTier: 'balanced',
        showRoutingIndicator: true,
        allowOverride: true,
        enableCache: true,
        cacheTTL: 300,
      },
      setAutoRouterSettings: jest.fn(),
      setAutoRouterEnabled: jest.fn(),
      setAutoRouterMode: jest.fn(),
      setAutoRouterStrategy: jest.fn(),
      setAutoRouterShowIndicator: jest.fn(),
      setAutoRouterFallbackTier: jest.fn(),
      resetAutoRouterSettings: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('@/lib/ai/generation/routing-cache', () => ({
  getRoutingStats: () => ({
    totalRequests: 100,
    avgLatency: 50,
    cacheHitRate: 0.75,
    byTier: { fast: 30, balanced: 50, powerful: 15, reasoning: 5 },
    estimatedCostSaved: 0.05,
  }),
  resetRoutingStats: jest.fn(),
  clearRoutingCache: jest.fn(),
  getCacheStats: () => ({ size: 50 }),
}));

const messages = {
  autoRouterSettings: {
    autoModelRouting: 'Auto Model Routing',
    autoModelRoutingDesc: 'Automatically select the best model',
    routingMode: 'Routing Mode',
    routingStrategy: 'Routing Strategy',
    fallbackTier: 'Fallback Tier',
    fallbackTierDesc: 'Default tier when routing fails',
    showRoutingIndicator: 'Show Routing Indicator',
    showRoutingIndicatorDesc: 'Show indicator when auto-routing',
    allowManualOverride: 'Allow Manual Override',
    allowManualOverrideDesc: 'Allow manual model selection',
    enableRoutingCache: 'Enable Routing Cache',
    enableRoutingCacheDesc: 'Cache routing decisions',
    cacheTtl: 'Cache TTL',
    routingStatistics: 'Routing Statistics',
    performanceMetrics: 'Performance metrics',
    totalRequests: 'Total Requests',
    avgLatency: 'Avg Latency',
    cacheHitRate: 'Cache Hit Rate',
    cacheSize: 'Cache Size',
    tierDistribution: 'Tier Distribution',
    tierFast: 'Fast',
    tierBalanced: 'Balanced',
    tierPowerful: 'Powerful',
    tierReasoning: 'Reasoning',
    estimatedCostSaved: 'Estimated Cost Saved',
    resetToDefaults: 'Reset to Defaults',
    auto: 'Auto',
    autoDesc: 'Automatically route',
    complexity: 'Complexity',
    complexityDesc: 'Route by complexity',
    cost: 'Cost',
    costDesc: 'Optimize for cost',
    balanced: 'Balanced',
    balancedDesc: 'Balance cost and quality',
    quality: 'Quality',
    qualityDesc: 'Prioritize quality',
    fast: 'Fast',
    fastDesc: 'Prioritize speed',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('AutoRouterSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders auto model routing label', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('Auto Model Routing')).toBeInTheDocument();
  });

  it('renders routing mode selector when enabled', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('Routing Mode')).toBeInTheDocument();
  });

  it('renders routing strategy options', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('Routing Strategy')).toBeInTheDocument();
  });

  it('renders statistics card', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('Routing Statistics')).toBeInTheDocument();
  });

  it('renders total requests stat', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders cache hit rate', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  it('renders tier distribution badges', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText(/Fast: 30/)).toBeInTheDocument();
    expect(screen.getByText(/Balanced: 50/)).toBeInTheDocument();
  });

  it('renders reset button', () => {
    renderWithProviders(<AutoRouterSettings />);
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
  });
});
