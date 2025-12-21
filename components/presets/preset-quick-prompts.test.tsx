/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetQuickPrompts } from './preset-quick-prompts';
import type { BuiltinPrompt } from '@/types/preset';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverContent: ({ children, className, align }: { children: React.ReactNode; className?: string; align?: string }) => (
    <div data-testid="popover-content" className={className} data-align={align}>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

describe('PresetQuickPrompts', () => {
  const mockPrompts: BuiltinPrompt[] = [
    {
      id: 'prompt-1',
      name: 'Explain Code',
      content: 'Please explain this code in detail.',
      description: 'Get detailed explanation of code',
    },
    {
      id: 'prompt-2',
      name: 'Fix Bug',
      content: 'Help me fix this bug in my code.',
      description: 'Find and fix bugs',
    },
    {
      id: 'prompt-3',
      name: 'Refactor',
      content: 'Refactor this code to be cleaner.',
    },
  ];

  const mockOnSelectPrompt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays Quick text on trigger', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    expect(screen.getByText('Quick')).toBeInTheDocument();
  });

  it('renders prompt names in popover', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    expect(screen.getByText('Explain Code')).toBeInTheDocument();
    expect(screen.getByText('Fix Bug')).toBeInTheDocument();
    expect(screen.getByText('Refactor')).toBeInTheDocument();
  });

  it('renders prompt descriptions', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    expect(screen.getByText('Get detailed explanation of code')).toBeInTheDocument();
    expect(screen.getByText('Find and fix bugs')).toBeInTheDocument();
  });

  it('renders prompt content previews', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    expect(screen.getByText('Please explain this code in detail.')).toBeInTheDocument();
    expect(screen.getByText('Help me fix this bug in my code.')).toBeInTheDocument();
  });

  it('calls onSelectPrompt when prompt is clicked', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    fireEvent.click(screen.getByText('Explain Code'));
    expect(mockOnSelectPrompt).toHaveBeenCalledWith('Please explain this code in detail.');
  });

  it('returns null when prompts array is empty', () => {
    const { container } = render(<PresetQuickPrompts prompts={[]} onSelectPrompt={mockOnSelectPrompt} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when prompts is undefined', () => {
    const { container } = render(<PresetQuickPrompts prompts={undefined as unknown as BuiltinPrompt[]} onSelectPrompt={mockOnSelectPrompt} />);
    expect(container.firstChild).toBeNull();
  });

  it('disables button when disabled prop is true', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders header in popover', () => {
    render(<PresetQuickPrompts prompts={mockPrompts} onSelectPrompt={mockOnSelectPrompt} />);
    expect(screen.getByText('Quick Prompts')).toBeInTheDocument();
    expect(screen.getByText('Click to insert into your message')).toBeInTheDocument();
  });
});
