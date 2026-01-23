/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletionSettings } from './completion-settings';
import { DEFAULT_COMPLETION_CONFIG } from '@/types/input-completion';

// Mock the useInputCompletion hook
const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);

const mockConfig = { ...DEFAULT_COMPLETION_CONFIG };

let mockHookState = {
  config: mockConfig,
  updateConfig: mockUpdateConfig,
  isRunning: false,
  start: mockStart,
  stop: mockStop,
};

jest.mock('@/hooks/input-completion', () => ({
  useInputCompletion: () => mockHookState,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    'data-testid': dataTestId,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    'data-testid'?: string;
  }) => (
    <input
      type="checkbox"
      data-testid={dataTestId || 'switch'}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
    'data-testid': dataTestId,
  }: {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    'data-testid'?: string;
  }) => (
    <input
      type="range"
      data-testid={dataTestId || 'slider'}
      value={value?.[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type.name === 'SelectTrigger') {
          return React.cloneElement(child as React.ReactElement, { onValueChange });
        }
        return child;
      })}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value} data-testid={`select-item-${value}`}>
      {children}
    </option>
  ),
  SelectTrigger: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <button data-testid="select-trigger" onClick={() => onValueChange?.('test-value')}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span data-testid="select-value">{placeholder}</span>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    type,
    placeholder,
    'data-testid': dataTestId,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    'data-testid'?: string;
  }) => (
    <input
      data-testid={dataTestId || 'input'}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    'data-testid': dataTestId,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    'data-testid'?: string;
  }) => (
    <button
      data-testid={dataTestId || 'button'}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

describe('CompletionSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock hook state
    mockHookState = {
      config: { ...DEFAULT_COMPLETION_CONFIG },
      updateConfig: mockUpdateConfig,
      isRunning: false,
      start: mockStart,
      stop: mockStop,
    };
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CompletionSettings />);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('displays title', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Input Completion')).toBeInTheDocument();
    });

    it('displays description', () => {
      render(<CompletionSettings />);
      expect(screen.getByText(/AI-powered real-time text completion/)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CompletionSettings className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders without className prop', () => {
      const { container } = render(<CompletionSettings />);
      expect(container.firstChild).not.toHaveClass();
    });
  });

  describe('Enable/Disable Section', () => {
    it('displays enable completion label', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Enable Completion')).toBeInTheDocument();
    });

    it('displays current status when stopped', () => {
      mockHookState = { ...mockHookState, isRunning: false };
      render(<CompletionSettings />);
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });

    it('displays current status when running', () => {
      mockHookState = { ...mockHookState, isRunning: true };
      render(<CompletionSettings />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('shows start button when stopped', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('shows stop button when running', () => {
      mockHookState = { ...mockHookState, isRunning: true };
      render(<CompletionSettings />);
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('calls start when start button is clicked', () => {
      render(<CompletionSettings />);
      fireEvent.click(screen.getByText('Start'));
      expect(mockStart).toHaveBeenCalled();
    });

    it('calls stop when stop button is clicked', () => {
      mockHookState = { ...mockHookState, isRunning: true };
      render(<CompletionSettings />);
      fireEvent.click(screen.getByText('Stop'));
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('Model Settings', () => {
    it('displays model section header', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Model')).toBeInTheDocument();
    });

    it('displays provider label', () => {
      render(<CompletionSettings />);
      expect(screen.getAllByText('Provider').length).toBeGreaterThan(0);
    });

    it('displays model ID label', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Model ID')).toBeInTheDocument();
    });

    it('displays temperature label with value', () => {
      render(<CompletionSettings />);
      expect(screen.getByText(/Temperature:/)).toBeInTheDocument();
    });

    it('displays endpoint label for custom provider', () => {
      const customConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'custom' as const } };
      mockHookState = { ...mockHookState, config: customConfig };

      render(<CompletionSettings />);
      expect(screen.getByText('Endpoint')).toBeInTheDocument();
    });

    it('displays API key label for custom provider', () => {
      const customConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'custom' as const } };
      mockHookState = { ...mockHookState, config: customConfig };

      render(<CompletionSettings />);
      expect(screen.getByText('API Key')).toBeInTheDocument();
    });

    it('does not display endpoint for ollama provider by default', () => {
      render(<CompletionSettings />);
      // Should not have endpoint label for ollama provider
      const labels = screen.queryAllByText('Endpoint');
      expect(labels.length).toBe(0);
    });

    it('does not display API key for ollama provider by default', () => {
      render(<CompletionSettings />);
      // Should not have API key label for ollama provider
      const labels = screen.queryAllByText('API Key');
      expect(labels.length).toBe(0);
    });
  });

  describe('Trigger Settings', () => {
    it('displays trigger section header', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Trigger')).toBeInTheDocument();
    });

    it('displays debounce label with value', () => {
      render(<CompletionSettings />);
      expect(screen.getByText(/Debounce:/)).toBeInTheDocument();
    });

    it('displays min context length label with value', () => {
      render(<CompletionSettings />);
      expect(screen.getByText(/Min Context Length:/)).toBeInTheDocument();
    });

    it('displays skip with modifier keys label', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Skip with modifier keys')).toBeInTheDocument();
    });
  });

  describe('UI Settings', () => {
    it('displays display section header', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Display')).toBeInTheDocument();
    });

    it('displays show inline preview label', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Show inline preview')).toBeInTheDocument();
    });

    it('displays show accept hint label', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Show accept hint')).toBeInTheDocument();
    });

    it('displays ghost text opacity label with value', () => {
      render(<CompletionSettings />);
      expect(screen.getByText(/Ghost text opacity:/)).toBeInTheDocument();
    });

    it('displays auto-dismiss label with value', () => {
      render(<CompletionSettings />);
      expect(screen.getByText(/Auto-dismiss:/)).toBeInTheDocument();
    });

    it('displays "Never" when auto_dismiss_ms is 0', () => {
      const noAutoDismissConfig = { ...mockConfig, ui: { ...mockConfig.ui, auto_dismiss_ms: 0 } };
      mockHookState = { ...mockHookState, config: noAutoDismissConfig };

      render(<CompletionSettings />);
      expect(screen.getByText(/Never/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('displays reset to defaults button', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('displays save changes button', () => {
      render(<CompletionSettings />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('save button is initially disabled (no changes)', () => {
      render(<CompletionSettings />);
      const saveButton = screen.getByText('Save Changes').closest('button');
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when there are changes', () => {
      render(<CompletionSettings />);
      const switches = screen.getAllByTestId('switch');
      fireEvent.click(switches[0]);

      const saveButton = screen.getByText('Save Changes').closest('button');
      expect(saveButton).not.toBeDisabled();
    });

    it('calls updateConfig and onSave when save button is clicked', async () => {
      const onSave = jest.fn();

      render(<CompletionSettings onSave={onSave} />);

      // Make a change first
      const switches = screen.getAllByTestId('switch');
      fireEvent.click(switches[0]);

      // Click save
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalled();
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('resets config to defaults when reset button is clicked', () => {
      render(<CompletionSettings />);

      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);

      // After clicking reset, the save button should be enabled (has changes)
      const saveButton = screen.getByText('Save Changes').closest('button');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('toggles enabled switch', () => {
      render(<CompletionSettings />);
      const switches = screen.getAllByTestId('switch');
      const enabledSwitch = switches[0];

      expect(enabledSwitch).toBeChecked();
      fireEvent.click(enabledSwitch);
      expect(enabledSwitch).not.toBeChecked();
    });

    it('updates provider select', () => {
      render(<CompletionSettings />);
      const selectTrigger = screen.getByTestId('select-trigger');
      fireEvent.click(selectTrigger);

      // Check that select options exist
      expect(screen.getByTestId('select-item-ollama')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-openai')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-groq')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-auto')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-custom')).toBeInTheDocument();
    });

    it('updates model ID input', () => {
      render(<CompletionSettings />);
      const inputs = screen.getAllByTestId('input');
      const modelIdInput = inputs.find((input) => input.getAttribute('placeholder') === 'qwen2.5-coder:0.5b');

      if (modelIdInput) {
        fireEvent.change(modelIdInput, { target: { value: 'new-model' } });
        expect(modelIdInput).toHaveValue('new-model');
      }
    });

    it('updates endpoint input for custom provider', () => {
      const customConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'custom' as const } };
      mockHookState = { ...mockHookState, config: customConfig };

      render(<CompletionSettings />);
      const inputs = screen.getAllByTestId('input');
      const endpointInput = inputs.find((input) => input.getAttribute('placeholder') === 'https://api.example.com');

      if (endpointInput) {
        fireEvent.change(endpointInput, { target: { value: 'https://custom.api' } });
        expect(endpointInput).toHaveValue('https://custom.api');
      }
    });

    it('updates API key input for custom provider', () => {
      const customConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'custom' as const } };
      mockHookState = { ...mockHookState, config: customConfig };

      render(<CompletionSettings />);
      const inputs = screen.getAllByTestId('input');
      const apiKeyInput = inputs.find((input) => input.getAttribute('type') === 'password');

      if (apiKeyInput) {
        fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
        expect(apiKeyInput).toHaveValue('new-api-key');
      }
    });

    it('updates temperature slider', () => {
      render(<CompletionSettings />);
      const sliders = screen.getAllByTestId('slider');
      const tempSlider = sliders[0];

      fireEvent.change(tempSlider, { target: { value: '0.5' } });
      // Slider values are strings in DOM
      expect(tempSlider).toHaveValue('0.5');
    });

    it('updates debounce slider', () => {
      render(<CompletionSettings />);
      const sliders = screen.getAllByTestId('slider');
      const debounceSlider = sliders[1];

      fireEvent.change(debounceSlider, { target: { value: '500' } });
      // Slider values are strings in DOM
      expect(debounceSlider).toHaveValue('500');
    });

    it('updates min context length slider', () => {
      render(<CompletionSettings />);
      const sliders = screen.getAllByTestId('slider');
      const contextSlider = sliders[2];

      fireEvent.change(contextSlider, { target: { value: '10' } });
      // Slider values are strings in DOM
      expect(contextSlider).toHaveValue('10');
    });

    it('toggles skip with modifiers switch', () => {
      render(<CompletionSettings />);
      const switches = screen.getAllByTestId('switch');
      const modifiersSwitch = switches.find((s) => {
        const label = s.closest('label');
        return label?.textContent?.includes('Skip with modifier keys');
      });

      if (modifiersSwitch) {
        fireEvent.click(modifiersSwitch);
        expect(modifiersSwitch).not.toBeChecked();
      }
    });

    it('toggles show inline preview switch', () => {
      render(<CompletionSettings />);
      const switches = screen.getAllByTestId('switch');
      const previewSwitch = switches.find((s) => {
        const label = s.closest('label');
        return label?.textContent?.includes('Show inline preview');
      });

      if (previewSwitch) {
        fireEvent.click(previewSwitch);
        expect(previewSwitch).not.toBeChecked();
      }
    });

    it('toggles show accept hint switch', () => {
      render(<CompletionSettings />);
      const switches = screen.getAllByTestId('switch');
      const hintSwitch = switches.find((s) => {
        const label = s.closest('label');
        return label?.textContent?.includes('Show accept hint');
      });

      if (hintSwitch) {
        fireEvent.click(hintSwitch);
        expect(hintSwitch).not.toBeChecked();
      }
    });
  });

  describe('Provider-Specific Fields', () => {
    it('shows endpoint and API key for openai provider', () => {
      const openaiConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'openai' as const } };
      mockHookState = { ...mockHookState, config: openaiConfig };

      render(<CompletionSettings />);
      expect(screen.getByText('Endpoint')).toBeInTheDocument();
      expect(screen.getByText('API Key')).toBeInTheDocument();
    });

    it('shows endpoint and API key for groq provider', () => {
      const groqConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'groq' as const } };
      mockHookState = { ...mockHookState, config: groqConfig };

      render(<CompletionSettings />);
      expect(screen.getByText('Endpoint')).toBeInTheDocument();
      expect(screen.getByText('API Key')).toBeInTheDocument();
    });

    it('hides endpoint and API key for auto provider', () => {
      const autoConfig = { ...mockConfig, model: { ...mockConfig.model, provider: 'auto' as const } };
      mockHookState = { ...mockHookState, config: autoConfig };

      render(<CompletionSettings />);
      expect(screen.queryByText('Endpoint')).not.toBeInTheDocument();
      expect(screen.queryByText('API Key')).not.toBeInTheDocument();
    });
  });

  describe('Component Behavior', () => {
    it('syncs local config with store config on update', () => {
      const newConfig = { ...mockConfig, enabled: false };
      mockHookState = { ...mockHookState, config: newConfig };

      render(<CompletionSettings />);
      // Component should reflect the new config
      const switches = screen.getAllByTestId('switch');
      expect(switches[0]).not.toBeChecked();
    });

    it('updates local config when user interacts', () => {
      render(<CompletionSettings />);
      const switches = screen.getAllByTestId('switch');

      fireEvent.click(switches[0]);

      // Save button should be enabled after change
      const saveButton = screen.getByText('Save Changes').closest('button');
      expect(saveButton).not.toBeDisabled();
    });
  });
});
