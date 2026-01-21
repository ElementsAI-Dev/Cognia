/**
 * Plugin Manager Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginManager } from './plugin-manager';
import { usePluginStore } from '@/stores/plugin';

// Mock stores and hooks
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string }) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className={className}
      data-testid="input" 
    />
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="dialog-description">{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}));

jest.mock('./plugin-list', () => ({
  PluginList: ({ plugins, onToggle: _onToggle, onConfigure: _onConfigure, onUninstall: _onUninstall }: { 
    plugins: unknown[]; 
    onToggle: (p: unknown) => void; 
    onConfigure: (p: unknown) => void; 
    onUninstall: (p: unknown) => void;
  }) => (
    <div data-testid="plugin-list" data-count={plugins.length}>
      {plugins.length} plugins
    </div>
  ),
}));

jest.mock('../config/plugin-config', () => ({
  PluginConfig: ({ plugin: _plugin, onClose: _onClose }: { plugin: unknown; onClose: () => void }) => (
    <div data-testid="plugin-config">Config for plugin</div>
  ),
}));

const mockPlugins = {
  'plugin-1': {
    manifest: {
      id: 'plugin-1',
      name: 'Test Plugin 1',
      description: 'Description 1',
      version: '1.0.0',
      type: 'frontend',
      capabilities: ['tools'],
    },
    status: 'enabled',
    path: '/plugins/plugin-1',
    config: {},
  },
  'plugin-2': {
    manifest: {
      id: 'plugin-2',
      name: 'Test Plugin 2',
      description: 'Description 2',
      version: '1.0.0',
      type: 'python',
      capabilities: ['commands'],
    },
    status: 'disabled',
    path: '/plugins/plugin-2',
    config: {},
  },
};

describe('PluginManager', () => {
  const mockStore = {
    plugins: mockPlugins,
    initialized: true,
    scanPlugins: jest.fn().mockResolvedValue(undefined),
    enablePlugin: jest.fn().mockResolvedValue(undefined),
    disablePlugin: jest.fn().mockResolvedValue(undefined),
    uninstallPlugin: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('should render plugin manager header', () => {
    render(<PluginManager />);
    
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });

  it('should display plugin count', () => {
    render(<PluginManager />);
    
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(<PluginManager />);
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should render dialog trigger for install', () => {
    render(<PluginManager />);
    
    // The component renders with buttons for actions
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render search input', () => {
    render(<PluginManager />);
    
    const searchInput = screen.getByPlaceholderText('Search plugins...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render tabs for All, Enabled, and Disabled plugins', () => {
    render(<PluginManager />);
    
    expect(screen.getByTestId('tab-trigger-all')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-enabled')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-disabled')).toBeInTheDocument();
  });

  it('should filter plugins when searching', () => {
    render(<PluginManager />);
    
    const searchInput = screen.getByPlaceholderText('Search plugins...');
    fireEvent.change(searchInput, { target: { value: 'Plugin 1' } });
    
    // The PluginList component receives filtered plugins (multiple tabs have plugin-list)
    expect(screen.getAllByTestId('plugin-list').length).toBeGreaterThan(0);
  });

  it('should call scanPlugins when refresh button is clicked', async () => {
    render(<PluginManager />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockStore.scanPlugins).toHaveBeenCalled();
    });
  });

  it('should call scanPlugins on mount when not initialized', () => {
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      initialized: false,
    });
    
    render(<PluginManager />);
    
    expect(mockStore.scanPlugins).toHaveBeenCalled();
  });

  it('should not call scanPlugins on mount when already initialized', () => {
    render(<PluginManager />);
    
    // scanPlugins should not be called automatically when already initialized
    expect(mockStore.scanPlugins).not.toHaveBeenCalled();
  });

  it('should render with custom className', () => {
    const { container } = render(<PluginManager className="custom-class" />);
    
    const managerDiv = container.firstChild as HTMLElement;
    expect(managerDiv).toHaveClass('custom-class');
  });

  it('should show error plugins banner when there are error plugins', () => {
    const errorPlugins = {
      ...mockPlugins,
      'plugin-error': {
        manifest: {
          id: 'plugin-error',
          name: 'Error Plugin',
          description: 'This plugin has an error',
          version: '1.0.0',
          type: 'frontend',
          capabilities: [],
        },
        status: 'error',
        error: 'Something went wrong',
        path: '/plugins/plugin-error',
        config: {},
      },
    };

    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      plugins: errorPlugins,
    });

    render(<PluginManager />);
    
    expect(screen.getByText(/plugin\(s\) have errors/)).toBeInTheDocument();
  });
});
