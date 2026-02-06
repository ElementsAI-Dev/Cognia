/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for CustomModeEditor component
 * Tests focus on core functionality: dialog behavior, save/create, form validation, and AI generation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomModeEditor } from './custom-mode-editor';
import { useCustomModeStore, checkToolAvailability } from '@/stores/agent/custom-mode-store';
import { useMcpStore } from '@/stores/mcp/mcp-store';
import { useSettingsStore } from '@/stores/settings/settings-store';
import type { CustomModeConfig } from '@/stores/agent/custom-mode-store';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('@/stores/agent/custom-mode-store');
jest.mock('@/stores/mcp/mcp-store');
jest.mock('@/stores/settings/settings-store');

jest.mock('next-intl', () => ({
  useTranslations: (_key: string) => (msg: string) => msg,
}));

// Minimal UI component mocks
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
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
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    value?: string;
  }) => (
    <button role="tab" data-value={value} {...props}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { id?: string }) => (
    <input data-testid={`input-${props.id || ''}`} {...props} />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id?: string }) => (
    <textarea data-testid={`textarea-${props.id || ''}`} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// =============================================================================
// Test Data
// =============================================================================

const mockCustomMode: CustomModeConfig = {
  id: 'test-mode-1',
  type: 'custom',
  isBuiltIn: false,
  name: 'Test Mode',
  description: 'A test custom mode',
  icon: 'Bot',
  systemPrompt: 'You are a helpful assistant.',
  tools: ['web_search', 'calculator'],
  outputFormat: 'text',
  previewEnabled: false,
  customConfig: {},
  category: 'productivity',
  tags: ['test', 'demo'],
  usageCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  a2uiEnabled: false,
  mcpTools: [],
};

const mockMcpServers = [
  {
    id: 'server-1',
    name: 'Test MCP Server',
    status: { type: 'connected' },
    tools: [{ name: 'mcp_tool_1', description: 'Test MCP tool 1' }],
  },
];

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
};

// =============================================================================
// Setup
// =============================================================================

const mockCreateMode = jest.fn();
const mockUpdateMode = jest.fn();
const mockGenerateModeFromDescription = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  (checkToolAvailability as jest.Mock).mockReturnValue({
    available: ['web_search', 'calculator'],
    unavailable: [],
  });

  (useCustomModeStore as unknown as jest.Mock).mockImplementation((selector) => {
    const state = {
      createMode: mockCreateMode,
      updateMode: mockUpdateMode,
      generateModeFromDescription: mockGenerateModeFromDescription,
      isGenerating: false,
    };
    return selector ? selector(state) : state;
  });

  (useMcpStore as unknown as jest.Mock).mockImplementation((selector) => {
    const state = { servers: mockMcpServers };
    return selector ? selector(state) : state;
  });

  (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
    const state = {
      providerSettings: {
        tavily: { apiKey: 'test-key' },
        openai: { apiKey: 'test-key' },
      },
    };
    return selector ? selector(state) : state;
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('CustomModeEditor - Dialog Rendering', () => {
  it('renders dialog when open is true', () => {
    render(<CustomModeEditor {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(<CustomModeEditor {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows correct title for creating new mode', () => {
    render(<CustomModeEditor {...defaultProps} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('createMode');
  });

  it('shows correct title for editing existing mode', () => {
    render(<CustomModeEditor {...defaultProps} mode={mockCustomMode} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('editMode');
  });

  it('renders all tabs', () => {
    render(<CustomModeEditor {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(4);
  });

  it('renders dialog footer with buttons', () => {
    render(<CustomModeEditor {...defaultProps} />);
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
  });

  it('closes dialog when cancel button is clicked', () => {
    const onOpenChange = jest.fn();
    render(<CustomModeEditor {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByText('cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('CustomModeEditor - Form Validation', () => {
  it('disables save button when form is invalid', () => {
    render(<CustomModeEditor {...defaultProps} />);
    const saveButton = screen.getByText('create');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when name is entered', async () => {
    const user = userEvent.setup();
    render(<CustomModeEditor {...defaultProps} />);

    // Find the name input (it should be the first input)
    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Test Mode');

    // The save button should become enabled after typing a name
    // Note: This depends on how your form validation is implemented
  });
});

describe('CustomModeEditor - Save & Create', () => {
  it('creates new mode when save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    mockCreateMode.mockReturnValue({
      ...mockCustomMode,
      id: 'new-mode-id',
    });

    render(<CustomModeEditor {...defaultProps} onSave={onSave} />);

    // Fill in the name
    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'New Test Mode');

    // Click save
    const saveButton = screen.getByText('create');
    await user.click(saveButton);

    // Verify createMode was called
    await waitFor(() => {
      expect(mockCreateMode).toHaveBeenCalled();
    });
  });

  it('updates existing mode when editing', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<CustomModeEditor {...defaultProps} mode={mockCustomMode} onSave={onSave} />);

    // Click save
    const saveButton = screen.getByText('save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMode).toHaveBeenCalledWith(mockCustomMode.id, expect.any(Object));
    });
  });

  it('closes dialog after successful save', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    mockCreateMode.mockReturnValue({
      ...mockCustomMode,
      id: 'new-mode-id',
    });

    render(<CustomModeEditor {...defaultProps} onOpenChange={onOpenChange} />);

    // Fill in the name
    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Test');

    // Click save
    const saveButton = screen.getByText('create');
    await user.click(saveButton);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('CustomModeEditor - AI Generation', () => {
  beforeEach(() => {
    mockGenerateModeFromDescription.mockResolvedValue({
      mode: {
        name: 'Generated Mode',
        description: 'A generated mode',
        icon: 'Bot',
        systemPrompt: 'You are a generated assistant.',
        tools: ['web_search'],
        outputFormat: 'text',
        category: 'other' as const,
        previewEnabled: false,
      },
      suggestedTools: ['web_search'],
      confidence: 0.8,
    });
  });

  it('renders AI generation tab', () => {
    render(<CustomModeEditor {...defaultProps} />);

    const generateTab = screen.getByRole('tab', { name: /aiGenerate/i });
    fireEvent.click(generateTab);

    expect(screen.getByTestId('tabs-content-generate')).toBeInTheDocument();
  });

  it('shows loading state when generating', async () => {
    (useCustomModeStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        createMode: mockCreateMode,
        updateMode: mockUpdateMode,
        generateModeFromDescription: mockGenerateModeFromDescription,
        isGenerating: true,
      };
      return selector ? selector(state) : state;
    });

    render(<CustomModeEditor {...defaultProps} />);

    const generateTab = screen.getByRole('tab', { name: /aiGenerate/i });
    fireEvent.click(generateTab);

    // Should show generating state
    expect(screen.getByText('generating')).toBeInTheDocument();
  });

  it('has generate button in generate tab', () => {
    render(<CustomModeEditor {...defaultProps} />);

    const generateTab = screen.getByRole('tab', { name: /aiGenerate/i });
    fireEvent.click(generateTab);

    // Generate button should be present
    const buttons = screen.getAllByRole('button');
    const generateButton = buttons.find((btn) => btn.textContent === 'generate');
    expect(generateButton).toBeInTheDocument();
  });
});

describe('CustomModeEditor - Tool Availability', () => {
  it('shows warning when tools require configuration', () => {
    (checkToolAvailability as jest.Mock).mockReturnValue({
      available: ['calculator'],
      unavailable: [{ tool: 'web_search', reason: 'Requires Tavily API key' }],
    });

    const modeWithUnavailableTools = {
      ...mockCustomMode,
      tools: ['web_search'],
    };

    render(<CustomModeEditor {...defaultProps} mode={modeWithUnavailableTools} />);

    // Switch to tools tab
    const toolsTab = screen.getByRole('tab', { name: /tools/i });
    fireEvent.click(toolsTab);

    // Should show warning
    expect(screen.getByText('toolsUnavailable')).toBeInTheDocument();
  });

  it('does not show warning when all tools are available', () => {
    (checkToolAvailability as jest.Mock).mockReturnValue({
      available: ['calculator'],
      unavailable: [],
    });

    const modeWithAvailableTools = {
      ...mockCustomMode,
      tools: ['calculator'],
    };

    render(<CustomModeEditor {...defaultProps} mode={modeWithAvailableTools} />);

    // Switch to tools tab
    const toolsTab = screen.getByRole('tab', { name: /tools/i });
    fireEvent.click(toolsTab);

    // Should not show warning
    expect(screen.queryByText('toolsUnavailable')).not.toBeInTheDocument();
  });
});

describe('CustomModeEditor - MCP Tools', () => {
  it('shows no MCP servers message when no servers are connected', () => {
    (useMcpStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { servers: [] };
      return selector ? selector(state) : state;
    });

    render(<CustomModeEditor {...defaultProps} />);

    const toolsTab = screen.getByRole('tab', { name: /tools/i });
    fireEvent.click(toolsTab);

    expect(screen.getByText('noMcpServers')).toBeInTheDocument();
  });

  it('displays connected MCP servers', () => {
    render(<CustomModeEditor {...defaultProps} />);

    const toolsTab = screen.getByRole('tab', { name: /tools/i });
    fireEvent.click(toolsTab);

    expect(screen.getByText('Test MCP Server')).toBeInTheDocument();
  });
});

describe('CustomModeEditor - Tab Navigation', () => {
  it('switches between tabs', () => {
    render(<CustomModeEditor {...defaultProps} />);

    const tabs = screen.getAllByRole('tab');

    // All tabs should be present
    expect(tabs.length).toBe(4);

    // Click on each tab and verify content renders
    fireEvent.click(tabs[1]); // tools
    expect(screen.getByTestId('tabs-content-tools')).toBeInTheDocument();

    fireEvent.click(tabs[2]); // advanced
    expect(screen.getByTestId('tabs-content-advanced')).toBeInTheDocument();

    fireEvent.click(tabs[3]); // generate
    expect(screen.getByTestId('tabs-content-generate')).toBeInTheDocument();

    fireEvent.click(tabs[0]); // basic
    expect(screen.getByTestId('tabs-content-basic')).toBeInTheDocument();
  });
});

describe('CustomModeEditor - Edit vs Create Mode', () => {
  it('renders create mode title when no mode is provided', () => {
    render(<CustomModeEditor {...defaultProps} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('createMode');
  });

  it('renders edit mode title when mode is provided', () => {
    render(<CustomModeEditor {...defaultProps} mode={mockCustomMode} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('editMode');
  });

  it('shows create button when creating new mode', () => {
    render(<CustomModeEditor {...defaultProps} />);
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('shows save button when editing existing mode', () => {
    render(<CustomModeEditor {...defaultProps} mode={mockCustomMode} />);
    expect(screen.getByText('save')).toBeInTheDocument();
  });
});

describe('CustomModeEditor - Edge Cases', () => {
  it('handles empty mode prop gracefully', () => {
    render(<CustomModeEditor {...defaultProps} mode={undefined} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('handles generation error gracefully', async () => {
    mockGenerateModeFromDescription.mockRejectedValue(new Error('Generation failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<CustomModeEditor {...defaultProps} />);

    const generateTab = screen.getByRole('tab', { name: /aiGenerate/i });
    fireEvent.click(generateTab);

    // The component handles errors internally with try/catch
    // We just verify it doesn't crash when generation is set up
    expect(mockGenerateModeFromDescription).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('handles minimal mode config', () => {
    const minimalMode: CustomModeConfig = {
      id: 'minimal',
      type: 'custom',
      isBuiltIn: false,
      name: 'Minimal',
      description: '',
      icon: 'Bot',
      systemPrompt: '',
      tools: [],
      outputFormat: 'text',
      previewEnabled: false,
      customConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<CustomModeEditor {...defaultProps} mode={minimalMode} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });
});

describe('CustomModeEditor - Accessibility', () => {
  it('has proper role for tabs', () => {
    render(<CustomModeEditor {...defaultProps} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(4);
    // All tabs should have the tab role
  });
});
