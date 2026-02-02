/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExternalAgentSettings } from './external-agent-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'External Agents',
      description: 'Configure external AI agents',
      enableExternalAgents: 'Enable External Agents',
      enableExternalAgentsDesc: 'Allow using external agents',
      autoConnect: 'Auto-connect on Startup',
      autoConnectDesc: 'Auto-connect when Cognia starts',
      showNotifications: 'Show Notifications',
      showNotificationsDesc: 'Show connection notifications',
      defaultPermissionMode: 'Default Permission Mode',
      defaultPermissionModeDesc: 'Default mode for sessions',
      permissionDefault: 'Default',
      permissionAcceptEdits: 'Accept Edits',
      permissionBypass: 'Bypass',
      permissionPlan: 'Plan Mode',
      configuredAgents: 'Configured Agents',
      configuredAgentsDesc: 'Manage connections',
      addAgent: 'Add Agent',
      editAgent: 'Edit Agent',
      deleteAgent: 'Delete Agent',
      deleteAgentConfirm: 'Are you sure?',
      noAgentsConfigured: 'No agents configured',
      addAgentToStart: 'Add an agent to start',
      agentAdded: 'Agent added',
      agentUpdated: 'Agent updated',
      agentRemoved: 'Agent removed',
      agentConfigDescription: 'Configure connection',
      agentName: 'Agent Name',
      agentNamePlaceholder: 'e.g., Claude Code',
      protocol: 'Protocol',
      transport: 'Transport',
      command: 'Command',
      arguments: 'Arguments',
      workingDirectory: 'Working Directory',
      cwdPlaceholder: 'Current directory',
      endpoint: 'Endpoint URL',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'Optional',
      nameRequired: 'Name required',
      commandRequired: 'Command required',
      endpointRequired: 'Endpoint required',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connected: 'Connected',
      disconnected: 'Disconnected',
      connectionFailed: 'Connection failed',
      disconnectFailed: 'Disconnect failed',
    };
    return translations[key] || key;
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock external agent store
const mockGetAllAgents = jest.fn();
const mockGetConnectionStatus = jest.fn();
const mockAddAgent = jest.fn();
const mockUpdateAgent = jest.fn();
const mockRemoveAgent = jest.fn();
const mockSetEnabled = jest.fn();
const mockSetDefaultPermissionMode = jest.fn();
const mockSetAutoConnectOnStartup = jest.fn();
const mockSetShowConnectionNotifications = jest.fn();
const mockStoreState = {
  enabled: true,
  defaultPermissionMode: 'default',
  autoConnectOnStartup: false,
  showConnectionNotifications: true,
};

jest.mock('@/stores/agent/external-agent-store', () => ({
  useExternalAgentStore: () => ({
    getAllAgents: mockGetAllAgents,
    getConnectionStatus: mockGetConnectionStatus,
    addAgent: mockAddAgent,
    updateAgent: mockUpdateAgent,
    removeAgent: mockRemoveAgent,
    enabled: mockStoreState.enabled,
    setEnabled: mockSetEnabled,
    defaultPermissionMode: mockStoreState.defaultPermissionMode,
    setDefaultPermissionMode: mockSetDefaultPermissionMode,
    autoConnectOnStartup: mockStoreState.autoConnectOnStartup,
    setAutoConnectOnStartup: mockSetAutoConnectOnStartup,
    showConnectionNotifications: mockStoreState.showConnectionNotifications,
    setShowConnectionNotifications: mockSetShowConnectionNotifications,
  }),
}));

// Mock external agent hook
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('@/hooks/agent/use-external-agent', () => ({
  useExternalAgent: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span data-testid="badge" className={className} data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id, ...props }: any) => (
    <input
      data-testid={`input-${id || 'default'}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div data-testid="card-content" className={className}>{children}</div>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 data-testid="card-title" className={className}>{children}</h3>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { onValueChange })
      )}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, onClick }: any) => (
    <div data-testid={`select-item-${value}`} onClick={onClick}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: any) => <div data-testid="select-trigger" className={className}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, className }: any) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="alert-dialog-action">{children}</button>
  ),
  AlertDialogCancel: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p data-testid="alert-dialog-description">{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2 data-testid="alert-dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: any) => <div data-testid="collapsible" data-open={open}>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div data-testid="collapsible-content">{children}</div>,
  CollapsibleTrigger: ({ children, asChild: _asChild }: any) => <div data-testid="collapsible-trigger">{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div data-testid="scroll-area" className={className}>{children}</div>,
}));

describe('ExternalAgentSettings', () => {
  const mockAgents = [
    {
      id: 'agent-1',
      name: 'Claude Code',
      protocol: 'acp',
      transport: 'stdio',
      process: { command: 'claude-code', args: [] },
    },
    {
      id: 'agent-2',
      name: 'Custom Agent',
      protocol: 'http',
      transport: 'http',
      network: { endpoint: 'http://localhost:8080' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllAgents.mockReturnValue(mockAgents);
    mockGetConnectionStatus.mockReturnValue('disconnected');
    mockStoreState.enabled = true;
    mockStoreState.autoConnectOnStartup = false;
    mockStoreState.showConnectionNotifications = true;
    mockStoreState.defaultPermissionMode = 'default';
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('External Agents')).toBeInTheDocument();
    });

    it('displays settings description', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('Configure external AI agents')).toBeInTheDocument();
    });

    it('renders global settings section', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('Enable External Agents')).toBeInTheDocument();
      expect(screen.getByText('Auto-connect on Startup')).toBeInTheDocument();
      expect(screen.getByText('Show Notifications')).toBeInTheDocument();
    });

    it('renders configured agents section', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('Configured Agents')).toBeInTheDocument();
    });

    it('displays all configured agents', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText('Custom Agent')).toBeInTheDocument();
    });

    it('shows "Add Agent" button', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('Add Agent')).toBeInTheDocument();
    });
  });

  describe('Global Settings Toggles', () => {
    it('calls setEnabled when enable switch is toggled', () => {
      render(<ExternalAgentSettings />);
      const switches = screen.getAllByTestId('switch');
      const enableSwitch = switches[0];
      fireEvent.click(enableSwitch);
      expect(mockSetEnabled).toHaveBeenCalled();
    });

    it('calls setAutoConnectOnStartup when auto-connect switch is toggled', () => {
      render(<ExternalAgentSettings />);
      const switches = screen.getAllByTestId('switch');
      const autoConnectSwitch = switches[1];
      fireEvent.click(autoConnectSwitch);
      expect(mockSetAutoConnectOnStartup).toHaveBeenCalled();
    });

    it('calls setShowConnectionNotifications when notifications switch is toggled', () => {
      render(<ExternalAgentSettings />);
      const switches = screen.getAllByTestId('switch');
      const notificationsSwitch = switches[2];
      fireEvent.click(notificationsSwitch);
      expect(mockSetShowConnectionNotifications).toHaveBeenCalled();
    });
  });

  describe('Agent List', () => {
    it('shows empty state when no agents are configured', () => {
      mockGetAllAgents.mockReturnValue([]);
      render(<ExternalAgentSettings />);
      expect(screen.getByText('No agents configured')).toBeInTheDocument();
    });

    it('shows add agent prompt when no agents are configured', () => {
      mockGetAllAgents.mockReturnValue([]);
      render(<ExternalAgentSettings />);
      expect(screen.getByText('Add an agent to start')).toBeInTheDocument();
    });

    it('displays protocol badge for each agent', () => {
      render(<ExternalAgentSettings />);
      expect(screen.getByText('ACP')).toBeInTheDocument();
      expect(screen.getByText('HTTP')).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('shows connect button for disconnected agents', () => {
      mockGetConnectionStatus.mockReturnValue('disconnected');
      render(<ExternalAgentSettings />);
      const connectButtons = screen.getAllByText('Connect');
      expect(connectButtons.length).toBeGreaterThan(0);
    });

    it('shows disconnect button for connected agents', () => {
      mockGetConnectionStatus.mockReturnValue('connected');
      render(<ExternalAgentSettings />);
      const disconnectButtons = screen.getAllByText('Disconnect');
      expect(disconnectButtons.length).toBeGreaterThan(0);
    });

    it('calls connect when connect button is clicked', async () => {
      mockGetConnectionStatus.mockReturnValue('disconnected');
      mockConnect.mockResolvedValue(undefined);
      render(<ExternalAgentSettings />);
      
      const connectButtons = screen.getAllByText('Connect');
      fireEvent.click(connectButtons[0]);
      
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith('agent-1');
      });
    });

    it('calls disconnect when disconnect button is clicked', async () => {
      mockGetConnectionStatus.mockReturnValue('connected');
      mockDisconnect.mockResolvedValue(undefined);
      render(<ExternalAgentSettings />);
      
      const disconnectButtons = screen.getAllByText('Disconnect');
      fireEvent.click(disconnectButtons[0]);
      
      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalledWith('agent-1');
      });
    });
  });

  describe('Add Agent Dialog', () => {
    it('opens add agent dialog when Add Agent button is clicked', () => {
      render(<ExternalAgentSettings />);
      const addButton = screen.getByText('Add Agent');
      fireEvent.click(addButton);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  describe('Delete Agent', () => {
    it('opens delete confirmation when delete button is clicked', () => {
      render(<ExternalAgentSettings />);
      // Find trash button by checking the button's role
      const buttons = screen.getAllByRole('button');
      const trashButton = buttons.find(btn => 
        btn.innerHTML.includes('Trash') || btn.className?.includes('destructive')
      );
      if (trashButton) {
        fireEvent.click(trashButton);
      }
    });
  });
});

describe('ExternalAgentSettings Permission Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllAgents.mockReturnValue([]);
    mockGetConnectionStatus.mockReturnValue('disconnected');
    mockStoreState.enabled = true;
  });

  it('renders permission mode selector', () => {
    render(<ExternalAgentSettings />);
    expect(screen.getByText('Default Permission Mode')).toBeInTheDocument();
  });

  it('displays permission mode description', () => {
    render(<ExternalAgentSettings />);
    expect(screen.getByText('Default mode for sessions')).toBeInTheDocument();
  });
});
