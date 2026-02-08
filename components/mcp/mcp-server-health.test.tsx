import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MCPServerHealth } from './mcp-server-health';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockPingServer = jest.fn();
const mockConnectServer = jest.fn();
const mockDisconnectServer = jest.fn();

const mockHealthMap = new Map();
mockHealthMap.set('server-1', {
  serverId: 'server-1',
  isHealthy: true,
  lastPingAt: Date.now() - 30000,
  pingLatencyMs: 45,
  failedPings: 0,
});
mockHealthMap.set('server-2', {
  serverId: 'server-2',
  isHealthy: false,
  lastPingAt: Date.now() - 120000,
  pingLatencyMs: 1200,
  failedPings: 3,
});

const mockServers = [
  {
    id: 'server-1',
    name: 'Healthy Server',
    status: { type: 'connected' as const },
    tools: [],
    resources: [],
    prompts: [],
    config: { name: 'Healthy Server', command: 'test', args: [], env: {}, connectionType: 'stdio' as const, enabled: true, autoStart: false },
    reconnectAttempts: 0,
  },
  {
    id: 'server-2',
    name: 'Unhealthy Server',
    status: { type: 'connected' as const },
    tools: [],
    resources: [],
    prompts: [],
    config: { name: 'Unhealthy Server', command: 'test', args: [], env: {}, connectionType: 'stdio' as const, enabled: true, autoStart: false },
    reconnectAttempts: 0,
  },
  {
    id: 'server-3',
    name: 'Disconnected Server',
    status: { type: 'disconnected' as const },
    tools: [],
    resources: [],
    prompts: [],
    config: { name: 'Disconnected Server', command: 'test', args: [], env: {}, connectionType: 'stdio' as const, enabled: true, autoStart: false },
    reconnectAttempts: 0,
  },
];

jest.mock('@/stores', () => ({
  useMcpStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      servers: mockServers,
      serverHealthMap: mockHealthMap,
      pingServer: mockPingServer,
      connectServer: mockConnectServer,
      disconnectServer: mockDisconnectServer,
    }),
}));

describe('MCPServerHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all servers', () => {
    render(<MCPServerHealth />);
    expect(screen.getByText('Healthy Server')).toBeInTheDocument();
    expect(screen.getByText('Unhealthy Server')).toBeInTheDocument();
    expect(screen.getByText('Disconnected Server')).toBeInTheDocument();
  });

  it('shows health status badges for connected servers', () => {
    render(<MCPServerHealth />);
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('unhealthy')).toBeInTheDocument();
  });

  it('shows ping latency for healthy server', () => {
    render(<MCPServerHealth />);
    expect(screen.getByText('45ms')).toBeInTheDocument();
  });

  it('shows failed ping count for unhealthy server', () => {
    render(<MCPServerHealth />);
    // "3 failedPings" text should appear for unhealthy server
    const failedPingsElements = screen.getAllByText(/3/);
    expect(failedPingsElements.length).toBeGreaterThan(0);
  });

  it('triggers ping when ping button clicked', async () => {
    mockPingServer.mockResolvedValue(50);
    render(<MCPServerHealth />);
    const pingButtons = screen.getAllByRole('button');
    const pingButton = pingButtons.find((b) => b.querySelector('svg'));
    if (pingButton) {
      fireEvent.click(pingButton);
      await waitFor(() => {
        expect(mockPingServer).toHaveBeenCalled();
      });
    }
  });

  it('renders with custom className', () => {
    const { container } = render(<MCPServerHealth className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
