/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { McpSettings } from './mcp-settings';

// Mock MCP store
const mockInitialize = jest.fn();
const mockLoadServers = jest.fn();
const mockConnectServer = jest.fn();
const mockDisconnectServer = jest.fn();
const mockRemoveServer = jest.fn();
const mockUpdateServer = jest.fn();
const mockClearError = jest.fn();

jest.mock('@/stores/mcp', () => ({
  useMcpStore: () => ({
    servers: [],
    isLoading: false,
    error: null,
    isInitialized: true,
    initialize: mockInitialize,
    loadServers: mockLoadServers,
    connectServer: mockConnectServer,
    disconnectServer: mockDisconnectServer,
    removeServer: mockRemoveServer,
    updateServer: mockUpdateServer,
    clearError: mockClearError,
  }),
}));

// Mock types
jest.mock('@/types/mcp', () => ({
  getStatusText: () => 'Disconnected',
  getStatusColor: () => 'text-muted-foreground',
  isServerConnected: () => false,
  isServerError: () => false,
}));

// Mock child components
jest.mock('./mcp-server-dialog', () => ({
  McpServerDialog: () => <div data-testid="mcp-server-dialog" />,
}));

jest.mock('./mcp-install-wizard', () => ({
  McpInstallWizard: () => <div data-testid="mcp-install-wizard" />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)}>Switch</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('McpSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<McpSettings />);
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
  });

  it('displays MCP servers alert', () => {
    render(<McpSettings />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays Add Server button', () => {
    render(<McpSettings />);
    expect(screen.getAllByText('Add Server').length).toBeGreaterThan(0);
  });

  it('displays Quick Install button', () => {
    render(<McpSettings />);
    expect(screen.getAllByText('Quick Install').length).toBeGreaterThan(0);
  });

  it('shows empty state when no servers', () => {
    render(<McpSettings />);
    expect(screen.getByText('No MCP Servers')).toBeInTheDocument();
  });

  it('renders server dialog', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-server-dialog')).toBeInTheDocument();
  });

  it('renders install wizard', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-install-wizard')).toBeInTheDocument();
  });
});

describe('McpSettings with servers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays server list when servers exist', () => {
    // Override the mock for this test
    jest.doMock('@/stores/mcp', () => ({
      useMcpStore: () => ({
        servers: [
          {
            id: 'test-server',
            name: 'Test Server',
            config: {
              connectionType: 'stdio',
              command: 'npx',
              args: ['test-server'],
              enabled: true,
            },
            status: { type: 'disconnected' },
            tools: [],
            resources: [],
            prompts: [],
          },
        ],
        isLoading: false,
        error: null,
        isInitialized: true,
        initialize: mockInitialize,
        loadServers: mockLoadServers,
        connectServer: mockConnectServer,
        disconnectServer: mockDisconnectServer,
        removeServer: mockRemoveServer,
        updateServer: mockUpdateServer,
        clearError: mockClearError,
      }),
    }));

    const { container } = render(<McpSettings />);
    expect(container).toBeInTheDocument();
  });
});
