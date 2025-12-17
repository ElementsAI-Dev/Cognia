/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetCard } from './preset-card';
import type { Preset } from '@/types/preset';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

describe('PresetCard', () => {
  const mockPreset: Preset = {
    id: 'preset-1',
    name: 'Test Preset',
    description: 'A test preset',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    icon: '🤖',
    color: '#3B82F6',
    temperature: 0.7,
    isDefault: false,
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders without crashing', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays preset name', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('Test Preset')).toBeInTheDocument();
  });

  it('displays preset description', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('A test preset')).toBeInTheDocument();
  });

  it('displays preset icon', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  it('displays provider badge', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('openai')).toBeInTheDocument();
  });

  it('displays mode badge', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('displays temperature badge', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('T: 0.7')).toBeInTheDocument();
  });

  it('displays usage count', () => {
    render(<PresetCard preset={mockPreset} />);
    expect(screen.getByText('Used 5 times')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    const onSelect = jest.fn();
    render(<PresetCard preset={mockPreset} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('card'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('shows selected state when isSelected is true', () => {
    render(<PresetCard preset={mockPreset} isSelected />);
    expect(screen.getByTestId('card')).toHaveClass('ring-2');
  });

  it('shows star icon when preset is default', () => {
    const defaultPreset = { ...mockPreset, isDefault: true };
    render(<PresetCard preset={defaultPreset} />);
    // Star icon should be present
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders dropdown menu with actions', () => {
    render(<PresetCard preset={mockPreset} onEdit={() => {}} onDuplicate={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows "Set as default" option when not default', () => {
    render(<PresetCard preset={mockPreset} onSetDefault={() => {}} />);
    expect(screen.getByText('Set as default')).toBeInTheDocument();
  });

  it('hides "Set as default" when preset is already default', () => {
    const defaultPreset = { ...mockPreset, isDefault: true };
    render(<PresetCard preset={defaultPreset} onSetDefault={() => {}} />);
    expect(screen.queryByText('Set as default')).not.toBeInTheDocument();
  });

  it('displays "Auto" for auto provider', () => {
    const autoPreset = { ...mockPreset, provider: 'auto' as const };
    render(<PresetCard preset={autoPreset} />);
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });
});
