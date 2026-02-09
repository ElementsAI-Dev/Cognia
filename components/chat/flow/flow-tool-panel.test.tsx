/**
 * FlowToolPanel - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { FlowToolPanel } from './flow-tool-panel';
import { useMcpStore } from '@/stores/mcp';
import { NextIntlClientProvider } from 'next-intl';

// Mock MCP store
jest.mock('@/stores/mcp', () => ({
  useMcpStore: jest.fn(),
}));

// Mock translations
const messages = {
  flowChat: {
    reference: 'Reference',
  },
  common: {
    loading: 'Loading...',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('FlowToolPanel', () => {
  const mockGetAllTools = jest.fn();
  const mockCallTool = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllTools.mockResolvedValue([]);
    (useMcpStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        servers: [
          { id: 'server-1', config: { name: 'Test Server' }, status: { type: 'connected' } },
        ],
        getAllTools: mockGetAllTools,
        callTool: mockCallTool,
      };
      return selector(state);
    });
  });

  it('renders the tool panel header', () => {
    render(<FlowToolPanel />, { wrapper });
    
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('shows empty state when no servers are configured', () => {
    (useMcpStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        servers: [],
        getAllTools: mockGetAllTools,
        callTool: mockCallTool,
      };
      return selector(state);
    });

    render(<FlowToolPanel />, { wrapper });
    
    expect(screen.getByText('No tools available')).toBeInTheDocument();
  });

  it('auto-loads tools on mount when servers are available', async () => {
    const mockTools = [
      {
        serverId: 'server-1',
        tool: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: { type: 'object', properties: {} },
        },
      },
    ];
    mockGetAllTools.mockResolvedValue(mockTools);

    render(<FlowToolPanel />, { wrapper });

    await waitFor(() => {
      expect(mockGetAllTools).toHaveBeenCalled();
    });
  });

  it('shows server group after auto-load', async () => {
    const mockTools = [
      {
        serverId: 'server-1',
        tool: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: { type: 'object', properties: {} },
        },
      },
    ];
    mockGetAllTools.mockResolvedValue(mockTools);

    render(<FlowToolPanel />, { wrapper });

    await waitFor(() => {
      // Server name should be visible in the collapsible header
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });
  });

  it('has search input', () => {
    render(<FlowToolPanel />, { wrapper });
    
    expect(screen.getByPlaceholderText('Search tools...')).toBeInTheDocument();
  });

  it('shows server count badge', () => {
    render(<FlowToolPanel />, { wrapper });
    
    expect(screen.getByText(/1 servers/)).toBeInTheDocument();
  });
});
