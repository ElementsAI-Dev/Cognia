/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetSelector } from './preset-selector';
import type { Preset } from '@/types/content/preset';

// Mock stores
const mockSelectPreset = jest.fn();
const mockUsePreset = jest.fn();

const mockPresets: Preset[] = [
  {
    id: 'preset-1',
    name: 'Default Chat',
    description: 'A general purpose chat preset',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    icon: '💬',
    color: '#3B82F6',
    temperature: 0.7,
    isDefault: true,
    usageCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  },
  {
    id: 'preset-2',
    name: 'Code Assistant',
    description: 'For coding tasks',
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    mode: 'agent',
    icon: '🤖',
    color: '#10B981',
    temperature: 0.5,
    isDefault: false,
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(Date.now() - 100000),
  },
  {
    id: 'preset-3',
    name: 'Researcher',
    description: 'For research tasks',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'research',
    icon: '🔬',
    color: '#8B5CF6',
    temperature: 0.8,
    isDefault: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      presets: mockPresets,
      selectedPresetId: 'preset-1',
      selectPreset: mockSelectPreset,
      usePreset: mockUsePreset,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; className?: string }) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dropdown" data-open={open}>{children}</div>
  ),
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) => (
    <div data-testid="dropdown-content" data-align={align}>{children}</div>
  ),
  DropdownMenuGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dropdown-group" className={className}>{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="dropdown-item" onClick={onClick} className={className}>{children}</button>
  ),
  DropdownMenuLabel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} className={className} data-testid="search-input" />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

describe('PresetSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PresetSelector />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('displays selected preset name', () => {
    render(<PresetSelector />);
    expect(screen.getAllByText('Default Chat').length).toBeGreaterThan(0);
  });

  it('displays selected preset icon', () => {
    render(<PresetSelector />);
    expect(screen.getAllByText('💬').length).toBeGreaterThan(0);
  });

  it('renders all presets in dropdown', () => {
    render(<PresetSelector />);
    expect(screen.getAllByText('Default Chat').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Code Assistant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Researcher').length).toBeGreaterThan(0);
  });

  it('renders preset descriptions', () => {
    render(<PresetSelector />);
    expect(screen.getAllByText('A general purpose chat preset').length).toBeGreaterThan(0);
    expect(screen.getAllByText('For coding tasks').length).toBeGreaterThan(0);
  });

  it('renders provider badges', () => {
    render(<PresetSelector />);
    expect(screen.getAllByText('openai').length).toBeGreaterThan(0);
    expect(screen.getAllByText('anthropic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Auto').length).toBeGreaterThan(0);
  });

  it('calls selectPreset and usePreset when preset is selected', () => {
    render(<PresetSelector />);
    const items = screen.getAllByTestId('dropdown-item');
    fireEvent.click(items[0]); // Click first preset
    expect(mockSelectPreset).toHaveBeenCalled();
    expect(mockUsePreset).toHaveBeenCalled();
  });

  it('calls onSelect callback when preset is selected', () => {
    const onSelect = jest.fn();
    render(<PresetSelector onSelect={onSelect} />);
    const items = screen.getAllByTestId('dropdown-item');
    fireEvent.click(items[0]);
    expect(onSelect).toHaveBeenCalled();
  });

  it('renders search input', () => {
    render(<PresetSelector />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders "Create new preset" option', () => {
    render(<PresetSelector />);
    expect(screen.getByText('Create new preset')).toBeInTheDocument();
  });

  it('calls onCreateNew when create option is clicked', () => {
    const onCreateNew = jest.fn();
    render(<PresetSelector onCreateNew={onCreateNew} />);
    fireEvent.click(screen.getByText('Create new preset'));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('renders "Manage presets" option', () => {
    render(<PresetSelector />);
    expect(screen.getByText('Manage presets')).toBeInTheDocument();
  });

  it('calls onManage when manage option is clicked', () => {
    const onManage = jest.fn();
    render(<PresetSelector onManage={onManage} />);
    fireEvent.click(screen.getByText('Manage presets'));
    expect(onManage).toHaveBeenCalled();
  });

  it('renders compact variant', () => {
    render(<PresetSelector compact />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    expect(screen.getAllByText('💬').length).toBeGreaterThan(0);
  });

  it('renders Recent section label', () => {
    render(<PresetSelector />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  it('renders All Presets section label', () => {
    render(<PresetSelector />);
    expect(screen.getByText('All Presets')).toBeInTheDocument();
  });
});
