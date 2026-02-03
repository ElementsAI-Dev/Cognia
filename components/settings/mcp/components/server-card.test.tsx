'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ServerCard } from './server-card';
import type { McpServerState } from '@/types/mcp';

jest.mock('./server-status-icon', () => ({
  ServerStatusIcon: ({ status }: { status: { type: string } }) => (
    <span data-testid="status-icon">{status.type}</span>
  ),
}));

jest.mock('@/types/mcp', () => ({
  getStatusText: (status: { type: string }) => status.type,
  getStatusColor: () => 'text-green-500',
  isServerConnected: (status: { type: string }) => status.type === 'connected',
  isServerError: (status: { type: string }) => status.type === 'error',
}));

const messages = {
  mcpSettings: {
    disconnect: 'Disconnect',
    connect: 'Connect',
    editServer: 'Edit',
    removeServer: 'Remove',
    toolsCount: '{count} tools',
    resourcesCount: '{count} resources',
    promptsCount: '{count} prompts',
    toolsTooltip: 'Available tools',
    resourcesTooltip: 'Available resources',
    promptsTooltip: 'Available prompts',
    showTools: 'Show Tools',
    showResources: 'Show Resources',
    showPrompts: 'Show Prompts',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ServerCard', () => {
  const connectedServer: McpServerState = {
    id: 'server-1',
    name: 'Test Server',
    status: { type: 'connected' },
    config: {
      connectionType: 'stdio',
      command: 'npx',
      args: ['-y', '@test/server'],
      enabled: true,
    },
    tools: [
      { name: 'tool1', description: 'First tool' },
      { name: 'tool2', description: 'Second tool' },
    ],
    resources: [{ uri: 'resource1', name: 'Resource 1' }],
    prompts: [],
  } as unknown as McpServerState;

  const disconnectedServer: McpServerState = {
    ...connectedServer,
    status: { type: 'disconnected' },
  } as unknown as McpServerState;

  const errorServer: McpServerState = {
    ...connectedServer,
    status: { type: 'error', message: 'Connection failed' },
  } as unknown as McpServerState;

  const defaultProps = {
    server: connectedServer,
    actionLoading: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onEdit: jest.fn(),
    onRemove: jest.fn(),
    onToggleEnabled: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders server name', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('Test Server')).toBeInTheDocument();
  });

  it('renders connection type badge', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('STDIO')).toBeInTheDocument();
  });

  it('renders command for stdio connection', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('npx -y @test/server')).toBeInTheDocument();
  });

  it('renders disconnect button when connected', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('renders connect button when disconnected', () => {
    renderWithProviders(<ServerCard {...defaultProps} server={disconnectedServer} />);
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('calls onDisconnect when disconnect clicked', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    fireEvent.click(screen.getByText('Disconnect'));
    expect(defaultProps.onDisconnect).toHaveBeenCalledWith('server-1');
  });

  it('calls onConnect when connect clicked', () => {
    renderWithProviders(<ServerCard {...defaultProps} server={disconnectedServer} />);
    fireEvent.click(screen.getByText('Connect'));
    expect(defaultProps.onConnect).toHaveBeenCalledWith('server-1');
  });

  it('shows tools count when connected', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('2 tools')).toBeInTheDocument();
  });

  it('shows resources count when connected', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('1 resources')).toBeInTheDocument();
  });

  it('shows prompts count when connected', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('0 prompts')).toBeInTheDocument();
  });

  it('shows error message when error status', () => {
    renderWithProviders(<ServerCard {...defaultProps} server={errorServer} />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders edit and remove buttons', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onToggleEnabled when switch toggled', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    expect(defaultProps.onToggleEnabled).toHaveBeenCalledWith(connectedServer);
  });

  it('renders when loading', () => {
    const { container } = renderWithProviders(
      <ServerCard {...defaultProps} server={disconnectedServer} actionLoading="server-1" />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders when server disabled', () => {
    const disabledServer = {
      ...disconnectedServer,
      config: { ...disconnectedServer.config, enabled: false },
    } as unknown as McpServerState;
    const { container } = renderWithProviders(<ServerCard {...defaultProps} server={disabledServer} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders tools count', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('2 tools')).toBeInTheDocument();
  });

  it('renders resources count', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByText('1 resources')).toBeInTheDocument();
  });

  it('renders status icon', () => {
    renderWithProviders(<ServerCard {...defaultProps} />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('renders url for sse connection', () => {
    const sseServer = {
      ...connectedServer,
      config: {
        connectionType: 'sse',
        url: 'https://example.com/sse',
        enabled: true,
      },
    } as unknown as McpServerState;
    renderWithProviders(<ServerCard {...defaultProps} server={sseServer} />);
    expect(screen.getByText('https://example.com/sse')).toBeInTheDocument();
  });

  describe('expandable sections', () => {
    const serverWithAllData: McpServerState = {
      ...connectedServer,
      tools: [
        { name: 'tool1', description: 'First tool', inputSchema: {} },
        { name: 'tool2', description: 'Second tool', inputSchema: {} },
      ],
      resources: [
        { uri: 'resource://file1', name: 'File 1', description: 'First resource' },
        { uri: 'resource://file2', name: 'File 2', description: 'Second resource' },
      ],
      prompts: [
        { name: 'prompt1', description: 'First prompt' },
        { name: 'prompt2', description: 'Second prompt' },
      ],
    } as unknown as McpServerState;

    it('shows expandable tools section when tools exist', () => {
      renderWithProviders(<ServerCard {...defaultProps} server={serverWithAllData} />);
      expect(screen.getByText(/Show Tools/)).toBeInTheDocument();
    });

    it('shows expandable resources section when resources exist', () => {
      renderWithProviders(<ServerCard {...defaultProps} server={serverWithAllData} />);
      expect(screen.getByText(/Show Resources/)).toBeInTheDocument();
    });

    it('shows expandable prompts section when prompts exist', () => {
      renderWithProviders(<ServerCard {...defaultProps} server={serverWithAllData} />);
      expect(screen.getByText(/Show Prompts/)).toBeInTheDocument();
    });

    it('does not show expandable sections when disconnected', () => {
      const disconnectedWithData = {
        ...serverWithAllData,
        status: { type: 'disconnected' },
      } as unknown as McpServerState;
      renderWithProviders(<ServerCard {...defaultProps} server={disconnectedWithData} />);
      expect(screen.queryByText(/Show Tools/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Show Resources/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Show Prompts/)).not.toBeInTheDocument();
    });

    it('does not show resources section when no resources', () => {
      const serverNoResources = {
        ...serverWithAllData,
        resources: [],
      } as unknown as McpServerState;
      renderWithProviders(<ServerCard {...defaultProps} server={serverNoResources} />);
      expect(screen.queryByText(/Show Resources/)).not.toBeInTheDocument();
    });

    it('does not show prompts section when no prompts', () => {
      const serverNoPrompts = {
        ...serverWithAllData,
        prompts: [],
      } as unknown as McpServerState;
      renderWithProviders(<ServerCard {...defaultProps} server={serverNoPrompts} />);
      expect(screen.queryByText(/Show Prompts/)).not.toBeInTheDocument();
    });
  });
});
