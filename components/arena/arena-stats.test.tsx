/**
 * Unit tests for ArenaStats component
 */

import { render, screen } from '@testing-library/react';
import { ArenaStats } from './arena-stats';
import type { ArenaBattle } from '@/types/arena';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock store data
let mockBattles: ArenaBattle[] = [];
let mockModelRatings: Array<{ modelId: string; provider: string; model: string; rating: number; winRate?: number; totalBattles?: number; categoryRatings?: Record<string, number>; wins?: number; losses?: number; ties?: number; updatedAt?: Date }> = [];
let mockPreferences: Array<{ id: string }> = [];

jest.mock('@/stores/arena', () => {
  const selectBattles = (state: Record<string, unknown>) => state.battles;
  const selectModelRatings = (state: Record<string, unknown>) => state.modelRatings;
  const selectPreferences = (state: Record<string, unknown>) => state.preferences;

  return {
    useArenaStore: (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        battles: mockBattles,
        modelRatings: mockModelRatings,
        preferences: mockPreferences,
      };
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    },
    selectBattles,
    selectModelRatings,
    selectPreferences,
  };
});

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

const createBattle = (overrides: Partial<ArenaBattle> = {}): ArenaBattle => ({
  id: `battle-${Math.random().toString(36).slice(2)}`,
  prompt: 'Test prompt',
  contestants: [
    {
      id: 'c1',
      provider: 'openai',
      model: 'gpt-4',
      displayName: 'GPT-4',
      response: 'Response A',
      status: 'completed',
    },
    {
      id: 'c2',
      provider: 'anthropic',
      model: 'claude-3',
      displayName: 'Claude 3',
      response: 'Response B',
      status: 'completed',
    },
  ],
  mode: 'normal',
  conversationMode: 'single',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('ArenaStats', () => {
  beforeEach(() => {
    mockBattles = [];
    mockModelRatings = [];
    mockPreferences = [];
  });

  it('renders empty state when no battles', () => {
    render(<ArenaStats />);
    expect(screen.getByText('stats.noData')).toBeInTheDocument();
    expect(screen.getByText('stats.startBattles')).toBeInTheDocument();
  });

  it('renders stats when battles exist', () => {
    mockBattles = [
      createBattle({ winnerId: 'c1', completedAt: new Date('2024-01-01T00:01:00') }),
      createBattle({ isTie: true, completedAt: new Date('2024-01-01T00:02:00') }),
    ];
    mockPreferences = [{ id: 'p1' }];

    render(<ArenaStats />);
    expect(screen.getByText('stats.totalBattles')).toBeInTheDocument();
    expect(screen.getByText('stats.decisiveVotes')).toBeInTheDocument();
    expect(screen.getByText('stats.uniqueModels')).toBeInTheDocument();
    expect(screen.getByText('stats.avgTime')).toBeInTheDocument();
  });

  it('shows top models section', () => {
    mockBattles = [
      createBattle({ winnerId: 'c1' }),
    ];

    render(<ArenaStats />);
    expect(screen.getByText('stats.topModels')).toBeInTheDocument();
  });

  it('shows category distribution', () => {
    mockBattles = [
      createBattle({ winnerId: 'c1', taskClassification: { category: 'coding', confidence: 0.9, complexity: 'moderate', requiresReasoning: false, requiresTools: false, requiresVision: false, requiresCreativity: false, requiresCoding: true, requiresLongContext: false, estimatedInputTokens: 100, estimatedOutputTokens: 200 } }),
    ];

    render(<ArenaStats />);
    expect(screen.getByText('stats.categories')).toBeInTheDocument();
  });

  it('shows voting patterns', () => {
    mockBattles = [
      createBattle({ winnerId: 'c1' }),
      createBattle({ isTie: true }),
    ];

    render(<ArenaStats />);
    expect(screen.getByText('stats.votingPatterns')).toBeInTheDocument();
    expect(screen.getByText('stats.decisiveRate')).toBeInTheDocument();
    expect(screen.getByText('stats.tieRate')).toBeInTheDocument();
  });

  it('shows top rated model when ratings exist', () => {
    mockBattles = [createBattle({ winnerId: 'c1' })];
    mockModelRatings = [
      {
        modelId: 'openai:gpt-4',
        provider: 'openai',
        model: 'gpt-4',
        rating: 1650,
        winRate: 0.8,
        totalBattles: 10,
        categoryRatings: {},
        wins: 8,
        losses: 2,
        ties: 0,
        updatedAt: new Date(),
      },
    ];

    render(<ArenaStats />);
    // topRated is rendered as "stats.topRated: gpt-4" inside the voting patterns card
    expect(screen.getByText(/stats\.topRated/)).toBeInTheDocument();
  });

  it('counts blind mode battles correctly', () => {
    mockBattles = [
      createBattle({ winnerId: 'c1', mode: 'blind' }),
      createBattle({ winnerId: 'c2', mode: 'normal' }),
    ];

    render(<ArenaStats />);
    expect(screen.getByText('stats.blindBattles')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockBattles = [];
    const { container } = render(<ArenaStats className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
