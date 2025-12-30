/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpServerDialog } from './mcp-server-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      addServer: 'Add Server',
      editServer: 'Edit Server',
      serverName: 'Server Name',
      command: 'Command',
      arguments: 'Arguments',
      environment: 'Environment Variables',
      connectionType: 'Connection Type',
      enabled: 'Enabled',
      autoStart: 'Auto Start',
      cancel: 'Cancel',
      save: 'Save',
      add: 'Add',
    };
    return translations[key] || key;
  },
}));

// Mock MCP store
const mockAddServer = jest.fn();
const mockUpdateServer = jest.fn();

jest.mock('@/stores/mcp-store', () => ({
  useMcpStore: () => ({
    addServer: mockAddServer,
    updateServer: mockUpdateServer,
  }),
}));

// Mock types
jest.mock('@/types/mcp', () => ({
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
  Button: ({ children, onClick, disabled, type }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} type={type}>{children}</button>
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid={id}>Switch</button>
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

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span>Value</span>,
}));

describe('McpServerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    editingServer: null,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<McpServerDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays Add MCP Server title when not editing', () => {
    render(<McpServerDialog {...defaultProps} />);
    // Dialog is rendered with Add button
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('displays server name input', () => {
    render(<McpServerDialog {...defaultProps} />);
    // Component renders hardcoded English
    expect(screen.getByText('Server Name')).toBeInTheDocument();
  });

  it('displays connection type selector', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByText('Connection Type')).toBeInTheDocument();
  });

  it('displays command input', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByText('Command')).toBeInTheDocument();
  });

  it('displays arguments section', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByText('Arguments')).toBeInTheDocument();
  });

  it('displays environment variables section', () => {
    render(<McpServerDialog {...defaultProps} />);
    // Component renders translation key
    expect(screen.getByText('envVariables')).toBeInTheDocument();
  });

  it('displays enabled switch', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('displays auto start switch', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByText('Auto Start')).toBeInTheDocument();
  });

  it('displays cancel button', () => {
    render(<McpServerDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<McpServerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
