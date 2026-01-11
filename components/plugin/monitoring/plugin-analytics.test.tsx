/**
 * Plugin Analytics Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginAnalytics } from './plugin-analytics';
import { usePluginStore } from '@/stores/plugin';
import { pluginAnalyticsStore, getPluginInsights, getPluginHealth } from '@/lib/plugin/analytics';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/lib/plugin/analytics', () => ({
  pluginAnalyticsStore: {
    getAllStats: jest.fn(),
  },
  getPluginInsights: jest.fn(),
  getPluginHealth: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value}>Progress {value}%</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

const mockPlugins = {
  'plugin-1': {
    manifest: {
      id: 'plugin-1',
      name: 'Test Plugin 1',
      version: '1.0.0',
      capabilities: ['tools'],
    },
    status: 'enabled',
  },
};

const mockStats = [
  {
    pluginId: 'plugin-1',
    totalCalls: 100,
    successfulCalls: 95,
    failedCalls: 5,
    averageDuration: 150,
    lastUsed: new Date().toISOString(),
    dailyUsage: [{ date: '2024-01-01', calls: 10 }],
    toolUsage: { tool1: { name: 'tool1', callCount: 50, successCount: 48 } },
  },
];

describe('PluginAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({ plugins: mockPlugins });
    (pluginAnalyticsStore.getAllStats as jest.Mock).mockReturnValue(mockStats);
    (getPluginInsights as jest.Mock).mockReturnValue([]);
    (getPluginHealth as jest.Mock).mockReturnValue({
      pluginId: 'plugin-1',
      status: 'healthy',
      score: 95,
      issues: [],
    });
  });

  it('should render overview stat cards', () => {
    render(<PluginAnalytics />);
    
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Active Plugins')).toBeInTheDocument();
    expect(screen.getByText('Avg Response')).toBeInTheDocument();
  });

  it('should display total calls count', () => {
    render(<PluginAnalytics />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should render tabs for Insights, Health, and Usage', () => {
    render(<PluginAnalytics />);
    
    expect(screen.getByTestId('tab-trigger-insights')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-health')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-usage')).toBeInTheDocument();
  });

  it('should show no insights message when there are no insights', () => {
    render(<PluginAnalytics />);
    
    expect(screen.getByText(/No insights yet/)).toBeInTheDocument();
  });

  it('should display insights when available', () => {
    (getPluginInsights as jest.Mock).mockReturnValue([
      {
        type: 'suggestion',
        title: 'Test Insight',
        description: 'This is a test insight',
        pluginId: 'plugin-1',
        actionable: false,
      },
    ]);

    render(<PluginAnalytics />);
    
    expect(screen.getByText('Test Insight')).toBeInTheDocument();
  });

  it('should render health status for plugins', () => {
    render(<PluginAnalytics />);
    
    expect(screen.getByText('Plugin Health Status')).toBeInTheDocument();
  });

  it('should render usage statistics', () => {
    render(<PluginAnalytics />);
    
    expect(screen.getByText('Plugin Usage')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<PluginAnalytics className="custom-class" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should handle empty stats gracefully', () => {
    (pluginAnalyticsStore.getAllStats as jest.Mock).mockReturnValue([]);
    
    render(<PluginAnalytics />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No usage data yet')).toBeInTheDocument();
  });
});
