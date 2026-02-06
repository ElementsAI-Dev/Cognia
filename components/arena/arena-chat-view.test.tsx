/**
 * Tests for ArenaChatView component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaChatView } from './arena-chat-view';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Chat Arena',
      description: 'Compare responses from multiple AI models',
      startBattle: 'Start Battle',
      newBattle: 'New Battle',
      viewBattle: 'View Battle',
      models: 'models',
      winnerSelected: 'Winner Selected',
      tie: 'Tie',
      'quickBattle.title': 'Quick Battle',
      'leaderboard.title': 'Leaderboard',
      'heatmap.title': 'Heatmap',
      'history.title': 'History',
      'history.battles': 'battles',
      'history.recentBattles': 'Recent Battles',
      'history.inProgress': 'In Progress',
      'history.totalBattles': 'Total Battles',
      'history.completed': 'Completed',
    };
    return translations[key] || key;
  },
}));

// Mock arena store
const mockBattles = [
  {
    id: 'battle-1',
    prompt: 'Test prompt for battle 1',
    contestants: [
      { id: 'c1', provider: 'openai', model: 'gpt-4o', status: 'completed' },
      { id: 'c2', provider: 'anthropic', model: 'claude-3', status: 'completed' },
    ],
    winnerId: 'c1',
    isTie: false,
  },
  {
    id: 'battle-2',
    prompt: 'Test prompt for battle 2',
    contestants: [
      { id: 'c3', provider: 'openai', model: 'gpt-4o', status: 'streaming' },
      { id: 'c4', provider: 'anthropic', model: 'claude-3', status: 'pending' },
    ],
    winnerId: null,
    isTie: false,
  },
];

jest.mock('@/stores/arena', () => ({
  useArenaStore: jest.fn((selector) => {
    const state = {
      battles: mockBattles,
      activeBattleId: null,
      setActiveBattle: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock arena components
jest.mock('@/components/arena', () => ({
  ArenaLeaderboard: () => <div data-testid="arena-leaderboard">Leaderboard</div>,
  ArenaHeatmap: () => <div data-testid="arena-heatmap">Heatmap</div>,
  ArenaHistory: ({ onViewBattle }: { onViewBattle: (id: string) => void }) => (
    <div data-testid="arena-history" onClick={() => onViewBattle('battle-1')}>
      History
    </div>
  ),
  ArenaDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="arena-dialog">Dialog</div> : null,
  ArenaBattleView: ({ battleId, open }: { battleId: string; open: boolean }) =>
    open ? <div data-testid="arena-battle-view">{battleId}</div> : null,
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('ArenaChatView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the component with header', () => {
      render(<ArenaChatView />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
      expect(screen.getByText(/battles/)).toBeInTheDocument();
    });

    it('renders tab navigation with all tabs', () => {
      render(<ArenaChatView />);

      // Check for tab list with 4 tabs
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('renders start battle button', () => {
      render(<ArenaChatView />);

      expect(screen.getByText('Start Battle')).toBeInTheDocument();
    });

    it('shows active battles banner when battles are in progress', () => {
      render(<ArenaChatView />);

      // Check for the animated pulse indicator which only appears in active battles banner
      const pulseIndicator = document.querySelector('.animate-pulse');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('renders stats summary', () => {
      render(<ArenaChatView />);

      expect(screen.getByText('Total Battles')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('defaults to battle tab with New Battle button visible', () => {
      render(<ArenaChatView />);

      expect(screen.getByText('New Battle')).toBeInTheDocument();
    });

    it('has leaderboard tab trigger', () => {
      render(<ArenaChatView />);

      const leaderboardTab = screen.getByRole('tab', { name: /leaderboard/i });
      expect(leaderboardTab).toBeInTheDocument();
    });

    it('has heatmap tab trigger', () => {
      render(<ArenaChatView />);

      const heatmapTab = screen.getByRole('tab', { name: /heatmap/i });
      expect(heatmapTab).toBeInTheDocument();
    });

    it('has history tab trigger', () => {
      render(<ArenaChatView />);

      const historyTab = screen.getByRole('tab', { name: /history/i });
      expect(historyTab).toBeInTheDocument();
    });
  });

  describe('battle interactions', () => {
    it('opens arena dialog when start battle button is clicked', () => {
      render(<ArenaChatView />);

      fireEvent.click(screen.getByText('Start Battle'));

      expect(screen.getByTestId('arena-dialog')).toBeInTheDocument();
    });

    it('opens arena dialog when new battle button is clicked', () => {
      render(<ArenaChatView />);

      fireEvent.click(screen.getByText('New Battle'));

      expect(screen.getByTestId('arena-dialog')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('accepts sessionId prop', () => {
      render(<ArenaChatView sessionId="test-session" />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
    });

    it('accepts systemPrompt prop', () => {
      render(<ArenaChatView systemPrompt="You are a helpful assistant" />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
    });

    it('accepts initialPrompt prop', () => {
      render(<ArenaChatView initialPrompt="Test prompt" />);

      expect(screen.getByText('Chat Arena')).toBeInTheDocument();
    });

    it('accepts className prop', () => {
      const { container } = render(<ArenaChatView className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('responsive design', () => {
    it('renders with responsive classes', () => {
      const { container } = render(<ArenaChatView />);

      // Check for responsive padding classes
      const header = container.querySelector('.px-3');
      expect(header).toBeInTheDocument();
    });
  });
});
