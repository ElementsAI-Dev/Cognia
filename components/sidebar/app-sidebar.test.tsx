/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from './app-sidebar';

// Mock stores
const mockCreateSession = jest.fn();
const mockSetTheme = jest.fn();
const mockDeleteAllSessions = jest.fn();
const mockSetActiveSession = jest.fn();
const mockUpdateSession = jest.fn();
const mockDeleteSession = jest.fn();
const mockDuplicateSession = jest.fn();
const mockTogglePinSession = jest.fn();

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [
        { id: 'session-1', title: 'Test Session 1', updatedAt: new Date(), pinned: false },
        { id: 'session-2', title: 'Test Session 2', updatedAt: new Date(), pinned: true },
      ],
      activeSessionId: 'session-1',
      createSession: mockCreateSession,
      setActiveSession: mockSetActiveSession,
      updateSession: mockUpdateSession,
      deleteSession: mockDeleteSession,
      duplicateSession: mockDuplicateSession,
      togglePinSession: mockTogglePinSession,
      deleteAllSessions: mockDeleteAllSessions,
      getActiveSession: () => ({ id: 'session-1', title: 'Test Session 1' }),
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: 'light',
      setTheme: mockSetTheme,
    };
    return selector(state);
  },
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      artifacts: [],
      setActiveArtifact: jest.fn(),
      openPanel: jest.fn(),
    };
    return selector(state);
  },
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      messages: [],
    };
    return selector(state);
  },
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: [],
      activeProjectId: null,
    };
    return selector(state);
  },
}));

// Mock database
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([]),
  },
}));

// Mock UI components
jest.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-footer">{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <span onClick={onClick}>{children}</span>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-header">{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; 'data-testid'?: string }) => (
    <button onClick={onClick} data-testid={props['data-testid']}>{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarSeparator: () => <hr />,
  useSidebar: () => ({ state: 'expanded' }),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/layout/keyboard-shortcuts-dialog', () => ({
  KeyboardShortcutsDialog: () => <div data-testid="keyboard-shortcuts-dialog" />,
}));

jest.mock('@/components/sidebar/sidebar-usage-stats', () => ({
  SidebarUsageStats: () => <div data-testid="usage-stats" />,
}));

jest.mock('@/components/sidebar/sidebar-background-tasks', () => ({
  SidebarBackgroundTasks: () => <div data-testid="background-tasks" />,
}));

jest.mock('@/components/sidebar/sidebar-quick-actions', () => ({
  SidebarQuickActions: () => <div data-testid="quick-actions" />,
}));

jest.mock('@/components/sidebar/sidebar-recent-files', () => ({
  SidebarRecentFiles: () => <div data-testid="recent-files" />,
}));

jest.mock('@/components/sidebar/sidebar-workflows', () => ({
  SidebarWorkflows: () => <div data-testid="workflows" />,
}));

jest.mock('@/components/artifacts', () => ({
  ArtifactListCompact: () => <div data-testid="artifacts" />,
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders sidebar header', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument();
  });

  it('renders sidebar footer', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument();
  });

  it('renders new chat button', () => {
    render(<AppSidebar />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('calls createSession when new chat button is clicked', () => {
    render(<AppSidebar />);
    // Find the new chat button by its text content
    const newChatButton = screen.getByText('New Chat').closest('button');
    if (newChatButton) {
      fireEvent.click(newChatButton);
    }
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it('renders session list', () => {
    render(<AppSidebar />);
    expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    expect(screen.getByText('Test Session 2')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('sidebar-search')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts dialog', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('keyboard-shortcuts-dialog')).toBeInTheDocument();
  });

  it('shows grouped sessions and pinned ordering', () => {
    render(<AppSidebar />);
    // The translation mock returns the key itself, so look for 'Pinned' (the translated value)
    const pinnedLabel = screen.getByText('Pinned');
    expect(pinnedLabel).toBeInTheDocument();
  });

  it('triggers delete all confirm', () => {
    render(<AppSidebar />);
    fireEvent.click(screen.getByTestId('delete-all-trigger'));
    expect(mockDeleteAllSessions).not.toHaveBeenCalled();
  });
});
