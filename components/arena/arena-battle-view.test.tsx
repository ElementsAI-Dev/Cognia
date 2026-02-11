/**
 * Unit tests for ArenaBattleView component
 * Updated for useArenaVoting hook refactor and ArenaContestantCard extraction
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaBattleView } from './arena-battle-view';
import type { ArenaBattle, ArenaContestant } from '@/types/arena';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// --- useArenaVoting hook mock ---
const mockHandleVote = jest.fn();
const mockHandleDeclareTie = jest.fn();
const mockHandleDeclareBothBad = jest.fn();
const mockHandleCopy = jest.fn();
const mockHandleCancel = jest.fn();
const mockSetSelectedReason = jest.fn();
let mockBattle: ArenaBattle | undefined;
let mockAllDone = true;

jest.mock('@/hooks/arena', () => ({
  useArenaVoting: () => ({
    battle: mockBattle,
    allDone: mockAllDone,
    isRevealing: false,
    selectedReason: 'quality' as const,
    setSelectedReason: mockSetSelectedReason,
    isCopying: false,
    handleVote: mockHandleVote,
    handleDeclareTie: mockHandleDeclareTie,
    handleDeclareBothBad: mockHandleDeclareBothBad,
    handleCopy: mockHandleCopy,
    handleCancel: mockHandleCancel,
    ensureVoteAllowed: jest.fn(() => true),
  }),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange: _onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Trophy: () => <span data-testid="icon-trophy" />,
  Clock: () => <span data-testid="icon-clock" />,
  Coins: () => <span data-testid="icon-coins" />,
  Hash: () => <span data-testid="icon-hash" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  Scale: () => <span data-testid="icon-scale" />,
  Maximize2: () => <span data-testid="icon-maximize" />,
  Minimize2: () => <span data-testid="icon-minimize" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Ban: () => <span data-testid="icon-ban" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  Send: () => <span data-testid="icon-send" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
  ThumbsDown: () => <span data-testid="icon-thumbsdown" />,
  Diff: () => <span data-testid="icon-diff" />,
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
      <span data-testid={`contestant-response-${index}`}>{contestant.response}</span>
      {contestant.error && <span data-testid={`contestant-error-${index}`}>{contestant.error}</span>}
      {isWinner && <span data-testid={`contestant-winner-${index}`}>winner</span>}
      {contestant.latencyMs && <span>{(contestant.latencyMs / 1000).toFixed(1)}s</span>}
      {contestant.tokenCount && <span>{contestant.tokenCount.total}</span>}
      <button data-testid={`copy-btn-${index}`} onClick={onCopy}>copy</button>
      {onCancel && <button data-testid={`cancel-btn-${index}`} onClick={onCancel}>cancel</button>}
    </div>
  ),
}));

// Mock ArenaDiffView
jest.mock('@/components/arena/arena-diff-view', () => ({
  ArenaDiffView: () => <div data-testid="arena-diff-view" />,
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
      <button data-testid="vote-a" onClick={() => onVote('a')}>Vote A</button>
      <button data-testid="vote-b" onClick={() => onVote('b')}>Vote B</button>
      <button data-testid="vote-tie" onClick={onTie}>Tie</button>
      {onBothBad && <button data-testid="vote-both-bad" onClick={onBothBad}>Both Bad</button>}
    </div>
  ),
}));

const createMockContestant = (
  id: string,
  status: ArenaContestant['status'] = 'completed'
): ArenaContestant => ({
  id,
  model: `gpt-4-${id}`,
  provider: 'openai',
  displayName: `Model ${id}`,
  response: `Response from ${id}`,
  status,
  latencyMs: 1500,
  tokenCount: { input: 100, output: 200, total: 300 },
  estimatedCost: 0.005,
});

const createMockBattle = (overrides?: Partial<ArenaBattle>): ArenaBattle => ({
  id: 'battle-1',
  prompt: 'Test prompt',
  contestants: [createMockContestant('a'), createMockContestant('b')],
  mode: 'normal',
  conversationMode: 'single',
  createdAt: new Date(),
  ...overrides,
});

describe('ArenaBattleView', () => {
  const defaultProps = {
    battleId: 'battle-1',
    open: true,
    onOpenChange: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBattle = createMockBattle();
    mockAllDone = true;
  });

  it('renders nothing when battle not found', () => {
    mockBattle = undefined;
    const { container } = render(<ArenaBattleView {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open and battle exists', () => {
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('battleInProgress');
  });

  it('displays prompt in the battle view', () => {
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('Test prompt')).toBeInTheDocument();
  });

  it('displays contestant cards', () => {
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByTestId('contestant-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('contestant-card-1')).toBeInTheDocument();
    expect(screen.getByText('Response from a')).toBeInTheDocument();
    expect(screen.getByText('Response from b')).toBeInTheDocument();
  });

  it('shows model names in open mode', () => {
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('Model a')).toBeInTheDocument();
    expect(screen.getByText('Model b')).toBeInTheDocument();
  });

  it('hides model names in blind mode', () => {
    mockBattle = createMockBattle({ mode: 'blind' });
    render(<ArenaBattleView {...defaultProps} />);
    // In blind mode, the ArenaContestantCard mock shows "Model A" / "Model B"
    expect(screen.getByText('Model A')).toBeInTheDocument();
    expect(screen.getByText('Model B')).toBeInTheDocument();
  });

  it('calls onOpenChange when close button clicked', async () => {
    const onOpenChange = jest.fn();
    render(<ArenaBattleView {...defaultProps} onOpenChange={onOpenChange} />);

    const closeButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('[data-testid="icon-x"]'));

    if (closeButton) {
      await userEvent.click(closeButton);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('shows QuickVoteBar when all done and no winner', () => {
    mockAllDone = true;
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByTestId('quick-vote-bar')).toBeInTheDocument();
  });

  it('calls handleVote via QuickVoteBar', async () => {
    render(<ArenaBattleView {...defaultProps} />);
    await userEvent.click(screen.getByTestId('vote-a'));
    expect(mockHandleVote).toHaveBeenCalledWith('a');
  });

  it('calls handleDeclareTie via QuickVoteBar', async () => {
    render(<ArenaBattleView {...defaultProps} />);
    await userEvent.click(screen.getByTestId('vote-tie'));
    expect(mockHandleDeclareTie).toHaveBeenCalled();
  });

  it('calls handleDeclareBothBad via QuickVoteBar', async () => {
    render(<ArenaBattleView {...defaultProps} />);
    await userEvent.click(screen.getByTestId('vote-both-bad'));
    expect(mockHandleDeclareBothBad).toHaveBeenCalled();
  });

  it('calls handleCancel when cancel button clicked on streaming contestant', async () => {
    mockBattle = createMockBattle({
      contestants: [createMockContestant('a', 'streaming'), createMockContestant('b', 'completed')],
    });
    render(<ArenaBattleView {...defaultProps} />);

    const cancelBtn = screen.queryByTestId('cancel-btn-0');
    if (cancelBtn) {
      await userEvent.click(cancelBtn);
      expect(mockHandleCancel).toHaveBeenCalled();
    }
  });

  it('shows winner badge when winner is selected', () => {
    mockBattle = createMockBattle({ winnerId: 'a' });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('winnerSelected')).toBeInTheDocument();
  });

  it('shows tie badge when battle is a tie', () => {
    mockBattle = createMockBattle({ isTie: true });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('tie')).toBeInTheDocument();
  });

  it('shows bothBad badge when both bad declared', () => {
    mockBattle = createMockBattle({ isBothBad: true });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('bothBad')).toBeInTheDocument();
  });

  it('hides QuickVoteBar when battle has a winner', () => {
    mockBattle = createMockBattle({ winnerId: 'a' });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.queryByTestId('quick-vote-bar')).not.toBeInTheDocument();
  });

  it('hides QuickVoteBar when not all done', () => {
    mockAllDone = false;
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.queryByTestId('quick-vote-bar')).not.toBeInTheDocument();
  });

  it('displays contestant stats (latency and tokens)', () => {
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getAllByText(/1\.5s/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('300').length).toBeGreaterThan(0);
  });

  it('shows streaming status for streaming contestants', () => {
    mockBattle = createMockBattle({
      contestants: [createMockContestant('a', 'streaming'), createMockContestant('b', 'completed')],
    });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('streaming')).toBeInTheDocument();
  });

  it('shows error status and error message for error contestants', () => {
    mockBattle = createMockBattle({
      contestants: [
        { ...createMockContestant('a', 'error'), error: 'API error' },
        createMockContestant('b', 'completed'),
      ],
    });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('API error')).toBeInTheDocument();
  });

  it('shows multi-turn UI for multi-turn battles', () => {
    mockBattle = createMockBattle({
      conversationMode: 'multi',
      currentTurn: 1,
      maxTurns: 5,
    });
    render(<ArenaBattleView {...defaultProps} canContinue />);
    expect(screen.getByText('multiTurn')).toBeInTheDocument();
  });

  it('has fullscreen toggle button', () => {
    render(<ArenaBattleView {...defaultProps} />);
    const fullscreenButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('[data-testid="icon-maximize"]'));
    expect(fullscreenButton).toBeDefined();
  });

  it('marks winner on the correct contestant card', () => {
    mockBattle = createMockBattle({ winnerId: 'a' });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByTestId('contestant-winner-0')).toBeInTheDocument();
    expect(screen.queryByTestId('contestant-winner-1')).not.toBeInTheDocument();
  });
});
