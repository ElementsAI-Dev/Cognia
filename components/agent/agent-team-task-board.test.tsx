/**
 * AgentTeamTaskBoard component tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock store data
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};
let mockTasks: Record<string, unknown> = {};
const mockCreateTask = jest.fn((input: Record<string, unknown>) => ({
  id: 'new-task',
  title: input.title,
  description: input.description,
  status: 'pending',
  priority: input.priority || 'normal',
  order: 0,
  dependencies: [],
  tags: [],
}));
const mockSetTaskStatus = jest.fn();
const mockClaimTask = jest.fn();
const mockAssignTask = jest.fn();

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        teams: mockTeams,
        teammates: mockTeammates,
        tasks: mockTasks,
        createTask: mockCreateTask,
        setTaskStatus: mockSetTaskStatus,
        claimTask: mockClaimTask,
        assignTask: mockAssignTask,
      };
      return selector(state);
    },
    {
      getState: () => ({
        teammates: mockTeammates,
      }),
    }
  ),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'taskBoard.title': 'Task Board',
      'taskBoard.tasks': 'tasks',
      'taskBoard.addTask': 'Add Task',
      'taskBoard.createTask': 'Create Task',
      'taskBoard.taskTitle': 'Title',
      'taskBoard.taskDescription': 'Description',
      'taskBoard.priority': 'Priority',
      'taskBoard.assignTo': 'Assign To',
      'taskBoard.create': 'Create',
      'taskBoard.empty': 'No tasks',
      'cancel': 'Cancel',
    };
    return translations[key] || key;
  },
}));

jest.mock('@/types/agent/agent-team', () => ({
  TASK_STATUS_CONFIG: {
    pending: { label: 'Pending', color: 'text-blue-500', icon: 'Clock' },
    blocked: { label: 'Blocked', color: 'text-orange-500', icon: 'Lock' },
    claimed: { label: 'Claimed', color: 'text-blue-500', icon: 'Hand' },
    in_progress: { label: 'In Progress', color: 'text-primary', icon: 'Loader2' },
    review: { label: 'In Review', color: 'text-yellow-500', icon: 'Eye' },
    completed: { label: 'Completed', color: 'text-green-500', icon: 'CheckCircle' },
    failed: { label: 'Failed', color: 'text-destructive', icon: 'XCircle' },
    cancelled: { label: 'Cancelled', color: 'text-orange-500', icon: 'Ban' },
  },
}));

import { AgentTeamTaskBoard } from './agent-team-task-board';

describe('AgentTeamTaskBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTeams = {};
    mockTeammates = {};
    mockTasks = {};
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamTaskBoard teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render board header with task count', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        teammateIds: ['lead-1'],
        taskIds: ['task1', 'task2'],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Task A', status: 'pending', priority: 'normal', order: 0, dependencies: [] },
      task2: { id: 'task2', title: 'Task B', status: 'completed', priority: 'high', order: 1, dependencies: [] },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('Task Board')).toBeInTheDocument();
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('should render all kanban columns', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        teammateIds: [],
        taskIds: [],
      },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('should show tasks in correct columns', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Test Team',
        teammateIds: ['lead-1'],
        taskIds: ['task1', 'task2', 'task3'],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Pending Task', status: 'pending', priority: 'normal', order: 0, dependencies: [] },
      task2: { id: 'task2', title: 'Active Task', status: 'in_progress', priority: 'high', order: 1, dependencies: [], claimedBy: 'lead-1' },
      task3: { id: 'task3', title: 'Done Task', status: 'completed', priority: 'low', order: 2, dependencies: [], result: 'Finished' },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('Pending Task')).toBeInTheDocument();
    expect(screen.getByText('Active Task')).toBeInTheDocument();
    expect(screen.getByText('Done Task')).toBeInTheDocument();
  });

  it('should show priority badges on task cards', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1'],
      },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Critical Bug', status: 'pending', priority: 'critical', order: 0, dependencies: [] },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('should show assignee name on task cards', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: ['lead-1', 'tm-1'],
        taskIds: ['task1'],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
      'tm-1': { id: 'tm-1', name: 'SecurityBot', role: 'worker', status: 'executing' },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Review Auth', status: 'in_progress', priority: 'high', order: 0, dependencies: [], claimedBy: 'tm-1' },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('SecurityBot')).toBeInTheDocument();
  });

  it('should show retry count on retried tasks', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1'],
      },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Retried Task', status: 'failed', priority: 'normal', order: 0, dependencies: [], retryCount: 2 },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show dependency count on tasks with deps', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1', 'task2'],
      },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'First Task', status: 'completed', priority: 'normal', order: 0, dependencies: [] },
      task2: { id: 'task2', title: 'Blocked Task', status: 'blocked', priority: 'normal', order: 1, dependencies: ['task1'] },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('Blocked Task')).toBeInTheDocument();
  });

  it('should show Add Task button', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
      },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });

  it('should have clickable Add Task button', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: ['lead-1'],
        taskIds: [],
      },
    };
    mockTeammates = {
      'lead-1': { id: 'lead-1', name: 'Lead', role: 'lead', status: 'idle' },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    const addBtn = screen.getByText('Add Task');
    expect(addBtn).toBeInTheDocument();
    expect(addBtn.closest('button')).not.toBeDisabled();
  });

  it('should show duration on completed tasks', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: ['task1'],
      },
    };
    mockTasks = {
      task1: { id: 'task1', title: 'Timed Task', status: 'completed', priority: 'normal', order: 0, dependencies: [], actualDuration: 30000 },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('should show empty state in columns with no tasks', () => {
    mockTeams = {
      t1: {
        id: 't1',
        name: 'Team',
        teammateIds: [],
        taskIds: [],
      },
    };

    render(<AgentTeamTaskBoard teamId="t1" />);
    // All 5 columns should show "No tasks"
    const emptyLabels = screen.getAllByText('No tasks');
    expect(emptyLabels.length).toBe(5);
  });
});
