/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionGroup, useSessionGroups } from './session-group';
import { renderHook } from '@testing-library/react';
import type { Session } from '@/types';

// Mock stores
const mockDeleteSession = jest.fn();
const mockActiveSessionId = 'session-1';

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      deleteSession: mockDeleteSession,
      activeSessionId: mockActiveSessionId,
    };
    return selector(state);
  },
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
    onOpenChange: _onOpenChange,
    className,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    className?: string;
  }) => (
    <div data-testid="collapsible" data-open={open} className={className}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

// Mock AlertDialog
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="confirm-delete-all" onClick={onClick}>{children}</button>
  ),
}));

// Mock SessionItem
jest.mock('./session-item', () => ({
  SessionItem: ({
    session,
    isActive,
    collapsed,
  }: {
    session: Session;
    isActive: boolean;
    collapsed?: boolean;
  }) => (
    <div
      data-testid={`session-item-${session.id}`}
      data-active={isActive}
      data-collapsed={collapsed}
    >
      {session.title}
    </div>
  ),
}));

describe('SessionGroup', () => {
  const mockSessions: Session[] = [
    {
      id: 'session-1',
      title: 'Test Session 1',
      mode: 'chat',
      provider: 'openai',
      model: 'gpt-4',
      messageCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false,
    },
    {
      id: 'session-2',
      title: 'Test Session 2',
      mode: 'chat',
      provider: 'openai',
      model: 'gpt-4',
      messageCount: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false,
    },
  ];

  const defaultProps = {
    title: 'Today',
    type: 'today' as const,
    sessions: mockSessions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SessionGroup {...defaultProps} />);
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });

  it('displays group title', () => {
    render(<SessionGroup {...defaultProps} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('displays session count', () => {
    render(<SessionGroup {...defaultProps} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders all sessions in the group', () => {
    render(<SessionGroup {...defaultProps} />);
    expect(screen.getByTestId('session-item-session-1')).toBeInTheDocument();
    expect(screen.getByTestId('session-item-session-2')).toBeInTheDocument();
  });

  it('returns null when sessions array is empty', () => {
    const { container } = render(
      <SessionGroup {...defaultProps} sessions={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('marks active session correctly', () => {
    render(<SessionGroup {...defaultProps} />);
    const activeSession = screen.getByTestId('session-item-session-1');
    expect(activeSession).toHaveAttribute('data-active', 'true');
  });

  it('renders collapsed view when collapsed prop is true', () => {
    render(<SessionGroup {...defaultProps} collapsed />);
    // In collapsed mode, shows max 3 sessions
    expect(screen.getByTestId('session-item-session-1')).toHaveAttribute(
      'data-collapsed',
      'true'
    );
  });

  it('shows overflow count in collapsed mode when more than 3 sessions', () => {
    const manySessions: Session[] = [
      ...mockSessions,
      {
        id: 'session-3',
        title: 'Test Session 3',
        mode: 'chat',
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        pinned: false,
      },
      {
        id: 'session-4',
        title: 'Test Session 4',
        mode: 'chat',
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        pinned: false,
      },
    ];
    render(<SessionGroup {...defaultProps} sessions={manySessions} collapsed />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders dropdown menu for delete all action', () => {
    render(<SessionGroup {...defaultProps} />);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });

  it('shows confirmation dialog when Delete All is clicked', () => {
    render(<SessionGroup {...defaultProps} />);
    const deleteAllButton = screen.getByText('deleteAll');
    fireEvent.click(deleteAllButton);

    // Confirmation dialog should appear, deleteSession not called yet
    expect(mockDeleteSession).not.toHaveBeenCalled();
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });

  it('calls deleteSession for each session when delete all is confirmed', () => {
    render(<SessionGroup {...defaultProps} />);
    const deleteAllButton = screen.getByText('deleteAll');
    fireEvent.click(deleteAllButton);
    fireEvent.click(screen.getByTestId('confirm-delete-all'));

    expect(mockDeleteSession).toHaveBeenCalledTimes(2);
    expect(mockDeleteSession).toHaveBeenCalledWith('session-1');
    expect(mockDeleteSession).toHaveBeenCalledWith('session-2');
  });

  it('applies custom className', () => {
    render(<SessionGroup {...defaultProps} className="custom-class" />);
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveClass('custom-class');
  });

  it('is open by default', () => {
    render(<SessionGroup {...defaultProps} />);
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('data-open', 'true');
  });

  it('respects defaultOpen prop', () => {
    render(<SessionGroup {...defaultProps} defaultOpen={false} />);
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('data-open', 'false');
  });
});

describe('useSessionGroups', () => {
  const createSession = (
    id: string,
    updatedAt: Date,
    pinned: boolean = false
  ): Session => ({
    id,
    title: `Session ${id}`,
    mode: 'chat',
    provider: 'openai',
    model: 'gpt-4',
    messageCount: 1,
    createdAt: new Date(),
    updatedAt,
    pinned,
  });

  it('returns empty groups when no sessions', () => {
    const { result } = renderHook(() => useSessionGroups([]));
    expect(result.current.pinned).toHaveLength(0);
    expect(result.current.today).toHaveLength(0);
    expect(result.current.yesterday).toHaveLength(0);
    expect(result.current.lastWeek).toHaveLength(0);
    expect(result.current.older).toHaveLength(0);
  });

  it('groups pinned sessions correctly', () => {
    const sessions = [createSession('1', new Date(), true)];
    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.pinned).toHaveLength(1);
  });

  it('groups today sessions correctly', () => {
    const sessions = [createSession('1', new Date())];
    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.today).toHaveLength(1);
  });

  it('groups yesterday sessions correctly', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); // Middle of yesterday

    const sessions = [createSession('1', yesterday)];
    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.yesterday).toHaveLength(1);
  });

  it('groups last week sessions correctly', () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 5);

    const sessions = [createSession('1', lastWeek)];
    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.lastWeek).toHaveLength(1);
  });

  it('groups older sessions correctly', () => {
    const older = new Date();
    older.setDate(older.getDate() - 30);

    const sessions = [createSession('1', older)];
    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.older).toHaveLength(1);
  });

  it('sorts sessions by updatedAt descending within groups', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

    const sessions = [
      createSession('1', earlier),
      createSession('2', now),
    ];

    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.today[0].id).toBe('2'); // Most recent first
    expect(result.current.today[1].id).toBe('1');
  });

  it('prioritizes pinned over time-based grouping', () => {
    const sessions = [createSession('1', new Date(), true)];
    const { result } = renderHook(() => useSessionGroups(sessions));
    expect(result.current.pinned).toHaveLength(1);
    expect(result.current.today).toHaveLength(0);
  });
});
