/**
 * AgentTeamTimeline component tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock store data
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};
let mockTasks: Record<string, unknown> = {};
let mockMessages: Record<string, unknown> = {};
let mockEvents: unknown[] = [];

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      teammates: mockTeammates,
      tasks: mockTasks,
      messages: mockMessages,
      events: mockEvents,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'timeline.title': 'Execution Timeline',
      'timeline.executing': 'Executing',
      'timeline.completed': 'Completed',
      'timeline.failed': 'Failed',
      'timeline.planning': 'Planning',
    };
    return translations[key] || key;
  },
}));

import { AgentTeamTimeline } from './agent-team-timeline';

// Shared mock data builders
const now = new Date('2025-06-01T12:00:00Z');
const earlier = new Date('2025-06-01T11:59:00Z');
const later = new Date('2025-06-01T12:01:00Z');

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    name: 'Test Team',
    leadId: 'lead-1',
    teammateIds: ['lead-1', 'tm-1'],
    taskIds: ['task1'],
    messageIds: ['msg1'],
    status: 'completed',
    config: {},
    createdAt: earlier,
    startedAt: earlier,
    completedAt: later,
    totalDuration: 60000,
    ...overrides,
  };
}

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    teamId: 't1',
    name: 'Lead Agent',
    role: 'lead',
    status: 'completed',
    config: {},
    tokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    progress: 0,
    createdAt: earlier,
    ...overrides,
  };
}

function makeWorker(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tm-1',
    teamId: 't1',
    name: 'Worker',
    role: 'worker',
    status: 'completed',
    config: {},
    tokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    progress: 0,
    createdAt: now,
    ...overrides,
  };
}

describe('AgentTeamTimeline', () => {
  beforeEach(() => {
    mockTeams = {};
    mockTeammates = {};
    mockTasks = {};
    mockMessages = {};
    mockEvents = [];
  });

  it('should return null when team does not exist', () => {
    const { container } = render(<AgentTeamTimeline teamId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the timeline header', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'Task 1', status: 'completed', priority: 'normal', assignedTo: 'tm-1', dependencies: [], createdAt: earlier, startedAt: earlier, completedAt: later },
    };
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    expect(screen.getByText('Execution Timeline')).toBeInTheDocument();
  });

  it('should render teammate rows sorted with lead first', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: { id: 'task1', title: 'T1', status: 'completed', priority: 'normal', assignedTo: 'tm-1', dependencies: [], createdAt: earlier, startedAt: earlier, completedAt: later },
    };
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    expect(screen.getByText('Lead Agent')).toBeInTheDocument();
    expect(screen.getByText('Worker')).toBeInTheDocument();
  });

  it('should display duration badge when team has totalDuration', () => {
    mockTeams = { t1: makeTeam({ totalDuration: 120000 }) };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {};
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    // 120000ms = 2.0m — may appear in multiple places
    expect(screen.getAllByText('2.0m').length).toBeGreaterThanOrEqual(1);
  });

  it('should show time axis labels', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {};
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    // The time axis should show "0ms" for the start
    expect(screen.getByText('0ms')).toBeInTheDocument();
  });

  it('should render legend items', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead() };
    mockTasks = {};
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    // Legend labels may also match teammate status badges, so use getAllByText
    expect(screen.getAllByText('Executing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Planning').length).toBeGreaterThanOrEqual(1);
  });

  it('should display task title in task bar', () => {
    mockTeams = { t1: makeTeam() };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker() };
    mockTasks = {
      task1: {
        id: 'task1',
        title: 'Important Task',
        status: 'completed',
        priority: 'normal',
        assignedTo: 'tm-1',
        claimedBy: null,
        dependencies: [],
        createdAt: earlier,
        startedAt: earlier,
        completedAt: later,
        actualDuration: 60000,
      },
    };
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    // Title appears in both bar label and tooltip, so use getAllByText
    expect(screen.getAllByText('Important Task').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle team with no startedAt gracefully', () => {
    mockTeams = { t1: makeTeam({ startedAt: undefined, completedAt: undefined, totalDuration: undefined }) };
    mockTeammates = { 'lead-1': makeLead() };
    mockTasks = {};
    mockMessages = {};

    const { container } = render(<AgentTeamTimeline teamId="t1" />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('Execution Timeline')).toBeInTheDocument();
  });

  it('should handle multiple teammates with multiple tasks', () => {
    const tm2 = { ...makeWorker(), id: 'tm-2', name: 'Worker 2' };
    mockTeams = { t1: makeTeam({ teammateIds: ['lead-1', 'tm-1', 'tm-2'], taskIds: ['task1', 'task2'] }) };
    mockTeammates = { 'lead-1': makeLead(), 'tm-1': makeWorker(), 'tm-2': tm2 };
    mockTasks = {
      task1: { id: 'task1', title: 'Task A', status: 'completed', priority: 'normal', assignedTo: 'tm-1', dependencies: [], createdAt: earlier, startedAt: earlier, completedAt: later },
      task2: { id: 'task2', title: 'Task B', status: 'in_progress', priority: 'high', assignedTo: 'tm-2', dependencies: [], createdAt: now, startedAt: now },
    };
    mockMessages = {};

    render(<AgentTeamTimeline teamId="t1" />);
    expect(screen.getByText('Lead Agent')).toBeInTheDocument();
    expect(screen.getByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('Worker 2')).toBeInTheDocument();
    // Task titles appear in both bar label and tooltip
    expect(screen.getAllByText('Task A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Task B').length).toBeGreaterThanOrEqual(1);
  });
});
