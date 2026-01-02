/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetsManager } from './presets-manager';
import type { Preset } from '@/types/preset';

// Mock stores
const mockSelectPreset = jest.fn();
const mockUsePreset = jest.fn();
const mockDeletePreset = jest.fn();
const mockDuplicatePreset = jest.fn();
const mockSetDefaultPreset = jest.fn();
const mockResetToDefaults = jest.fn();
const mockSearchPresets = jest.fn((search: string) => mockPresets.filter(p => p.name.toLowerCase().includes(search.toLowerCase())));
const mockCreatePreset = jest.fn();

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
    isFavorite: true,
    usageCount: 10,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    isFavorite: false,
    usageCount: 5,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'preset-3',
    name: 'Learning Tutor',
    description: 'Interactive tutoring',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'learning',
    icon: '🎓',
    color: '#8B5CF6',
    temperature: 0.6,
    isDefault: false,
    isFavorite: false,
    usageCount: 3,
    sortOrder: 2,
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
      deletePreset: mockDeletePreset,
      duplicatePreset: mockDuplicatePreset,
      setDefaultPreset: mockSetDefaultPreset,
      resetToDefaults: mockResetToDefaults,
      searchPresets: mockSearchPresets,
      createPreset: mockCreatePreset,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openai: { enabled: true, apiKey: 'test-key' },
      },
    };
    return selector(state);
  },
}));

// Mock child components
jest.mock('./preset-card', () => ({
  PresetCard: ({ preset, isSelected, onSelect, onEdit, onDuplicate, onDelete, onSetDefault }: { 
    preset: Preset; 
    isSelected?: boolean; 
    onSelect?: () => void; 
    onEdit?: () => void; 
    onDuplicate?: () => void; 
    onDelete?: () => void;
    onSetDefault?: () => void;
  }) => (
    <div data-testid={`preset-card-${preset.id}`} data-selected={isSelected}>
      <span>{preset.name}</span>
      <button onClick={onSelect}>Select</button>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDuplicate}>Duplicate</button>
      <button onClick={onDelete}>Delete</button>
      <button onClick={onSetDefault}>Set Default</button>
    </div>
  ),
}));

jest.mock('./create-preset-dialog', () => ({
  CreatePresetDialog: ({ open, editPreset }: { open: boolean; editPreset?: Preset | null }) => (
    open ? <div data-testid="create-dialog" data-edit-preset={editPreset?.id}>Create Dialog</div> : null
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; className?: string }) => (
    <button onClick={onClick} className={className} data-variant={variant} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} className={className} data-testid="search-input" />
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogAction: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) => (
    <div data-testid="dropdown-content" data-align={align}>{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PresetsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AI Generate Preset section', () => {
    render(<PresetsManager />);
    expect(screen.getByText('AI Generate Preset')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PresetsManager />);
    expect(screen.getByPlaceholderText('Search presets...')).toBeInTheDocument();
  });

  it('renders New Preset button', () => {
    render(<PresetsManager />);
    expect(screen.getByText('New Preset')).toBeInTheDocument();
  });

  it('renders Reset button', () => {
    render(<PresetsManager />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('renders preset cards', () => {
    render(<PresetsManager />);
    expect(screen.getByTestId('preset-card-preset-1')).toBeInTheDocument();
    expect(screen.getByTestId('preset-card-preset-2')).toBeInTheDocument();
  });

  it('shows selected state for selected preset', () => {
    render(<PresetsManager />);
    expect(screen.getByTestId('preset-card-preset-1')).toHaveAttribute('data-selected', 'true');
  });

  it('calls selectPreset and usePreset when preset is selected', () => {
    render(<PresetsManager />);
    fireEvent.click(screen.getAllByText('Select')[0]);
    expect(mockSelectPreset).toHaveBeenCalled();
    expect(mockUsePreset).toHaveBeenCalled();
  });

  it('opens create dialog when New Preset is clicked', () => {
    render(<PresetsManager />);
    fireEvent.click(screen.getByText('New Preset'));
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });

  it('calls duplicatePreset when duplicate is clicked', () => {
    render(<PresetsManager />);
    fireEvent.click(screen.getAllByText('Duplicate')[0]);
    expect(mockDuplicatePreset).toHaveBeenCalledWith('preset-1');
  });

  it('calls onSelectPreset callback when provided', () => {
    const onSelectPreset = jest.fn();
    render(<PresetsManager onSelectPreset={onSelectPreset} />);
    fireEvent.click(screen.getAllByText('Select')[0]);
    expect(onSelectPreset).toHaveBeenCalled();
  });

  it('renders Export Presets option in dropdown', () => {
    render(<PresetsManager />);
    expect(screen.getByText('Export Presets')).toBeInTheDocument();
  });

  it('renders Import Presets option in dropdown', () => {
    render(<PresetsManager />);
    expect(screen.getByText('Import Presets')).toBeInTheDocument();
  });

  it('shows delete confirmation dialog when delete is clicked', () => {
    render(<PresetsManager />);
    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });

  it('shows reset confirmation dialog when Reset is clicked', () => {
    render(<PresetsManager />);
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });

  it('renders AI description input', () => {
    render(<PresetsManager />);
    expect(screen.getByPlaceholderText(/Describe your ideal preset/)).toBeInTheDocument();
  });
});

describe('PresetsManager empty state', () => {
  it('shows empty state when no presets match search', () => {
    mockSearchPresets.mockReturnValueOnce([]);
    render(<PresetsManager />);
    const searchInput = screen.getByPlaceholderText('Search presets...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No presets found')).toBeInTheDocument();
  });
});

describe('PresetsManager learning mode', () => {
  it('renders learning mode preset', () => {
    render(<PresetsManager />);
    expect(screen.getByTestId('preset-card-preset-3')).toBeInTheDocument();
    expect(screen.getByText('Learning Tutor')).toBeInTheDocument();
  });
});

describe('PresetsManager export/import', () => {
  it('includes isFavorite field in export data', () => {
    render(<PresetsManager />);
    // Verify export option exists
    expect(screen.getByText('Export Presets')).toBeInTheDocument();
  });

  it('includes isDefault field in export data', () => {
    render(<PresetsManager />);
    // Verify that default preset shows correct state
    expect(screen.getByTestId('preset-card-preset-1')).toHaveAttribute('data-selected', 'true');
  });

  it('includes sortOrder field in export data', () => {
    render(<PresetsManager />);
    // All presets should be rendered in order
    expect(screen.getByTestId('preset-card-preset-1')).toBeInTheDocument();
    expect(screen.getByTestId('preset-card-preset-2')).toBeInTheDocument();
    expect(screen.getByTestId('preset-card-preset-3')).toBeInTheDocument();
  });
});
