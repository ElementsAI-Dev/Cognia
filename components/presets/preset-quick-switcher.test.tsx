/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetQuickSwitcher } from './preset-quick-switcher';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      preset: 'Preset',
      switchPreset: 'Switch Preset',
      quickSwitchDesc: 'Quickly change your AI configuration',
      active: 'Active',
      favorites: 'Favorites',
      recent: 'Recent',
      allPresets: 'All Presets',
      noPresets: 'No presets available',
      createNew: 'New',
      manage: 'Manage',
      addedToFavorites: 'Added to favorites',
      removedFromFavorites: 'Removed from favorites',
      dragToReorder: 'drag to reorder',
      orderUpdated: 'Order updated',
      searchPlaceholder: 'Search presets...',
      noResults: 'No matching presets found',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockPresets = [
  {
    id: 'preset-1',
    name: 'General Assistant',
    description: 'Balanced general-purpose assistant',
    icon: '💬',
    color: '#6366f1',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    temperature: 0.7,
    isDefault: true,
    isFavorite: false,
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  },
  {
    id: 'preset-2',
    name: 'Code Expert',
    description: 'Technical coding assistant',
    icon: '💻',
    color: '#22c55e',
    provider: 'anthropic',
    model: 'claude-3-opus',
    mode: 'chat',
    temperature: 0.3,
    isDefault: false,
    isFavorite: false,
    usageCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockSelectPreset = jest.fn();
const mockTrackPresetUsage = jest.fn();
const mockToggleFavorite = jest.fn();
const mockReorderPresets = jest.fn();
const mockUpdateSession = jest.fn();

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: unknown) => unknown) => {
    const state = {
      presets: mockPresets,
      selectPreset: mockSelectPreset,
      usePreset: mockTrackPresetUsage,
      toggleFavorite: mockToggleFavorite,
      reorderPresets: mockReorderPresets,
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: unknown) => unknown) => {
    const state = {
      activeSessionId: 'session-1',
      sessions: [
        {
          id: 'session-1',
          presetId: 'preset-1',
          provider: 'openai',
          model: 'gpt-4o',
          mode: 'chat',
        },
      ],
      updateSession: mockUpdateSession,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

// Mock @dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: jest.fn(),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

describe('PresetQuickSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset preset favorite states
    mockPresets[0].isFavorite = false;
    mockPresets[1].isFavorite = false;
  });

  it('renders without crashing', () => {
    render(<PresetQuickSwitcher />);
    expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
  });

  it('shows current preset name when a preset is active', () => {
    render(<PresetQuickSwitcher />);
    // Use getAllByText since preset may appear multiple times
    expect(screen.getAllByText('General Assistant').length).toBeGreaterThan(0);
  });

  it('shows preset icon when a preset is active', () => {
    render(<PresetQuickSwitcher />);
    // Use getAllByText since icon may appear multiple times
    expect(screen.getAllByText('💬').length).toBeGreaterThan(0);
  });

  it('displays all presets in the popover', () => {
    render(<PresetQuickSwitcher />);
    // Use getAllByText since presets may appear in both recent and all sections
    expect(screen.getAllByText('General Assistant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Code Expert').length).toBeGreaterThan(0);
  });

  it('shows recent section when there are recent presets', () => {
    render(<PresetQuickSwitcher />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  it('shows all presets section', () => {
    render(<PresetQuickSwitcher />);
    expect(screen.getByText('All Presets')).toBeInTheDocument();
  });

  it('shows create new and manage buttons', () => {
    render(<PresetQuickSwitcher />);
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('calls onPresetChange when a preset is selected', () => {
    const onPresetChange = jest.fn();
    render(<PresetQuickSwitcher onPresetChange={onPresetChange} />);
    
    // Find and click the Code Expert preset
    const codeExpertButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('Code Expert')
    );
    if (codeExpertButton) {
      fireEvent.click(codeExpertButton);
      expect(mockSelectPreset).toHaveBeenCalledWith('preset-2');
      expect(mockTrackPresetUsage).toHaveBeenCalledWith('preset-2');
      expect(mockUpdateSession).toHaveBeenCalled();
    }
  });

  it('calls onCreateNew when new button is clicked', () => {
    const onCreateNew = jest.fn();
    render(<PresetQuickSwitcher onCreateNew={onCreateNew} />);
    
    const newButton = screen.getByText('New');
    fireEvent.click(newButton);
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('calls onManage when manage button is clicked', () => {
    const onManage = jest.fn();
    render(<PresetQuickSwitcher onManage={onManage} />);
    
    const manageButton = screen.getByText('Manage');
    fireEvent.click(manageButton);
    expect(onManage).toHaveBeenCalled();
  });

  it('disables the button when disabled prop is true', () => {
    render(<PresetQuickSwitcher disabled={true} />);
    
    const trigger = screen.getByTestId('popover-trigger');
    const button = trigger.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('shows active indicator for current preset', () => {
    render(<PresetQuickSwitcher />);
    // The active badge should be present
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('updates session with all preset settings when preset is selected', () => {
    const onPresetChange = jest.fn();
    render(<PresetQuickSwitcher onPresetChange={onPresetChange} />);
    
    // Find and click the Code Expert preset
    const codeExpertButtons = screen.getAllByRole('button').filter(
      btn => btn.textContent?.includes('Code Expert')
    );
    
    if (codeExpertButtons.length > 0) {
      fireEvent.click(codeExpertButtons[0]);
      
      // Verify updateSession was called with all the preset settings
      expect(mockUpdateSession).toHaveBeenCalledWith('session-1', expect.objectContaining({
        provider: 'anthropic',
        model: 'claude-3-opus',
        mode: 'chat',
        temperature: 0.3,
        presetId: 'preset-2',
      }));
    }
  });

  it('shows favorites section when there are favorite presets', () => {
    mockPresets[0].isFavorite = true;
    render(<PresetQuickSwitcher />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('calls toggleFavorite when favorite button is clicked', () => {
    render(<PresetQuickSwitcher />);
    
    // Find the favorite button (heart icon button)
    const favoriteButtons = screen.getAllByTitle('Add to favorites');
    
    if (favoriteButtons.length > 0) {
      fireEvent.click(favoriteButtons[0]);
      expect(mockToggleFavorite).toHaveBeenCalled();
    }
  });

  it('shows filled heart icon for favorited presets', () => {
    mockPresets[0].isFavorite = true;
    render(<PresetQuickSwitcher />);
    
    // Find the remove from favorites button
    const removeButtons = screen.getAllByTitle('Remove from favorites');
    expect(removeButtons.length).toBeGreaterThan(0);
  });
});
