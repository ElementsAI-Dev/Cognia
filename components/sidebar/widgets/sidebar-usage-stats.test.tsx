/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarUsageStats } from './sidebar-usage-stats';

// Mock store
const mockGetTotalUsage = jest.fn();
const mockGetDailyUsage = jest.fn();

jest.mock('@/stores', () => ({
  useUsageStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getTotalUsage: mockGetTotalUsage,
      getDailyUsage: mockGetDailyUsage,
      records: [],
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value}>
      Progress: {value}%
    </div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger" data-aschild={asChild}>
      {children}
    </div>
  ),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      usageStats: 'Usage Stats',
      todayTokens: 'Today: {count} tokens',
    };
    return translations[key] || key;
  },
}));

describe('SidebarUsageStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTotalUsage.mockReturnValue({ tokens: 50000, cost: 1.25, requests: 25 });
    mockGetDailyUsage.mockReturnValue([{ tokens: 10000, cost: 0.25, requests: 10 }]);
  });

  it('renders without crashing', () => {
    render(<SidebarUsageStats />);
    expect(screen.getByText(/Usage Stats/i)).toBeInTheDocument();
  });

  it('displays today token count in summary', () => {
    render(<SidebarUsageStats />);
    // The component shows "10.0K tokens today" in the summary
    expect(screen.getByText(/10\.0K tokens today/i)).toBeInTheDocument();
  });

  it('shows collapsible trigger', () => {
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    expect(trigger).toBeInTheDocument();
  });

  it('expands to show details when clicked', () => {
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    fireEvent.click(trigger!);
    // After expanding, should show "View Full Report" link
    expect(screen.getByText('View Full Report')).toBeInTheDocument();
  });

  it('shows progress bar when expanded', () => {
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    fireEvent.click(trigger!);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('calculates usage percentage correctly', () => {
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    fireEvent.click(trigger!);
    const progressBar = screen.getByTestId('progress-bar');
    // 10000 / 1000000 * 100 = 1%
    expect(progressBar).toHaveAttribute('data-value', '1');
  });

  it('links to settings data tab when expanded', () => {
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    fireEvent.click(trigger!);
    const link = screen.getByRole('link', { name: /View Full Report/i });
    expect(link).toHaveAttribute('href', '/settings?tab=data');
  });

  it('renders collapsed view correctly', () => {
    render(<SidebarUsageStats collapsed />);
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/settings?tab=data');
  });

  it('formats large token counts correctly', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 1500000, cost: 5.0, requests: 100 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText(/1\.5M tokens today/i)).toBeInTheDocument();
  });

  it('formats small token counts correctly', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 500, cost: 0.001, requests: 2 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText(/500 tokens today/i)).toBeInTheDocument();
  });

  it('shows cost in expanded view', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 100, cost: 0.001, requests: 1 }]);
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    fireEvent.click(trigger!);
    // Very small cost shows as "< $0.01"
    expect(screen.getByText('< $0.01')).toBeInTheDocument();
  });

  it('handles zero usage gracefully', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 0, cost: 0, requests: 0 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText(/0 tokens today/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SidebarUsageStats className="custom-class" />);
    const collapsible = container.querySelector('[data-slot="collapsible"]');
    expect(collapsible).toHaveClass('custom-class');
  });

  it('shows request count in expanded view', () => {
    const { container } = render(<SidebarUsageStats />);
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    fireEvent.click(trigger!);
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
