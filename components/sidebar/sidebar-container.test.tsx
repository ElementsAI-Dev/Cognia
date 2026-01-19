/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarContainer } from './sidebar-container';

// Mock stores
const mockCreateSession = jest.fn();
const mockSetTheme = jest.fn();
const mockOpenModal = jest.fn();
let currentTheme = 'light';

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [],
      createSession: mockCreateSession,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: currentTheme,
      setTheme: mockSetTheme,
    };
    return selector(state);
  },
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      openModal: mockOpenModal,
    };
    return selector(state);
  },
}));

// Mock child components
jest.mock('./sessions/session-search', () => ({
  SessionSearch: ({ collapsed }: { collapsed?: boolean }) => (
    <div data-testid="session-search" data-collapsed={collapsed}>Search</div>
  ),
}));

jest.mock('./sessions/session-group', () => ({
  SessionGroup: ({ collapsed }: { collapsed?: boolean }) => (
    <div data-testid="session-group" data-collapsed={collapsed}>Group</div>
  ),
  useSessionGroups: () => ({ pinned: [], today: [], yesterday: [], lastWeek: [], older: [], custom: [] }),
}));

jest.mock('./widgets/sidebar-quick-actions', () => ({
  SidebarQuickActions: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

jest.mock('./widgets/sidebar-usage-stats', () => ({
  SidebarUsageStats: () => <div data-testid="usage-stats">Usage Stats</div>,
}));

jest.mock('./widgets/sidebar-background-tasks', () => ({
  SidebarBackgroundTasks: () => <div data-testid="background-tasks">Background Tasks</div>,
}));

jest.mock('./widgets/sidebar-workflows', () => ({
  SidebarWorkflows: () => <div data-testid="workflows">Workflows</div>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SidebarContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentTheme = 'light';
  });

  it('renders without crashing', () => {
    render(<SidebarContainer />);
    expect(screen.getByText('Cognia')).toBeInTheDocument();
  });

  it('displays app name when not collapsed', () => {
    render(<SidebarContainer />);
    expect(screen.getByText('Cognia')).toBeInTheDocument();
  });

  it('hides app name when collapsed', () => {
    render(<SidebarContainer collapsed />);
    expect(screen.queryByText('Cognia')).not.toBeInTheDocument();
  });

  it('displays new chat button', () => {
    render(<SidebarContainer />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('calls createSession when new chat button is clicked', () => {
    render(<SidebarContainer />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it('renders session search', () => {
    render(<SidebarContainer />);
    expect(screen.getByTestId('session-search')).toBeInTheDocument();
  });

  it('passes collapsed prop to session search', () => {
    render(<SidebarContainer collapsed />);
    const sessionSearch = screen.getByTestId('session-search');
    expect(sessionSearch).toHaveAttribute('data-collapsed', 'true');
  });

  it('renders theme toggle button', () => {
    render(<SidebarContainer />);
    const tooltipContents = screen.getAllByTestId('tooltip-content');
    const themeTooltip = tooltipContents.find(el => el.textContent?.includes('Theme:'));
    expect(themeTooltip).toBeInTheDocument();
  });

  it('cycles theme from light to dark', () => {
    currentTheme = 'light';
    render(<SidebarContainer />);
    
    const buttons = screen.getAllByRole('button');
    // Find theme button by looking for the one that triggers setTheme
    // It's the first button in the footer (after New Chat button)
    const themeButton = buttons[1];
    
    if (themeButton) {
      fireEvent.click(themeButton);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    }
  });

  it('cycles theme from dark to system', () => {
    currentTheme = 'dark';
    render(<SidebarContainer />);
    
    const buttons = screen.getAllByRole('button');
    const themeButton = buttons[1];
    if (themeButton) {
      fireEvent.click(themeButton);
      expect(mockSetTheme).toHaveBeenCalledWith('system');
    }
  });

  it('cycles theme from system to light', () => {
    currentTheme = 'system';
    render(<SidebarContainer />);
    
    const buttons = screen.getAllByRole('button');
    const themeButton = buttons[1];
    if (themeButton) {
      fireEvent.click(themeButton);
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    }
  });

  it('renders settings button', () => {
    render(<SidebarContainer />);
    const tooltipContents = screen.getAllByTestId('tooltip-content');
    const settingsTooltip = tooltipContents.find(el => el.textContent === 'Settings');
    expect(settingsTooltip).toBeInTheDocument();
  });

  it('opens settings modal when settings button is clicked', () => {
    render(<SidebarContainer />);
    
    const buttons = screen.getAllByRole('button');
    const settingsButton = buttons[buttons.length - 1];
    fireEvent.click(settingsButton);
    
    expect(mockOpenModal).toHaveBeenCalledWith('settings');
  });

  it('renders separators', () => {
    render(<SidebarContainer />);
    const separators = screen.getAllByTestId('separator');
    expect(separators.length).toBeGreaterThanOrEqual(2);
  });

  it('renders scroll area for session list', () => {
    render(<SidebarContainer />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });
});
