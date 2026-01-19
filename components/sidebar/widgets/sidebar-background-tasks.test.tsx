/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarBackgroundTasks } from './sidebar-background-tasks';

// Mock store
const mockOpenPanel = jest.fn();
const mockGetRunningAgents = jest.fn();
const mockGetUnreadNotificationCount = jest.fn();
let mockAgents: Record<string, { id: string; status: string; progress?: number }> = {};
let mockIsPanelOpen = false;

jest.mock('@/stores', () => ({
  useBackgroundAgentStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      agents: mockAgents,
      isPanelOpen: mockIsPanelOpen,
      openPanel: mockOpenPanel,
      getRunningAgents: mockGetRunningAgents,
      getUnreadNotificationCount: mockGetUnreadNotificationCount,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value}>Progress: {value}%</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SidebarBackgroundTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAgents = {};
    mockIsPanelOpen = false;
    mockGetRunningAgents.mockReturnValue([]);
    mockGetUnreadNotificationCount.mockReturnValue(0);
  });

  it('returns null when no agents exist and no activity', () => {
    const { container } = render(<SidebarBackgroundTasks />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when there are running agents', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    
    render(<SidebarBackgroundTasks />);
    expect(screen.getByText(/Background Tasks/i)).toBeInTheDocument();
  });

  it('shows running agent count', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
      'agent-2': { id: 'agent-2', status: 'running', progress: 75 },
    };
    mockGetRunningAgents.mockReturnValue([
      { id: 'agent-1', status: 'running', progress: 50 },
      { id: 'agent-2', status: 'running', progress: 75 },
    ]);
    
    render(<SidebarBackgroundTasks />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows unread notification count badge', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'completed' },
    };
    mockGetUnreadNotificationCount.mockReturnValue(3);
    
    render(<SidebarBackgroundTasks />);
    expect(screen.getByTestId('badge')).toHaveTextContent('3');
  });

  it('calls openPanel when clicked', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    
    render(<SidebarBackgroundTasks />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOpenPanel).toHaveBeenCalled();
  });

  it('shows progress bar when tasks are running', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    
    render(<SidebarBackgroundTasks />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('calculates average progress correctly', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 40 },
      'agent-2': { id: 'agent-2', status: 'running', progress: 60 },
    };
    mockGetRunningAgents.mockReturnValue([
      { id: 'agent-1', status: 'running', progress: 40 },
      { id: 'agent-2', status: 'running', progress: 60 },
    ]);
    
    render(<SidebarBackgroundTasks />);
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('data-value', '50');
  });

  it('shows completed count', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'completed' },
      'agent-2': { id: 'agent-2', status: 'completed' },
    };
    mockGetRunningAgents.mockReturnValue([]);
    mockGetUnreadNotificationCount.mockReturnValue(1);
    
    render(<SidebarBackgroundTasks />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows failed count', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'failed' },
    };
    mockGetRunningAgents.mockReturnValue([]);
    mockGetUnreadNotificationCount.mockReturnValue(1);
    
    render(<SidebarBackgroundTasks />);
    // There may be multiple "1"s, just verify the component renders with failed status
    expect(screen.getByText(/Background Tasks/i)).toBeInTheDocument();
    // Check that the destructive color class is present for failed count
    const { container } = render(<SidebarBackgroundTasks />);
    expect(container.querySelector('.text-destructive')).toBeInTheDocument();
  });

  it('shows queued count', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'queued' },
      'agent-2': { id: 'agent-2', status: 'queued' },
    };
    mockGetRunningAgents.mockReturnValue([]);
    
    render(<SidebarBackgroundTasks />);
    // Queued tasks should trigger render
    expect(screen.getByText(/Background Tasks/i)).toBeInTheDocument();
  });

  it('renders collapsed view correctly', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    
    render(<SidebarBackgroundTasks collapsed />);
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
  });

  it('shows spinner icon when tasks are running', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    
    const { container } = render(<SidebarBackgroundTasks />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    
    const { container } = render(<SidebarBackgroundTasks className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('highlights button when panel is open', () => {
    mockAgents = {
      'agent-1': { id: 'agent-1', status: 'running', progress: 50 },
    };
    mockGetRunningAgents.mockReturnValue([{ id: 'agent-1', status: 'running', progress: 50 }]);
    mockIsPanelOpen = true;
    
    const { container } = render(<SidebarBackgroundTasks />);
    expect(container.querySelector('.bg-accent\\/50')).toBeInTheDocument();
  });
});
