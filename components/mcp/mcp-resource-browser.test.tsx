import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MCPResourceBrowser } from './mcp-resource-browser';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockReadResource = jest.fn();
const mockSubscribeResource = jest.fn();
const mockUnsubscribeResource = jest.fn();
const mockListResourceTemplates = jest.fn();

const mockServers = [
  {
    id: 'server-1',
    name: 'Test Server',
    status: { type: 'connected' as const },
    capabilities: { resources: { subscribe: true } },
    resources: [
      { uri: 'file:///test.txt', name: 'test.txt', description: 'A test file', mimeType: 'text/plain' },
      { uri: 'file:///data.json', name: 'data.json', mimeType: 'application/json' },
    ],
    tools: [],
    prompts: [],
    config: { name: 'Test Server', command: 'test', args: [], env: {}, connectionType: 'stdio' as const, enabled: true, autoStart: false },
    reconnectAttempts: 0,
  },
];

jest.mock('@/stores', () => ({
  useMcpStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      servers: mockServers,
      readResource: mockReadResource,
      subscribeResource: mockSubscribeResource,
      unsubscribeResource: mockUnsubscribeResource,
      listResourceTemplates: mockListResourceTemplates,
    }),
}));

describe('MCPResourceBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders resource list for connected server', () => {
    render(<MCPResourceBrowser serverId="server-1" />);
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('data.json')).toBeInTheDocument();
  });

  it('shows empty state when no resources', () => {
    mockServers[0].resources = [];
    render(<MCPResourceBrowser serverId="server-1" />);
    expect(screen.getByText('noResources')).toBeInTheDocument();
    mockServers[0].resources = [
      { uri: 'file:///test.txt', name: 'test.txt', description: 'A test file', mimeType: 'text/plain' },
      { uri: 'file:///data.json', name: 'data.json', mimeType: 'application/json' },
    ];
  });

  it('filters resources by search query', () => {
    render(<MCPResourceBrowser serverId="server-1" />);
    const searchInput = screen.getByPlaceholderText('search');
    fireEvent.change(searchInput, { target: { value: 'json' } });
    expect(screen.getByText('data.json')).toBeInTheDocument();
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
  });

  it('reads resource on click', async () => {
    mockReadResource.mockResolvedValue({
      contents: [{ uri: 'file:///test.txt', text: 'Hello world', mimeType: 'text/plain' }],
    });
    render(<MCPResourceBrowser serverId="server-1" />);
    fireEvent.click(screen.getByText('test.txt'));
    await waitFor(() => {
      expect(mockReadResource).toHaveBeenCalledWith('server-1', 'file:///test.txt');
    });
  });

  it('shows error when resource read fails', async () => {
    mockReadResource.mockRejectedValue(new Error('Read failed'));
    render(<MCPResourceBrowser serverId="server-1" />);
    fireEvent.click(screen.getByText('test.txt'));
    await waitFor(() => {
      expect(screen.getByText('Read failed')).toBeInTheDocument();
    });
  });

  it('renders with custom className', () => {
    const { container } = render(<MCPResourceBrowser serverId="server-1" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
