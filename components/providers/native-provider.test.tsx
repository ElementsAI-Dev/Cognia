/**
 * Tests for NativeProvider
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NativeProvider } from './native-provider';
import { useNativeStore } from '@/stores/system';
import * as nativeUtils from '@/lib/native/utils';
import * as systemApi from '@/lib/native/system';
import * as notificationApi from '@/lib/native/notification';
import * as updaterApi from '@/lib/native/updater';

// Mock the native store
jest.mock('@/stores/system', () => ({
  useNativeStore: {
    getState: jest.fn(() => ({
      setIsDesktop: jest.fn(),
      setSystemInfo: jest.fn(),
      setNotificationPermission: jest.fn(),
      setUpdateAvailable: jest.fn(),
    })),
  },
}));

// Mock native utilities
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@/lib/native/system', () => ({
  getSystemInfo: jest.fn(),
}));

jest.mock('@/lib/native/notification', () => ({
  isNotificationPermissionGranted: jest.fn(),
}));

jest.mock('@/lib/native/updater', () => ({
  checkForUpdates: jest.fn(),
}));

const mockIsTauri = nativeUtils.isTauri as jest.Mock;
const mockGetSystemInfo = systemApi.getSystemInfo as jest.Mock;
const mockIsNotificationPermissionGranted = notificationApi.isNotificationPermissionGranted as jest.Mock;
const mockCheckForUpdates = updaterApi.checkForUpdates as jest.Mock;

describe('NativeProvider', () => {
  const mockSetIsDesktop = jest.fn();
  const mockSetSystemInfo = jest.fn();
  const mockSetNotificationPermission = jest.fn();
  const mockSetUpdateAvailable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNativeStore.getState as jest.Mock).mockReturnValue({
      setIsDesktop: mockSetIsDesktop,
      setSystemInfo: mockSetSystemInfo,
      setNotificationPermission: mockSetNotificationPermission,
      setUpdateAvailable: mockSetUpdateAvailable,
    });

    // Default mock implementations
    mockIsTauri.mockReturnValue(false);
    mockGetSystemInfo.mockResolvedValue({ platform: 'windows', appVersion: '1.0.0' });
    mockIsNotificationPermissionGranted.mockResolvedValue(true);
    mockCheckForUpdates.mockResolvedValue({ available: false });
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <NativeProvider>
          <div>Child content</div>
        </NativeProvider>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });
  });

  describe('non-Tauri environment', () => {
    it('sets isDesktop to false when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockSetIsDesktop).toHaveBeenCalledWith(false);
      });
    });

    it('does not call other native APIs when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockSetIsDesktop).toHaveBeenCalledWith(false);
      });

      expect(mockGetSystemInfo).not.toHaveBeenCalled();
      expect(mockIsNotificationPermissionGranted).not.toHaveBeenCalled();
    });
  });

  describe('Tauri environment', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
    });

    it('sets isDesktop to true when in Tauri', async () => {
      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockSetIsDesktop).toHaveBeenCalledWith(true);
      });
    });

    it('fetches and sets system info', async () => {
      mockGetSystemInfo.mockResolvedValue({
        platform: 'macos',
        appVersion: '2.0.0',
      });

      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockGetSystemInfo).toHaveBeenCalled();
        expect(mockSetSystemInfo).toHaveBeenCalledWith('macos', '2.0.0');
      });
    });

    it('checks notification permission', async () => {
      mockIsNotificationPermissionGranted.mockResolvedValue(true);

      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockIsNotificationPermissionGranted).toHaveBeenCalled();
        expect(mockSetNotificationPermission).toHaveBeenCalledWith(true);
      });
    });

    it('sets notification permission to false when not granted', async () => {
      mockIsNotificationPermissionGranted.mockResolvedValue(false);

      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockSetNotificationPermission).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('update checking', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
    });

    it('checks for updates when checkUpdatesOnMount is true', async () => {
      mockCheckForUpdates.mockResolvedValue({ available: false });

      render(
        <NativeProvider checkUpdatesOnMount={true}>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockCheckForUpdates).toHaveBeenCalled();
      });
    });

    it('does not check for updates when checkUpdatesOnMount is false', async () => {
      render(
        <NativeProvider checkUpdatesOnMount={false}>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockSetIsDesktop).toHaveBeenCalled();
      });

      expect(mockCheckForUpdates).not.toHaveBeenCalled();
    });

    it('sets update available when update is found', async () => {
      mockCheckForUpdates.mockResolvedValue({
        available: true,
        version: '3.0.0',
      });

      render(
        <NativeProvider checkUpdatesOnMount={true}>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockSetUpdateAvailable).toHaveBeenCalledWith(true, '3.0.0');
      });
    });

    it('does not set update when no update is available', async () => {
      mockCheckForUpdates.mockResolvedValue({ available: false });

      render(
        <NativeProvider checkUpdatesOnMount={true}>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockCheckForUpdates).toHaveBeenCalled();
      });

      expect(mockSetUpdateAvailable).not.toHaveBeenCalled();
    });

    it('handles update check errors gracefully', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockCheckForUpdates.mockRejectedValue(new Error('Update check failed'));

      render(
        <NativeProvider checkUpdatesOnMount={true}>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          'Failed to check for updates:',
          expect.any(Error)
        );
      });

      warnSpy.mockRestore();
    });
  });

  describe('default props', () => {
    it('defaults checkUpdatesOnMount to true', async () => {
      mockIsTauri.mockReturnValue(true);

      render(
        <NativeProvider>
          <div>Test</div>
        </NativeProvider>
      );

      await waitFor(() => {
        expect(mockCheckForUpdates).toHaveBeenCalled();
      });
    });
  });
});
