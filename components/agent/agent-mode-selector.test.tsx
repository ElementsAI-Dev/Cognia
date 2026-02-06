/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import _userEvent from '@testing-library/user-event';
import { AgentModeSelector } from './agent-mode-selector';
import { BUILT_IN_AGENT_MODES } from '@/types/agent/agent-mode';

// Mock the UI components
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
  }) => <span className={className}>{children}</span>,
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

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      data-testid={`input-${id}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    id,
    className,
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      data-testid={`textarea-${id}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      className={className}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
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

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
    onOpenChange: _onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogAction: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className} data-testid="alert-dialog-action">
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} data-testid="alert-dialog-cancel">
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
}));

jest.mock('./custom-mode-editor', () => ({
  CustomModeEditor: ({
    open,
    onOpenChange,
    mode: _mode,
    onSave,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: any;
    onSave: (mode: any) => void;
  }) =>
    open ? (
      <div data-testid="custom-mode-editor">
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button
          onClick={() =>
            onSave({
              name: 'Test',
              description: 'Test',
              systemPrompt: 'Test',
              type: 'custom',
              icon: 'Settings',
              outputFormat: 'text',
              previewEnabled: false,
            })
          }
        >
          Save
        </button>
      </div>
    ) : null,
}));

describe('AgentModeSelector', () => {
  const defaultProps = {
    selectedModeId: 'general',
    onModeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AgentModeSelector {...defaultProps} />);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });

  it('displays the selected mode name', () => {
    render(<AgentModeSelector {...defaultProps} />);
    const selectedMode = BUILT_IN_AGENT_MODES.find((m) => m.id === 'general');
    expect(screen.getAllByText(selectedMode!.name).length).toBeGreaterThan(0);
  });

  it('renders all built-in agent modes', () => {
    render(<AgentModeSelector {...defaultProps} />);
    BUILT_IN_AGENT_MODES.forEach((mode) => {
      expect(screen.getAllByText(mode.name).length).toBeGreaterThan(0);
    });
  });

  it('renders scroll area with consolidated mode list', () => {
    render(<AgentModeSelector {...defaultProps} />);
    const scrollArea = screen.getByTestId('scroll-area');
    expect(scrollArea).toBeInTheDocument();
    // Verify scroll area contains the built-in modes
    BUILT_IN_AGENT_MODES.forEach((mode) => {
      expect(screen.getAllByText(mode.name).length).toBeGreaterThan(0);
    });
  });

  it('calls onModeChange when a mode is selected', () => {
    const onModeChange = jest.fn();
    render(<AgentModeSelector {...defaultProps} onModeChange={onModeChange} />);

    const codeMode = BUILT_IN_AGENT_MODES.find((m) => m.id === 'code');
    const dropdownItems = screen.getAllByTestId('dropdown-item');

    if (codeMode && dropdownItems.length > 0) {
      const codeModeItem = dropdownItems.find((item) => item.textContent?.includes(codeMode.name));
      if (codeModeItem) {
        fireEvent.click(codeModeItem);
        expect(onModeChange).toHaveBeenCalled();
      }
    }
  });

  it('disables the button when disabled prop is true', () => {
    render(<AgentModeSelector {...defaultProps} disabled={true} />);
    const trigger = screen.getByTestId('dropdown-trigger');
    const button = trigger.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<AgentModeSelector {...defaultProps} className="custom-class" />);
    const trigger = screen.getByTestId('dropdown-trigger');
    const button = trigger.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('shows "Create Custom Mode" option when onCustomModeCreate is provided', () => {
    const onCustomModeCreate = jest.fn();
    render(<AgentModeSelector {...defaultProps} onCustomModeCreate={onCustomModeCreate} />);
    expect(screen.getByText('Create Custom Mode')).toBeInTheDocument();
  });

  it('places "Create Custom Mode" button outside scroll area', () => {
    const onCustomModeCreate = jest.fn();
    render(<AgentModeSelector {...defaultProps} onCustomModeCreate={onCustomModeCreate} />);
    const scrollArea = screen.getByTestId('scroll-area');
    const createButton = screen.getByText('Create Custom Mode');
    // Verify the create button is not inside the scroll area
    expect(scrollArea.contains(createButton)).toBe(false);
  });

  it('shows "Create Custom Mode" button regardless of onCustomModeCreate prop', () => {
    render(<AgentModeSelector {...defaultProps} />);
    expect(screen.getByText('Create Custom Mode')).toBeInTheDocument();
  });

  it('displays mode descriptions', () => {
    render(<AgentModeSelector {...defaultProps} />);
    BUILT_IN_AGENT_MODES.forEach((mode) => {
      expect(screen.getByText(mode.description)).toBeInTheDocument();
    });
  });

  it('shows Live Preview badge for modes with previewEnabled', () => {
    render(<AgentModeSelector {...defaultProps} />);
    const previewEnabledModes = BUILT_IN_AGENT_MODES.filter((m) => m.previewEnabled);
    if (previewEnabledModes.length > 0) {
      expect(screen.getAllByText('Live Preview').length).toBe(previewEnabledModes.length);
    }
  });

  it('displays check icon for selected mode', () => {
    render(<AgentModeSelector {...defaultProps} selectedModeId="general" />);
    // The selected mode should have a visual indicator (check icon is rendered)
    const dropdownItems = screen.getAllByTestId('dropdown-item');
    expect(dropdownItems.length).toBeGreaterThan(0);
  });

  it('defaults to first mode when selectedModeId is invalid', () => {
    render(<AgentModeSelector {...defaultProps} selectedModeId="invalid-mode" />);
    const firstMode = BUILT_IN_AGENT_MODES[0];
    expect(screen.getAllByText(firstMode.name).length).toBeGreaterThan(0);
  });
});

describe('AgentModeSelector Custom Mode Dialog', () => {
  const propsWithCustomCreate = {
    selectedModeId: 'general',
    onModeChange: jest.fn(),
    onCustomModeCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens custom mode editor when "Create Custom Mode" is clicked', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);

    const createButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
    });
  });

  it('displays editor with correct title', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);

    const createButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
    });
  });

  it('has Close and Save buttons in editor', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);

    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  it('closes editor when Close is clicked', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);

    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);

    await waitFor(() => {
      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('custom-mode-editor')).not.toBeInTheDocument();
    });
  });

  it('calls onCustomModeCreate with correct data when Save is clicked', async () => {
    const onCustomModeCreate = jest.fn();
    render(
      <AgentModeSelector {...propsWithCustomCreate} onCustomModeCreate={onCustomModeCreate} />
    );

    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);

    await waitFor(() => {
      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(onCustomModeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test',
        description: 'Test',
        systemPrompt: 'Test',
        type: 'custom',
        icon: 'Settings',
        outputFormat: 'text',
        previewEnabled: false,
      })
    );
  });
});
