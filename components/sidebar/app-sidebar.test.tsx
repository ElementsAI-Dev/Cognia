/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from './app-sidebar';

// Mock stores
const mockCreateSession = jest.fn();
const mockSetTheme = jest.fn();

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [
        { id: 'session-1', title: 'Test Session 1' },
        { id: 'session-2', title: 'Test Session 2' },
      ],
      activeSessionId: 'session-1',
      createSession: mockCreateSession,
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
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-header">{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
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
    fireEvent.click(screen.getByText('New Chat'));
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it('renders session list', () => {
    render(<AppSidebar />);
    expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    expect(screen.getByText('Test Session 2')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<AppSidebar />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('renders settings link', () => {
    render(<AppSidebar />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts dialog', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('keyboard-shortcuts-dialog')).toBeInTheDocument();
  });
});
