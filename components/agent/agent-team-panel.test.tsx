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

jest.mock('./live-trace-panel', () => ({
  LiveTracePanel: () => <div data-testid="live-trace">Live Trace</div>,
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

  it('invokes delegate callback from task item action', () => {
    const onDelegateTaskToBackground = jest.fn();
    mockStoreState = {
      ...emptyStore,
      teams: {
        't1': {
          id: 't1',
          name: 'Delegation Team',
          status: 'executing',
          description: '',
          teammateIds: [],
          taskIds: ['task-1'],
          messageIds: [],
          progress: 20,
          totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        },
      },
      tasks: {
        'task-1': {
          id: 'task-1',
          teamId: 't1',
          title: 'Background-capable task',
          description: 'Delegate this task',
          status: 'pending',
          priority: 'normal',
          dependencies: [],
          tags: [],
          createdAt: new Date('2026-03-05T08:00:00.000Z'),
          order: 0,
        },
      },
      activeTeamId: 't1',
    };

    render(<AgentTeamPanel onDelegateTaskToBackground={onDelegateTaskToBackground} />);

    fireEvent.click(screen.getByText('Delegate'));
    expect(onDelegateTaskToBackground).toHaveBeenCalledWith('t1', 'task-1');
  });

  it('renders routing rationale and delegation record details from first-class team/task state', () => {
    mockStoreState = {
      ...emptyStore,
      teams: {
        't1': {
          id: 't1',
          name: 'Routing Team',
          status: 'idle',
          description: 'Team with routing context',
          routingAssessment: {
            recommendedPattern: 'parallel_specialists',
            confidence: 0.9,
            reason: 'Parallel specialist work is beneficial',
            factors: {
              taskComplexity: 'complex',
              specializationNeeded: true,
              contextIsolationNeeded: true,
              delegationCandidate: false,
              budgetPressure: 'low',
            },
            createdAt: new Date('2026-03-14T10:00:00.000Z'),
          },
          selectedExecutionPattern: 'parallel_specialists',
          executionReport: {
            id: 'report-1',
            teamId: 't1',
            status: 'running',
            activeExecutionPattern: 'parallel_specialists',
            traceSessionId: 'trace-session-1',
            checkpoints: [
              {
                id: 'checkpoint-1',
                type: 'approval_requested',
                timestamp: new Date('2026-03-14T10:02:00.000Z'),
                summary: 'Delegation approval requested',
              },
            ],
            summary: {
              completedTasks: 1,
              failedTasks: 0,
              cancelledTasks: 0,
              blockedTasks: 0,
              delegatedTasks: 1,
              approvalsRequested: 1,
              retries: 0,
              totalTokens: 1200,
              nextActions: ['Approve background delegation'],
            },
            createdAt: new Date('2026-03-14T10:00:00.000Z'),
            updatedAt: new Date('2026-03-14T10:05:00.000Z'),
          },
          teammateIds: [],
          taskIds: ['task-1'],
          messageIds: [],
          progress: 15,
          totalTokenUsage: { totalTokens: 1200, promptTokens: 800, completionTokens: 400 },
        },
      },
      tasks: {
        'task-1': {
          id: 'task-1',
          teamId: 't1',
          title: 'Awaiting delegation approval',
          description: 'Delegate this carefully',
          status: 'pending',
          priority: 'normal',
          dependencies: [],
          tags: [],
          createdAt: new Date('2026-03-14T10:00:00.000Z'),
          order: 0,
          delegationRecord: {
            id: 'delegation-1',
            sourceTeamId: 't1',
            sourceTaskId: 'task-1',
            targetType: 'background',
            status: 'awaiting_approval',
            reason: 'Manual delegation awaiting approval',
            manual: true,
            createdAt: new Date('2026-03-14T10:01:00.000Z'),
            updatedAt: new Date('2026-03-14T10:01:00.000Z'),
          },
        },
      },
      activeTeamId: 't1',
    };

    render(<AgentTeamPanel />);

    expect(screen.getByText('parallel_specialists')).toBeInTheDocument();
    expect(screen.getByText('Parallel specialist work is beneficial')).toBeInTheDocument();
    expect(screen.getByText('Delegation: awaiting_approval')).toBeInTheDocument();
    expect(screen.getByText('Manual delegation awaiting approval')).toBeInTheDocument();
    expect(screen.getByText('Approve background delegation')).toBeInTheDocument();
    expect(screen.getByText('Delegation approval requested')).toBeInTheDocument();
    expect(screen.getByTestId('live-trace')).toBeInTheDocument();
  });
});
