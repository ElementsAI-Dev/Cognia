/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionList } from './session-list';
import type { Session } from '@/types';

// Mock data
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
  },
  {
    id: 'session-2',
    title: 'Test Session 2',
    mode: 'agent',
    provider: 'anthropic',
    model: 'claude-3',
    messageCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Create a variable to control sessions in tests
let currentSessions = mockSessions;
let currentActiveSessionId = 'session-1';

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: currentSessions,
      activeSessionId: currentActiveSessionId,
    };
    return selector(state);
  },
}));

// Mock SessionItem
jest.mock('./session-item', () => ({
  SessionItem: ({ session, isActive, collapsed }: { session: Session; isActive: boolean; collapsed: boolean }) => (
    <div 
      data-testid={`session-item-${session.id}`}
      data-active={isActive}
      data-collapsed={collapsed}
    >
      {session.title}
    </div>
  ),
}));

describe('SessionList', () => {
  beforeEach(() => {
    currentSessions = mockSessions;
    currentActiveSessionId = 'session-1';
  });

  it('renders without crashing', () => {
    render(<SessionList />);
    expect(screen.getByTestId('session-item-session-1')).toBeInTheDocument();
  });

  it('displays all sessions', () => {
    render(<SessionList />);
    expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    expect(screen.getByText('Test Session 2')).toBeInTheDocument();
  });

  it('renders session items for each session', () => {
    render(<SessionList />);
    expect(screen.getByTestId('session-item-session-1')).toBeInTheDocument();
    expect(screen.getByTestId('session-item-session-2')).toBeInTheDocument();
  });

  it('marks active session correctly', () => {
    render(<SessionList />);
    const activeItem = screen.getByTestId('session-item-session-1');
    expect(activeItem).toHaveAttribute('data-active', 'true');
    
    const inactiveItem = screen.getByTestId('session-item-session-2');
    expect(inactiveItem).toHaveAttribute('data-active', 'false');
  });

  it('passes collapsed prop to session items', () => {
    render(<SessionList collapsed />);
    const item = screen.getByTestId('session-item-session-1');
    expect(item).toHaveAttribute('data-collapsed', 'true');
  });

  it('shows empty state when no sessions exist', () => {
    currentSessions = [];
    render(<SessionList />);
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(screen.getByText('Start a new chat to begin')).toBeInTheDocument();
  });

  it('does not show empty state text when collapsed and no sessions', () => {
    currentSessions = [];
    render(<SessionList collapsed />);
    expect(screen.queryByText('No conversations yet')).not.toBeInTheDocument();
  });

  it('renders in non-collapsed mode by default', () => {
    render(<SessionList />);
    const item = screen.getByTestId('session-item-session-1');
    expect(item).toHaveAttribute('data-collapsed', 'false');
  });
});
