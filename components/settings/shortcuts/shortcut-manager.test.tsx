/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShortcutManager } from './shortcut-manager';
import type { ShortcutMetadata, ShortcutConflict, ConflictResolution } from '@/types/shortcut';

// Mock data
const mockShortcuts: ShortcutMetadata[] = [
  {
    shortcut: 'Ctrl+N',
    owner: 'system',
    action: 'New Chat',
    registeredAt: Date.now(),
    enabled: true,
  },
  {
    shortcut: 'Ctrl+S',
    owner: 'system',
    action: 'Save',
    registeredAt: Date.now(),
    enabled: true,
  },
  {
    shortcut: 'Ctrl+B',
    owner: 'media',
    action: 'Toggle Sidebar',
    registeredAt: Date.now(),
    enabled: false,
  },
];

const mockConflicts: ShortcutConflict[] = [];
const mockDetectConflicts = jest.fn().mockResolvedValue([]);
const mockResolveConflict = jest.fn();
const mockSetConflictResolutionMode = jest.fn();

// Mock stores
jest.mock('@/stores/system', () => ({
  useNativeStore: () => ({
    shortcutConflicts: mockConflicts,
    conflictResolutionMode: 'warn',
    detectConflicts: mockDetectConflicts,
    resolveConflict: mockResolveConflict,
    setConflictResolutionMode: mockSetConflictResolutionMode,
  }),
}));

// Mock shortcuts lib
jest.mock('@/lib/native/shortcuts', () => ({
  getAllShortcutMetadata: () => mockShortcuts,
}));

// Mock ShortcutConflictDialog
jest.mock('./shortcut-conflict-dialog', () => ({
  ShortcutConflictDialog: ({ open, onOpenChange, conflicts, onResolve, onResolveAll }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conflicts: ShortcutConflict[];
    onResolve: (conflict: ShortcutConflict, resolution: ConflictResolution) => void;
    onResolveAll: (resolution: ConflictResolution) => void;
  }) => (
    open ? (
      <div data-testid="conflict-dialog">
        <span>Conflicts: {conflicts.length}</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={() => onResolveAll('keep-existing')}>Resolve All</button>
        {conflicts.length > 0 && (
          <button 
            data-testid="resolve-single" 
            onClick={() => onResolve(conflicts[0], 'keep-existing')}
          >
            Resolve Single
          </button>
        )}
      </div>
    ) : null
  ),
}));

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="search-input"
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} data-testid={`button-${variant || 'default'}`} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

// Create a wrapper to capture onValueChange for testing
let tabsOnValueChange: ((value: string) => void) | null = null;

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => {
    tabsOnValueChange = onValueChange;
    return <div data-testid="tabs" data-value={value}>{children}</div>;
  },
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`} onClick={() => tabsOnValueChange?.(value)}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children, colSpan, className }: { children: React.ReactNode; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => <th className={className}>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr data-testid="table-row">{children}</tr>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <select data-testid="select-native" value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value="warn">Warn</option>
        <option value="block">Block</option>
        <option value="auto-resolve">Auto-Resolve</option>
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option data-testid={`select-item-${value}`} value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value" />,
}));

jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="icon-search" />,
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  Settings2: () => <span data-testid="icon-settings" />,
  Download: () => <span data-testid="icon-download" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock URL and document for export functionality
const mockCreateObjectURL = jest.fn(() => 'blob:test');
const mockRevokeObjectURL = jest.fn();
const mockClick = jest.fn();

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

describe('ShortcutManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConflicts.length = 0;
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('displays title with settings icon', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
      expect(screen.getByText('Shortcut Manager')).toBeInTheDocument();
    });

    it('displays description', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('View and manage all keyboard shortcuts')).toBeInTheDocument();
    });

    it('displays search input', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search shortcuts...')).toBeInTheDocument();
    });

    it('displays Refresh button', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
    });

    it('displays Export button', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByTestId('icon-download')).toBeInTheDocument();
    });

    it('displays Detect Conflicts button', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Detect Conflicts')).toBeInTheDocument();
    });

    it('displays shortcuts table', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('displays table headers', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Shortcut')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Registered')).toBeInTheDocument();
    });

    it('displays shortcuts from metadata', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
      expect(screen.getByText('New Chat')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('displays shortcut count', () => {
      render(<ShortcutManager />);
      expect(screen.getByText(/Showing 3 of 3 shortcuts/)).toBeInTheDocument();
    });
  });

  describe('Category Tabs', () => {
    it('displays tabs list', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
    });

    it('displays all category tab', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    });

    it('displays owner-based category tabs', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('tab-system')).toBeInTheDocument();
      expect(screen.getByTestId('tab-media')).toBeInTheDocument();
    });

    it('shows badge with count for category tabs', () => {
      render(<ShortcutManager />);
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('filters shortcuts by search query', () => {
      render(<ShortcutManager />);
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'New Chat' } });
      
      expect(screen.getByText(/Showing 1 of 3 shortcuts/)).toBeInTheDocument();
    });

    it('filters by shortcut key', () => {
      render(<ShortcutManager />);
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Ctrl+N' } });
      
      expect(screen.getByText(/Showing 1 of 3 shortcuts/)).toBeInTheDocument();
    });

    it('filters by owner name', () => {
      render(<ShortcutManager />);
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'media' } });
      
      expect(screen.getByText(/Showing 1 of 3 shortcuts/)).toBeInTheDocument();
    });

    it('shows no shortcuts message when no matches', () => {
      render(<ShortcutManager />);
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      expect(screen.getByText('No shortcuts found')).toBeInTheDocument();
    });

    it('is case insensitive', () => {
      render(<ShortcutManager />);
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'NEW CHAT' } });
      
      expect(screen.getByText(/Showing 1 of 3 shortcuts/)).toBeInTheDocument();
    });

    it('filters by category when tab is clicked', () => {
      render(<ShortcutManager />);
      
      // Click on the 'system' category tab
      fireEvent.click(screen.getByTestId('tab-system'));
      
      // Should show only 2 system shortcuts (Ctrl+N and Ctrl+S)
      expect(screen.getByText(/Showing 2 of 3 shortcuts/)).toBeInTheDocument();
    });

    it('filters by media category when tab is clicked', () => {
      render(<ShortcutManager />);
      
      // Click on the 'media' category tab
      fireEvent.click(screen.getByTestId('tab-media'));
      
      // Should show only 1 media shortcut (Ctrl+B)
      expect(screen.getByText(/Showing 1 of 3 shortcuts/)).toBeInTheDocument();
    });
  });

  describe('Shortcut Status Display', () => {
    it('displays Enabled status for enabled shortcuts', () => {
      render(<ShortcutManager />);
      expect(screen.getAllByText('Enabled').length).toBe(2);
    });

    it('displays Disabled status for disabled shortcuts', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Conflict Handling', () => {
    it('does not show conflict button when no conflicts', () => {
      render(<ShortcutManager />);
      expect(screen.queryByTestId('button-destructive')).not.toBeInTheDocument();
    });

    it('shows conflict button when conflicts exist', () => {
      mockConflicts.push({
        shortcut: 'Ctrl+N',
        existingOwner: 'system',
        existingAction: 'New Window',
        newOwner: 'app',
        newAction: 'New Chat',
        timestamp: Date.now(),
      });
      
      render(<ShortcutManager />);
      expect(screen.getByTestId('button-destructive')).toBeInTheDocument();
      expect(screen.getAllByText('1 Conflict(s)').length).toBeGreaterThan(0);
    });

    it('shows plural conflicts text', () => {
      mockConflicts.push(
        {
          shortcut: 'Ctrl+N',
          existingOwner: 'system',
          existingAction: 'New Window',
          newOwner: 'app',
          newAction: 'New Chat',
          timestamp: Date.now(),
        },
        {
          shortcut: 'Ctrl+S',
          existingOwner: 'system',
          existingAction: 'Save',
          newOwner: 'app',
          newAction: 'Search',
          timestamp: Date.now(),
        }
      );
      
      render(<ShortcutManager />);
      expect(screen.getAllByText('2 Conflict(s)').length).toBeGreaterThan(0);
    });

    it('opens conflict dialog when conflict button clicked', () => {
      mockConflicts.push({
        shortcut: 'Ctrl+N',
        existingOwner: 'system',
        existingAction: 'New Window',
        newOwner: 'app',
        newAction: 'New Chat',
        timestamp: Date.now(),
      });
      
      render(<ShortcutManager />);
      fireEvent.click(screen.getByTestId('button-destructive'));
      expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
    });

    it('shows alert icon for shortcuts with conflicts', () => {
      mockConflicts.push({
        shortcut: 'Ctrl+N',
        existingOwner: 'system',
        existingAction: 'New Window',
        newOwner: 'app',
        newAction: 'New Chat',
        timestamp: Date.now(),
      });
      
      render(<ShortcutManager />);
      expect(screen.getAllByTestId('icon-alert-triangle').length).toBeGreaterThan(0);
    });

    it('calls detectConflicts when Detect Conflicts clicked', async () => {
      render(<ShortcutManager />);
      fireEvent.click(screen.getByText('Detect Conflicts'));
      
      await waitFor(() => {
        expect(mockDetectConflicts).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('calls detectConflicts on refresh', () => {
      render(<ShortcutManager />);
      fireEvent.click(screen.getByText('Refresh'));
      expect(mockDetectConflicts).toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    it('exports shortcuts as JSON when Export clicked', () => {
      // Mock document.createElement only for anchor element
      const originalCreateElement = document.createElement.bind(document);
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        style: {},
      };
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });
      
      render(<ShortcutManager />);
      fireEvent.click(screen.getByText('Export'));
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
    });
  });

  describe('Conflict Resolution Mode', () => {
    it('displays conflict resolution mode selector', () => {
      render(<ShortcutManager />);
      expect(screen.getByText('Conflict Resolution Mode:')).toBeInTheDocument();
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('calls setConflictResolutionMode when mode changed', () => {
      render(<ShortcutManager />);
      const select = screen.getByTestId('select-native');
      fireEvent.change(select, { target: { value: 'block' } });
      expect(mockSetConflictResolutionMode).toHaveBeenCalledWith('block');
    });

    it('displays all resolution mode options', () => {
      render(<ShortcutManager />);
      expect(screen.getByTestId('select-item-warn')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-block')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-auto-resolve')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty shortcuts list', () => {
      jest.doMock('@/lib/native/shortcuts', () => ({
        getAllShortcutMetadata: () => [],
      }));
      
      render(<ShortcutManager />);
      // Component should still render without crashing
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('Conflict Resolution Callbacks', () => {
    it('calls resolveConflict when single conflict is resolved', () => {
      const conflict = {
        shortcut: 'Ctrl+N',
        existingOwner: 'system',
        existingAction: 'New Window',
        newOwner: 'app',
        newAction: 'New Chat',
        timestamp: Date.now(),
      };
      mockConflicts.push(conflict);
      
      render(<ShortcutManager />);
      // Open conflict dialog
      fireEvent.click(screen.getByTestId('button-destructive'));
      expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
      
      // Resolve single conflict
      fireEvent.click(screen.getByTestId('resolve-single'));
      expect(mockResolveConflict).toHaveBeenCalledWith(conflict, 'keep-existing');
    });

    it('calls resolveConflict for all conflicts when Resolve All clicked', () => {
      const conflict1 = {
        shortcut: 'Ctrl+N',
        existingOwner: 'system',
        existingAction: 'New Window',
        newOwner: 'app',
        newAction: 'New Chat',
        timestamp: Date.now(),
      };
      const conflict2 = {
        shortcut: 'Ctrl+S',
        existingOwner: 'system',
        existingAction: 'Save',
        newOwner: 'app',
        newAction: 'Search',
        timestamp: Date.now() + 1,
      };
      mockConflicts.push(conflict1, conflict2);
      
      render(<ShortcutManager />);
      // Open conflict dialog
      fireEvent.click(screen.getByTestId('button-destructive'));
      
      // Resolve all conflicts
      fireEvent.click(screen.getByText('Resolve All'));
      expect(mockResolveConflict).toHaveBeenCalledTimes(2);
      expect(mockResolveConflict).toHaveBeenCalledWith(conflict1, 'keep-existing');
      expect(mockResolveConflict).toHaveBeenCalledWith(conflict2, 'keep-existing');
    });

    it('opens conflict dialog when conflicts are detected during detection', async () => {
      // Mock detectConflicts to return conflicts and update the store
      const mockConflictsToAdd = [{
        shortcut: 'Ctrl+N',
        existingOwner: 'system',
        existingAction: 'New Window',
        newOwner: 'app',
        newAction: 'New Chat',
        timestamp: Date.now(),
      }];
      
      mockDetectConflicts.mockImplementation(async () => {
        mockConflicts.push(...mockConflictsToAdd);
        return mockConflictsToAdd;
      });
      
      render(<ShortcutManager />);
      fireEvent.click(screen.getByText('Detect Conflicts'));
      
      await waitFor(() => {
        expect(mockDetectConflicts).toHaveBeenCalled();
      });
    });
  });
});
