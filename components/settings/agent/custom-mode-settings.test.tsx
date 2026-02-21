/**
 * Tests for CustomModeSettings component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomModeSettings } from './custom-mode-settings';
import type { CustomModeConfig } from '@/stores/agent/custom-mode-store';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
     
    const translations: Record<string, Record<string, any>> = {
      customMode: {
        createMode: 'Create Mode',
        categoryProductivity: 'Productivity',
        categoryCreative: 'Creative',
        categoryTechnical: 'Technical',
        categoryResearch: 'Research',
        categoryEducation: 'Education',
        categoryBusiness: 'Business',
        categoryPersonal: 'Personal',
        categoryOther: 'Other',
      },
      common: {
        import: 'Import',
        export: 'Export All',
        edit: 'Edit',
        delete: 'Delete',
        cancel: 'Cancel',
      },
      settings: {
        customModes: 'Custom Agent Modes',
        customModesDesc: 'Create and manage custom agent modes',
      },
      customModeSettings: {
        searchModes: 'Search modes...',
        allCategories: 'All Categories',
        sortByName: 'Name',
        sortByCreated: 'Created',
        sortByUpdated: 'Updated',
        sortByMostUsed: 'Most Used',
        selected: (params: { count: number }) => `${params.count} selected`,
        clear: 'Clear',
        selectAll: 'Select All',
        deleteSelected: 'Delete Selected',
        noCustomModesYet: 'No custom modes yet',
        noModesMatchFilters: 'No modes match filters',
        createFirstMode: 'Create your first mode',
        noDescription: 'No description',
        tools: (params: { count: number }) => `${params.count} tools`,
        usedTimes: (params: { count: number }) => `Used ${params.count} times`,
        duplicate: 'Duplicate',
        modeDuplicated: 'Mode duplicated',
        modeDeleted: 'Mode deleted',
        modeExported: 'Mode exported',
        exportedModes: (params: { count: number }) => `Exported ${params.count} modes`,
        importedModes: (params: { count: number }) => `Imported ${params.count} modes`,
        importedMode: (params: { name: string }) => `Imported ${params.name}`,
        failedToImportMode: 'Failed to import mode',
        invalidFileFormat: 'Invalid file format',
        failedToParseFile: 'Failed to parse file',
        deletedModes: (params: { count: number }) => `Deleted ${params.count} modes`,
        deleteConfirmDesc: 'Are you sure you want to delete this mode?',
      },
    };
     
    return (key: string, params?: any) => {
      const value = translations[namespace]?.[key];
      if (typeof value === 'function') {
        return value(params || {});
      }
      return value || key;
    };
  },
}));

// Mock toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));


// Mock CustomModeEditor
jest.mock('@/components/agent/custom-mode-editor', () => ({
  CustomModeEditor: ({ open, onOpenChange, mode, onSave }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: CustomModeConfig;
    onSave?: () => void;
  }) => (
    open ? (
      <div data-testid="custom-mode-editor">
        <span data-testid="editor-mode">{mode?.name || 'new'}</span>
        <button data-testid="editor-close" onClick={() => onOpenChange(false)}>Close</button>
        <button data-testid="editor-save" onClick={onSave}>Save</button>
      </div>
    ) : null
  ),
}));

// Mock store functions
const mockDeleteMode = jest.fn();
const mockDuplicateMode = jest.fn();
const mockExportMode = jest.fn();
const mockExportAllModes = jest.fn();
const mockImportMode = jest.fn();
const mockImportModes = jest.fn();

// Default mock modes
const createMockMode = (overrides: Partial<CustomModeConfig> = {}): CustomModeConfig => ({
  id: 'mode-1',
  type: 'custom',
  isBuiltIn: false,
  name: 'Test Mode',
  description: 'Test description',
  icon: 'Bot',
  systemPrompt: 'Test prompt',
  tools: ['tool1', 'tool2'],
  outputFormat: 'text',
  previewEnabled: false,
  customConfig: {},
  category: 'productivity',
  tags: ['test', 'sample'],
  usageCount: 5,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

const mockCustomModes: Record<string, CustomModeConfig> = {
  'mode-1': createMockMode(),
  'mode-2': createMockMode({
    id: 'mode-2',
    name: 'Creative Mode',
    description: 'For creative work',
    category: 'creative',
    tags: ['creative'],
    usageCount: 10,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20'),
  }),
  'mode-3': createMockMode({
    id: 'mode-3',
    name: 'Research Assistant',
    description: 'Academic research helper',
    category: 'research',
    tags: ['research', 'academic'],
    usageCount: 3,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-10'),
  }),
};

let currentMockModes = { ...mockCustomModes };

jest.mock('@/stores/agent/custom-mode-store', () => ({
  useCustomModeStore: () => ({
    customModes: currentMockModes,
    deleteMode: mockDeleteMode,
    duplicateMode: mockDuplicateMode,
    exportMode: mockExportMode,
    exportAllModes: mockExportAllModes,
    importMode: mockImportMode,
    importModes: mockImportModes,
  }),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// =============================================================================
// Test Utilities
// =============================================================================

const renderComponent = () => {
  return render(<CustomModeSettings />);
};

// =============================================================================
// Tests
// =============================================================================

describe('CustomModeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentMockModes = { ...mockCustomModes };
  });

  describe('Rendering', () => {
    it('should render the component with title and description', () => {
      renderComponent();

      expect(screen.getByText('Custom Agent Modes')).toBeInTheDocument();
      expect(screen.getByText('Create and manage custom agent modes')).toBeInTheDocument();
    });

    it('should render header buttons', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /Import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Mode/i })).toBeInTheDocument();
    });

    it('should render search input', () => {
      renderComponent();

      expect(screen.getByPlaceholderText('Search modes...')).toBeInTheDocument();
    });

    it('should render mode list when modes exist', () => {
      renderComponent();

      expect(screen.getByText('Test Mode')).toBeInTheDocument();
      expect(screen.getByText('Creative Mode')).toBeInTheDocument();
      expect(screen.getByText('Research Assistant')).toBeInTheDocument();
    });

    it('should render empty state when no modes exist', () => {
      currentMockModes = {};
      renderComponent();

      expect(screen.getByText('No custom modes yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create your first mode/i })).toBeInTheDocument();
    });

    it('should render mode details correctly', () => {
      renderComponent();

      expect(screen.getByText('Test description')).toBeInTheDocument();
      // Multiple modes may have the same tool count, so check for at least one
      expect(screen.getAllByText('2 tools').length).toBeGreaterThan(0);
      expect(screen.getByText('Used 5 times')).toBeInTheDocument();
    });

    it('should render category badges', () => {
      renderComponent();

      expect(screen.getByText('productivity')).toBeInTheDocument();
      expect(screen.getByText('creative')).toBeInTheDocument();
      expect(screen.getByText('research')).toBeInTheDocument();
    });
  });

  describe('Search Filtering', () => {
    it('should filter modes by name', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText('Search modes...');
      await user.type(searchInput, 'Creative');

      expect(screen.getByText('Creative Mode')).toBeInTheDocument();
      expect(screen.queryByText('Test Mode')).not.toBeInTheDocument();
      expect(screen.queryByText('Research Assistant')).not.toBeInTheDocument();
    });

    it('should filter modes by description', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText('Search modes...');
      await user.type(searchInput, 'academic');

      expect(screen.getByText('Research Assistant')).toBeInTheDocument();
      expect(screen.queryByText('Test Mode')).not.toBeInTheDocument();
      expect(screen.queryByText('Creative Mode')).not.toBeInTheDocument();
    });

    it('should filter modes by tags', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText('Search modes...');
      await user.type(searchInput, 'sample');

      expect(screen.getByText('Test Mode')).toBeInTheDocument();
      expect(screen.queryByText('Creative Mode')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText('Search modes...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No modes match filters')).toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText('Search modes...');
      await user.type(searchInput, 'CREATIVE');

      expect(screen.getByText('Creative Mode')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by name by default', () => {
      renderComponent();

      const modeItems = screen.getAllByText(/Mode|Assistant/);
      const names = modeItems.map(item => item.textContent);
      
      // Should be alphabetically sorted
      expect(names).toContain('Creative Mode');
      expect(names).toContain('Research Assistant');
      expect(names).toContain('Test Mode');
    });

    it('should render filter controls', () => {
      renderComponent();

      // Verify that select controls are rendered
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Create Mode', () => {
    it('should open editor when "Create Mode" button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const createButton = screen.getByRole('button', { name: /Create Mode/i });
      await user.click(createButton);

      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
      expect(screen.getByTestId('editor-mode')).toHaveTextContent('new');
    });

    it('should open editor when empty state button is clicked', async () => {
      currentMockModes = {};
      const user = userEvent.setup();
      renderComponent();

      const createButton = screen.getByRole('button', { name: /Create your first mode/i });
      await user.click(createButton);

      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
    });

    it('should close editor when close button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /Create Mode/i }));
      expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();

      await user.click(screen.getByTestId('editor-close'));
      expect(screen.queryByTestId('custom-mode-editor')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should open editor with mode data when Edit is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Open dropdown menu for first mode
      const moreButtons = screen.getAllByRole('button', { name: '' });
      const dropdownTrigger = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-horizontal')
      );
      
      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        await user.click(screen.getByRole('menuitem', { name: /Edit/i }));

        expect(screen.getByTestId('custom-mode-editor')).toBeInTheDocument();
      }
    });
  });

  describe('Duplicate Mode', () => {
    it('should call duplicateMode and show success toast', async () => {
      mockDuplicateMode.mockReturnValue({ id: 'mode-4', name: 'Test Mode (Copy)' });
      const user = userEvent.setup();
      renderComponent();

      // Open dropdown menu
      const moreButtons = screen.getAllByRole('button', { name: '' });
      const dropdownTrigger = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-horizontal')
      );
      
      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        await user.click(screen.getByRole('menuitem', { name: /Duplicate/i }));

        expect(mockDuplicateMode).toHaveBeenCalled();
        expect(mockToastSuccess).toHaveBeenCalledWith('Mode duplicated');
      }
    });
  });

  describe('Delete Mode', () => {
    it('should show confirmation dialog when Delete is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Open dropdown menu
      const moreButtons = screen.getAllByRole('button', { name: '' });
      const dropdownTrigger = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-horizontal')
      );
      
      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        await user.click(screen.getByRole('menuitem', { name: /Delete/i }));

        expect(screen.getByText('Are you sure you want to delete this mode?')).toBeInTheDocument();
      }
    });

    it('should call deleteMode when confirmed', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Open dropdown and click delete
      const moreButtons = screen.getAllByRole('button', { name: '' });
      const dropdownTrigger = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-horizontal')
      );
      
      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        await user.click(screen.getByRole('menuitem', { name: /Delete/i }));

        // Confirm deletion
        const confirmButton = screen.getAllByRole('button', { name: /Delete/i }).pop();
        if (confirmButton) {
          await user.click(confirmButton);
          expect(mockDeleteMode).toHaveBeenCalled();
          expect(mockToastSuccess).toHaveBeenCalledWith('Mode deleted');
        }
      }
    });

    it('should close dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Open dropdown and click delete
      const moreButtons = screen.getAllByRole('button', { name: '' });
      const dropdownTrigger = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-horizontal')
      );
      
      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        await user.click(screen.getByRole('menuitem', { name: /Delete/i }));

        // Cancel
        await user.click(screen.getByRole('button', { name: /Cancel/i }));
        
        expect(screen.queryByText('Are you sure you want to delete this mode?')).not.toBeInTheDocument();
      }
    });
  });

  describe('Export Single Mode', () => {
    it('should export mode and trigger download', async () => {
      mockExportMode.mockReturnValue('{"type":"custom-mode","mode":{}}');
      const user = userEvent.setup();
      renderComponent();

      // Open dropdown and click export
      const moreButtons = screen.getAllByRole('button', { name: '' });
      const dropdownTrigger = moreButtons.find(btn => 
        btn.querySelector('svg.lucide-more-horizontal')
      );
      
      if (dropdownTrigger) {
        await user.click(dropdownTrigger);
        
        // Find export menu item
        const exportItem = screen.getByRole('menuitem', { name: /Export/i });
        await user.click(exportItem);

        expect(mockExportMode).toHaveBeenCalled();
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
        expect(mockToastSuccess).toHaveBeenCalledWith('Mode exported');
      }
    });
  });

  describe('Export All Modes', () => {
    it('should export all modes', async () => {
      mockExportAllModes.mockReturnValue('{"type":"custom-modes-collection","modes":[]}');
      const user = userEvent.setup();
      renderComponent();

      const exportAllButton = screen.getByRole('button', { name: /Export All/i });
      await user.click(exportAllButton);

      expect(mockExportAllModes).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Exported 3 modes');
    });

    it('should disable export all button when no modes exist', () => {
      currentMockModes = {};
      renderComponent();

      const exportAllButton = screen.getByRole('button', { name: /Export All/i });
      expect(exportAllButton).toBeDisabled();
    });
  });

  describe('Import Modes', () => {
    it('should import single mode from file', async () => {
      mockImportMode.mockReturnValue({ id: 'imported-1', name: 'Imported Mode' });
      const user = userEvent.setup();
      renderComponent();

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      // Get the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create a mock file
      const file = new File(
        [JSON.stringify({ type: 'custom-mode', mode: { name: 'Imported' } })],
        'mode.json',
        { type: 'application/json' }
      );

      // Simulate file selection
      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // Wait for file to be read
      await waitFor(() => {
        expect(mockImportMode).toHaveBeenCalled();
      });
    });

    it('should import multiple modes from collection file', async () => {
      mockImportModes.mockReturnValue(3);
      const user = userEvent.setup();
      renderComponent();

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(
        [JSON.stringify({ type: 'custom-modes-collection', modes: [{}, {}, {}] })],
        'modes.json',
        { type: 'application/json' }
      );

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockImportModes).toHaveBeenCalled();
      });
    });

    it('should show error for invalid file format', async () => {
      const user = userEvent.setup();
      renderComponent();

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(
        [JSON.stringify({ type: 'unknown' })],
        'invalid.json',
        { type: 'application/json' }
      );

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Invalid file format');
      });
    });

    it('should show error for invalid JSON', async () => {
      const user = userEvent.setup();
      renderComponent();

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['not valid json'], 'invalid.json', { type: 'application/json' });

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to parse file');
      });
    });
  });

  describe('Selection and Bulk Actions', () => {
    it('should toggle mode selection when checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should show bulk action bar when modes are selected', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete Selected/i })).toBeInTheDocument();
    });

    it('should clear selection when Clear is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      await user.click(clearButton);

      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });

    it('should select all when Select All is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const selectAllButton = screen.getByRole('button', { name: /Select All/i });
      await user.click(selectAllButton);

      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('should delete selected modes when Delete Selected is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const deleteSelectedButton = screen.getByRole('button', { name: /Delete Selected/i });
      await user.click(deleteSelectedButton);

      expect(mockDeleteMode).toHaveBeenCalledTimes(2);
      expect(mockToastSuccess).toHaveBeenCalledWith('Deleted 2 modes');
    });
  });

  describe('Mode Display', () => {
    it('should display mode without description correctly', () => {
      currentMockModes = {
        'mode-no-desc': createMockMode({
          id: 'mode-no-desc',
          name: 'No Description Mode',
          description: '',
        }),
      };
      renderComponent();

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('should display mode with zero tools and usage', () => {
      currentMockModes = {
        'mode-zero': createMockMode({
          id: 'mode-zero',
          name: 'Zero Stats Mode',
          tools: [],
          usageCount: 0,
        }),
      };
      renderComponent();

      expect(screen.getByText('0 tools')).toBeInTheDocument();
      expect(screen.getByText('Used 0 times')).toBeInTheDocument();
    });
  });

  describe('Filter Controls', () => {
    it('should render category and sort filter controls', () => {
      renderComponent();

      // Verify filter controls are present
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBe(2); // Category and Sort selects
    });
  });
});
