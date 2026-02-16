'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TraySettings } from './tray-settings';

jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn().mockReturnValue(false),
}));

jest.mock('@/hooks/native', () => ({
  useTray: jest.fn().mockReturnValue({
    displayMode: 'full',
    config: {
      visibleItems: [],
      compactModeItems: [],
      showShortcuts: true,
      showIcons: true,
      itemOrder: [],
    },
    isSyncing: false,
    error: null,
    setDisplayMode: jest.fn(),
    toggleMode: jest.fn(),
    setItemVisibility: jest.fn(),
    setCompactItems: jest.fn(),
    setShowShortcuts: jest.fn(),
    setShowIcons: jest.fn(),
    syncConfig: jest.fn(),
    resetConfig: jest.fn(),
  }),
}));

jest.mock('@/stores/system/tray-store', () => ({
  useTrayStore: jest.fn().mockReturnValue({
    menuItems: [],
    moveItemUp: jest.fn(),
    moveItemDown: jest.fn(),
  }),
}));

const messages = {
  traySettings: {
    title: 'System Tray',
    notAvailable: 'System tray settings are only available in the desktop app',
    downloadHint: 'Download the desktop app to access system tray settings',
    displayMode: 'Display Mode',
    displayModeDesc: 'Choose how the system tray menu is displayed',
    currentMode: 'Current Mode',
    fullModeDesc: 'Shows all menu items',
    compactModeDesc: 'Shows only essential items',
    full: 'Full',
    compact: 'Compact',
    switchMode: 'Switch Mode',
    fullMode: 'Full Mode',
    compactMode: 'Compact Mode',
    showAllItems: 'Show all menu items',
    coreOnly: 'Show core items only',
    displayOptions: 'Display Options',
    showIcons: 'Show Icons',
    showIconsDesc: 'Display icons in menu items',
    showShortcuts: 'Show Shortcuts',
    showShortcutsDesc: 'Display keyboard shortcuts',
    menuConfig: 'Menu Configuration',
    menuConfigDesc: 'Configure which items appear in the tray menu',
    resetCompact: 'Reset Compact',
    resetAll: 'Reset All',
    categories: {
      window: 'Window',
      tools: 'Tools',
      settings: 'Settings',
      help: 'Help',
      exit: 'Exit',
    },
    submenu: 'Submenu',
    showInCompact: 'Show in compact mode',
    compactPreview: 'Compact Mode Preview',
    compactPreviewDesc: '{count} items in compact mode',
    syncing: 'Syncing...',
    applyChanges: 'Apply Changes',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('TraySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when not in Tauri environment', () => {
    it('renders not available message', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('System Tray')).toBeInTheDocument();
      expect(
        screen.getByText('System tray settings are only available in the desktop app')
      ).toBeInTheDocument();
    });

    it('shows download hint', () => {
      renderWithProviders(<TraySettings />);
      expect(
        screen.getByText('Download the desktop app to access system tray settings')
      ).toBeInTheDocument();
    });
  });

  describe('when in Tauri environment', () => {
    beforeEach(() => {
      const mockIsTauri = jest.requireMock('@/lib/native/utils').isTauri;
      mockIsTauri.mockReturnValue(true);
    });

    it('renders display mode section', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Display Mode')).toBeInTheDocument();
    });

    it('renders display options section', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Display Options')).toBeInTheDocument();
    });

    it('renders menu configuration section', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Menu Configuration')).toBeInTheDocument();
    });

    it('renders compact preview section', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Compact Mode Preview')).toBeInTheDocument();
    });

    it('renders apply changes button', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Apply Changes')).toBeInTheDocument();
    });

    it('shows full mode badge when in full mode', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Full')).toBeInTheDocument();
    });

    it('renders switch mode button', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Switch Mode')).toBeInTheDocument();
    });

    it('renders show icons toggle', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Show Icons')).toBeInTheDocument();
    });

    it('renders show shortcuts toggle', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Show Shortcuts')).toBeInTheDocument();
    });

    it('renders reset buttons', () => {
      renderWithProviders(<TraySettings />);
      expect(screen.getByText('Reset Compact')).toBeInTheDocument();
      expect(screen.getByText('Reset All')).toBeInTheDocument();
    });
  });
});
