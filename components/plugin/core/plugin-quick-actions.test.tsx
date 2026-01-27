'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginQuickActions } from './plugin-quick-actions';
import type { Plugin } from '@/types/plugin';

const messages = {
  pluginQuickActions: {
    selectAll: 'Select All',
    selected: '{count} selected',
    enable: 'Enable',
    disable: 'Disable',
    update: 'Update',
    uninstall: 'Uninstall',
    deselect: 'Deselect',
    moreActions: 'More Actions',
    enableAll: 'Enable All',
    disableAll: 'Disable All',
    checkUpdates: 'Check Updates',
    uninstallAll: 'Uninstall All',
    uninstallDialog: {
      title: 'Uninstall Plugins',
      description: 'Are you sure you want to uninstall {count} plugins?',
      cancel: 'Cancel',
      confirm: 'Uninstall',
      andMore: 'and {count} more',
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
      description: 'Test',
      author: { name: 'Author' },
      entry: 'index.js',
    },
    status: 'enabled',
    source: 'local',
    path: '/test',
    config: {},
  },
  {
    manifest: {
      id: 'plugin-2',
      name: 'Test Plugin 2',
      version: '1.0.0',
      type: 'python',
      capabilities: ['components'],
      description: 'Test 2',
      author: { name: 'Author' },
      entry: 'main.py',
    },
    status: 'disabled',
    source: 'local',
    path: '/test2',
    config: {},
  },
] as unknown as Plugin[];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PluginQuickActions', () => {
  const mockHandlers = {
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onEnableSelected: jest.fn().mockResolvedValue(undefined),
    onDisableSelected: jest.fn().mockResolvedValue(undefined),
    onUninstallSelected: jest.fn().mockResolvedValue(undefined),
    onUpdateSelected: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('no selection', () => {
    it('renders select all button when no selection', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set()}
          {...mockHandlers}
        />
      );
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('calls onSelectAll when clicked', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set()}
          {...mockHandlers}
        />
      );
      fireEvent.click(screen.getByText('Select All'));
      expect(mockHandlers.onSelectAll).toHaveBeenCalled();
    });

    it('disables select all when no plugins', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={[]}
          selectedPlugins={new Set()}
          {...mockHandlers}
        />
      );
      expect(screen.getByText('Select All')).toBeDisabled();
    });
  });

  describe('with selection', () => {
    it('shows selection count', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-1'])}
          {...mockHandlers}
        />
      );
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('renders enable button', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-2'])}
          {...mockHandlers}
        />
      );
      expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument();
    });

    it('renders disable button', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-1'])}
          {...mockHandlers}
        />
      );
      expect(screen.getByRole('button', { name: /disable/i })).toBeInTheDocument();
    });

    it('calls onEnableSelected when enable clicked', async () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-2'])}
          {...mockHandlers}
        />
      );
      const enableBtn = screen.getByRole('button', { name: /enable/i });
      fireEvent.click(enableBtn);
      await waitFor(() => {
        expect(mockHandlers.onEnableSelected).toHaveBeenCalled();
      });
    });

    it('calls onDisableSelected when disable clicked', async () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-1'])}
          {...mockHandlers}
        />
      );
      const disableBtn = screen.getByRole('button', { name: /disable/i });
      fireEvent.click(disableBtn);
      await waitFor(() => {
        expect(mockHandlers.onDisableSelected).toHaveBeenCalled();
      });
    });

    it('renders deselect button', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-1'])}
          {...mockHandlers}
        />
      );
      expect(screen.getByText('Deselect')).toBeInTheDocument();
    });

    it('calls onDeselectAll when deselect clicked', () => {
      renderWithProviders(
        <PluginQuickActions
          plugins={mockPlugins}
          selectedPlugins={new Set(['plugin-1'])}
          {...mockHandlers}
        />
      );
      fireEvent.click(screen.getByText('Deselect'));
      expect(mockHandlers.onDeselectAll).toHaveBeenCalled();
    });
  });
});
