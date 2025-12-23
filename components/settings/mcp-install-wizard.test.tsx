/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpInstallWizard } from './mcp-install-wizard';

// Mock MCP store
const mockAddServer = jest.fn();
const mockConnectServer = jest.fn();

jest.mock('@/stores/mcp-store', () => ({
  useMcpStore: () => ({
    addServer: mockAddServer,
    connectServer: mockConnectServer,
  }),
}));

// Mock types
jest.mock('@/types/mcp', () => ({
  MCP_SERVER_TEMPLATES: [
    {
      id: 'test-server',
      name: 'Test Server',
      description: 'A test MCP server',
      command: 'npx',
      args: ['test-server'],
      envKeys: ['API_KEY'],
    },
    {
      id: 'another-server',
      name: 'Another Server',
      description: 'Another test server',
      command: 'npx',
      args: ['another'],
      envKeys: [],
    },
  ],
  createDefaultServerConfig: () => ({
    name: '',
    command: 'npx',
    args: [],
    env: {},
    connectionType: 'stdio',
    enabled: true,
    autoStart: false,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} data-testid={id || 'input'} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="card" onClick={onClick}>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('McpInstallWizard', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<McpInstallWizard {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<McpInstallWizard {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays Quick Install title on select step', () => {
    render(<McpInstallWizard {...defaultProps} />);
    expect(screen.getByText('Quick Install MCP Server')).toBeInTheDocument();
  });

  it('displays server templates', () => {
    render(<McpInstallWizard {...defaultProps} />);
    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('Another Server')).toBeInTheDocument();
  });

  it('displays template descriptions', () => {
    render(<McpInstallWizard {...defaultProps} />);
    expect(screen.getByText('A test MCP server')).toBeInTheDocument();
  });

  it('displays cancel button on select step', () => {
    render(<McpInstallWizard {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(<McpInstallWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows configure step when template is selected', () => {
    render(<McpInstallWizard {...defaultProps} />);
    const cards = screen.getAllByTestId('card');
    fireEvent.click(cards[0]);
    expect(screen.getByText('Configure Test Server')).toBeInTheDocument();
  });
});
