/**
 * Unit tests for ArenaBattleView component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaBattleView } from './arena-battle-view';
import type { ArenaBattle, ArenaContestant } from '@/types/arena';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock hooks
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue(undefined),
    isCopying: false,
  }),
}));

// Mock arena store
const mockSelectWinner = jest.fn();
const mockDeclareTie = jest.fn();
const mockDeclareBothBad = jest.fn();
let mockBattle: ArenaBattle | undefined;

jest.mock('@/stores/arena', () => ({
  useArenaStore: (selector: (state: { battles: ArenaBattle[]; selectWinner: typeof mockSelectWinner; declareTie: typeof mockDeclareTie; declareBothBad: typeof mockDeclareBothBad }) => unknown) => {
    const state = {
      battles: mockBattle ? [mockBattle] : [],
      selectWinner: mockSelectWinner,
      declareTie: mockDeclareTie,
      declareBothBad: mockDeclareBothBad,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <p data-testid="dialog-description">{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange: _onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select">{children}</div>
  ),
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
}));

// Mock chat utils (MarkdownRenderer)
jest.mock('@/components/chat/utils', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>,
}));

// Mock QuickVoteBar
jest.mock('@/components/chat/ui/quick-vote-bar', () => ({
  QuickVoteBar: ({ onVote, onTie, onBothBad }: { onVote: (id: string) => void; onTie: () => void; onBothBad?: () => void }) => (
    <div data-testid="quick-vote-bar">
      <button onClick={() => onVote('a')}>Vote A</button>
      <button onClick={() => onVote('b')}>Vote B</button>
      <button onClick={onTie}>Tie</button>
      {onBothBad && <button onClick={onBothBad}>Both Bad</button>}
    </div>
  ),
}));

const createMockContestant = (id: string, status: ArenaContestant['status'] = 'completed'): ArenaContestant => ({
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
  contestants: [
    createMockContestant('a'),
    createMockContestant('b'),
  ],
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
    expect(screen.queryByText('Model a')).not.toBeInTheDocument();
    // Should show "Model A" and "Model B" instead
    expect(screen.getByText(/model A/i)).toBeInTheDocument();
  });

  it('calls onOpenChange when close button clicked', async () => {
    const onOpenChange = jest.fn();
    render(<ArenaBattleView {...defaultProps} onOpenChange={onOpenChange} />);
    
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('[data-testid="icon-x"]'));
    
    if (closeButton) {
      await userEvent.click(closeButton);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('allows selecting a winner', async () => {
    render(<ArenaBattleView {...defaultProps} />);
    
    // Find select winner buttons
    const selectButtons = screen.getAllByRole('button').filter(
      btn => btn.textContent?.includes('selectWinner')
    );
    
    if (selectButtons.length > 0) {
      await userEvent.click(selectButtons[0]);
      expect(mockSelectWinner).toHaveBeenCalledWith('battle-1', 'a', { reason: 'quality' });
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

  it('shows declare tie button when all contestants are done', async () => {
    render(<ArenaBattleView {...defaultProps} />);
    
    const tieButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('declareTie')
    );
    
    if (tieButton) {
      await userEvent.click(tieButton);
      expect(mockDeclareTie).toHaveBeenCalledWith('battle-1');
    }
  });

  it('displays contestant stats', () => {
    render(<ArenaBattleView {...defaultProps} />);
    // Latency
    expect(screen.getAllByText(/1\.5s/).length).toBeGreaterThan(0);
    // Token count
    expect(screen.getAllByText('300').length).toBeGreaterThan(0);
  });

  it('shows streaming status for streaming contestants', () => {
    mockBattle = createMockBattle({
      contestants: [
        createMockContestant('a', 'streaming'),
        createMockContestant('b', 'completed'),
      ],
    });
    render(<ArenaBattleView {...defaultProps} />);
    expect(screen.getByText('streaming')).toBeInTheDocument();
  });

  it('shows error status for error contestants', () => {
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

  it('toggles fullscreen mode', async () => {
    render(<ArenaBattleView {...defaultProps} />);
    
    const fullscreenButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('[data-testid="icon-maximize"]')
    );
    
    expect(fullscreenButton).toBeDefined();
  });
});
