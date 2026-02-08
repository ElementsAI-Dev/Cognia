/**
 * AgentTeamGraph component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock store data
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};
let mockTasks: Record<string, unknown> = {};
let mockMessages: Record<string, unknown> = {};

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      teammates: mockTeammates,
      tasks: mockTasks,
      messages: mockMessages,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'graph.teamView': 'Team',
      'graph.taskView': 'Tasks',
      'graph.teamViewTooltip': 'Team structure & communication',
      'graph.taskViewTooltip': 'Task dependency DAG',
    };
    return translations[key] || key;
  },
}));

// Mock @xyflow/react — ReactFlow requires a DOM resize observer and other browser APIs
jest.mock('@xyflow/react', () => {
  const React = jest.requireActual('react');
  return {
    ReactFlow: ({ nodes, edges, onNodeClick, nodeTypes }: Record<string, unknown>) => {
      const n = nodes as Array<{ id: string; type: string; data: Record<string, unknown> }>;
      const e = edges as Array<{ id: string }>;
      const nt = nodeTypes as Record<string, React.ComponentType<{ data: Record<string, unknown> }>> | undefined;
      return React.createElement('div', { 'data-testid': 'react-flow' },
        React.createElement('div', { 'data-testid': 'node-count' }, `${n.length} nodes`),
        React.createElement('div', { 'data-testid': 'edge-count' }, `${e.length} edges`),
        ...n.map((node: { id: string; type: string; data: Record<string, unknown> }) => {
          const NodeComp = nt?.[node.type];
          return React.createElement('div', {
            key: node.id,
            'data-testid': `node-${node.id}`,
            onClick: (ev: React.MouseEvent) => (onNodeClick as (e: React.MouseEvent, n: { id: string }) => void)?.(ev, node),
          }, NodeComp ? React.createElement(NodeComp, { data: node.data }) : null);
        }),
      );
    },
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    Background: () => React.createElement('div', { 'data-testid': 'background' }),
    Controls: () => React.createElement('div', { 'data-testid': 'controls' }),
    MiniMap: () => React.createElement('div', { 'data-testid': 'minimap' }),
    Handle: () => React.createElement('div', { 'data-testid': 'handle' }),
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
  };
});

jest.mock('@xyflow/react/dist/style.css', () => ({}));

import { AgentTeamGraph } from './agent-team-graph';

// Shared mock data builders
function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    name: 'Test Team',
    leadId: 'lead-1',
    teammateIds: ['lead-1', 'tm-1'],
    taskIds: ['task1'],
    messageIds: ['msg1'],
    status: 'idle',
    config: { executionMode: 'coordinated' },
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    teamId: 't1',
    name: 'Lead Agent',
    role: 'lead',
    status: 'idle',
    config: {},
    tokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    progress: 0,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeWorker(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tm-1',
    teamId: 't1',
    name: 'Worker',
    role: 'worker',
    status: 'idle',
    config: {},
    tokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    progress: 0,
    createdAt: new Date('2025-01-01T00:01:00'),
    ...overrides,
  };
}

describe('AgentTeamGraph', () => {
  beforeEach(() => {
    mockTeams = {};
    mockTeammates = {};
    mockTasks = {};
    mockMessages = {};
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamGraph teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the graph with view mode toggle', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'Task 1', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {
      msg1: { id: 'msg1', teamId: 't1', senderId: 'lead-1', recipientId: 'tm-1', type: 'direct', content: 'Hi', timestamp: new Date() },
    };

    render(<AgentTeamGraph teamId="t1" />);
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should display correct node and edge counts in team mode', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" />);
    // Team mode: 2 teammates = 2 nodes, 1 edge (lead→worker)
    // Text appears in both mock ReactFlow and stats, so use getAllByText
    expect(screen.getAllByText('2 nodes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1 edges').length).toBeGreaterThanOrEqual(1);
  });

  it('should switch to task view when tasks button clicked', () => {
    mockTeams = { t1: makeTeam({ taskIds: ['task1', 'task2'] }) };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'Root Task', status: 'completed', priority: 'high', assignedTo: 'tm-1', dependencies: [] },
      task2: { id: 'task2', title: 'Child Task', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: ['task1'] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" />);

    fireEvent.click(screen.getByText('Tasks'));
    // Task mode: 2 tasks = 2 nodes, 1 dependency edge
    expect(screen.getAllByText('2 nodes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1 edges').length).toBeGreaterThanOrEqual(1);
  });

  it('should render teammate nodes with names', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" />);
    expect(screen.getByText('Lead Agent')).toBeInTheDocument();
    expect(screen.getByText('Worker')).toBeInTheDocument();
  });

  it('should call onTeammateClick when a node is clicked in team mode', () => {
    const onTeammateClick = jest.fn();
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" onTeammateClick={onTeammateClick} />);
    fireEvent.click(screen.getByTestId('node-tm-1'));
    expect(onTeammateClick).toHaveBeenCalledWith('tm-1');
  });

  it('should call onTaskClick when a node is clicked in task mode', () => {
    const onTaskClick = jest.fn();
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getByText('Tasks'));
    fireEvent.click(screen.getByTestId('node-task1'));
    expect(onTaskClick).toHaveBeenCalledWith('task1');
  });

  it('should show task nodes with title and priority in task view', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'Critical Task', status: 'in_progress', priority: 'critical', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" />);
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByText('Critical Task')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('should show team with no tasks or messages', () => {
    mockTeams = { t1: makeTeam({ taskIds: [], messageIds: [] }) };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {};
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" />);
    expect(screen.getAllByText('2 nodes').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle executing teammate with animated edge', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = {
      'lead-1': makeLead({ status: 'executing' }),
      'tm-1': makeWorker({ status: 'executing', progress: 50 }),
    };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'in_progress', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {};

    render(<AgentTeamGraph teamId="t1" />);
    expect(screen.getByText('Lead Agent')).toBeInTheDocument();
  });

  it('should display message flow edges between non-lead teammates', () => {
    const tm2 = { ...makeWorker(), id: 'tm-2', name: 'Worker 2' };
    mockTeams = { t1: makeTeam({ teammateIds: ['lead-1', 'tm-1', 'tm-2'], messageIds: ['msg1'] }) };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker(), 'tm-2': tm2 };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'pending', priority: 'normal', assignedTo: 'tm-1', dependencies: [] },
    };
    mockMessages = {
      msg1: { id: 'msg1', teamId: 't1', senderId: 'tm-1', recipientId: 'tm-2', type: 'direct', content: 'Hey', timestamp: new Date() },
    };

    render(<AgentTeamGraph teamId="t1" />);
    // 3 nodes (lead + 2 workers), 2 lead→worker edges + 1 message edge = 3 edges
    expect(screen.getAllByText('3 nodes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3 edges').length).toBeGreaterThanOrEqual(1);
  });
});
