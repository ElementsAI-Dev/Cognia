/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock stores
jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [],
      activeSessionId: null,
      createSession: jest.fn(),
      setActiveSession: jest.fn(),
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {},
      sidebarOpen: true,
    };
    return selector(state);
  },
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      messages: [],
      isLoading: false,
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
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      presets: [],
      activePreset: null,
    };
    return selector(state);
  },
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sidebarOpen: true,
    };
    return selector(state);
  },
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      panelOpen: false,
    };
    return selector(state);
  },
  useNativeStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isDesktop: false,
      isWindows: false,
      isMac: false,
      isLinux: false,
    };
    return selector(state);
  },
  useAgentStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isExecuting: false,
    };
    return selector(state);
  },
}));

// Mock UI components that use context
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  ),
  Sidebar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button>Toggle</button>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  useSidebar: () => ({ open: true, setOpen: jest.fn() }),
}));

jest.mock('@/components/sidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar">Sidebar</div>,
}));

jest.mock('@/components/chat', () => ({
  ChatContainer: () => <div data-testid="chat-container">Chat</div>,
}));

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument();
  });

  it('renders the sidebar', () => {
    render(<Home />);
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });

  it('renders the chat container', () => {
    render(<Home />);
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });

  it('renders the sidebar inset', () => {
    render(<Home />);
    expect(screen.getByTestId('sidebar-inset')).toBeInTheDocument();
  });

  it('has correct component hierarchy', () => {
    const { container } = render(<Home />);
    const sidebarProvider = container.querySelector('[data-testid="sidebar-provider"]');
    expect(sidebarProvider).toBeInTheDocument();
    expect(sidebarProvider).toContainElement(screen.getByTestId('app-sidebar'));
    expect(sidebarProvider).toContainElement(screen.getByTestId('sidebar-inset'));
  });
});
