/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { ExternalAgentManager } from './external-agent-manager';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  function Plus(props: any) {
    return <svg {...props} data-testid="icon-Plus" />;
  }
  function RefreshCw(props: any) {
    return <svg {...props} data-testid="icon-RefreshCw" />;
  }
  function Settings(props: any) {
    return <svg {...props} data-testid="icon-Settings" />;
  }
  function Power(props: any) {
    return <svg {...props} data-testid="icon-Power" />;
  }
  function PowerOff(props: any) {
    return <svg {...props} data-testid="icon-PowerOff" />;
  }
  function Trash2(props: any) {
    return <svg {...props} data-testid="icon-Trash2" />;
  }
  function Activity(props: any) {
    return <svg {...props} data-testid="icon-Activity" />;
  }
  function AlertCircle(props: any) {
    return <svg {...props} data-testid="icon-AlertCircle" />;
  }

  return { Plus, RefreshCw, Settings, Power, PowerOff, Trash2, Activity, AlertCircle };
});

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock external agent presets
jest.mock('@/lib/ai/agent/external/presets', () => ({
  EXTERNAL_AGENT_PRESETS: {
    'claude-code': {
      name: 'Claude Code',
      description: 'Claude Code preset',
      protocol: 'acp',
      transport: 'stdio',
      process: { command: 'npx', args: ['@anthropics/claude-code', '--stdio'] },
      defaultPermissionMode: 'default',
      tags: ['local'],
      envVarHint: 'Set CLAUDE_CODE_API_KEY',
    },
  },
  getAvailablePresets: () => ['claude-code'],
}));

// Mock useExternalAgent hook
const mockUseExternalAgent = jest.fn();

jest.mock('@/hooks/agent', () => ({
  useExternalAgent: () => mockUseExternalAgent(),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-title" className={className}>
      {children}
    </div>
  ),
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-description" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

// Dialog mocks (conditionally render children based on `open`)
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <>{open ? children : null}</>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    id,
    placeholder,
    required,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      id={id}
      value={value as any}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="tooltip-trigger">{children}</div>,
}));

// Select mocks with context - click SelectItem to trigger onValueChange
jest.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext({ onValueChange: (_value: string) => {} });

  function Select({
    children,
    onValueChange: _onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) {
    return (
      <SelectContext.Provider value={{ onValueChange: _onValueChange || (() => {}) }}>
        <div data-testid="select">{children}</div>
      </SelectContext.Provider>
    );
  }

  function SelectItem({ children, value }: { children: React.ReactNode; value: string }) {
    const { onValueChange } = React.useContext(SelectContext);
    return (
      <button
        type="button"
        data-testid={`select-item-${value}`}
        onClick={() => onValueChange(value)}
      >
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="select-trigger">{children}</div>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span data-testid="select-value">{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="select-content">{children}</div>
    ),
    SelectItem,
  };
});

describe('ExternalAgentManager', () => {
  const baseHookReturn = {
    agents: [],
    activeAgentId: null,
    isExecuting: false,
    isLoading: false,
    error: null,
    availableCommands: [],
    planEntries: [],
    planStep: null,
    addAgent: jest.fn(),
    removeAgent: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    execute: jest.fn(),
    setActiveAgent: jest.fn(),
    refresh: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExternalAgent.mockReturnValue({ ...baseHookReturn });
    (global as any).confirm = jest.fn(() => true);
  });

  it('renders header and empty state when there are no agents', () => {
    render(<ExternalAgentManager />);

    expect(screen.getByText('External Agents')).toBeInTheDocument();
    expect(screen.getByText('No External Agents')).toBeInTheDocument();
    expect(screen.getAllByText('Add Agent').length).toBeGreaterThan(0);
  });

  it('shows error banner and dismiss calls clearError', () => {
    const clearError = jest.fn();
    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      error: 'Something went wrong',
      clearError,
    });

    render(<ExternalAgentManager />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dismiss'));
    expect(clearError).toHaveBeenCalledTimes(1);
  });

  it('refresh button calls refresh and is disabled while loading', () => {
    const refresh = jest.fn();

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      refresh,
      isLoading: false,
    });

    const { rerender } = render(<ExternalAgentManager />);
    const icon = screen.getByTestId('icon-RefreshCw');
    const refreshButton = icon.closest('button');
    expect(refreshButton).not.toBeNull();

    fireEvent.click(refreshButton as HTMLButtonElement);
    expect(refresh).toHaveBeenCalledTimes(1);

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      refresh,
      isLoading: true,
    });

    rerender(<ExternalAgentManager />);

    const icon2 = screen.getByTestId('icon-RefreshCw');
    const refreshButton2 = icon2.closest('button');
    expect(refreshButton2).toBeDisabled();
  });

  it('renders agents and clicking a card selects the agent', () => {
    const setActiveAgent = jest.fn();

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      setActiveAgent,
      agents: [
        {
          config: {
            id: 'a1',
            name: 'Agent One',
            protocol: 'acp',
            transport: 'stdio',
            enabled: true,
            process: { command: 'npx', args: ['foo'] },
          },
          connectionStatus: 'disconnected',
        },
        {
          config: {
            id: 'a2',
            name: 'Agent Two',
            protocol: 'http',
            transport: 'http',
            enabled: true,
            network: { endpoint: 'http://localhost:8080' },
          },
          connectionStatus: 'connected',
        },
      ],
    });

    render(<ExternalAgentManager />);

    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();

    // Click the card title (bubbles to card onClick)
    fireEvent.click(screen.getByText('Agent One'));
    expect(setActiveAgent).toHaveBeenCalledWith('a1');
  });

  it('connect/disconnect buttons call connect/disconnect and do not select the card', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();
    const setActiveAgent = jest.fn();

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      connect,
      disconnect,
      setActiveAgent,
      agents: [
        {
          config: {
            id: 'a1',
            name: 'Agent One',
            protocol: 'acp',
            transport: 'stdio',
            enabled: true,
            process: { command: 'npx', args: [] },
          },
          connectionStatus: 'disconnected',
        },
        {
          config: {
            id: 'a2',
            name: 'Agent Two',
            protocol: 'http',
            transport: 'http',
            enabled: true,
            network: { endpoint: 'http://localhost:8080' },
          },
          connectionStatus: 'connected',
        },
      ],
    });

    render(<ExternalAgentManager />);

    const powerIcon = screen.getAllByTestId('icon-Power')[0];
    const connectButton = powerIcon.closest('button');
    fireEvent.click(connectButton as HTMLButtonElement);
    expect(connect).toHaveBeenCalledWith('a1');
    expect(setActiveAgent).not.toHaveBeenCalled();

    const powerOffIcon = screen.getAllByTestId('icon-PowerOff')[0];
    const disconnectButton = powerOffIcon.closest('button');
    fireEvent.click(disconnectButton as HTMLButtonElement);
    expect(disconnect).toHaveBeenCalledWith('a2');
    expect(setActiveAgent).not.toHaveBeenCalled();
  });

  it('remove button confirms before calling removeAgent', () => {
    const removeAgent = jest.fn();
    const confirmSpy = jest.fn(() => true);
    (global as any).confirm = confirmSpy;

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      removeAgent,
      agents: [
        {
          config: {
            id: 'a1',
            name: 'Agent One',
            protocol: 'acp',
            transport: 'stdio',
            enabled: true,
            process: { command: 'npx', args: [] },
          },
          connectionStatus: 'disconnected',
        },
      ],
    });

    render(<ExternalAgentManager />);

    const trashIcon = screen.getAllByTestId('icon-Trash2')[0];
    const removeButton = trashIcon.closest('button');
    fireEvent.click(removeButton as HTMLButtonElement);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(removeAgent).toHaveBeenCalledWith('a1');
  });

  it('remove button does nothing when confirm is cancelled', () => {
    const removeAgent = jest.fn();
    const confirmSpy = jest.fn(() => false);
    (global as any).confirm = confirmSpy;

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      removeAgent,
      agents: [
        {
          config: {
            id: 'a1',
            name: 'Agent One',
            protocol: 'acp',
            transport: 'stdio',
            enabled: true,
            process: { command: 'npx', args: [] },
          },
          connectionStatus: 'disconnected',
        },
      ],
    });

    render(<ExternalAgentManager />);

    const trashIcon = screen.getAllByTestId('icon-Trash2')[0];
    const removeButton = trashIcon.closest('button');
    fireEvent.click(removeButton as HTMLButtonElement);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(removeAgent).not.toHaveBeenCalled();
  });

  it('opens add dialog and submitting stdio form calls addAgent with process args split', async () => {
    const addAgent = jest.fn(async (_config: any) => undefined);

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      addAgent,
    });

    render(<ExternalAgentManager />);

    // Open dialog
    fireEvent.click(screen.getAllByText('Add Agent')[0]);
    expect(screen.getByText('Add External Agent')).toBeInTheDocument();
    const dialog = screen.getByTestId('dialog-content');

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Agent' } });
    fireEvent.change(screen.getByLabelText('Command'), { target: { value: 'npx' } });
    fireEvent.change(screen.getByLabelText('Arguments'), {
      target: { value: '@anthropics/claude-code --stdio' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Agent' }));

    await waitFor(() => {
      expect(addAgent).toHaveBeenCalledTimes(1);
      expect(addAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Agent',
          protocol: 'acp',
          transport: 'stdio',
          enabled: true,
          process: { command: 'npx', args: ['@anthropics/claude-code', '--stdio'] },
        })
      );
    });
  });

  it('preset selection populates form and shows env var hint', () => {
    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      addAgent: jest.fn(async (_config: any) => undefined),
    });

    render(<ExternalAgentManager />);

    fireEvent.click(screen.getAllByText('Add Agent')[0]);

    // Select preset
    fireEvent.click(screen.getByTestId('select-item-claude-code'));

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Claude Code');

    const commandInput = screen.getByLabelText('Command') as HTMLInputElement;
    expect(commandInput.value).toBe('npx');

    const argsInput = screen.getByLabelText('Arguments') as HTMLInputElement;
    expect(argsInput.value).toBe('@anthropics/claude-code --stdio');

    expect(screen.getByText(/Set CLAUDE_CODE_API_KEY/)).toBeInTheDocument();
  });

  it('submitting non-stdio form calls addAgent with network endpoint', () => {
    const addAgent = jest.fn(async (_config: any) => undefined);

    mockUseExternalAgent.mockReturnValue({
      ...baseHookReturn,
      addAgent,
    });

    render(<ExternalAgentManager />);

    fireEvent.click(screen.getAllByText('Add Agent')[0]);
    const dialog = screen.getByTestId('dialog-content');

    // Change transport to http
    const transportContainer = screen.getByText('Transport').closest('div');
    expect(transportContainer).not.toBeNull();
    fireEvent.click(within(transportContainer as HTMLElement).getByTestId('select-item-http'));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'HTTP Agent' } });
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'http://localhost:9999' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Agent' }));

    expect(addAgent).toHaveBeenCalledTimes(1);
    expect(addAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HTTP Agent',
        protocol: 'acp',
        transport: 'http',
        enabled: true,
        network: { endpoint: 'http://localhost:9999' },
      })
    );
  });
});
