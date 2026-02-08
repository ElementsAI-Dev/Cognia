/**
 * AgentTeamActivityFeed component tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock store data
let mockTeammates: Record<string, unknown> = {};
let mockTasks: Record<string, unknown> = {};
let mockEvents: unknown[] = [];

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teammates: mockTeammates,
      tasks: mockTasks,
      events: mockEvents,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'activityFeed.title': 'Activity',
      'activityFeed.filter': 'Filter',
      'activityFeed.noEvents': 'No events yet',
    };
    return translations[key] || key;
  },
}));

import { AgentTeamActivityFeed } from './agent-team-activity-feed';

// Helper to create events
function makeEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    teamId: 't1',
    timestamp: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  };
}

describe('AgentTeamActivityFeed', () => {
  beforeEach(() => {
    mockTeammates = {};
    mockTasks = {};
    mockEvents = [];
  });

  it('should render empty state when no events', () => {
    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('should render header with title and count', () => {
    mockEvents = [
      makeEvent('team_started'),
      makeEvent('task_created', { timestamp: new Date('2025-06-01T12:01:00Z') }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display event labels for known event types', () => {
    mockEvents = [
      makeEvent('team_started'),
      makeEvent('team_completed', { timestamp: new Date('2025-06-01T12:01:00Z') }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText('Team Started')).toBeInTheDocument();
    expect(screen.getByText('Team Completed')).toBeInTheDocument();
  });

  it('should display teammate name badge when event has teammateId', () => {
    mockTeammates = {
      'tm-1': { name: 'Security Expert' },
    };
    mockEvents = [
      makeEvent('teammate_started', { teammateId: 'tm-1' }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText('Teammate Started')).toBeInTheDocument();
    expect(screen.getByText('Security Expert')).toBeInTheDocument();
  });

  it('should display task title badge when event has taskId', () => {
    mockTasks = {
      'task-1': { title: 'Review Code' },
    };
    mockEvents = [
      makeEvent('task_completed', { taskId: 'task-1' }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText('Task Completed')).toBeInTheDocument();
    expect(screen.getByText('Review Code')).toBeInTheDocument();
  });

  it('should render filter button', () => {
    mockEvents = [
      makeEvent('team_started'),
      makeEvent('task_created', { timestamp: new Date('2025-06-01T12:01:00Z') }),
      makeEvent('plan_submitted', { timestamp: new Date('2025-06-01T12:02:00Z') }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);

    // All 3 should be visible initially
    expect(screen.getByText('3')).toBeInTheDocument();

    // Filter button should be present
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('should only show events for the given teamId', () => {
    mockEvents = [
      makeEvent('team_started', { teamId: 't1' }),
      makeEvent('team_started', { teamId: 't2', timestamp: new Date('2025-06-01T12:01:00Z') }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    // Only 1 event for t1
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should sort events chronologically', () => {
    mockEvents = [
      makeEvent('task_completed', { timestamp: new Date('2025-06-01T12:05:00Z') }),
      makeEvent('team_started', { timestamp: new Date('2025-06-01T12:00:00Z') }),
      makeEvent('task_created', { timestamp: new Date('2025-06-01T12:02:00Z') }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    const labels = screen.getAllByText(/Team Started|Task Created|Task Completed/);
    expect(labels[0]).toHaveTextContent('Team Started');
    expect(labels[1]).toHaveTextContent('Task Created');
    expect(labels[2]).toHaveTextContent('Task Completed');
  });

  it('should display timestamp for each event', () => {
    mockEvents = [
      makeEvent('team_started', { timestamp: new Date('2025-06-01T14:30:15Z') }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    // Time display depends on local timezone. We check for the time format pattern.
    const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle all known event types', () => {
    const eventTypes = [
      'team_started', 'team_completed', 'team_failed', 'team_cancelled',
      'teammate_started', 'teammate_completed', 'teammate_failed',
      'task_created', 'task_started', 'task_completed', 'task_failed', 'task_retried',
      'plan_submitted', 'plan_approved', 'plan_rejected',
      'budget_exceeded', 'deadlock_resolved',
    ];

    mockEvents = eventTypes.map((type, i) =>
      makeEvent(type, { timestamp: new Date(`2025-06-01T12:${String(i).padStart(2, '0')}:00Z`) })
    );

    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText(String(eventTypes.length))).toBeInTheDocument();
  });

  it('should show both teammate and task badges when both present', () => {
    mockTeammates = { 'tm-1': { name: 'Alice' } };
    mockTasks = { 'task-1': { title: 'Build API' } };
    mockEvents = [
      makeEvent('task_completed', { teammateId: 'tm-1', taskId: 'task-1' }),
    ];

    render(<AgentTeamActivityFeed teamId="t1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Build API')).toBeInTheDocument();
  });
});
