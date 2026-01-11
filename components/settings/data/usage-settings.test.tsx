/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageSettings } from './usage-settings';

// Mock stores
const mockClearUsageRecords = jest.fn();

jest.mock('@/stores', () => ({
  useUsageStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getTotalUsage: () => ({ tokens: 10000, requests: 50, cost: 0.15 }),
      getUsageByProvider: () => [
        { provider: 'openai', tokens: 8000, requests: 40, cost: 0.12 },
        { provider: 'anthropic', tokens: 2000, requests: 10, cost: 0.03 },
      ],
      getDailyUsage: () => [
        { date: '2024-01-01', tokens: 1000 },
        { date: '2024-01-02', tokens: 1500 },
        { date: '2024-01-03', tokens: 2000 },
      ],
      clearUsageRecords: mockClearUsageRecords,
      records: [
        {
          id: '1',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { total: 500 },
          createdAt: new Date(),
        },
      ],
    };
    return selector(state);
  },
}));

// Mock usage types
jest.mock('@/types/system/usage', () => ({
  formatTokens: (n: number) => `${(n / 1000).toFixed(1)}K`,
  formatCost: (n: number) => `$${n.toFixed(2)}`,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : <div>{children}</div>
  ),
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

describe('UsageSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<UsageSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays total tokens', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('10.0K')).toBeInTheDocument();
  });

  it('displays total cost', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('$0.15')).toBeInTheDocument();
  });

  it('displays By Provider section', () => {
    render(<UsageSettings />);
    expect(screen.getByText('By Provider')).toBeInTheDocument();
  });

  it('displays provider names', () => {
    render(<UsageSettings />);
    expect(screen.getAllByText('openai').length).toBeGreaterThan(0);
    expect(screen.getAllByText('anthropic').length).toBeGreaterThan(0);
  });

  it('displays Last 7 Days section', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
  });

  it('displays Recent Activity section', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('displays Export button', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('displays Clear button', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('opens clear dialog when Clear is clicked', () => {
    render(<UsageSettings />);
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText('Clear Usage Records')).toBeInTheDocument();
  });
});
