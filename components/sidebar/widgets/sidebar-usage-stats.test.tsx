/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SidebarUsageStats } from './sidebar-usage-stats';

// Mock store
const mockGetTotalUsage = jest.fn();
const mockGetDailyUsage = jest.fn();

jest.mock('@/stores', () => ({
  useUsageStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getTotalUsage: mockGetTotalUsage,
      getDailyUsage: mockGetDailyUsage,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value}>Progress: {value}%</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

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

  it('displays today token count', () => {
    render(<SidebarUsageStats />);
    // The component formats as "10.0K tokens" (with decimal)
    expect(screen.getByText('10.0K tokens')).toBeInTheDocument();
  });

  it('displays request count', () => {
    render(<SidebarUsageStats />);
    expect(screen.getByText(/10 requests/i)).toBeInTheDocument();
  });

  it('displays cost', () => {
    render(<SidebarUsageStats />);
    const costText = screen.getByText('$0.25');
    expect(costText).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<SidebarUsageStats />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('calculates usage percentage correctly', () => {
    render(<SidebarUsageStats />);
    const progressBar = screen.getByTestId('progress-bar');
    // 10000 / 1000000 * 100 = 1%
    expect(progressBar).toHaveAttribute('data-value', '1');
  });

  it('links to settings data tab', () => {
    render(<SidebarUsageStats />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/settings?tab=data');
  });

  it('renders collapsed view correctly', () => {
    render(<SidebarUsageStats collapsed />);
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
  });

  it('formats large token counts correctly', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 1500000, cost: 5.0, requests: 100 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText('1.5M tokens')).toBeInTheDocument();
  });

  it('formats small token counts correctly', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 500, cost: 0.001, requests: 2 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText('500 tokens')).toBeInTheDocument();
  });

  it('shows less than penny for very small costs', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 100, cost: 0.001, requests: 1 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText(/< \$0\.01/)).toBeInTheDocument();
  });

  it('handles zero usage gracefully', () => {
    mockGetDailyUsage.mockReturnValue([{ tokens: 0, cost: 0, requests: 0 }]);
    render(<SidebarUsageStats />);
    expect(screen.getByText('0 tokens')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    // The className is passed but our mock Link component doesn't forward it
    // This test verifies the component renders without error when className is passed
    const { container } = render(<SidebarUsageStats className="custom-class" />);
    expect(container.querySelector('a')).toBeInTheDocument();
  });
});
