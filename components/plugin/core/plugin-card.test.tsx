/**
 * Plugin Card Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginCard } from './plugin-card';
import type { Plugin, PluginManifest } from '@/types/plugin';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-footer">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    backgroundSettings: {
      enabled: false,
      source: 'none',
    },
  }),
}));

jest.mock('@/stores/plugin', () => ({
  usePluginMarketplaceStore: () => ({
    favorites: {},
    toggleFavorite: jest.fn(),
  }),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) => (
    <button 
      data-testid="switch" 
      data-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin for testing',
  type: 'frontend',
  capabilities: ['tools', 'commands'],
  author: { name: 'Test Author' },
  main: 'index.ts',
};

const mockPlugin: Plugin = {
  manifest: mockManifest,
  status: 'enabled',
  source: 'local',
  path: '/plugins/test-plugin',
  config: {},
};

describe('PluginCard', () => {
  const defaultProps = {
    plugin: mockPlugin,
    onToggle: jest.fn(),
    onConfigure: jest.fn(),
    onUninstall: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render plugin name', () => {
    render(<PluginCard {...defaultProps} />);
    
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
  });

  it('should render plugin description', () => {
    render(<PluginCard {...defaultProps} />);
    
    expect(screen.getByText('A test plugin for testing')).toBeInTheDocument();
  });

  it('should render plugin version and type', () => {
    render(<PluginCard {...defaultProps} />);
    
    // The component shows version and type in CardDescription
    expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/frontend/)).toBeInTheDocument();
  });

  it('should render capabilities badges', () => {
    render(<PluginCard {...defaultProps} />);
    
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('should call onToggle when switch is clicked', () => {
    render(<PluginCard {...defaultProps} />);
    
    const switchButton = screen.getByTestId('switch');
    fireEvent.click(switchButton);
    
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('should call onConfigure when configure menu item is clicked', () => {
    render(<PluginCard {...defaultProps} />);
    
    const configButton = screen.getByText('Configure');
    fireEvent.click(configButton);
    
    expect(defaultProps.onConfigure).toHaveBeenCalled();
  });

  it('should call onUninstall when uninstall menu item is clicked', () => {
    render(<PluginCard {...defaultProps} />);
    
    const uninstallButton = screen.getByText('Uninstall');
    fireEvent.click(uninstallButton);
    
    expect(defaultProps.onUninstall).toHaveBeenCalled();
  });

  it('should show enabled status for enabled plugins', () => {
    render(<PluginCard {...defaultProps} />);
    
    const switchButton = screen.getByTestId('switch');
    expect(switchButton).toHaveAttribute('data-checked', 'true');
  });

  it('should show disabled status for disabled plugins', () => {
    const disabledPlugin = { ...mockPlugin, status: 'disabled' as const };
    render(<PluginCard {...defaultProps} plugin={disabledPlugin} />);
    
    const switchButton = screen.getByTestId('switch');
    expect(switchButton).toHaveAttribute('data-checked', 'false');
  });

  it('should show error state for plugins with errors', () => {
    const errorPlugin = { ...mockPlugin, status: 'error' as const, error: 'Test error' };
    render(<PluginCard {...defaultProps} plugin={errorPlugin} />);
    
    // Check that error plugin renders correctly
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should render plugin type badge', () => {
    render(<PluginCard {...defaultProps} />);
    
    expect(screen.getByText(/frontend/i)).toBeInTheDocument();
  });

  it('should handle plugins with empty description', () => {
    const noDescPlugin = {
      ...mockPlugin,
      manifest: { ...mockManifest, description: '' },
    };
    render(<PluginCard {...defaultProps} plugin={noDescPlugin} />);
    
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
  });

  it('should handle plugins with loading status', () => {
    const loadingPlugin = { ...mockPlugin, status: 'loading' as const };
    render(<PluginCard {...defaultProps} plugin={loadingPlugin} />);
    
    const switchButton = screen.getByTestId('switch');
    // Loading plugins should show as not enabled
    expect(switchButton).toHaveAttribute('data-checked', 'false');
  });
});
