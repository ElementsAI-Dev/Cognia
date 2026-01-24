/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageSettings } from './usage-settings';

// Mock stores
const mockClearUsageRecords = jest.fn();

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => {
    if (ns === 'usageSettings') {
      if (key === 'overview') return 'Overview';
      if (key === 'tokens') return 'Tokens';
      if (key === 'cost') return 'Cost';
      if (key === 'since') return 'Since';
      if (key === 'byProvider') return 'By Provider';
      if (key === 'last7Days') return 'Last 7 Days';
      if (key === 'recentActivity') return 'Recent Activity';
      if (key === 'export') return 'Export';
      if (key === 'clear') return 'Clear';
      if (key === 'clearTitle') return 'Clear Usage Records';
    }
    if (ns === 'common') {
      if (key === 'cancel') return 'Cancel';
      if (key === 'confirm') return 'Confirm';
    }
    return key;
  },
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Coins: () => <div data-testid="icon-coins" />,
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  Clock: () => <div data-testid="icon-clock" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Download: () => <div data-testid="icon-download" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  Search: () => <div data-testid="icon-search" />,
}));

// Mock usage types
jest.mock('@/types/system/usage', () => ({
  formatTokens: (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  },
  formatCost: (n: number) => `$${n.toFixed(2)}`,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} className={className} />
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
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
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
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

describe('UsageSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRecords = [
    {
      id: '1',
      provider: 'openai',
      model: 'gpt-4o',
      tokens: { total: 8000 },
      cost: 0.12,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      tokens: { total: 2000 },
      cost: 0.03,
      createdAt: new Date('2024-01-01T11:00:00Z'),
    },
  ];

  // Modified mock to align with component's records-based calculation
  jest.mock('@/stores', () => ({
    useUsageStore: (
      selector: (state: { records: UsageRecord[]; clearUsageRecords: jest.Mock }) => any
    ) => {
      const state = {
        records: [
          {
            id: '1',
            provider: 'openai',
            model: 'gpt-4o',
            tokens: { total: 8000 },
            cost: 0.12,
            createdAt: new Date('2024-01-01T10:00:00Z'),
          },
          {
            id: '2',
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            tokens: { total: 2000 },
            cost: 0.03,
            createdAt: new Date('2024-01-01T11:00:00Z'),
          },
        ],
        clearUsageRecords: mockClearUsageRecords,
      };
      return selector(state);
    },
  }));

  it('renders without crashing', () => {
    render(<UsageSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays overview section', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('displays total tokens calculated from records', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('10.0K')).toBeInTheDocument();
  });

  it('displays total cost calculated from records', () => {
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

  it('displays Recent Activity section with record count', () => {
    render(<UsageSettings />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
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
