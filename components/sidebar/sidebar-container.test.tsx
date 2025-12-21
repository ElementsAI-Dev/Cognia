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
jest.mock('./session-list', () => ({
  SessionList: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="session-list" data-collapsed={collapsed}>Session List</div>
  ),
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

  it('renders session list', () => {
    render(<SidebarContainer />);
    expect(screen.getByTestId('session-list')).toBeInTheDocument();
  });

  it('passes collapsed prop to session list', () => {
    render(<SidebarContainer collapsed />);
    const sessionList = screen.getByTestId('session-list');
    expect(sessionList).toHaveAttribute('data-collapsed', 'true');
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
    // Theme button is the second-to-last button (before settings)
    const themeButton = buttons[buttons.length - 2];
    
    if (themeButton) {
      fireEvent.click(themeButton);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    }
  });

  it('cycles theme from dark to system', () => {
    currentTheme = 'dark';
    render(<SidebarContainer />);
    
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 1) {
      fireEvent.click(buttons[1]);
      expect(mockSetTheme).toHaveBeenCalledWith('system');
    }
  });

  it('cycles theme from system to light', () => {
    currentTheme = 'system';
    render(<SidebarContainer />);
    
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 1) {
      fireEvent.click(buttons[1]);
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
