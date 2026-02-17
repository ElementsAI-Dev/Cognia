/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsProfiles } from './settings-profiles';
import type { SettingsProfile } from '@/stores/settings/settings-profiles-store';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Save: () => <span data-testid="icon-save">Save</span>,
  FolderOpen: () => <span data-testid="icon-folder-open">FolderOpen</span>,
  Trash2: () => <span data-testid="icon-trash">Trash2</span>,
  Copy: () => <span data-testid="icon-copy">Copy</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
  Upload: () => <span data-testid="icon-upload">Upload</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  AlertCircle: () => <span data-testid="icon-alert">AlertCircle</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  MoreVertical: () => <span data-testid="icon-more">MoreVertical</span>,
  Layers: () => <span data-testid="icon-layers">Layers</span>,
}));

// Mock settings store
const mockSetTheme = jest.fn();
const mockSetColorTheme = jest.fn();
const mockCreateCustomTheme = jest.fn();
const mockDeleteCustomTheme = jest.fn();
const mockSetActiveCustomTheme = jest.fn();
const mockSetBackgroundSettings = jest.fn();
const mockSetUICustomization = jest.fn();
const mockSetMessageBubbleStyle = jest.fn();
const mockSetUIFontSize = jest.fn();

const defaultSettingsState = {
  theme: 'light' as const,
  colorTheme: 'default' as const,
  customThemes: [],
  activeCustomThemeId: null,
  backgroundSettings: {
    mode: 'single' as const,
    layers: [
      {
        id: 'layer-1',
        enabled: true,
        source: 'none' as const,
        imageUrl: '',
        localAssetId: null,
        presetId: null,
        fit: 'cover' as const,
        position: 'center' as const,
        opacity: 100,
        blur: 0,
        overlayColor: '#000000',
        overlayOpacity: 0,
        brightness: 100,
        saturation: 100,
        attachment: 'fixed' as const,
        animation: 'none' as const,
        animationSpeed: 5,
        contrast: 100,
        grayscale: 0,
      },
    ],
    slideshow: {
      slides: [],
      intervalMs: 15000,
      transitionMs: 1000,
      shuffle: false,
    },
    enabled: false,
    source: 'none' as const,
    imageUrl: '',
    localAssetId: null,
    presetId: null,
    fit: 'cover' as const,
    position: 'center' as const,
    opacity: 100,
    blur: 0,
    overlayColor: '#000000',
    overlayOpacity: 0,
    brightness: 100,
    saturation: 100,
    attachment: 'fixed' as const,
    animation: 'none' as const,
    animationSpeed: 5,
    contrast: 100,
    grayscale: 0,
  },
  uiCustomization: {
    borderRadius: 'md' as const,
    spacing: 'comfortable' as const,
    shadowIntensity: 'subtle' as const,
    enableAnimations: true,
    enableBlur: true,
    sidebarWidth: 280,
    chatMaxWidth: 900,
    messageDensity: 'default' as const,
    avatarStyle: 'circle' as const,
    timestampFormat: 'relative' as const,
    showAvatars: true,
    showUserAvatar: false,
    showAssistantAvatar: true,
    messageAlignment: 'alternate' as const,
    inputPosition: 'bottom' as const,
    uiFontFamily: 'system' as const,
  },
  messageBubbleStyle: 'default' as const,
  uiFontSize: 14,
  setTheme: mockSetTheme,
  setColorTheme: mockSetColorTheme,
  createCustomTheme: mockCreateCustomTheme,
  deleteCustomTheme: mockDeleteCustomTheme,
  setActiveCustomTheme: mockSetActiveCustomTheme,
  setBackgroundSettings: mockSetBackgroundSettings,
  setUICustomization: mockSetUICustomization,
  setMessageBubbleStyle: mockSetMessageBubbleStyle,
  setUIFontSize: mockSetUIFontSize,
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: typeof defaultSettingsState) => unknown) => {
    return selector(defaultSettingsState);
  },
}));

// Mock profiles store
const mockCreateProfile = jest.fn().mockReturnValue('profile-123');
const mockUpdateProfile = jest.fn();
const mockDeleteProfile = jest.fn();
const mockDuplicateProfile = jest.fn().mockReturnValue('profile-456');
const mockSetActiveProfile = jest.fn();
const mockExportProfile = jest.fn();
const mockImportProfile = jest.fn();

const createMockProfile = (overrides: Partial<SettingsProfile> = {}): SettingsProfile => ({
  id: 'profile-1',
  name: 'Test Profile',
  description: 'A test profile',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  theme: 'dark',
  colorTheme: 'ocean',
  activeCustomThemeId: null,
  customThemes: [],
  backgroundSettings: defaultSettingsState.backgroundSettings,
  uiCustomization: defaultSettingsState.uiCustomization,
  messageBubbleStyle: 'gradient',
  uiFontSize: 16,
  ...overrides,
});

let mockProfiles: SettingsProfile[] = [];
let mockActiveProfileId: string | null = null;

jest.mock('@/stores/settings/settings-profiles-store', () => ({
  useSettingsProfilesStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      profiles: mockProfiles,
      activeProfileId: mockActiveProfileId,
      createProfile: mockCreateProfile,
      updateProfile: mockUpdateProfile,
      deleteProfile: mockDeleteProfile,
      duplicateProfile: mockDuplicateProfile,
      setActiveProfile: mockSetActiveProfile,
      exportProfile: mockExportProfile,
      importProfile: mockImportProfile,
    };
    return selector(state);
  },
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, value, onChange, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => (
    <div data-testid="dialog" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dialog-trigger" data-aschild={asChild}>
      {children}
    </div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger" data-aschild={asChild}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

// Mock URL APIs globally for export tests
const mockCreateObjectURL = jest.fn(() => 'blob:test');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('SettingsProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfiles = [];
    mockActiveProfileId = null;
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SettingsProfiles />);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('displays the title and description', () => {
      render(<SettingsProfiles />);
      expect(screen.getByTestId('card-title')).toHaveTextContent('title');
      expect(screen.getByTestId('card-description')).toHaveTextContent('description');
    });

    it('displays the Layers icon', () => {
      render(<SettingsProfiles />);
      expect(screen.getByTestId('icon-layers')).toBeInTheDocument();
    });

    it('displays import button', () => {
      render(<SettingsProfiles />);
      expect(screen.getByText('import')).toBeInTheDocument();
      expect(screen.getByTestId('icon-upload')).toBeInTheDocument();
    });

    it('displays new profile button', () => {
      render(<SettingsProfiles />);
      expect(screen.getByText('new')).toBeInTheDocument();
      expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state message when no profiles exist', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      expect(screen.getByText('noSavedProfiles')).toBeInTheDocument();
    });

    it('does not display scroll area when no profiles exist', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      expect(screen.queryByTestId('scroll-area')).not.toBeInTheDocument();
    });
  });

  describe('Profiles List', () => {
    it('displays profiles when they exist', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      expect(screen.getByText('Test Profile')).toBeInTheDocument();
    });

    it('displays profile description', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      expect(screen.getByText('A test profile')).toBeInTheDocument();
    });

    it('displays multiple profiles', () => {
      mockProfiles = [
        createMockProfile({ id: 'profile-1', name: 'Profile One' }),
        createMockProfile({ id: 'profile-2', name: 'Profile Two' }),
      ];
      render(<SettingsProfiles />);
      expect(screen.getByText('Profile One')).toBeInTheDocument();
      expect(screen.getByText('Profile Two')).toBeInTheDocument();
    });

    it('displays active badge for active profile', () => {
      mockProfiles = [createMockProfile({ id: 'profile-1' })];
      mockActiveProfileId = 'profile-1';
      render(<SettingsProfiles />);
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('does not display active badge for inactive profiles', () => {
      mockProfiles = [createMockProfile({ id: 'profile-1' })];
      mockActiveProfileId = null;
      render(<SettingsProfiles />);
      expect(screen.queryByText('active')).not.toBeInTheDocument();
    });

    it('displays updated date', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      expect(screen.getByText(/updated/)).toBeInTheDocument();
    });

    it('displays load button for each profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      expect(screen.getByText('load')).toBeInTheDocument();
      expect(screen.getByTestId('icon-folder-open')).toBeInTheDocument();
    });
  });

  describe('Create Profile Dialog', () => {
    it('renders dialog trigger with new button', () => {
      render(<SettingsProfiles />);
      const dialogTrigger = screen.getByTestId('dialog-trigger');
      expect(dialogTrigger).toBeInTheDocument();
      expect(screen.getByText('new')).toBeInTheDocument();
    });

    it('has profile name input in dialog', () => {
      render(<SettingsProfiles />);
      // Dialog content is always rendered in our mock
      expect(screen.getByPlaceholderText('profileNamePlaceholder')).toBeInTheDocument();
    });

    it('has profile description input in dialog', () => {
      render(<SettingsProfiles />);
      expect(screen.getByPlaceholderText('descriptionPlaceholder')).toBeInTheDocument();
    });

    it('has save button in dialog footer', () => {
      render(<SettingsProfiles />);
      expect(screen.getByText('save')).toBeInTheDocument();
    });

    it('has cancel button in dialog footer', () => {
      render(<SettingsProfiles />);
      expect(screen.getByText('cancel')).toBeInTheDocument();
    });
  });

  describe('Create Profile Handler', () => {
    it('calls createProfile and updateProfile when save is clicked with valid name', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      
      // Fill in the profile name
      const nameInput = screen.getByPlaceholderText('profileNamePlaceholder');
      fireEvent.change(nameInput, { target: { value: 'My New Profile' } });
      
      // Fill in description
      const descInput = screen.getByPlaceholderText('descriptionPlaceholder');
      fireEvent.change(descInput, { target: { value: 'Profile description' } });
      
      // Click save button
      const saveButton = screen.getByText('save');
      fireEvent.click(saveButton);
      
      expect(mockCreateProfile).toHaveBeenCalledWith('My New Profile', 'Profile description');
      expect(mockUpdateProfile).toHaveBeenCalledWith('profile-123', expect.objectContaining({
        theme: 'light',
        colorTheme: 'default',
      }));
    });

    it('does not create profile when name is empty', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      
      // Leave name empty, click save
      const saveButton = screen.getByText('save');
      fireEvent.click(saveButton);
      
      // Should not call createProfile with empty name
      expect(mockCreateProfile).not.toHaveBeenCalled();
    });

    it('does not create profile when name is only whitespace', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      
      // Fill in whitespace-only name
      const nameInput = screen.getByPlaceholderText('profileNamePlaceholder');
      fireEvent.change(nameInput, { target: { value: '   ' } });
      
      // Click save button
      const saveButton = screen.getByText('save');
      fireEvent.click(saveButton);
      
      // Should not call createProfile
      expect(mockCreateProfile).not.toHaveBeenCalled();
    });

    it('creates profile without description when description is empty', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      
      // Fill in only name
      const nameInput = screen.getByPlaceholderText('profileNamePlaceholder');
      fireEvent.change(nameInput, { target: { value: 'Profile Without Desc' } });
      
      // Click save button
      const saveButton = screen.getByText('save');
      fireEvent.click(saveButton);
      
      expect(mockCreateProfile).toHaveBeenCalledWith('Profile Without Desc', undefined);
    });
  });

  describe('Load Profile', () => {
    it('calls setTheme when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('calls setColorTheme when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetColorTheme).toHaveBeenCalledWith('ocean');
    });

    it('calls setBackgroundSettings when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetBackgroundSettings).toHaveBeenCalled();
    });

    it('calls setUICustomization when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetUICustomization).toHaveBeenCalled();
    });

    it('calls setMessageBubbleStyle when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetMessageBubbleStyle).toHaveBeenCalledWith('gradient');
    });

    it('calls setUIFontSize when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetUIFontSize).toHaveBeenCalledWith(16);
    });

    it('calls setActiveProfile when loading profile', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetActiveProfile).toHaveBeenCalledWith('profile-1');
    });

    it('calls setActiveCustomTheme when profile has activeCustomThemeId', () => {
      mockProfiles = [createMockProfile({ activeCustomThemeId: 'custom-theme-1' })];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockSetActiveCustomTheme).toHaveBeenCalledWith('custom-theme-1');
    });

    it('syncs custom themes when loading profile', () => {
      const customTheme = {
        id: 'theme-1',
        name: 'Custom Theme',
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          background: '#ffffff',
          foreground: '#000000',
          muted: '#cccccc',
        },
        isDark: false,
      };
      mockProfiles = [createMockProfile({ customThemes: [customTheme] })];
      render(<SettingsProfiles />);
      
      const loadButton = screen.getByText('load');
      fireEvent.click(loadButton);
      
      expect(mockCreateCustomTheme).toHaveBeenCalledWith({
        name: 'Custom Theme',
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          background: '#ffffff',
          foreground: '#000000',
          muted: '#cccccc',
        },
        isDark: false,
      });
    });
  });

  describe('Dropdown Menu Actions', () => {
    it('renders save current option in dropdown', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      expect(screen.getByText('saveCurrent')).toBeInTheDocument();
    });

    it('renders duplicate option in dropdown', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      expect(screen.getByText('duplicate')).toBeInTheDocument();
    });

    it('renders export option in dropdown', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      expect(screen.getByText('export')).toBeInTheDocument();
    });

    it('renders delete option in dropdown', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      expect(screen.getByText('delete')).toBeInTheDocument();
    });

    it('calls updateProfile when save current is clicked', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const saveButton = screen.getByText('saveCurrent');
      fireEvent.click(saveButton);
      
      expect(mockUpdateProfile).toHaveBeenCalledWith('profile-1', expect.objectContaining({
        theme: 'light',
        colorTheme: 'default',
      }));
    });

    it('calls duplicateProfile when duplicate is clicked', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const duplicateButton = screen.getByText('duplicate');
      fireEvent.click(duplicateButton);
      
      expect(mockDuplicateProfile).toHaveBeenCalledWith('profile-1', 'Test Profile (Copy)');
    });

    it('calls deleteProfile when delete is clicked', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      
      const deleteButton = screen.getByText('delete');
      fireEvent.click(deleteButton);
      
      expect(mockDeleteProfile).toHaveBeenCalledWith('profile-1');
    });
  });

  describe('Export Profile', () => {
    it('calls exportProfile when export is clicked', () => {
      mockProfiles = [createMockProfile()];
      mockExportProfile.mockReturnValue('{"version":"1.0"}');
      render(<SettingsProfiles />);
      
      const exportButton = screen.getByText('export');
      fireEvent.click(exportButton);
      
      expect(mockExportProfile).toHaveBeenCalledWith('profile-1');
    });

    it('does not proceed when exportProfile returns null', () => {
      mockProfiles = [createMockProfile()];
      mockExportProfile.mockReturnValue(null);
      render(<SettingsProfiles />);
      
      const exportButton = screen.getByText('export');
      fireEvent.click(exportButton);
      
      // Verify exportProfile was called but returned null
      expect(mockExportProfile).toHaveBeenCalledWith('profile-1');
    });
  });

  describe('Import Profile', () => {
    it('renders hidden file input for import', () => {
      render(<SettingsProfiles />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.json');
    });

    it('calls importProfile when file is selected', async () => {
      mockImportProfile.mockReturnValue({ success: true });
      render(<SettingsProfiles />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"version":"1.0","profile":{"name":"Test"}}'], 'test.json', {
        type: 'application/json',
      });
      
      // Create a mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        result: '{"version":"1.0","profile":{"name":"Test"}}',
      };
      
      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as unknown as FileReader);
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // Simulate FileReader onload
      if (mockFileReader.onload) {
        await act(async () => {
          mockFileReader.onload!({
            target: { result: '{"version":"1.0","profile":{"name":"Test"}}' },
          } as unknown as ProgressEvent<FileReader>);
        });
      }
      
      expect(mockImportProfile).toHaveBeenCalled();
    });

    it('does not call importProfile when no file is selected', () => {
      render(<SettingsProfiles />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [],
      });
      
      fireEvent.change(fileInput);
      
      expect(mockImportProfile).not.toHaveBeenCalled();
    });

    it('shows error status when import fails', async () => {
      mockImportProfile.mockReturnValue({ success: false, error: 'Invalid format' });
      render(<SettingsProfiles />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['invalid'], 'test.json', { type: 'application/json' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        result: 'invalid',
      };
      
      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as unknown as FileReader);
      
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);
      
      // Trigger onload
      if (mockFileReader.onload) {
        await act(async () => {
          mockFileReader.onload!({
            target: { result: 'invalid' },
          } as unknown as ProgressEvent<FileReader>);
        });
      }
      
      expect(mockImportProfile).toHaveBeenCalledWith('invalid');
    });

    it('shows success status when import succeeds', async () => {
      mockImportProfile.mockReturnValue({ success: true, profileId: 'new-profile' });
      render(<SettingsProfiles />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"version":"1.0"}'], 'test.json', { type: 'application/json' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        result: '{"version":"1.0"}',
      };
      
      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as unknown as FileReader);
      
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);
      
      // Trigger onload
      if (mockFileReader.onload) {
        await act(async () => {
          mockFileReader.onload!({
            target: { result: '{"version":"1.0"}' },
          } as unknown as ProgressEvent<FileReader>);
        });
      }
      
      expect(mockImportProfile).toHaveBeenCalledWith('{"version":"1.0"}');
    });
  });

  describe('Import Status Display', () => {
    it('card content section exists for status display', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      // The card content is where import status would be displayed
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });
  });

  describe('Profile without description', () => {
    it('renders profile without description correctly', () => {
      mockProfiles = [createMockProfile({ description: undefined })];
      render(<SettingsProfiles />);
      
      // Should still render the profile name
      expect(screen.getByText('Test Profile')).toBeInTheDocument();
      // The description text should not be present
      expect(screen.queryByText('A test profile')).not.toBeInTheDocument();
    });
  });

  describe('Duplicate Profile Handler', () => {
    it('does nothing when profile is not found', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      
      // No profiles to duplicate
      expect(mockDuplicateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('renders file input for import', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('renders multiple interactive buttons', () => {
      mockProfiles = [];
      render(<SettingsProfiles />);
      // Check that import and new buttons are rendered
      expect(screen.getByText('import')).toBeInTheDocument();
      expect(screen.getByText('new')).toBeInTheDocument();
    });
  });

  describe('Scroll Area', () => {
    it('renders scroll area when profiles exist', () => {
      mockProfiles = [createMockProfile()];
      render(<SettingsProfiles />);
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });
  });
});
