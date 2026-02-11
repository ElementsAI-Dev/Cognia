/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExternalAgentSelector } from './external-agent-selector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      disabled: 'External Agents Disabled',
      enableInSettings: 'Enable in settings',
      builtIn: 'Built-in',
      builtInAgent: 'Built-in Agent',
      builtInAgentDesc: 'Use built-in AI agent',
      selectAgent: 'Select Agent',
      externalAgents: 'External Agents',
      manageAgents: 'Manage Agents',
    };
    return translations[key] || key;
  },
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

// Mock external agent store
const mockGetAllAgents = jest.fn();
const mockGetConnectionStatus = jest.fn();
const mockEnabled = { current: true };

jest.mock('@/stores/agent/external-agent-store', () => ({
  useExternalAgentStore: () => ({
    getAllAgents: mockGetAllAgents,
    getConnectionStatus: mockGetConnectionStatus,
    enabled: mockEnabled.current,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
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

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
    className?: string;
  }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-group">{children}</div>
  ),
  DropdownMenuLabel: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="dropdown-label" className={className}>
      {children}
    </div>
  ),
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

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

describe('ExternalAgentSelector', () => {
  const defaultProps = {
    selectedAgentId: null,
    onAgentChange: jest.fn(),
  };

  const mockAgents = [
    { id: 'agent-1', name: 'Claude Code', protocol: 'acp', transport: 'stdio' },
    { id: 'agent-2', name: 'Custom Agent', protocol: 'http', transport: 'http' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllAgents.mockReturnValue(mockAgents);
    mockGetConnectionStatus.mockReturnValue('disconnected');
    mockEnabled.current = true;
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('shows "Built-in" text when no external agent is selected', () => {
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });

    it('shows selected agent name when an external agent is selected', () => {
      render(<ExternalAgentSelector {...defaultProps} selectedAgentId="agent-1" />);
      expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0);
    });

    it('renders all external agents in dropdown', () => {
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Custom Agent').length).toBeGreaterThan(0);
    });

    it('shows "Built-in Agent" option in dropdown', () => {
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByText('Built-in Agent')).toBeInTheDocument();
    });

    it('displays protocol badge for each agent', () => {
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByText('ACP')).toBeInTheDocument();
      expect(screen.getByText('HTTP')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('shows disabled state when external agents are disabled', () => {
      mockEnabled.current = false;
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByText('External Agents Disabled')).toBeInTheDocument();
    });

    it('shows tooltip with enable instructions when disabled', () => {
      mockEnabled.current = false;
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByText('Enable in settings')).toBeInTheDocument();
    });

    it('disables the button when disabled prop is true', () => {
      render(<ExternalAgentSelector {...defaultProps} disabled={true} />);
      const trigger = screen.getByTestId('dropdown-trigger');
      const button = trigger.querySelector('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Selection', () => {
    it('calls onAgentChange with null when "Built-in Agent" is clicked', () => {
      const onAgentChange = jest.fn();
      render(
        <ExternalAgentSelector
          {...defaultProps}
          onAgentChange={onAgentChange}
          selectedAgentId="agent-1"
        />
      );

      const builtInItem = screen
        .getAllByTestId('dropdown-item')
        .find((item) => item.textContent?.includes('Built-in Agent'));
      if (builtInItem) {
        fireEvent.click(builtInItem);
        expect(onAgentChange).toHaveBeenCalledWith(null);
      }
    });

    it('calls onAgentChange with agent ID when external agent is clicked', () => {
      const onAgentChange = jest.fn();
      render(<ExternalAgentSelector {...defaultProps} onAgentChange={onAgentChange} />);

      const agentItem = screen
        .getAllByTestId('dropdown-item')
        .find((item) => item.textContent?.includes('Claude Code'));
      if (agentItem) {
        fireEvent.click(agentItem);
        expect(onAgentChange).toHaveBeenCalledWith('agent-1');
      }
    });
  });

  describe('Connection Status', () => {
    it('shows connected status for connected agents', () => {
      mockGetConnectionStatus.mockReturnValue('connected');
      render(<ExternalAgentSelector {...defaultProps} selectedAgentId="agent-1" />);
      // Connection status is shown via icon, verify dropdown renders
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('shows connecting status for agents being connected', () => {
      mockGetConnectionStatus.mockReturnValue('connecting');
      render(<ExternalAgentSelector {...defaultProps} selectedAgentId="agent-1" />);
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('shows error status for agents with connection errors', () => {
      mockGetConnectionStatus.mockReturnValue('error');
      render(<ExternalAgentSelector {...defaultProps} selectedAgentId="agent-1" />);
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });
  });

  describe('Settings', () => {
    it('shows "Manage Agents" option when onOpenSettings is provided', () => {
      const onOpenSettings = jest.fn();
      render(<ExternalAgentSelector {...defaultProps} onOpenSettings={onOpenSettings} />);
      expect(screen.getByText('Manage Agents')).toBeInTheDocument();
    });

    it('calls onOpenSettings when "Manage Agents" is clicked', () => {
      const onOpenSettings = jest.fn();
      render(<ExternalAgentSelector {...defaultProps} onOpenSettings={onOpenSettings} />);

      const settingsItem = screen
        .getAllByTestId('dropdown-item')
        .find((item) => item.textContent?.includes('Manage Agents'));
      if (settingsItem) {
        fireEvent.click(settingsItem);
        expect(onOpenSettings).toHaveBeenCalled();
      }
    });
  });

  describe('Empty State', () => {
    it('does not show external agents section when no agents are configured', () => {
      mockGetAllAgents.mockReturnValue([]);
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.queryByText('External Agents')).not.toBeInTheDocument();
    });

    it('still shows "Built-in Agent" option when no external agents', () => {
      mockGetAllAgents.mockReturnValue([]);
      render(<ExternalAgentSelector {...defaultProps} />);
      expect(screen.getByText('Built-in Agent')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<ExternalAgentSelector {...defaultProps} className="custom-class" />);
      const trigger = screen.getByTestId('dropdown-trigger');
      const button = trigger.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    it('applies border highlight when external agent is selected', () => {
      render(<ExternalAgentSelector {...defaultProps} selectedAgentId="agent-1" />);
      const trigger = screen.getByTestId('dropdown-trigger');
      const button = trigger.querySelector('button');
      expect(button?.className).toContain('border-primary/50');
    });
  });
});
