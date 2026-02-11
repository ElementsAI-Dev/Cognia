/**
 * Tests for ArenaInlineBattle component
 * Updated for useArenaVoting hook refactor and ArenaContestantCard extraction
 * Covers: rendering, blind mode, voting, result banner, metrics, copy, cancel, grid layout
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaInlineBattle } from './arena-inline-battle';
import type { ArenaContestant } from '@/types/arena';

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

// --- useArenaVoting hook mock ---
const mockHandleVote = jest.fn();
const mockHandleDeclareTie = jest.fn();
const mockHandleDeclareBothBad = jest.fn();
const mockHandleCopy = jest.fn();
const mockHandleCancel = jest.fn();
let mockAllDone = true;
let mockIsRevealing = false;

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
  conversationMode: 'single' as const,
  createdAt: new Date(),
  ...overrides,
});

let currentBattle: ReturnType<typeof createBattle> | undefined = createBattle();

jest.mock('@/hooks/arena', () => ({
  useArenaVoting: () => ({
    battle: currentBattle,
    allDone: mockAllDone,
    isRevealing: mockIsRevealing,
    isCopying: false,
    handleVote: mockHandleVote,
    handleDeclareTie: mockHandleDeclareTie,
    handleDeclareBothBad: mockHandleDeclareBothBad,
    handleCopy: mockHandleCopy,
    handleCancel: mockHandleCancel,
  }),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

// Mock ArenaContestantCard (shared component)
jest.mock('@/components/arena/arena-contestant-card', () => ({
  ArenaContestantCard: ({
    contestant,
    index,
    isWinner,
    blindMode,
    isRevealed,
    onCopy,
    onCancel,
  }: {
    contestant: ArenaContestant;
    index: number;
    isWinner: boolean;
    blindMode: boolean;
    isRevealed: boolean;
    onCopy: () => void;
    onCancel?: () => void;
    isCopying: boolean;
    variant?: string;
  }) => (
    <div data-testid={`contestant-card-${index}`}>
      <span data-testid={`contestant-name-${index}`}>
        {blindMode && !isRevealed ? `Model ${String.fromCharCode(65 + index)}` : contestant.displayName}
      </span>
      <span data-testid={`contestant-status-${index}`}>{contestant.status}</span>
      {contestant.response && (
        <span data-testid={`contestant-response-${index}`}>{contestant.response}</span>
      )}
      {contestant.error && <span data-testid={`contestant-error-${index}`}>{contestant.error}</span>}
      {isWinner && <span data-testid={`contestant-winner-${index}`}>Winner</span>}
      {contestant.latencyMs && <span>{(contestant.latencyMs / 1000).toFixed(1)}s</span>}
      {contestant.tokenCount && <span>{contestant.tokenCount.total}</span>}
      {contestant.estimatedCost && <span>${contestant.estimatedCost.toFixed(4)}</span>}
      <button data-testid={`copy-btn-${index}`} onClick={onCopy}>copy</button>
      {onCancel && <button data-testid={`cancel-btn-${index}`} onClick={onCancel}>cancel</button>}
    </div>
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

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trophy: () => <span data-testid="icon-trophy" />,
  MessageSquare: () => <span data-testid="icon-message" />,
}));

describe('ArenaInlineBattle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentBattle = createBattle();
    mockAllDone = true;
    mockIsRevealing = false;
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
      expect(screen.getByTestId('contestant-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('contestant-card-1')).toBeInTheDocument();
    });

    it('renders responses via ArenaContestantCard', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.getByText('Response from Model A')).toBeInTheDocument();
      expect(screen.getByText('Response from Model B')).toBeInTheDocument();
    });

    it('returns null when battle is not found', () => {
      currentBattle = undefined;
      const { container } = render(<ArenaInlineBattle battleId="non-existent" />);
      expect(container.firstChild).toBeNull();
    });

    it('accepts className prop', () => {
      const { container } = render(
        <ArenaInlineBattle battleId="battle-1" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
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

  // --- Metrics ---
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

    it('does not show QuickVoteBar when not all done', () => {
      mockAllDone = false;
      render(<ArenaInlineBattle battleId="battle-1" />);
      expect(screen.queryByTestId('quick-vote-bar')).not.toBeInTheDocument();
    });

    it('calls handleVote when voting for a contestant', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-a'));
      expect(mockHandleVote).toHaveBeenCalledWith('c1');
    });

    it('calls handleDeclareTie when tie button is clicked', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-tie'));
      expect(mockHandleDeclareTie).toHaveBeenCalled();
    });

    it('calls handleDeclareBothBad when both bad button is clicked', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('vote-both-bad'));
      expect(mockHandleDeclareBothBad).toHaveBeenCalled();
    });

    it('calls handleCopy via contestant card copy button', () => {
      render(<ArenaInlineBattle battleId="battle-1" />);
      fireEvent.click(screen.getByTestId('copy-btn-0'));
      expect(mockHandleCopy).toHaveBeenCalledWith('Response from Model A');
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
      expect(screen.getByTestId('contestant-winner-0')).toBeInTheDocument();
      expect(screen.queryByTestId('contestant-winner-1')).not.toBeInTheDocument();
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
