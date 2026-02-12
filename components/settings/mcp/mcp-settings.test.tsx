/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { McpSettings } from './mcp-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'MCP Servers',
      description: 'Manage your MCP servers',
      myServers: 'My Servers',
      marketplace: 'Marketplace',
      health: 'Health',
      tools: 'Tools',
      resources: 'Resources',
      logs: 'Logs',
      addServer: 'Add Server',
      installServer: 'Quick Install',
      noServers: 'No MCP Servers',
      logsTitle: 'Server Logs',
      logsDescription: 'View server logs',
      serverLogs: 'Logs',
    };
    return translations[key] || key;
  },
}));

// Mock MCP store
const mockInitialize = jest.fn();
const mockLoadServers = jest.fn();
const mockConnectServer = jest.fn();
const mockDisconnectServer = jest.fn();
const mockRemoveServer = jest.fn();
const mockUpdateServer = jest.fn();
const mockClearError = jest.fn();
const mockClearLogs = jest.fn();

jest.mock('@/stores/mcp', () => ({
  useMcpStore: () => ({
    servers: [],
    logs: [],
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
    clearLogs: mockClearLogs,
    pingServer: jest.fn(),
    testConnection: jest.fn(),
    exportConfig: jest.fn(() => '{}'),
    importConfig: jest.fn(),
  }),
}));

// Mock hooks/mcp barrel
jest.mock('@/hooks/mcp', () => ({
  useMcpServerActions: () => ({
    handleConnect: jest.fn(),
    handleDisconnect: jest.fn(),
    handleRemove: jest.fn(),
    confirmRemove: jest.fn(),
    cancelRemove: jest.fn(),
    handleToggleEnabled: jest.fn(),
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

jest.mock('./mcp-marketplace', () => ({
  McpMarketplace: () => <div data-testid="mcp-marketplace" />,
}));

jest.mock('./components', () => ({
  ServerCard: () => <div data-testid="server-card" />,
  ServerCardSkeleton: () => <div data-testid="server-card-skeleton" />,
}));

// Mock new MCP components
jest.mock('@/components/mcp/mcp-log-viewer', () => ({
  MCPLogViewer: () => <div data-testid="mcp-log-viewer" />,
}));

jest.mock('@/components/mcp/mcp-server-health', () => ({
  MCPServerHealth: () => <div data-testid="mcp-server-health" />,
}));

jest.mock('@/components/mcp/mcp-tool-usage-stats', () => ({
  MCPToolUsageStats: () => <div data-testid="mcp-tool-usage-stats" />,
}));

jest.mock('@/components/mcp/mcp-tool-selection-config', () => ({
  MCPToolSelectionConfig: () => <div data-testid="mcp-tool-selection-config" />,
}));

jest.mock('@/components/mcp/mcp-active-calls', () => ({
  MCPActiveCalls: () => <div data-testid="mcp-active-calls" />,
}));

jest.mock('@/components/mcp/mcp-resource-browser', () => ({
  MCPResourceBrowser: () => <div data-testid="mcp-resource-browser" />,
}));

jest.mock('@/components/mcp/mcp-prompts-panel', () => ({
  McpPromptsPanel: () => <div data-testid="mcp-prompts-panel" />,
}));

jest.mock('@/components/mcp/mcp-error-display', () => ({
  MCPErrorDisplay: ({ error, onDismiss }: { error: string; onDismiss?: () => void }) => (
    <div data-testid="mcp-error-display">
      <span>{error}</span>
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
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

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('McpSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<McpSettings />);
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
  });

  it('renders tabs with correct structure', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
  });

  it('renders all 6 tab triggers', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('tab-trigger-servers')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-marketplace')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-health')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-resources')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-logs')).toBeInTheDocument();
  });

  it('renders Health tab with MCPServerHealth', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-server-health')).toBeInTheDocument();
  });

  it('renders Tools tab with MCPToolSelectionConfig and MCPToolUsageStats', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-tool-selection-config')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-tool-usage-stats')).toBeInTheDocument();
  });

  it('renders Resources tab with MCPResourceBrowser', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-resource-browser')).toBeInTheDocument();
  });

  it('renders Logs tab with MCPActiveCalls and MCPLogViewer', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-active-calls')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-log-viewer')).toBeInTheDocument();
  });

  it('renders Marketplace tab', () => {
    render(<McpSettings />);
    expect(screen.getByTestId('mcp-marketplace')).toBeInTheDocument();
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
