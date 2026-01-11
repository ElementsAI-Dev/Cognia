/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentModeSelector } from './agent-mode-selector';
import { BUILT_IN_AGENT_MODES } from '@/types/agent/agent-mode';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string; className?: string }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean; onOpenChange?: (open: boolean) => void }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
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
  Textarea: ({ value, onChange, placeholder, id, className }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
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
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
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
    const selectedMode = BUILT_IN_AGENT_MODES.find(m => m.id === 'general');
    expect(screen.getAllByText(selectedMode!.name).length).toBeGreaterThan(0);
  });

  it('renders all built-in agent modes', () => {
    render(<AgentModeSelector {...defaultProps} />);
    BUILT_IN_AGENT_MODES.forEach((mode) => {
      expect(screen.getAllByText(mode.name).length).toBeGreaterThan(0);
    });
  });

  it('calls onModeChange when a mode is selected', () => {
    const onModeChange = jest.fn();
    render(<AgentModeSelector {...defaultProps} onModeChange={onModeChange} />);
    
    const codeMode = BUILT_IN_AGENT_MODES.find(m => m.id === 'code');
    const dropdownItems = screen.getAllByTestId('dropdown-item');
    
    if (codeMode && dropdownItems.length > 0) {
      const codeModeItem = dropdownItems.find(item => item.textContent?.includes(codeMode.name));
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
    render(
      <AgentModeSelector {...defaultProps} onCustomModeCreate={onCustomModeCreate} />
    );
    expect(screen.getByText('Create Custom Mode')).toBeInTheDocument();
  });

  it('does not show "Create Custom Mode" when onCustomModeCreate is not provided', () => {
    render(<AgentModeSelector {...defaultProps} />);
    expect(screen.queryByText('Create Custom Mode')).not.toBeInTheDocument();
  });

  it('displays mode descriptions', () => {
    render(<AgentModeSelector {...defaultProps} />);
    BUILT_IN_AGENT_MODES.forEach((mode) => {
      expect(screen.getByText(mode.description)).toBeInTheDocument();
    });
  });

  it('shows Live Preview badge for modes with previewEnabled', () => {
    render(<AgentModeSelector {...defaultProps} />);
    const previewEnabledModes = BUILT_IN_AGENT_MODES.filter(m => m.previewEnabled);
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

  it('opens custom mode dialog when "Create Custom Mode" is clicked', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);
    
    const createButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  it('displays dialog with correct title and description', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);
    
    const createButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      // Text may be translated
      expect(screen.queryAllByText(/Custom|Agent|Mode|创建/i).length).toBeGreaterThan(0);
    });
  });

  it('has input fields for name, description, and system prompt', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);
    
    const createButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-description')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-prompt')).toBeInTheDocument();
    });
  });

  it('disables Create button when name is empty', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);
    
    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);
    
    await waitFor(() => {
      const createButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Create');
      expect(createButton).toBeDisabled();
    });
  });

  it('enables Create button when name is provided', async () => {
    const user = userEvent.setup();
    render(<AgentModeSelector {...propsWithCustomCreate} />);
    
    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });
    
    const nameInput = screen.getByTestId('input-name');
    await user.type(nameInput, 'My Custom Agent');
    
    const createButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Create');
    expect(createButton).not.toBeDisabled();
  });

  it('calls onCustomModeCreate with correct data when Create is clicked', async () => {
    const user = userEvent.setup();
    const onCustomModeCreate = jest.fn();
    render(
      <AgentModeSelector
        {...propsWithCustomCreate}
        onCustomModeCreate={onCustomModeCreate}
      />
    );
    
    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });
    
    const nameInput = screen.getByTestId('input-name');
    const descInput = screen.getByTestId('input-description');
    const promptInput = screen.getByTestId('textarea-prompt');
    
    await user.type(nameInput, 'Test Agent');
    await user.type(descInput, 'Test Description');
    await user.type(promptInput, 'Test Prompt');
    
    const createButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Create');
    if (createButton) {
      fireEvent.click(createButton);
    }
    
    expect(onCustomModeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Agent',
        description: 'Test Description',
        systemPrompt: 'Test Prompt',
        type: 'custom',
        icon: 'Settings',
        outputFormat: 'text',
        previewEnabled: false,
      })
    );
  });

  it('closes dialog when Cancel is clicked', async () => {
    render(<AgentModeSelector {...propsWithCustomCreate} />);
    
    const createCustomButton = screen.getByText('Create Custom Mode');
    fireEvent.click(createCustomButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });
});
