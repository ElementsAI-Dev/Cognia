/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExternalAgentConfigOptions } from './external-agent-config-options';
import type { AcpConfigOption, AcpConfigOptionCategory } from '@/types/agent/external-agent';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  Settings2: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-settings2" />,
  Brain: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-brain" />,
  Cpu: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-cpu" />,
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-sparkles" />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {children}
      {onValueChange && (
        <button data-testid="select-change" onClick={() => onValueChange('new-value')}>
          change
        </button>
      )}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockConfigOptions: AcpConfigOption[] = [
  {
    id: 'model',
    name: 'Model',
    description: 'Select the AI model',
    category: 'model' as AcpConfigOptionCategory,
    type: 'select',
    options: [
      { value: 'gpt-4', name: 'GPT-4' },
      { value: 'claude-3', name: 'Claude 3' },
    ],
    currentValue: 'gpt-4',
  },
];

describe('ExternalAgentConfigOptions', () => {
  const mockOnSet = jest.fn(async () => mockConfigOptions);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders config options', () => {
    render(
      <ExternalAgentConfigOptions
        configOptions={mockConfigOptions}
        onSetConfigOption={mockOnSet}
      />
    );
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('renders nothing when no config options', () => {
    const { container } = render(
      <ExternalAgentConfigOptions
        configOptions={[]}
        onSetConfigOption={mockOnSet}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onSetConfigOption when value changes', async () => {
    render(
      <ExternalAgentConfigOptions
        configOptions={mockConfigOptions}
        onSetConfigOption={mockOnSet}
      />
    );

    fireEvent.click(screen.getByTestId('select-change'));

    await waitFor(() => {
      expect(mockOnSet).toHaveBeenCalledWith('model', 'new-value');
    });
  });

  it('disables selects when disabled prop is true', () => {
    render(
      <ExternalAgentConfigOptions
        configOptions={mockConfigOptions}
        onSetConfigOption={mockOnSet}
        disabled
      />
    );
    expect(screen.getByTestId('select')).toHaveAttribute('data-disabled', 'true');
  });
});
