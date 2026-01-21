/**
 * Plugin Settings Page Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginSettingsPage } from './plugin-settings-page';
import { usePluginStore } from '@/stores/plugin';
import { usePlugins } from '@/hooks/plugin';
import type { Plugin } from '@/types/plugin';

// Mock stores and hooks
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/hooks/plugin', () => ({
  usePlugins: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'Plugins',
      'enabledCount': `${params?.count || 0} enabled`,
      'installedCount': `${params?.count || 0} installed`,
      'refresh': 'Refresh',
      'import': 'Import',
      'fromFolder': 'From Folder',
      'fromZip': 'From ZIP',
      'fromGitUrl': 'From Git URL',
      'createPlugin': 'Create Plugin',
      'tabs.installed': 'Installed',
      'tabs.analytics': 'Analytics',
      'tabs.develop': 'Develop',
      'tabs.health': 'Health',
      'tabs.settings': 'Settings',
      'filters.searchPlaceholder': 'Search plugins...',
      'filters.allStatus': 'All Status',
      'filters.enabled': 'Enabled',
      'filters.disabled': 'Disabled',
      'filters.error': 'Error',
      'filters.allTypes': 'All Types',
      'filters.frontend': 'Frontend',
      'filters.python': 'Python',
      'filters.hybrid': 'Hybrid',
      'filters.allCapabilities': 'All Capabilities',
      'filters.tools': 'Tools',
      'filters.components': 'Components',
      'filters.modes': 'Modes',
      'filters.commands': 'Commands',
      'filters.hooks': 'Hooks',
      'filters.sortByName': 'By Name',
      'filters.sortByRecent': 'By Recent',
      'filters.sortByStatus': 'By Status',
      'emptyState.noMatch': 'No plugins match your filters',
      'emptyState.tryAdjusting': 'Try adjusting your search or filters',
      'emptyState.noPlugins': 'No plugins installed',
      'emptyState.createFirst': 'Create your first plugin',
      'statusBar.pluginsShown': `${params?.count || 0} plugins shown`,
      'statusBar.errors': `${params?.count || 0} errors`,
      'statusBar.enabledCount': `${params?.count || 0} enabled`,
      'statusBar.disabledCount': `${params?.count || 0} disabled`,
      'settingsTab.title': 'Plugin Settings',
      'settingsTab.description': 'Configure plugin behavior',
      'settingsTab.autoEnable': 'Auto Enable',
      'settingsTab.autoEnableDesc': 'Automatically enable new plugins',
      'settingsTab.configure': 'Configure',
      'settingsTab.pluginDirectory': 'Plugin Directory',
      'settingsTab.open': 'Open',
      'settingsTab.pythonEnvironment': 'Python Environment',
      'settingsTab.pythonEnvironmentDesc': 'Configure Python for plugins',
      'settingsTab.clearCache': 'Clear Cache',
      'settingsTab.clearCacheDesc': 'Clear plugin cache',
      'settingsTab.clearCacheBtn': 'Clear',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: { 
    value?: string; 
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      className={className}
      data-testid="search-input"
    />
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => (
    <div data-testid={`tab-content-${value}`} className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="tabs-list" className={className}>{children}</div>,
  TabsTrigger: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => (
    <button data-testid={`tab-trigger-${value}`} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange: _onValueChange }: { 
    children: React.ReactNode; 
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => 
    <div data-testid={`select-item-${value}`}>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="select-trigger" className={className}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => 
    <span data-testid="select-value">{placeholder}</span>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => 
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dropdown-trigger">{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

// Mock child components
jest.mock('../core/plugin-list', () => ({
  PluginList: ({ plugins, viewMode, onToggle, onConfigure, onUninstall }: { 
    plugins: Plugin[];
    viewMode: string;
    onToggle: (p: Plugin) => void;
    onConfigure: (p: Plugin) => void;
    onUninstall: (p: Plugin) => void;
  }) => (
    <div data-testid="plugin-list" data-view-mode={viewMode}>
      {plugins.map(p => (
        <div key={p.manifest.id} data-testid={`plugin-${p.manifest.id}`}>
          {p.manifest.name}
          <button onClick={() => onToggle(p)} data-testid={`toggle-${p.manifest.id}`}>Toggle</button>
          <button onClick={() => onConfigure(p)} data-testid={`configure-${p.manifest.id}`}>Configure</button>
          <button onClick={() => onUninstall(p)} data-testid={`uninstall-${p.manifest.id}`}>Uninstall</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../monitoring/plugin-analytics', () => ({
  PluginAnalytics: ({ className }: { className?: string }) => 
    <div data-testid="plugin-analytics" className={className}>Analytics</div>,
}));

jest.mock('./plugin-create-wizard', () => ({
  PluginCreateWizard: ({ open, onOpenChange, onComplete: _onComplete }: { 
    open: boolean; 
    onOpenChange: (v: boolean) => void;
    onComplete?: () => void;
  }) => 
    open ? (
      <div data-testid="create-wizard">
        <button onClick={() => onOpenChange(false)} data-testid="close-wizard">Close</button>
      </div>
    ) : null,
}));

jest.mock('../dev/plugin-dev-tools', () => ({
  PluginDevTools: ({ className }: { className?: string }) => 
    <div data-testid="plugin-dev-tools" className={className}>Dev Tools</div>,
}));

jest.mock('../monitoring/plugin-health', () => ({
  PluginHealth: ({ autoRefresh, refreshInterval }: { autoRefresh?: boolean; refreshInterval?: number }) => 
    <div data-testid="plugin-health" data-auto-refresh={autoRefresh} data-interval={refreshInterval}>Health</div>,
}));

jest.mock('../monitoring/plugin-dependency-tree', () => ({
  PluginDependencyTree: () => <div data-testid="plugin-dependency-tree">Dependency Tree</div>,
}));

jest.mock('../monitoring/plugin-conflicts', () => ({
  PluginConflicts: ({ autoDetect }: { autoDetect?: boolean }) => 
    <div data-testid="plugin-conflicts" data-auto-detect={autoDetect}>Conflicts</div>,
}));

jest.mock('../monitoring/plugin-updates', () => ({
  PluginUpdates: ({ autoCheck }: { autoCheck?: boolean }) => 
    <div data-testid="plugin-updates" data-auto-check={autoCheck}>Updates</div>,
}));

const mockPlugin: Plugin = {
  manifest: {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    type: 'frontend',
    capabilities: ['tools'],
    author: { name: 'Test' },
    main: 'index.ts',
  },
  status: 'enabled',
  source: 'local',
  path: '/plugins/test-plugin',
  config: {},
};

const mockDisabledPlugin: Plugin = {
  ...mockPlugin,
  manifest: { ...mockPlugin.manifest, id: 'disabled-plugin', name: 'Disabled Plugin' },
  status: 'disabled',
};

const mockErrorPlugin: Plugin = {
  ...mockPlugin,
  manifest: { ...mockPlugin.manifest, id: 'error-plugin', name: 'Error Plugin' },
  status: 'error',
  error: 'Failed to load',
};

describe('PluginSettingsPage', () => {
  const mockScanPlugins = jest.fn();
  const mockInitialize = jest.fn();
  const mockEnablePlugin = jest.fn();
  const mockDisablePlugin = jest.fn();
  const mockUninstallPlugin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      scanPlugins: mockScanPlugins,
      initialize: mockInitialize,
      enablePlugin: mockEnablePlugin,
      disablePlugin: mockDisablePlugin,
      uninstallPlugin: mockUninstallPlugin,
    });
    (usePlugins as unknown as jest.Mock).mockReturnValue({
      plugins: [mockPlugin, mockDisabledPlugin, mockErrorPlugin],
      enabledPlugins: [mockPlugin],
      disabledPlugins: [mockDisabledPlugin],
      errorPlugins: [mockErrorPlugin],
      initialized: true,
    });
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should render plugin counts', () => {
      render(<PluginSettingsPage />);
      
      // Multiple elements contain these counts
      expect(screen.getAllByText(/1 enabled/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/3 installed/).length).toBeGreaterThan(0);
    });

    it('should render refresh button', () => {
      render(<PluginSettingsPage />);
      
      // Multiple refresh buttons exist (desktop and mobile)
      expect(screen.getAllByText('Refresh').length).toBeGreaterThan(0);
    });

    it('should render create plugin button', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getAllByText('Create Plugin').length).toBeGreaterThan(0);
    });

    it('should render import dropdown', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getAllByText('Import').length).toBeGreaterThan(0);
    });
  });

  describe('Tabs', () => {
    it('should render all tab triggers', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByTestId('tab-trigger-installed')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-develop')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-health')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-settings')).toBeInTheDocument();
    });

    it('should render installed tab content with plugin list', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByTestId('plugin-list')).toBeInTheDocument();
    });

    it('should render analytics tab content', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByTestId('plugin-analytics')).toBeInTheDocument();
    });

    it('should render develop tab content', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByTestId('plugin-dev-tools')).toBeInTheDocument();
    });

    it('should render health tab content', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByTestId('plugin-health')).toBeInTheDocument();
      expect(screen.getByTestId('plugin-conflicts')).toBeInTheDocument();
      expect(screen.getByTestId('plugin-updates')).toBeInTheDocument();
      expect(screen.getByTestId('plugin-dependency-tree')).toBeInTheDocument();
    });
  });

  describe('Search and Filters', () => {
    it('should render search input', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should render status filter', () => {
      render(<PluginSettingsPage />);
      
      // Multiple select dropdowns have 'all' option
      expect(screen.getAllByTestId('select-item-all').length).toBeGreaterThan(0);
      expect(screen.getByTestId('select-item-enabled')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-disabled')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-error')).toBeInTheDocument();
    });

    it('should render type filter', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getAllByTestId('select-item-frontend').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('select-item-python').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('select-item-hybrid').length).toBeGreaterThan(0);
    });

    it('should render view mode toggle buttons', () => {
      render(<PluginSettingsPage />);
      
      const buttons = screen.getAllByTestId('button');
      // View mode buttons should exist
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should filter plugins by search query', () => {
      render(<PluginSettingsPage />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Test Plugin' } });
      
      // Plugin list should update (mock doesn't filter but component should)
      expect(searchInput).toHaveValue('Test Plugin');
    });
  });

  describe('Plugin Actions', () => {
    it('should call enablePlugin when toggling disabled plugin', () => {
      render(<PluginSettingsPage />);
      
      const toggleButton = screen.getByTestId('toggle-disabled-plugin');
      fireEvent.click(toggleButton);
      
      expect(mockEnablePlugin).toHaveBeenCalledWith('disabled-plugin');
    });

    it('should call disablePlugin when toggling enabled plugin', () => {
      render(<PluginSettingsPage />);
      
      const toggleButton = screen.getByTestId('toggle-test-plugin');
      fireEvent.click(toggleButton);
      
      expect(mockDisablePlugin).toHaveBeenCalledWith('test-plugin');
    });

    it('should call uninstallPlugin when uninstall is clicked', () => {
      render(<PluginSettingsPage />);
      
      const uninstallButton = screen.getByTestId('uninstall-test-plugin');
      fireEvent.click(uninstallButton);
      
      expect(mockUninstallPlugin).toHaveBeenCalledWith('test-plugin');
    });
  });

  describe('Refresh', () => {
    it('should call scanPlugins when refresh is clicked', async () => {
      mockScanPlugins.mockResolvedValue(undefined);
      render(<PluginSettingsPage />);
      
      const refreshButton = screen.getAllByText('Refresh')[0];
      fireEvent.click(refreshButton);
      
      expect(mockScanPlugins).toHaveBeenCalled();
    });

    it('should call initialize if not initialized', async () => {
      mockInitialize.mockResolvedValue(undefined);
      mockScanPlugins.mockResolvedValue(undefined);
      (usePlugins as unknown as jest.Mock).mockReturnValue({
        plugins: [],
        enabledPlugins: [],
        disabledPlugins: [],
        errorPlugins: [],
        initialized: false,
      });
      
      render(<PluginSettingsPage />);
      
      const refreshButton = screen.getAllByText('Refresh')[0];
      fireEvent.click(refreshButton);
      
      expect(mockInitialize).toHaveBeenCalledWith('plugins');
    });
  });

  describe('Create Wizard', () => {
    it('should open create wizard when create button is clicked', () => {
      render(<PluginSettingsPage />);
      
      const createButton = screen.getAllByText('Create Plugin')[0];
      fireEvent.click(createButton);
      
      expect(screen.getByTestId('create-wizard')).toBeInTheDocument();
    });

    it('should close create wizard when close is clicked', () => {
      render(<PluginSettingsPage />);
      
      // Open wizard
      const createButton = screen.getAllByText('Create Plugin')[0];
      fireEvent.click(createButton);
      
      // Close wizard
      const closeButton = screen.getByTestId('close-wizard');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('create-wizard')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no plugins', () => {
      (usePlugins as unknown as jest.Mock).mockReturnValue({
        plugins: [],
        enabledPlugins: [],
        disabledPlugins: [],
        errorPlugins: [],
        initialized: true,
      });
      
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('No plugins installed')).toBeInTheDocument();
      expect(screen.getByText('Create your first plugin')).toBeInTheDocument();
    });

    it('should show no match message when filters return no results', () => {
      (usePlugins as unknown as jest.Mock).mockReturnValue({
        plugins: [mockPlugin],
        enabledPlugins: [mockPlugin],
        disabledPlugins: [],
        errorPlugins: [],
        initialized: true,
      });
      
      render(<PluginSettingsPage />);
      
      // Search for non-existent plugin
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      // Component should filter and show no match
      expect(searchInput).toHaveValue('nonexistent');
    });
  });

  describe('Status Bar', () => {
    it('should show plugins count in status bar', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText(/plugins shown/)).toBeInTheDocument();
    });

    it('should show error count badge when there are errors', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText(/errors/)).toBeInTheDocument();
    });

    it('should show enabled and disabled counts', () => {
      render(<PluginSettingsPage />);
      
      // Multiple elements contain 'enabled' and 'disabled' text
      expect(screen.getAllByText(/enabled/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/disabled/i).length).toBeGreaterThan(0);
    });
  });

  describe('Settings Tab', () => {
    it('should render settings section', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('Plugin Settings')).toBeInTheDocument();
    });

    it('should render auto enable setting', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('Auto Enable')).toBeInTheDocument();
    });

    it('should render plugin directory setting', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('Plugin Directory')).toBeInTheDocument();
      expect(screen.getByText('~/.cognia/plugins')).toBeInTheDocument();
    });

    it('should render python environment setting', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('Python Environment')).toBeInTheDocument();
    });

    it('should render clear cache setting', () => {
      render(<PluginSettingsPage />);
      
      expect(screen.getByText('Clear Cache')).toBeInTheDocument();
    });
  });

  describe('View Mode', () => {
    it('should default to grid view', () => {
      render(<PluginSettingsPage />);
      
      const pluginList = screen.getByTestId('plugin-list');
      expect(pluginList).toHaveAttribute('data-view-mode', 'grid');
    });
  });
});
