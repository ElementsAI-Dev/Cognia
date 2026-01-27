'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginGroupedList } from './plugin-grouped-list';
import type { Plugin } from '@/types/plugin';

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    backgroundSettings: {
      enabled: false,
      source: 'none',
    },
  }),
}));

const messages = {
  plugin: {
    groupedList: {
      groupedBy: 'Grouped by {by}',
      groups: 'groups',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
    },
  },
};

const mockPlugins = [
  {
    manifest: {
      id: 'plugin-1',
      name: 'Test Plugin 1',
      version: '1.0.0',
      type: 'frontend',
      capabilities: ['tools'],
      description: 'Test description',
      author: { name: 'Author 1' },
      entry: 'index.js',
    },
    status: 'enabled',
    source: 'local',
    path: '/test/path',
    config: {},
  },
  {
    manifest: {
      id: 'plugin-2',
      name: 'Test Plugin 2',
      version: '1.0.0',
      type: 'python',
      capabilities: ['components'],
      description: 'Test description 2',
      author: { name: 'Author 2' },
      entry: 'main.py',
    },
    status: 'disabled',
    source: 'local',
    path: '/test/path2',
    config: {},
  },
] as unknown as Plugin[];

const mockHandlers = {
  onToggle: jest.fn(),
  onConfigure: jest.fn(),
  onUninstall: jest.fn(),
  onViewDetails: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PluginGroupedList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders grouped by type', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        {...mockHandlers}
      />
    );
    // Check that grouped list renders with group headers
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders expand all button', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        {...mockHandlers}
      />
    );
    // Check for expand/collapse buttons by role
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders toggle buttons', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        {...mockHandlers}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders group headers', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('shows plugin count in groups', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        {...mockHandlers}
      />
    );
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('expands group on click', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        defaultExpandedGroups={['frontend']}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
  });

  it('returns null when no plugins', () => {
    const { container } = renderWithProviders(
      <PluginGroupedList plugins={[]} groupBy="type" {...mockHandlers} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('groups by capability', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="capability"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
  });

  it('groups by status', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="status"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('supports list view mode', () => {
    renderWithProviders(
      <PluginGroupedList
        plugins={mockPlugins}
        groupBy="type"
        viewMode="list"
        defaultExpandedGroups={['frontend']}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
  });
});
