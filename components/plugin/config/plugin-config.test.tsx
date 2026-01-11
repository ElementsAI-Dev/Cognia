/**
 * Plugin Config Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginConfig } from './plugin-config';
import { usePluginStore } from '@/stores/plugin';
import { usePluginPermissions } from '@/hooks/plugin';
import type { Plugin, PluginManifest } from '@/types/plugin';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/hooks/plugin', () => ({
  usePluginPermissions: jest.fn(),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className} data-testid="label">{children}</label>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('../schema/schema-form', () => ({
  SchemaForm: ({ schema: _schema, value: _value, onChange: _onChange }: { 
    schema: unknown; 
    value: unknown; 
    onChange: (v: unknown) => void; 
  }) => (
    <div data-testid="schema-form">Schema Form</div>
  ),
}));

const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  type: 'frontend',
  capabilities: ['tools', 'commands'],
  author: { name: 'Test Author' },
  main: 'index.ts',
  configSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', title: 'API Key' },
      enabled: { type: 'boolean', title: 'Enabled' },
    },
  },
  defaultConfig: { apiKey: '', enabled: false },
};

const mockPlugin: Plugin = {
  manifest: mockManifest,
  status: 'enabled',
  source: 'local',
  path: '/plugins/test-plugin',
  config: { apiKey: 'test-key', enabled: true },
};

describe('PluginConfig', () => {
  const mockSetPluginConfig = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      setPluginConfig: mockSetPluginConfig,
    });
    (usePluginPermissions as unknown as jest.Mock).mockReturnValue({
      permissions: ['read', 'write'],
      grants: [{ permission: 'read', grantedBy: 'user' }],
      hasPermission: (perm: string) => perm === 'read',
    });
  });

  it('should render config tabs', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByTestId('tab-trigger-config')).toHaveTextContent('Configuration');
    expect(screen.getByTestId('tab-trigger-info')).toHaveTextContent('Information');
    expect(screen.getByTestId('tab-trigger-permissions')).toHaveTextContent('Permissions');
  });

  it('should render schema form when plugin has configSchema', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByTestId('schema-form')).toBeInTheDocument();
  });

  it('should render no configuration message when plugin has no configSchema', () => {
    const noConfigPlugin = {
      ...mockPlugin,
      manifest: { ...mockManifest, configSchema: undefined },
    };
    
    render(<PluginConfig plugin={noConfigPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByText('This plugin has no configuration options.')).toBeInTheDocument();
  });

  it('should display plugin info in info tab', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    // Check for plugin ID
    expect(screen.getByText('test-plugin')).toBeInTheDocument();
    // Check for version
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('should display plugin type', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('should display plugin author if available', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('should display capabilities badges', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should display permissions', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();
  });

  it('should render save and reset buttons when configSchema has properties', () => {
    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    const buttons = screen.getAllByTestId('button');
    const buttonTexts = buttons.map(b => b.textContent);
    expect(buttonTexts).toContain(expect.stringContaining('Save'));
    expect(buttonTexts).toContain(expect.stringContaining('Reset'));
  });

  it('should show no permissions message when plugin has no permissions', () => {
    (usePluginPermissions as unknown as jest.Mock).mockReturnValue({
      permissions: [],
      grants: [],
      hasPermission: () => false,
    });

    render(<PluginConfig plugin={mockPlugin} onClose={mockOnClose} />);
    
    expect(screen.getByText('This plugin requires no special permissions.')).toBeInTheDocument();
  });
});
