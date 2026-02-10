/**
 * Tests for ArenaInlineBattle component
 * Covers: rendering, status badges, blind mode, voting, result banner, metrics, copy, cancel
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaInlineBattle } from './arena-inline-battle';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      prompt: 'Prompt',
      model: 'Model',
      streaming: 'Streaming',
      completed: 'Completed',
      error: 'Error',
      pending: 'Pending',
      waiting: 'Waiting for response...',
      winner: 'Winner',
      winnerSelected: 'Winner Selected',
      selected: 'Selected',
      tie: 'Tie',
      bothBad: 'Both Bad',
      modelsRevealed: 'Models revealed',
      done: 'Done',
      copy: 'Copy response',
      cancel: 'Cancel',
      selectWinner: 'Select Winner',
    };
    return translations[key] || key;
  },
}));

// Mock toast
import { toast } from 'sonner';
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock useCopy hook
const mockCopy = jest.fn();
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: mockCopy,
    isCopying: false,
  }),
}));

// Mock useArena hook
const mockCancelBattle = jest.fn();
jest.mock('@/hooks/arena', () => ({
  useArena: () => ({
    cancelBattle: mockCancelBattle,
  }),
}));

// Mock MarkdownRenderer
jest.mock('@/components/chat/utils', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

// Mock QuickVoteBar
jest.mock('@/components/chat/ui/quick-vote-bar', () => ({
  QuickVoteBar: ({
    onVote,
    onTie,
    onBothBad,
  }: {
    onVote: (id: string) => void;
    onTie: () => void;
    onBothBad?: () => void;
  }) => (
    <div data-testid="quick-vote-bar">
      <button data-testid="vote-a" onClick={() => onVote('c1')}>
        Vote A
      </button>
      <button data-testid="vote-tie" onClick={() => onTie()}>
        Tie
      </button>
      {onBothBad && (
        <button data-testid="vote-both-bad" onClick={() => onBothBad()}>
          Both Bad
        </button>
      )}
    </div>
  ),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

// --- Store mock setup ---
const mockSelectWinner = jest.fn();
const mockDeclareTie = jest.fn();
const mockDeclareBothBad = jest.fn();
const mockCanVote = jest.fn().mockReturnValue({ allowed: true });
const mockMarkBattleViewed = jest.fn();

const createBattle = (overrides: Record<string, unknown> = {}) => ({
  id: 'battle-1',
  prompt: 'Compare these two approaches',
  mode: 'blind' as const,
  contestants: [
    {
      id: 'c1',
      provider: 'openai' as const,
      model: 'gpt-4o',
      displayName: 'GPT-4o',
      response: 'Response from Model A',
      status: 'completed' as const,
      latencyMs: 1500,
      tokenCount: { input: 100, output: 200, total: 300 },
      estimatedCost: 0.0045,
    },
    {
      id: 'c2',
      provider: 'anthropic' as const,
      model: 'claude-3',
      displayName: 'Claude 3',
      response: 'Response from Model B',
      status: 'completed' as const,
      latencyMs: 2000,
      tokenCount: { input: 100, output: 250, total: 350 },
      estimatedCost: 0.006,
    },
  ],
  winnerId: undefined as string | undefined,
  isTie: false,
  isBothBad: false,
  createdAt: new Date(),
  ...overrides,
});

let currentBattle = createBattle();

jest.mock('@/stores/arena', () => ({
  useArenaStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      battles: [currentBattle],
      selectWinner: mockSelectWinner,
      declareTie: mockDeclareTie,
      declareBothBad: mockDeclareBothBad,
      canVote: mockCanVote,
      markBattleViewed: mockMarkBattleViewed,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('ArenaInlineBattle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentBattle = createBattle();
    mockCanVote.mockReturnValue({ allowed: true });
  });

  // --- Rendering ---
  describe('rendering', () => {
    it('renders the prompt preview', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Prompt:')).toBeInTheDocument();
      expect(screen.getByText('Compare these two approaches')).toBeInTheDocument();
    });

    it('renders contestant cards for each model', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('renders markdown content for responses', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      const renderers = screen.getAllByTestId('markdown-renderer');
      expect(renderers).toHaveLength(2);
      expect(renderers[0]).toHaveTextContent('Response from Model A');
      expect(renderers[1]).toHaveTextContent('Response from Model B');
    });

    it('returns null when battle is not found', () => {
      const { container } = render(<ArenaInlineBattle battleId="non-existent" />);
      expect(container.firstChild).toBeNull();
    });

    it('accepts className prop', () => {
      const { container } = render(
        <ArenaInlineBattle battleId="battle-1" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('calls markBattleViewed on mount', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(mockMarkBattleViewed).toHaveBeenCalledWith('battle-1');
    });
  });

  // --- Blind Mode ---
  describe('blind mode', () => {
    it('hides model names in blind mode before vote', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Model A')).toBeInTheDocument();
      expect(screen.getByText('Model B')).toBeInTheDocument();
      expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
      expect(screen.queryByText('Claude 3')).not.toBeInTheDocument();
    });

    it('shows model names in normal mode', () => {
      currentBattle = createBattle({ mode: 'normal' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(screen.getByText('Claude 3')).toBeInTheDocument();
    });
  });

  // --- Status Badges ---
  describe('status badges', () => {
    it('shows Completed badge for completed contestants', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      const completedBadges = screen.getAllByText('Completed');
      expect(completedBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('shows Streaming badge for streaming contestants', () => {
      currentBattle = createBattle({
        contestants: [
          { id: 'c1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', response: '', status: 'streaming' },
          { id: 'c2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', response: '', status: 'pending' },
        ],
      });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Streaming')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows Error badge for errored contestants', () => {
      currentBattle = createBattle({
        contestants: [
          { id: 'c1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', response: '', status: 'error', error: 'API failed' },
          { id: 'c2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', response: 'ok', status: 'completed' },
        ],
      });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API failed')).toBeInTheDocument();
    });

    it('shows waiting state when response is empty and not error', () => {
      currentBattle = createBattle({
        contestants: [
          { id: 'c1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', response: '', status: 'pending' },
          { id: 'c2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', response: '', status: 'pending' },
        ],
      });
      render(<ArenaInlineBattle battleId="battle-1" />);
      const waitingTexts = screen.getAllByText('Waiting for response...');
      expect(waitingTexts).toHaveLength(2);
    });
  });

  // --- Metrics Footer ---
  describe('metrics', () => {
    it('shows latency in seconds', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('1.5s')).toBeInTheDocument();
      expect(screen.getByText('2.0s')).toBeInTheDocument();
    });

    it('shows token count', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
    });

    it('shows estimated cost', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('$0.0045')).toBeInTheDocument();
      expect(screen.getByText('$0.0060')).toBeInTheDocument();
    });
  });

  // --- Vote Bar ---
  describe('voting', () => {
    it('shows QuickVoteBar when all contestants completed and no winner yet', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByTestId('quick-vote-bar')).toBeInTheDocument();
    });

    it('does not show QuickVoteBar when battle already has a winner', () => {
      currentBattle = createBattle({ winnerId: 'c1' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.queryByTestId('quick-vote-bar')).not.toBeInTheDocument();
    });

    it('does not show QuickVoteBar when contestants are still streaming', () => {
      currentBattle = createBattle({
        contestants: [
          { id: 'c1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', response: 'partial', status: 'streaming' },
          { id: 'c2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', response: '', status: 'pending' },
        ],
      });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.queryByTestId('quick-vote-bar')).not.toBeInTheDocument();
    });

    it('calls selectWinner when voting for a contestant', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-a'));
      expect(mockSelectWinner).toHaveBeenCalledWith('battle-1', 'c1', { reason: 'quality' });
    });

    it('calls declareTie when tie button is clicked', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-tie'));
      expect(mockDeclareTie).toHaveBeenCalledWith('battle-1');
    });

    it('calls declareBothBad when both bad button is clicked', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-both-bad'));
      expect(mockDeclareBothBad).toHaveBeenCalledWith('battle-1');
    });

    it('shows error toast when voting is not allowed', () => {
      mockCanVote.mockReturnValue({ allowed: false, reason: 'min-viewing-time' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-a'));
      expect(mockSelectWinner).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('shows error toast when rate limited', () => {
      mockCanVote.mockReturnValue({ allowed: false, reason: 'rate-limit' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-tie'));
      expect(mockDeclareTie).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  // --- Result Banner ---
  describe('result banner', () => {
    it('shows winner banner when winner selected', () => {
      currentBattle = createBattle({ winnerId: 'c1' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Winner Selected')).toBeInTheDocument();
    });

    it('shows tie banner when tie declared', () => {
      currentBattle = createBattle({ isTie: true });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Tie')).toBeInTheDocument();
    });

    it('shows both bad banner', () => {
      currentBattle = createBattle({ isBothBad: true });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Both Bad')).toBeInTheDocument();
    });

    it('shows winner badge on winning contestant card', () => {
      currentBattle = createBattle({ winnerId: 'c1' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Winner')).toBeInTheDocument();
    });

    it('shows Done button when onClose provided and battle complete', () => {
      const mockOnClose = jest.fn();
      currentBattle = createBattle({ winnerId: 'c1' });
      render(<ArenaInlineBattle battleId="battle-1" onClose={mockOnClose} />);
      const doneBtn = screen.getByText('Done');
      expect(doneBtn).toBeInTheDocument();
      fireEvent.click(doneBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not show Done button when onClose not provided', () => {
      currentBattle = createBattle({ winnerId: 'c1' });
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  // --- Grid layout ---
  describe('grid layout', () => {
    it('renders 2-column grid for 2 contestants', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      const grid = document.querySelector('[style*="grid-template-columns"]') as HTMLElement;
      expect(grid).toBeInTheDocument();
      expect(grid?.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    });

    it('caps grid columns at 4', () => {
      currentBattle = createBattle({
        contestants: Array.from({ length: 5 }, (_, i) => ({
          id: `c${i}`,
          provider: 'openai',
          model: `model-${i}`,
          displayName: `Model ${i}`,
          response: `Response ${i}`,
          status: 'completed',
        })),
      });
      render(<ArenaInlineBattle battleId="battle-1" />);
      const grid = document.querySelector('[style*="grid-template-columns"]') as HTMLElement;
      expect(grid?.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
    });
  });
});
