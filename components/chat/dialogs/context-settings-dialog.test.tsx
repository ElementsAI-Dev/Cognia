/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextSettingsDialog } from './context-settings-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Context Settings',
      description: 'Configure context window settings',
      wordEncoder: 'Word Encoder',
      tiktokenDesc: 'OpenAI tiktoken encoder (accurate)',
      regexDesc: 'Regex-based encoder (fast)',
      contextLength: 'Context Length',
      contextLengthDesc: 'Maximum context window size',
      contextUsage: 'Context Usage',
      tokenLimit: 'Token Limit',
      tokenLimitDesc: 'Set the maximum token limit',
      token: 'Token',
      remaining: `${params?.count || 0} remaining`,
      system: 'System',
      context: 'Context',
      showMemoryActivation: 'Show Memory Activation',
      memoryActivationDesc: 'Display memory activation indicators',
      showTokenUsage: 'Show Token Usage',
      tokenUsageDesc: 'Display token usage meter',
      currentStats: 'Current Statistics',
      events: 'Events',
      activeTokens: 'Active Tokens',
      used: 'Used',
      limit: 'Limit',
      remainingTokens: 'Remaining',
      statusHealthy: 'Healthy',
      statusWarning: 'Warning',
      statusDanger: 'Near Limit',
      advancedSettings: 'Advanced Settings',
      compressionSettings: 'Compression Settings',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    compressionSettings: {
      enabled: false,
      strategy: 'sliding-window',
      trigger: 'auto',
      tokenThreshold: 80000,
      messageThreshold: 50,
      preserveRecentCount: 10,
    },
    setCompressionEnabled: jest.fn(),
    setCompressionStrategy: jest.fn(),
    setCompressionTrigger: jest.fn(),
    setCompressionTokenThreshold: jest.fn(),
    setCompressionMessageThreshold: jest.fn(),
    setCompressionPreserveRecent: jest.fn(),
  }),
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

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="switch"
    />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max }: { value: number[]; onValueChange: (v: number[]) => void; min: number; max: number }) => (
    <input
      type="range"
      value={value[0]}
      min={min}
      max={max}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      data-testid="slider"
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('ContextSettingsDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    totalTokens: 100000,
    usedTokens: 25000,
    systemTokens: 5000,
    contextTokens: 20000,
    contextLimitPercent: 50,
    onContextLimitChange: jest.fn(),
    showMemoryActivation: false,
    onShowMemoryActivationChange: jest.fn(),
    showTokenUsageMeter: true,
    onShowTokenUsageMeterChange: jest.fn(),
    modelMaxTokens: 200000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ContextSettingsDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Context Settings')).toBeInTheDocument();
  });

  it('displays word encoder section', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Word Encoder')).toBeInTheDocument();
  });

  it('displays tiktoken encoder option', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText(/o200k_base/)).toBeInTheDocument();
  });

  it('displays regex encoder option', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText(/Regex/)).toBeInTheDocument();
  });

  it('displays dialog content', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Configure context window settings')).toBeInTheDocument();
  });

  it('displays usage percentage', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    // 25% appears multiple times (context usage and token section)
    expect(screen.getAllByText('25%').length).toBeGreaterThan(0);
  });

  it('displays token limit slider', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('calls onContextLimitChange when slider changes', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    const slider = screen.getByTestId('slider');
    fireEvent.change(slider, { target: { value: 75 } });
    expect(defaultProps.onContextLimitChange).toHaveBeenCalledWith(75);
  });

  it('displays used tokens', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Used')).toBeInTheDocument();
    expect(screen.getByText('25,000')).toBeInTheDocument();
  });

  it('displays limit tokens', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Limit')).toBeInTheDocument();
  });

  it('displays remaining label', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('displays memory activation toggle', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Show Memory Activation')).toBeInTheDocument();
  });

  it('displays token usage toggle', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Show Token Usage')).toBeInTheDocument();
  });

  it('calls onShowMemoryActivationChange when toggle changes', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    const switches = screen.getAllByTestId('switch');
    fireEvent.click(switches[0]); // First switch is memory activation
    expect(defaultProps.onShowMemoryActivationChange).toHaveBeenCalled();
  });

  it('calls onShowTokenUsageMeterChange when toggle changes', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    const switches = screen.getAllByTestId('switch');
    fireEvent.click(switches[1]); // Second switch is token usage
    expect(defaultProps.onShowTokenUsageMeterChange).toHaveBeenCalled();
  });

  it('displays context settings title', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    expect(screen.getByText('Context Settings')).toBeInTheDocument();
  });

  it('calculates token limit correctly', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    // 50% of 200000 = 100000
    expect(screen.getAllByText(/100,000/).length).toBeGreaterThan(0);
  });

  it('displays remaining tokens', () => {
    render(<ContextSettingsDialog {...defaultProps} />);
    // 100000 - 25000 = 75000 remaining
    expect(screen.getByText('75,000')).toBeInTheDocument();
  });
});
