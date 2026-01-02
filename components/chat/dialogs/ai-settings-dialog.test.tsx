/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AISettingsDialog, type AISettings } from './ai-settings-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'AI Message Settings',
      description: 'Configure AI generation parameters for this conversation',
      temperature: 'Temperature',
      temperatureDesc: 'Controls randomness. Lower values are more focused, higher values are more creative.',
      precise: 'Precise',
      balanced: 'Balanced',
      creative: 'Creative',
      maxTokens: 'Max Tokens',
      maxTokensDesc: 'Maximum number of tokens in the response.',
      topP: 'Top P (Nucleus Sampling)',
      topPTooltip: 'Nucleus sampling parameter',
      topPDesc: 'Alternative to temperature. Consider tokens with top_p probability mass.',
      frequencyPenalty: 'Frequency Penalty',
      frequencyPenaltyDesc: 'Reduces repetition by penalizing tokens based on frequency.',
      presencePenalty: 'Presence Penalty',
      presencePenaltyDesc: 'Encourages new topics by penalizing tokens that have appeared.',
      resetDefaults: 'Reset to Defaults',
      done: 'Done',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} data-variant={variant} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step }: { value: number[]; onValueChange: (v: number[]) => void; min: number; max: number; step?: number }) => (
    <input
      type="range"
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      data-testid="slider"
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      data-testid="input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('AISettingsDialog', () => {
  const defaultSettings: AISettings = {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  };

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    settings: defaultSettings,
    onSettingsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<AISettingsDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<AISettingsDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays the dialog title', () => {
    render(<AISettingsDialog {...defaultProps} />);
    expect(screen.getByText('AI Message Settings')).toBeInTheDocument();
  });

  it('displays all setting labels', () => {
    render(<AISettingsDialog {...defaultProps} />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Max Tokens')).toBeInTheDocument();
    expect(screen.getByText('Top P (Nucleus Sampling)')).toBeInTheDocument();
    expect(screen.getByText('Frequency Penalty')).toBeInTheDocument();
    expect(screen.getByText('Presence Penalty')).toBeInTheDocument();
  });

  it('displays current temperature value', () => {
    render(<AISettingsDialog {...defaultProps} />);
    expect(screen.getByText('0.7')).toBeInTheDocument();
  });

  it('displays temperature label based on value', () => {
    // Test balanced (0.7)
    render(<AISettingsDialog {...defaultProps} />);
    expect(screen.getByText('Balanced')).toBeInTheDocument();
  });

  it('displays precise label for low temperature', () => {
    const lowTempSettings = { ...defaultSettings, temperature: 0.2 };
    render(<AISettingsDialog {...defaultProps} settings={lowTempSettings} />);
    expect(screen.getByText('Precise')).toBeInTheDocument();
  });

  it('displays creative label for high temperature', () => {
    const highTempSettings = { ...defaultSettings, temperature: 1.5 };
    render(<AISettingsDialog {...defaultProps} settings={highTempSettings} />);
    expect(screen.getByText('Creative')).toBeInTheDocument();
  });

  it('calls onSettingsChange when temperature slider changes', () => {
    render(<AISettingsDialog {...defaultProps} />);
    const sliders = screen.getAllByTestId('slider');
    fireEvent.change(sliders[0], { target: { value: '0.5' } });
    expect(defaultProps.onSettingsChange).toHaveBeenCalledWith({ temperature: 0.5 });
  });

  it('calls onSettingsChange when maxTokens input changes', () => {
    render(<AISettingsDialog {...defaultProps} />);
    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: '8192' } });
    expect(defaultProps.onSettingsChange).toHaveBeenCalledWith({ maxTokens: 8192 });
  });

  it('calls onSettingsChange with reset values when Reset to Defaults is clicked', () => {
    const customSettings: AISettings = {
      temperature: 1.5,
      maxTokens: 8192,
      topP: 0.5,
      frequencyPenalty: 1,
      presencePenalty: 1,
    };
    render(<AISettingsDialog {...defaultProps} settings={customSettings} />);
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(defaultProps.onSettingsChange).toHaveBeenCalledWith({
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });
  });

  it('uses custom defaultSettings for reset when provided', () => {
    const customDefaults: AISettings = {
      temperature: 0.5,
      maxTokens: 2048,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
    };
    render(
      <AISettingsDialog
        {...defaultProps}
        defaultSettings={customDefaults}
      />
    );
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(defaultProps.onSettingsChange).toHaveBeenCalledWith(customDefaults);
  });

  it('calls onOpenChange when Done button is clicked', () => {
    render(<AISettingsDialog {...defaultProps} />);
    const doneButton = screen.getByText('Done');
    fireEvent.click(doneButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays footer with Reset and Done buttons', () => {
    render(<AISettingsDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('handles minimum maxTokens value correctly', () => {
    render(<AISettingsDialog {...defaultProps} />);
    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: '0' } });
    expect(defaultProps.onSettingsChange).toHaveBeenCalledWith({ maxTokens: 1 });
  });

  it('handles invalid maxTokens input', () => {
    render(<AISettingsDialog {...defaultProps} />);
    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'invalid' } });
    expect(defaultProps.onSettingsChange).toHaveBeenCalledWith({ maxTokens: 1 });
  });
});
