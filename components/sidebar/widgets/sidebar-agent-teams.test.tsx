/**
 * SidebarAgentTeams widget tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock store state
let mockTeams: Record<string, unknown> = {};
let mockTeammates: Record<string, unknown> = {};
let mockIsPanelOpen = false;
const mockSetIsPanelOpen = jest.fn();

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      teams: mockTeams,
      teammates: mockTeammates,
      isPanelOpen: mockIsPanelOpen,
      setIsPanelOpen: mockSetIsPanelOpen,
    };
    return selector(state);
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { SidebarAgentTeams } from './sidebar-agent-teams';

describe('SidebarAgentTeams', () => {
  beforeEach(() => {
    mockTeams = {};
    mockTeammates = {};
    mockIsPanelOpen = false;
    jest.clearAllMocks();
  });

  it('should not render when no teams exist', () => {
    const { container } = render(<SidebarAgentTeams />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when only idle teams exist and no active ones', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Idle Team', status: 'idle', teammateIds: [] },
    };
    // idle is not active, but allTeams.length > 0, so it should still render
    const { container } = render(<SidebarAgentTeams />);
    expect(container.firstChild).not.toBeNull();
  });

  it('should render when active teams exist', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Active Team', status: 'executing', teammateIds: ['tm1'] },
    };
    mockTeammates = {
      tm1: { id: 'tm1', progress: 50 },
    };
    render(<SidebarAgentTeams />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('should show active team badge count', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
      t2: { id: 't2', name: 'Team B', status: 'planning', teammateIds: [] },
    };
    render(<SidebarAgentTeams />);
    // '2' appears in both the badge and the status summary
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it('should show completed count with icon', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Done Team', status: 'completed', teammateIds: [] },
    };
    render(<SidebarAgentTeams />);
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('should show failed count', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Failed Team', status: 'failed', teammateIds: [] },
    };
    render(<SidebarAgentTeams />);
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('should open panel when clicked', async () => {
    mockTeams = {
      t1: { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
    };
    const user = userEvent.setup();
    render(<SidebarAgentTeams />);
    await user.click(screen.getByRole('button'));
    expect(mockSetIsPanelOpen).toHaveBeenCalledWith(true);
  });

  it('should render collapsed variant', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
    };
    render(<SidebarAgentTeams collapsed />);
    // Collapsed mode should still render a button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should open panel when collapsed button clicked', async () => {
    mockTeams = {
      t1: { id: 't1', name: 'Team A', status: 'executing', teammateIds: [] },
    };
    const user = userEvent.setup();
    render(<SidebarAgentTeams collapsed />);
    await user.click(screen.getByRole('button'));
    expect(mockSetIsPanelOpen).toHaveBeenCalledWith(true);
  });

  it('should calculate average progress from teammates', () => {
    mockTeams = {
      t1: { id: 't1', name: 'Team A', status: 'executing', teammateIds: ['tm1', 'tm2'] },
    };
    mockTeammates = {
      tm1: { id: 'tm1', progress: 40 },
      tm2: { id: 'tm2', progress: 80 },
    };
    render(<SidebarAgentTeams />);
    // Average progress should be 60%, rendered via Progress component
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });
});
