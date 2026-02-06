/**
 * AgentTeamIndicator component tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock store - default: no active teams
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      teammates: mockTeammates,
    };
    return selector(state);
  },
}));

jest.mock('@/types/agent/agent-team', () => ({
  TEAM_STATUS_CONFIG: {
    idle: { label: 'Idle', color: 'text-muted-foreground', icon: 'Circle' },
    planning: { label: 'Planning', color: 'text-blue-500', icon: 'Brain' },
    executing: { label: 'Executing', color: 'text-primary', icon: 'Play' },
    paused: { label: 'Paused', color: 'text-yellow-500', icon: 'Pause' },
    completed: { label: 'Completed', color: 'text-green-500', icon: 'CheckCircle' },
    failed: { label: 'Failed', color: 'text-destructive', icon: 'XCircle' },
    cancelled: { label: 'Cancelled', color: 'text-orange-500', icon: 'Ban' },
  },
}));

import { AgentTeamIndicator } from './agent-team-indicator';

describe('AgentTeamIndicator', () => {
  beforeEach(() => {
    mockTeams = {};
    mockTeammates = {};
  });

  it('should not render when no active teams', () => {
    const { container } = render(<AgentTeamIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when only completed teams exist', () => {
    mockTeams = {
      't1': { id: 't1', name: 'Team 1', status: 'completed', teammateIds: [] },
    };
    const { container } = render(<AgentTeamIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when active teams exist', () => {
    mockTeams = {
      't1': { id: 't1', name: 'Active Team', status: 'executing', teammateIds: ['tm1'] },
    };
    mockTeammates = {
      'tm1': { id: 'tm1', progress: 50 },
    };
    const { container } = render(<AgentTeamIndicator />);
    expect(container.firstChild).not.toBeNull();
  });

  it('should show team count in compact mode', () => {
    mockTeams = {
      't1': { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
      't2': { id: 't2', name: 'Team B', status: 'planning', teammateIds: [] },
    };
    render(<AgentTeamIndicator compact />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show team count in normal mode', () => {
    mockTeams = {
      't1': { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
    };
    render(<AgentTeamIndicator />);
    expect(screen.getByText('1 Team')).toBeInTheDocument();
  });

  it('should pluralize teams correctly', () => {
    mockTeams = {
      't1': { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
      't2': { id: 't2', name: 'Team B', status: 'paused', teammateIds: [] },
    };
    render(<AgentTeamIndicator />);
    expect(screen.getByText('2 Teams')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    mockTeams = {
      't1': { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
    };
    const mockOnClick = jest.fn();
    render(<AgentTeamIndicator onClick={mockOnClick} />);
    const button = screen.getByRole('button');
    button.click();
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
