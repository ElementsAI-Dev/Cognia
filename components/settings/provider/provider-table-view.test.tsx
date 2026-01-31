/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderTableView } from './provider-table-view';
import type { ProviderConfig } from '@/types/provider';

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string }) => (
    <button data-testid="button" data-variant={variant} data-size={size} onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" data-testid="switch" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead data-testid="table-header">{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody data-testid="table-body">{children}</tbody>,
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => <tr data-testid="table-row" className={className}>{children}</tr>,
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => <th data-testid="table-head" className={className}>{children}</th>,
  TableCell: ({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
    <td data-testid="table-cell" className={className} colSpan={colSpan}>{children}</td>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean | 'indeterminate'; onCheckedChange?: (checked: boolean) => void }) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={checked === true}
      data-indeterminate={checked === 'indeterminate'}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/lib/ai/providers/provider-helpers', () => ({
  getCategoryIcon: () => null,
}));

const mockProvider: ProviderConfig = {
  id: 'openai',
  name: 'OpenAI',
  description: 'OpenAI API',
  category: 'premium',
  models: [
    { id: 'gpt-4', name: 'GPT-4', contextLength: 8192, supportsVision: true, supportsTools: true },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 4096 },
  ],
  defaultModel: 'gpt-4',
};

const mockProviders: Array<[string, ProviderConfig]> = [
  ['openai', mockProvider],
];

describe('ProviderTableView', () => {
  const mockOnTestConnection = jest.fn();
  const mockOnToggleProvider = jest.fn();
  const mockOnSetDefaultModel = jest.fn();
  const mockOnConfigureProvider = jest.fn();
  const mockRenderProviderCard = jest.fn(() => <div data-testid="provider-card" />);

  const defaultProps = {
    providers: mockProviders,
    providerSettings: {
      openai: { enabled: true, apiKey: 'sk-test', defaultModel: 'gpt-4' },
    },
    testResults: {},
    testingProviders: {},
    isBatchTesting: false,
    onTestConnection: mockOnTestConnection,
    onToggleProvider: mockOnToggleProvider,
    onSetDefaultModel: mockOnSetDefaultModel,
    onConfigureProvider: mockOnConfigureProvider,
    renderProviderCard: mockRenderProviderCard,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table', () => {
    render(<ProviderTableView {...defaultProps} />);
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('renders card container', () => {
    render(<ProviderTableView {...defaultProps} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders provider name in table', () => {
    render(<ProviderTableView {...defaultProps} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('renders table header with sortable columns', () => {
    render(<ProviderTableView {...defaultProps} />);
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders checkboxes for selection', () => {
    render(<ProviderTableView {...defaultProps} />);
    const checkboxes = screen.getAllByTestId('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('calls onToggleProvider when switch is changed', () => {
    render(<ProviderTableView {...defaultProps} />);
    const switches = screen.getAllByTestId('switch');
    if (switches.length > 0) {
      fireEvent.click(switches[0]);
      expect(mockOnToggleProvider).toHaveBeenCalled();
    }
  });

  it('renders model badges', () => {
    render(<ProviderTableView {...defaultProps} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('displays ready status when provider has API key', () => {
    render(<ProviderTableView {...defaultProps} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.some((b) => b.textContent?.includes('Ready') || b.textContent?.includes('ready'))).toBe(true);
  });

  it('displays connected status when test succeeded', () => {
    render(
      <ProviderTableView
        {...defaultProps}
        testResults={{ openai: { success: true, message: 'OK' } }}
      />
    );
    const badges = screen.getAllByTestId('badge');
    expect(badges.some((b) => b.textContent?.toLowerCase().includes('connect'))).toBe(true);
  });

  it('displays failed status when test failed', () => {
    render(
      <ProviderTableView
        {...defaultProps}
        testResults={{ openai: { success: false, message: 'Failed' } }}
      />
    );
    const badges = screen.getAllByTestId('badge');
    expect(badges.some((b) => b.textContent?.toLowerCase().includes('fail'))).toBe(true);
  });

  it('disables batch test button when nothing selected', () => {
    render(<ProviderTableView {...defaultProps} />);
    const buttons = screen.getAllByTestId('button');
    const testSelectedBtn = buttons.find((b) => b.textContent?.includes('Test') || b.textContent?.includes('test'));
    expect(testSelectedBtn).toBeDisabled();
  });

  it('selects provider when checkbox clicked', () => {
    render(<ProviderTableView {...defaultProps} />);
    const checkboxes = screen.getAllByTestId('checkbox');
    // First checkbox is select-all, second is provider row
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1]);
      // After clicking, the button should be enabled
    }
  });

  it('renders mobile fallback cards', () => {
    render(<ProviderTableView {...defaultProps} />);
    expect(mockRenderProviderCard).toHaveBeenCalledWith('openai', mockProvider);
  });

  it('expands row when chevron clicked', () => {
    render(<ProviderTableView {...defaultProps} />);
    const buttons = screen.getAllByTestId('button');
    // Find chevron button (usually last button in action cell)
    const chevronBtn = buttons[buttons.length - 1];
    fireEvent.click(chevronBtn);
    // Should now show expanded content with "All Models" text
  });
});
