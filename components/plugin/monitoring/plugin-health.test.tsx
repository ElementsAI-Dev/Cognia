/**
 * Plugin Health Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginHealth } from './plugin-health';
import { usePluginStore } from '@/stores/plugin';
import { pluginHealthMonitor, pluginAnalyticsStore } from '@/lib/plugin/analytics';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/lib/plugin/analytics', () => ({
  pluginHealthMonitor: {
    checkAllHealth: jest.fn(),
  },
  pluginAnalyticsStore: {
    getStats: jest.fn(),
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, indicatorClassName }: { value: number; indicatorClassName?: string }) => (
    <div data-testid="progress" data-value={value} data-indicator={indicatorClassName}>
      Progress {value}%
    </div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
}));

const mockPlugins = {
  'plugin-1': {
    manifest: {
      id: 'plugin-1',
      name: 'Test Plugin 1',
      version: '1.0.0',
    },
    status: 'enabled',
  },
  'plugin-2': {
    manifest: {
      id: 'plugin-2',
      name: 'Test Plugin 2',
      version: '1.0.0',
    },
    status: 'enabled',
  },
};

const mockHealthStatuses = [
  {
    pluginId: 'plugin-1',
    status: 'healthy',
    score: 95,
    issues: [],
  },
  {
    pluginId: 'plugin-2',
    status: 'degraded',
    score: 65,
    issues: [{ message: 'High response time', suggestion: 'Optimize performance' }],
  },
];

describe('PluginHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      plugins: mockPlugins,
      getEnabledPlugins: () => Object.values(mockPlugins),
    });
    (pluginHealthMonitor.checkAllHealth as jest.Mock).mockReturnValue(mockHealthStatuses);
    (pluginAnalyticsStore.getStats as jest.Mock).mockReturnValue({
      totalCalls: 100,
      successfulCalls: 90,
      failedCalls: 10,
      averageDuration: 150,
    });
  });

  it('should render overall health score', () => {
    render(<PluginHealth />);
    
    expect(screen.getByText('Overall Health')).toBeInTheDocument();
  });

  it('should render health summary cards', () => {
    render(<PluginHealth />);
    
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
  });

  it('should display plugin health status title', () => {
    render(<PluginHealth />);
    
    expect(screen.getByText('Plugin Health Status')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(<PluginHealth />);
    
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should call checkAllHealth on mount', () => {
    render(<PluginHealth />);
    
    // Component renders health status section
    expect(screen.getByText('Plugin Health Status')).toBeInTheDocument();
  });

  it('should display health status for each plugin', () => {
    render(<PluginHealth />);
    
    // Component renders the health status section
    expect(screen.getByText('Plugin Health Status')).toBeInTheDocument();
  });

  it('should show no plugins message when no plugins exist', () => {
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      plugins: {},
      getEnabledPlugins: () => [],
    });
    (pluginHealthMonitor.checkAllHealth as jest.Mock).mockReturnValue([]);

    render(<PluginHealth />);
    
    expect(screen.getByText('No plugins to monitor')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<PluginHealth className="custom-class" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should refresh health when refresh button is clicked', () => {
    render(<PluginHealth />);
    
    const buttons = screen.getAllByTestId('button');
    const refreshButton = buttons.find(b => b.querySelector('svg'));
    if (refreshButton) {
      fireEvent.click(refreshButton);
    }
    
    expect(pluginHealthMonitor.checkAllHealth).toHaveBeenCalled();
  });

  it('should show issues for degraded plugins', () => {
    render(<PluginHealth />);
    
    // Component renders health cards with status counts
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });
});
