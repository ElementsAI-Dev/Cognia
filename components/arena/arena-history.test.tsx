import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaHistory } from './arena-history';
import type { ArenaBattle, ArenaContestant } from '@/types/arena';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en-US',
}));

let mockBattles: ArenaBattle[] = [];
const mockDeleteBattle = jest.fn();
const mockUpdateHistoryFilters = jest.fn((updates: Record<string, unknown>) => {
  mockWorkflowContext = {
    ...mockWorkflowContext,
    historyFilters: {
      ...mockWorkflowContext.historyFilters,
      ...updates,
    },
  };
});
const mockUpdateBattleReview = jest.fn((battleId: string, updates: Record<string, unknown>) => {
  mockReviewMetadata = {
    ...mockReviewMetadata,
    [battleId]: {
      ...(mockReviewMetadata[battleId] || { reviewed: false, bookmarked: false }),
      ...updates,
    },
  };
});
const mockToggleBattleReviewSelection = jest.fn((battleId: string) => {
  mockWorkflowContext = {
    ...mockWorkflowContext,
    selectedReviewBattleIds: mockWorkflowContext.selectedReviewBattleIds.includes(battleId)
      ? mockWorkflowContext.selectedReviewBattleIds.filter((id) => id !== battleId)
      : [...mockWorkflowContext.selectedReviewBattleIds, battleId],
  };
});
let mockReviewMetadata: Record<string, { reviewed: boolean; bookmarked: boolean; note?: string }> = {};
let mockWorkflowContext = {
  historyFilters: {
    searchQuery: '',
    status: 'all',
    model: 'all',
    sortOrder: 'newest',
  },
  selectedReviewBattleIds: [] as string[],
};

jest.mock('@/stores/arena', () => ({
  useArenaStore: (
    selector: (state: Record<string, unknown>) => unknown
  ) => {
    const state = {
      battles: mockBattles,
      deleteBattle: mockDeleteBattle,
      reviewMetadata: mockReviewMetadata,
      workflowContext: mockWorkflowContext,
      updateHistoryFilters: mockUpdateHistoryFilters,
      updateBattleReview: mockUpdateBattleReview,
      toggleBattleReviewSelection: mockToggleBattleReviewSelection,
    };
    return selector(state);
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const SelectContext = React.createContext<{ onValueChange?: (v: string) => void } | null>(null);

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => <SelectContext.Provider value={{ onValueChange }}>{children}</SelectContext.Provider>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const ctx = React.useContext(SelectContext);
    return (
      <button type="button" onClick={() => ctx?.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

const CollapsibleContext = React.createContext<{
  open: boolean;
  onOpenChange?: (open: boolean) => void;
} | null>(null);

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      {children}
    </CollapsibleContext.Provider>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => {
    const ctx = React.useContext(CollapsibleContext);
    const element = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(element, {
      onClick: (e: React.MouseEvent) => {
        element.props.onClick?.(e);
        ctx?.onOpenChange?.(!ctx.open);
      },
    } as Partial<unknown>);
  },
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => {
    const ctx = React.useContext(CollapsibleContext);
    if (!ctx?.open) return null;
    return <div>{children}</div>;
  },
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  History: () => <span data-testid="icon-history" />,
  Trophy: () => <span data-testid="icon-trophy" />,
  Scale: () => <span data-testid="icon-scale" />,
  Search: () => <span data-testid="icon-search" />,
  Filter: () => <span data-testid="icon-filter" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Clock: () => <span data-testid="icon-clock" />,
  Eye: () => <span data-testid="icon-eye" />,
  Trash2: () => <span data-testid="icon-trash" />,
  RotateCcw: () => <span data-testid="icon-rematch" />,
  Download: () => <span data-testid="icon-download" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
}));

function makeContestant(id: string, overrides?: Partial<ArenaContestant>): ArenaContestant {
  return {
    id,
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: `Model ${id}`,
    response: `Response ${id}`,
    status: 'completed',
    ...overrides,
  };
}

function makeBattle(overrides?: Partial<ArenaBattle>): ArenaBattle {
  return {
    id: 'battle-1',
    prompt: 'Prompt one',
    contestants: [
      makeContestant('a'),
      makeContestant('b', { provider: 'anthropic', model: 'claude-3-5-sonnet' }),
    ],
    mode: 'normal',
    conversationMode: 'single',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('ArenaHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBattles = [];
    mockReviewMetadata = {};
    mockWorkflowContext = {
      historyFilters: {
        searchQuery: '',
        status: 'all',
        model: 'all',
        sortOrder: 'newest',
      },
      selectedReviewBattleIds: [],
    };
  });

  it('renders empty state when no battles', () => {
    render(<ArenaHistory />);

    expect(screen.getByText('history.noHistory')).toBeInTheDocument();
    expect(screen.getByText('history.startBattles')).toBeInTheDocument();
  });

  it('renders battles list and allows searching', async () => {
    mockBattles = [
      makeBattle({ id: 'b1', prompt: 'Alpha prompt', createdAt: new Date('2026-01-02T00:00:00Z') }),
      makeBattle({ id: 'b2', prompt: 'Beta prompt', createdAt: new Date('2026-01-03T00:00:00Z') }),
    ];

    const initialView = render(<ArenaHistory />);

    expect(screen.getByText('history.title')).toBeInTheDocument();
    expect(screen.getByText('Alpha prompt')).toBeInTheDocument();
    expect(screen.getByText('Beta prompt')).toBeInTheDocument();

    mockUpdateHistoryFilters({ searchQuery: 'alpha' });
    initialView.unmount();
    render(<ArenaHistory />);

    expect(screen.getByText('Alpha prompt')).toBeInTheDocument();
    expect(screen.queryByText('Beta prompt')).not.toBeInTheDocument();
  });

  it('filters by status and sorts by oldest/newest', async () => {
    mockBattles = [
      makeBattle({
        id: 'completed',
        prompt: 'Completed',
        winnerId: 'a',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      }),
      makeBattle({
        id: 'pending',
        prompt: 'Pending',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      }),
    ];

    const initialView = render(<ArenaHistory />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    mockUpdateHistoryFilters({ status: 'completed' });
    initialView.unmount();
    const filteredView = render(<ArenaHistory />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();

    mockUpdateHistoryFilters({ status: 'all', sortOrder: 'oldest' });
    filteredView.unmount();
    render(<ArenaHistory />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('filters by model and allows deleting a battle', async () => {
    mockBattles = [
      makeBattle({
        id: 'b1',
        prompt: 'First',
        contestants: [
          makeContestant('a', { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT' }),
          makeContestant('b', {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet',
            displayName: 'Claude',
          }),
        ],
      }),
      makeBattle({
        id: 'b2',
        prompt: 'Second',
        contestants: [
          makeContestant('c', {
            provider: 'google',
            model: 'gemini-1.5-pro',
            displayName: 'Gemini',
          }),
          makeContestant('d', {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet',
            displayName: 'Claude',
          }),
        ],
      }),
    ];

    const view = render(<ArenaHistory />);

    mockUpdateHistoryFilters({ model: 'openai:gpt-4o-mini' });
    view.unmount();
    render(<ArenaHistory />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();

    const expandButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-chevron-down"]'));

    expect(expandButton).toBeDefined();
    if (expandButton) {
      await userEvent.click(expandButton);
      expect(screen.getByText(/history\.contestants/)).toBeInTheDocument();
    }

    await userEvent.click(screen.getByText('history.delete'));
    expect(mockDeleteBattle).toHaveBeenCalledWith('b1');
  });

  it('calls onViewBattle when view button is clicked', async () => {
    mockBattles = [makeBattle({ id: 'b1', prompt: 'View me' })];
    const onViewBattle = jest.fn();

    render(<ArenaHistory onViewBattle={onViewBattle} />);

    const viewButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-eye"]'));
    expect(viewButton).toBeDefined();

    if (viewButton) {
      await userEvent.click(viewButton);
      expect(onViewBattle).toHaveBeenCalledWith('b1');
    }
  });

  it('calls onRematch when rematch button is clicked', async () => {
    const battle = makeBattle({ id: 'b1', prompt: 'Rematch me' });
    mockBattles = [battle];
    const onRematch = jest.fn();

    render(<ArenaHistory onRematch={onRematch} />);

    const rematchButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-rematch"]'));
    expect(rematchButton).toBeDefined();

    if (rematchButton) {
      await userEvent.click(rematchButton);
      expect(onRematch).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b1', prompt: 'Rematch me' })
      );
    }
  });

  it('passes an isolated rematch copy that does not mutate history records', async () => {
    const battle = makeBattle({
      id: 'b-copy',
      prompt: 'Original prompt',
      mode: 'blind',
      conversationMode: 'multi',
      maxTurns: 6,
    });
    mockBattles = [battle];
    const onRematch = jest.fn();

    render(<ArenaHistory onRematch={onRematch} />);

    const rematchButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-rematch"]'));
    expect(rematchButton).toBeDefined();

    if (rematchButton) {
      await userEvent.click(rematchButton);
    }

    expect(onRematch).toHaveBeenCalledTimes(1);
    const rematchBattle = onRematch.mock.calls[0]?.[0] as ArenaBattle;
    expect(rematchBattle).not.toBe(battle);
    expect(rematchBattle.contestants[0]).not.toBe(battle.contestants[0]);

    rematchBattle.prompt = 'Changed prompt';
    rematchBattle.contestants[0].displayName = 'Changed model';

    expect(battle.prompt).toBe('Original prompt');
    expect(battle.contestants[0].displayName).toBe('Model a');
  });

  it('does not render rematch button when onRematch is not provided', () => {
    mockBattles = [makeBattle({ id: 'b1', prompt: 'No rematch' })];

    render(<ArenaHistory />);

    const rematchButton = screen
      .queryAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-rematch"]'));
    expect(rematchButton).toBeUndefined();
  });

  it('toggles review selection and updates review metadata', async () => {
    mockBattles = [makeBattle({ id: 'b-review', prompt: 'Review me' })];

    render(<ArenaHistory />);

    await userEvent.click(screen.getByRole('button', { name: 'history.selectForExport' }));
    expect(mockToggleBattleReviewSelection).toHaveBeenCalledWith('b-review');

    const expandButton = screen
      .getAllByRole('button')
      .find((button) => button.querySelector('[data-testid="icon-chevron-down"]'));
    expect(expandButton).toBeDefined();

    if (expandButton) {
      await userEvent.click(expandButton);
    }

    await userEvent.click(screen.getByRole('button', { name: 'history.markReviewed' }));
    expect(mockUpdateBattleReview).toHaveBeenCalledWith(
      'b-review',
      expect.objectContaining({ reviewed: true })
    );

    fireEvent.change(screen.getByPlaceholderText('history.reviewNotePlaceholder'), {
      target: { value: 'Keep' },
    });
    expect(mockUpdateBattleReview).toHaveBeenCalledWith(
      'b-review',
      expect.objectContaining({ note: 'Keep' })
    );
  });

  it('shows hidden selected count when filters hide selected battles', async () => {
    mockBattles = [
      makeBattle({ id: 'b1', prompt: 'Visible prompt' }),
      makeBattle({ id: 'b2', prompt: 'Hidden prompt' }),
    ];
    mockWorkflowContext.selectedReviewBattleIds = ['b2'];

    const view = render(<ArenaHistory />);

    mockUpdateHistoryFilters({ searchQuery: 'Visible' });
    view.unmount();
    render(<ArenaHistory />);

    expect(screen.getByText('history.hiddenSelected')).toBeInTheDocument();
  });
});
