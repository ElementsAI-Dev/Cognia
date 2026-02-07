/**
 * AgentTeamResultCard component tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock store data
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};
let mockTasks: Record<string, unknown> = {};

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      teammates: mockTeammates,
      tasks: mockTasks,
    };
    return selector(state);
  },
}));

jest.mock('@/types/agent/agent-team', () => ({
  TEAM_STATUS_CONFIG: {
    idle: { label: 'Idle', color: 'text-muted-foreground' },
    planning: { label: 'Planning', color: 'text-blue-500' },
    executing: { label: 'Executing', color: 'text-primary' },
    paused: { label: 'Paused', color: 'text-yellow-500' },
    completed: { label: 'Completed', color: 'text-green-500' },
    failed: { label: 'Failed', color: 'text-destructive' },
    cancelled: { label: 'Cancelled', color: 'text-orange-500' },
  },
  TEAMMATE_STATUS_CONFIG: {
    idle: { label: 'Idle', color: 'text-muted-foreground' },
    executing: { label: 'Executing', color: 'text-primary' },
    completed: { label: 'Completed', color: 'text-green-500' },
    failed: { label: 'Failed', color: 'text-destructive' },
  },
}));

import { AgentTeamResultCard } from './agent-team-result-card';

describe('AgentTeamResultCard', () => {
  beforeEach(() => {
    mockTeams = {};
    mockTeammates = {};
    mockTasks = {};
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamResultCard teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render team name and status', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Research Team',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
      },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('Research Team')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should show teammate count', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: ['tm1', 'tm2'],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
      },
    };
    mockTeammates = {
      tm1: { id: 'tm1', name: 'Agent 1', role: 'lead', status: 'completed', tokenUsage: { totalTokens: 100 } },
      tm2: { id: 'tm2', name: 'Agent 2', role: 'worker', status: 'completed', tokenUsage: { totalTokens: 200 } },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('2 teammates')).toBeInTheDocument();
  });

  it('should show task progress', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: ['task1', 'task2', 'task3'],
        totalTokenUsage: { totalTokens: 0 },
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed' },
      task2: { id: 'task2', status: 'completed' },
      task3: { id: 'task3', status: 'failed' },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('2/3 tasks')).toBeInTheDocument();
  });

  it('should display final result', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
        finalResult: 'Task completed successfully with all deliverables.',
      },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('Task completed successfully with all deliverables.')).toBeInTheDocument();
  });

  it('should display error message for failed teams', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Failed Team',
        status: 'failed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
        error: 'Execution timed out',
      },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('Execution timed out')).toBeInTheDocument();
  });

  it('should show duration when available', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
        totalDuration: 45000,
      },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('45.0s')).toBeInTheDocument();
  });

  it('should format minutes for longer durations', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
        totalDuration: 125000,
      },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('should show token usage', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 15000 },
      },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    expect(screen.getByText('15,000 tokens')).toBeInTheDocument();
  });

  it('should render View Details button when onOpenPanel provided', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
      },
    };
    const mockOnOpen = jest.fn();
    render(<AgentTeamResultCard teamId="t1" onOpenPanel={mockOnOpen} />);
    const btn = screen.getByText('View Details');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });

  it('should show compact result in compact mode', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0 },
        finalResult: 'Short result text',
      },
    };
    render(<AgentTeamResultCard teamId="t1" compact />);
    expect(screen.getByText('Short result text')).toBeInTheDocument();
  });

  it('should show task failed count', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team A',
        status: 'completed',
        teammateIds: [],
        taskIds: ['task1', 'task2'],
        totalTokenUsage: { totalTokens: 0 },
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed' },
      task2: { id: 'task2', status: 'failed' },
    };
    render(<AgentTeamResultCard teamId="t1" />);
    // Stats bar shows "1/2 tasks", progress section shows "1/2" + "(1 failed)"
    expect(screen.getByText('1/2 tasks')).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });
});
