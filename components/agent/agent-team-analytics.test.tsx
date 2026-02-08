/**
 * AgentTeamAnalytics component tests
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

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'analytics.title': 'Analytics',
      'analytics.totalTokens': 'Total Tokens',
      'analytics.totalDuration': 'Duration',
      'analytics.successRate': 'Success Rate',
      'analytics.teammates': 'Teammates',
      'analytics.tokenBudget': 'Token Budget',
      'analytics.tokensByTeammate': 'Tokens by Teammate',
      'analytics.taskDurations': 'Task Durations',
    };
    return translations[key] || key;
  },
}));

import { AgentTeamAnalytics } from './agent-team-analytics';

describe('AgentTeamAnalytics', () => {
  beforeEach(() => {
    mockTeams = {};
    mockTeammates = {};
    mockTasks = {};
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamAnalytics teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render analytics header', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('should show overview stat cards', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        teammateIds: ['lead-1', 'tm-1'],
        taskIds: ['task1', 'task2'],
        totalTokenUsage: { totalTokens: 5000, promptTokens: 3000, completionTokens: 2000 },
        config: {},
        totalDuration: 60000,
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'completed', tokenUsage: { totalTokens: 2000, promptTokens: 1200, completionTokens: 800 }, completedTaskIds: [] },
      'tm-1': { id: 'tm-1', name: 'Worker', role: 'worker', status: 'completed', tokenUsage: { totalTokens: 3000, promptTokens: 1800, completionTokens: 1200 }, completedTaskIds: ['task1'] },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed', actualDuration: 30000 },
      task2: { id: 'task2', status: 'completed', actualDuration: 30000 },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Teammates')).toBeInTheDocument();
  });

  it('should show 100% success rate when all tasks completed', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1', 'task2'],
        totalTokenUsage: { totalTokens: 1000, promptTokens: 500, completionTokens: 500 },
        config: {},
        totalDuration: 10000,
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed' },
      task2: { id: 'task2', status: 'completed' },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('2/2 tasks')).toBeInTheDocument();
  });

  it('should show partial success rate with failed tasks', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1', 'task2', 'task3', 'task4'],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed' },
      task2: { id: 'task2', status: 'completed' },
      task3: { id: 'task3', status: 'completed' },
      task4: { id: 'task4', status: 'failed' },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('3/4 tasks')).toBeInTheDocument();
  });

  it('should show token budget progress bar when budget is set', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 8000, promptTokens: 5000, completionTokens: 3000 },
        config: { tokenBudget: 10000 },
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('Token Budget')).toBeInTheDocument();
    // 8000 / 10000 = 80% used — should show budget with warning
    expect(screen.getByText('8.0K / 10.0K')).toBeInTheDocument();
  });

  it('should show budget warning when usage exceeds 80%', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 9500, promptTokens: 6000, completionTokens: 3500 },
        config: { tokenBudget: 10000 },
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    // Should show remaining tokens warning
    expect(screen.getByText(/500 tokens remaining/)).toBeInTheDocument();
  });

  it('should show budget exceeded message when over 100%', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 11000, promptTokens: 7000, completionTokens: 4000 },
        config: { tokenBudget: 10000 },
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText(/Budget exceeded/)).toBeInTheDocument();
  });

  it('should not show budget section when no budget set', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 5000, promptTokens: 3000, completionTokens: 2000 },
        config: {},
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.queryByText('Token Budget')).not.toBeInTheDocument();
  });

  it('should show failed task badge', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1', 'task2'],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed' },
      task2: { id: 'task2', status: 'failed' },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('1 failed')).toBeInTheDocument();
  });

  it('should show retried task badge', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1'],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed', retryCount: 2 },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('1 retried')).toBeInTheDocument();
  });

  it('should show cancelled task badge', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1'],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'cancelled' },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('1 cancelled')).toBeInTheDocument();
  });

  it('should show token usage per teammate with bar chart', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: ['lead-1', 'tm-1', 'tm-2'],
        taskIds: [],
        totalTokenUsage: { totalTokens: 10000, promptTokens: 6000, completionTokens: 4000 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead Agent', role: 'lead', status: 'completed', tokenUsage: { totalTokens: 3000, promptTokens: 1800, completionTokens: 1200 }, completedTaskIds: [] },
      'tm-1': { id: 'tm-1', name: 'Security Expert', role: 'worker', status: 'completed', tokenUsage: { totalTokens: 5000, promptTokens: 3000, completionTokens: 2000 }, completedTaskIds: ['t1'] },
      'tm-2': { id: 'tm-2', name: 'Perf Analyst', role: 'worker', status: 'completed', tokenUsage: { totalTokens: 2000, promptTokens: 1200, completionTokens: 800 }, completedTaskIds: ['t2'] },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('Tokens by Teammate')).toBeInTheDocument();
    // Names may appear in both the bar label and tooltip, so use getAllByText
    expect(screen.getAllByText('Security Expert').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Perf Analyst').length).toBeGreaterThanOrEqual(1);
    // Lead should show "(lead)" label
    expect(screen.getAllByText('(lead)').length).toBeGreaterThanOrEqual(1);
  });

  it('should show task duration comparison', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1', 'task2'],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 90000,
      },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Fast Task', status: 'completed', actualDuration: 15000 },
      task2: { id: 'task2', title: 'Slow Task', status: 'completed', actualDuration: 75000 },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('Task Durations')).toBeInTheDocument();
    expect(screen.getByText('Slow Task')).toBeInTheDocument();
    expect(screen.getByText('Fast Task')).toBeInTheDocument();
    expect(screen.getByText('1.3m')).toBeInTheDocument(); // 75000ms = 1.25m → 1.3m
    expect(screen.getByText('15.0s')).toBeInTheDocument();
  });

  it('should format tokens correctly with K suffix', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 15500, promptTokens: 10000, completionTokens: 5500 },
        config: {},
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('15.5K')).toBeInTheDocument();
  });

  it('should show 0% success rate with no tasks', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should not show failure/retry badges when there are none', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1'],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTasks = {
      task1: { id: 'task1', status: 'completed' },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/retried/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cancelled/)).not.toBeInTheDocument();
  });

  it('should not show teammate token section when no tokens used', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: ['lead-1'],
        taskIds: [],
        totalTokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        config: {},
        totalDuration: 0,
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle', tokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }, completedTaskIds: [] },
    };

    render(<AgentTeamAnalytics teamId="t1" />);
    expect(screen.queryByText('Tokens by Teammate')).not.toBeInTheDocument();
  });
});
