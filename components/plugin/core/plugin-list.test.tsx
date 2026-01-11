/**
 * Plugin List Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginList } from './plugin-list';
import type { Plugin, PluginManifest } from '@/types/plugin';

// Mock PluginCard component
jest.mock('./plugin-card', () => ({
  PluginCard: ({ plugin }: { plugin: Plugin }) => (
    <div data-testid="plugin-card">{plugin.manifest.name}</div>
  ),
}));

const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  type: 'frontend',
  capabilities: ['tools'],
  author: { name: 'Test' },
  main: 'index.ts',
};

const createMockPlugin = (id: string, name: string): Plugin => ({
  manifest: { ...mockManifest, id, name },
  status: 'enabled',
  source: 'local',
  path: `/plugins/${id}`,
  config: {},
});

describe('PluginList', () => {
  const defaultProps = {
    plugins: [],
    onToggle: jest.fn(),
    onConfigure: jest.fn(),
    onUninstall: jest.fn(),
  };

  it('should render empty state when no plugins', () => {
    render(<PluginList {...defaultProps} />);
    
    expect(screen.getByText(/no plugins/i)).toBeInTheDocument();
  });

  it('should render plugin cards for each plugin', () => {
    const plugins = [
      createMockPlugin('plugin-1', 'Plugin One'),
      createMockPlugin('plugin-2', 'Plugin Two'),
      createMockPlugin('plugin-3', 'Plugin Three'),
    ];

    render(<PluginList {...defaultProps} plugins={plugins} />);
    
    const cards = screen.getAllByTestId('plugin-card');
    expect(cards).toHaveLength(3);
  });

  it('should display plugin names', () => {
    const plugins = [
      createMockPlugin('plugin-1', 'Plugin One'),
      createMockPlugin('plugin-2', 'Plugin Two'),
    ];

    render(<PluginList {...defaultProps} plugins={plugins} />);
    
    expect(screen.getByText('Plugin One')).toBeInTheDocument();
    expect(screen.getByText('Plugin Two')).toBeInTheDocument();
  });

  it('should render single plugin', () => {
    const plugins = [createMockPlugin('single', 'Single Plugin')];

    render(<PluginList {...defaultProps} plugins={plugins} />);
    
    expect(screen.getByTestId('plugin-card')).toBeInTheDocument();
    expect(screen.getByText('Single Plugin')).toBeInTheDocument();
  });

  it('should handle many plugins', () => {
    const plugins = Array.from({ length: 20 }, (_, i) => 
      createMockPlugin(`plugin-${i}`, `Plugin ${i}`)
    );

    render(<PluginList {...defaultProps} plugins={plugins} />);
    
    const cards = screen.getAllByTestId('plugin-card');
    expect(cards).toHaveLength(20);
  });
});
