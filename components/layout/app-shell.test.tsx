/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from './app-shell';

// Mock useNetworkStatus hook to prevent act() warnings from async state updates
jest.mock('@/hooks/network/use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'wifi',
  }),
  __esModule: true,
  default: () => ({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'wifi',
  }),
}));

// Mock stores
const mockSetSidebarCollapsed = jest.fn();

jest.mock('@/stores', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = { sidebarOpen: true };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sidebarCollapsed: false,
      setSidebarCollapsed: mockSetSidebarCollapsed,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AppShell>Content</AppShell>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders children in main area', () => {
    render(<AppShell><div data-testid="main-content">Main Content</div></AppShell>);
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders sidebar when provided', () => {
    render(
      <AppShell sidebar={<div data-testid="sidebar">Sidebar</div>}>
        Content
      </AppShell>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('does not render sidebar when not provided', () => {
    const { container } = render(<AppShell>Content</AppShell>);
    const aside = container.querySelector('aside');
    expect(aside).toBeNull();
  });

  it('renders collapse toggle button when sidebar is open', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>Content</AppShell>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls setSidebarCollapsed when collapse button is clicked', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>Content</AppShell>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetSidebarCollapsed).toHaveBeenCalledWith(true);
  });
});
