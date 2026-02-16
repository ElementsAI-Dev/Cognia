/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentTeamPanel } from './agent-team-panel';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}(${JSON.stringify(params)})`;
    return key;
  },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

const emptyStore = {
  teams: {},
  teammates: {},
  tasks: {},
  messages: {},
  activeTeamId: null as string | null,
  selectedTeammateId: null as string | null,
  displayMode: 'compact' as const,
  setActiveTeam: jest.fn(),
  setSelectedTeammate: jest.fn(),
  setDisplayMode: jest.fn(),
};

let mockStoreState = { ...emptyStore };

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

jest.mock('./agent-team-chat', () => ({
  AgentTeamChat: () => <div data-testid="team-chat">Chat</div>,
}));

jest.mock('./agent-team-activity-feed', () => ({
  AgentTeamActivityFeed: () => <div data-testid="activity-feed">Activity</div>,
}));

jest.mock('./agent-team-timeline', () => ({
  AgentTeamTimeline: () => <div data-testid="timeline">Timeline</div>,
}));

jest.mock('./agent-team-config-editor', () => ({
  AgentTeamConfigEditor: () => <div data-testid="config-editor">Config</div>,
}));

jest.mock('./agent-team-task-board', () => ({
  AgentTeamTaskBoard: () => <div data-testid="task-board">Task Board</div>,
}));

jest.mock('./agent-team-analytics', () => ({
  AgentTeamAnalytics: () => <div data-testid="analytics">Analytics</div>,
}));

jest.mock('./agent-team-result-card', () => ({
  AgentTeamResultCard: () => <div data-testid="result-card">Result</div>,
}));

jest.mock('./agent-team-graph', () => ({
  AgentTeamGraph: () => <div data-testid="team-graph">Graph</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('lucide-react', () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    Users: icon, Plus: icon, Play: icon, Pause: icon, Square: icon,
    Trash2: icon, ChevronDown: icon, ChevronRight: icon, MessageSquare: icon,
    ListTodo: icon, CheckCircle: icon, XCircle: icon, Circle: icon,
    Clock: icon, Loader2: icon, Power: icon, Ban: icon, Lock: icon,
    Eye: icon, Hand: icon, Brain: icon, Layers: icon,
    LayoutGrid: icon, LayoutList: icon, Columns: icon,
  };
});

jest.mock('@/types/agent/agent-team', () => ({
  TEAM_STATUS_CONFIG: {
    idle: { label: 'Idle', icon: 'Circle', color: '' },
    planning: { label: 'Planning', icon: 'Brain', color: '' },
    executing: { label: 'Executing', icon: 'Play', color: '' },
    paused: { label: 'Paused', icon: 'Pause', color: '' },
    completed: { label: 'Completed', icon: 'CheckCircle', color: '' },
    failed: { label: 'Failed', icon: 'XCircle', color: '' },
    cancelled: { label: 'Cancelled', icon: 'Ban', color: '' },
  },
  TEAMMATE_STATUS_CONFIG: {
    idle: { label: 'Idle', color: '' },
    executing: { label: 'Executing', color: '' },
    completed: { label: 'Completed', color: '' },
  },
  TASK_STATUS_CONFIG: {
    pending: { label: 'Pending', icon: 'Circle', color: '' },
    in_progress: { label: 'In Progress', icon: 'Play', color: '' },
    completed: { label: 'Completed', icon: 'CheckCircle', color: '' },
  },
}));

describe('AgentTeamPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = { ...emptyStore };
  });

  it('renders empty state when no teams exist', () => {
    render(<AgentTeamPanel />);
    expect(screen.getByText('noTeams')).toBeInTheDocument();
    expect(screen.getByText('noTeamsHint')).toBeInTheDocument();
  });

  it('shows create team button in empty state', () => {
    const onCreateTeam = jest.fn();
    render(<AgentTeamPanel onCreateTeam={onCreateTeam} />);
    fireEvent.click(screen.getByText('createTeam'));
    expect(onCreateTeam).toHaveBeenCalled();
  });

  it('renders team header when teams exist', () => {
    mockStoreState = {
      ...emptyStore,
      teams: {
        't1': {
          id: 't1',
          name: 'Test Team',
          status: 'idle',
          description: '',
          teammateIds: [],
          taskIds: [],
          messageIds: [],
          progress: 0,
          totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        },
      },
      activeTeamId: 't1',
    };
    render(<AgentTeamPanel />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders select team prompt when no active team', () => {
    mockStoreState = {
      ...emptyStore,
      teams: {
        't1': {
          id: 't1',
          name: 'Team A',
          status: 'idle',
          description: '',
          teammateIds: [],
          taskIds: [],
          messageIds: [],
          progress: 0,
          totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        },
      },
      activeTeamId: null,
    };
    render(<AgentTeamPanel />);
    expect(screen.getByText('selectTeam')).toBeInTheDocument();
  });
});
