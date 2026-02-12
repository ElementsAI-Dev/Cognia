/**
 * Unit tests for ArenaLeaderboard component
 */

import { render, screen } from '@testing-library/react';
import { ArenaLeaderboard } from './arena-leaderboard';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock arena store
const mockModelRatings = [
  {
    modelId: 'gpt-4',
    provider: 'openai',
    displayName: 'GPT-4',
    rating: 1850,
    ci95Lower: 1800,
    ci95Upper: 1900,
    wins: 50,
    losses: 10,
    ties: 5,
    totalBattles: 65,
    winRate: 0.769,
    stabilityScore: 0.8,
    categoryRatings: {},
  },
  {
    modelId: 'claude-3',
    provider: 'anthropic',
    displayName: 'Claude 3',
    rating: 1780,
    ci95Lower: 1730,
    ci95Upper: 1830,
    wins: 45,
    losses: 15,
    ties: 5,
    totalBattles: 65,
    winRate: 0.692,
    stabilityScore: 0.75,
    categoryRatings: {},
  },
  {
    modelId: 'gemini-pro',
    provider: 'google',
    displayName: 'Gemini Pro',
    rating: 1650,
    ci95Lower: 1600,
    ci95Upper: 1700,
    wins: 30,
    losses: 25,
    ties: 10,
    totalBattles: 65,
    winRate: 0.461,
    stabilityScore: 0.5,
    categoryRatings: {},
  },
];

const mockRecalculateBTRatings = jest.fn();
const mockGetBTRatings = jest.fn(() => mockModelRatings.map((r) => ({
  ...r,
  btScore: r.rating / 1000,
})));

jest.mock('@/stores/arena', () => ({
  useArenaStore: (selector: (state: unknown) => unknown) => {
    const mockState = {
      modelRatings: mockModelRatings,
      getBTRatings: mockGetBTRatings,
      recalculateBTRatings: mockRecalculateBTRatings,
      settings: { showConfidenceIntervals: true },
    };
    return selector(mockState);
  },
}));

// Mock hooks/arena to avoid transitive ESM dependency chain (react-vega)
jest.mock('@/hooks/arena', () => ({
  useLeaderboardData: () => ({
    leaderboard: [],
    status: 'idle',
    error: null,
    lastFetchAt: null,
  }),
}));

// Mock remoteToLocalRating from types
jest.mock('@/types/arena', () => ({
  ...jest.requireActual('@/types/arena'),
  remoteToLocalRating: jest.fn((r: unknown) => r),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table data-testid="table">{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr data-testid="table-row">{children}</tr>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <option>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: () => <div data-testid="progress" />,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trophy: () => <span data-testid="icon-trophy" />,
  Medal: () => <span data-testid="icon-medal" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  Minus: () => <span data-testid="icon-minus" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
  Filter: () => <span data-testid="icon-filter" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Download: () => <span data-testid="icon-download" />,
  Info: () => <span data-testid="icon-info" />,
  ArrowUpDown: () => <span data-testid="icon-sort" />,
}));

describe('ArenaLeaderboard', () => {
  it('renders the leaderboard', () => {
    render(<ArenaLeaderboard />);
    // Component renders with tabs and table
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('displays models in the leaderboard', () => {
    render(<ArenaLeaderboard />);
    // Model names should appear in the table
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders table rows for each model', () => {
    render(<ArenaLeaderboard />);
    const rows = screen.getAllByTestId('table-row');
    // Header row + 3 model rows = 4 rows minimum
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('shows trophy icon', () => {
    render(<ArenaLeaderboard />);
    expect(screen.getByTestId('icon-trophy')).toBeInTheDocument();
  });

  it('renders tabs for categories', () => {
    render(<ArenaLeaderboard />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('renders the leaderboard table', () => {
    render(<ArenaLeaderboard />);
    const tables = screen.getAllByTestId('table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('shows provider filter options', () => {
    render(<ArenaLeaderboard />);
    // Providers appear in both filter and table
    expect(screen.getAllByText('openai').length).toBeGreaterThan(0);
    expect(screen.getAllByText('anthropic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('google').length).toBeGreaterThan(0);
  });
});
