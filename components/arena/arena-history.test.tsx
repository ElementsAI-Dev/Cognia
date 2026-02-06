import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaHistory } from './arena-history';
import type { ArenaBattle, ArenaContestant } from '@/types/arena';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

let mockBattles: ArenaBattle[] = [];
const mockDeleteBattle = jest.fn();

jest.mock('@/stores/arena', () => ({
  useArenaStore: (
    selector: (state: { battles: ArenaBattle[]; deleteBattle: typeof mockDeleteBattle }) => unknown
  ) => {
    const state = {
      battles: mockBattles,
      deleteBattle: mockDeleteBattle,
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
    const element = children as React.ReactElement;
    return React.cloneElement(element, {
      onClick: (e: React.MouseEvent) => {
        element.props.onClick?.(e);
        ctx?.onOpenChange?.(!ctx.open);
      },
    });
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

    render(<ArenaHistory />);

    expect(screen.getByText('history.title')).toBeInTheDocument();
    expect(screen.getByText('Alpha prompt')).toBeInTheDocument();
    expect(screen.getByText('Beta prompt')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('history.searchPlaceholder');
    await userEvent.type(input, 'alpha');

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

    render(<ArenaHistory />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'history.completed' }));

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'history.allStatus' }));
    await userEvent.click(screen.getByRole('button', { name: 'history.oldest' }));

    const prompts = screen.getAllByText(/Completed|Pending/);
    expect(prompts[0]).toHaveTextContent('Completed');
    expect(prompts[1]).toHaveTextContent('Pending');
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

    render(<ArenaHistory />);

    await userEvent.click(screen.getByRole('button', { name: 'gpt-4o-mini' }));

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
});
