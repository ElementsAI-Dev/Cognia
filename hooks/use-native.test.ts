/**
 * Tests for useNative hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useNative } from './use-native';
import * as nativeUtils from '@/lib/native/utils';
import * as systemModule from '@/lib/native/system';
import * as updaterModule from '@/lib/native/updater';
import * as notificationModule from '@/lib/native/notification';

// Mock dependencies
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

jest.mock('@/lib/native/system', () => ({
  getSystemInfo: jest.fn(() => Promise.resolve({
    platform: 'windows',
    appVersion: '1.0.0',
  })),
}));

jest.mock('@/lib/native/updater', () => ({
  checkForUpdates: jest.fn(() => Promise.resolve({
    available: false,
    version: null,
    notes: null,
    date: null,
  })),
  downloadAndInstallUpdate: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/native/notification', () => ({
  requestNotificationPermission: jest.fn(() => Promise.resolve(true)),
  isNotificationPermissionGranted: jest.fn(() => Promise.resolve(true)),
}));

// Mock the native store
const mockSetSystemInfo = jest.fn();
const mockSetIsDesktop = jest.fn();
const mockSetNotificationPermission = jest.fn();
const mockSetUpdateAvailable = jest.fn();
const mockSetUpdateDownloading = jest.fn();
const mockSetUpdateProgress = jest.fn();

jest.mock('@/stores/native-store', () => ({
  useNativeStore: () => ({
    platform: 'windows',
    appVersion: '1.0.0',
    isDesktop: true,
    setSystemInfo: mockSetSystemInfo,
    setIsDesktop: mockSetIsDesktop,
    setNotificationPermission: mockSetNotificationPermission,
    setUpdateAvailable: mockSetUpdateAvailable,
    setUpdateDownloading: mockSetUpdateDownloading,
    setUpdateProgress: mockSetUpdateProgress,
  }),
}));

const mockIsTauri = nativeUtils.isTauri as jest.MockedFunction<typeof nativeUtils.isTauri>;
const mockGetSystemInfo = systemModule.getSystemInfo as jest.MockedFunction<typeof systemModule.getSystemInfo>;
const mockCheckForUpdates = updaterModule.checkForUpdates as jest.MockedFunction<typeof updaterModule.checkForUpdates>;
const mockDownloadAndInstallUpdate = updaterModule.downloadAndInstallUpdate as jest.MockedFunction<typeof updaterModule.downloadAndInstallUpdate>;
const mockRequestNotificationPermission = notificationModule.requestNotificationPermission as jest.MockedFunction<typeof notificationModule.requestNotificationPermission>;
const mockIsNotificationPermissionGranted = notificationModule.isNotificationPermissionGranted as jest.MockedFunction<typeof notificationModule.isNotificationPermissionGranted>;

describe('useNative', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('initialization', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useNative());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.platform).toBe('windows');
      expect(result.current.appVersion).toBe('1.0.0');
      expect(result.current.updateInfo).toBeNull();
      expect(result.current.isCheckingUpdates).toBe(false);
    });

    it('should set desktop status on init', async () => {
      renderHook(() => useNative());

      await waitFor(() => {
        expect(mockSetIsDesktop).toHaveBeenCalledWith(true);
      });
    });

    it('should fetch system info on init', async () => {
      renderHook(() => useNative());

      await waitFor(() => {
        expect(mockGetSystemInfo).toHaveBeenCalled();
      });

      expect(mockSetSystemInfo).toHaveBeenCalledWith('windows', '1.0.0');
    });

    it('should check notification permission on init', async () => {
      renderHook(() => useNative());

      await waitFor(() => {
        expect(mockIsNotificationPermissionGranted).toHaveBeenCalled();
      });

      expect(mockSetNotificationPermission).toHaveBeenCalledWith(true);
    });
  });

  describe('checkForUpdates', () => {
    it('should check for updates and return info', async () => {
      const mockUpdateInfo = {
        available: true,
        version: '2.0.0',
        notes: 'New features',
        date: '2024-01-15',
      };
      
      mockCheckForUpdates.mockResolvedValueOnce(mockUpdateInfo);

      const { result } = renderHook(() => useNative());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.checkForUpdates();
      });

      expect(updateResult).toEqual(mockUpdateInfo);
      expect(result.current.updateInfo).toEqual(mockUpdateInfo);
      expect(mockSetUpdateAvailable).toHaveBeenCalledWith(true, '2.0.0');
    });

    it('should set isCheckingUpdates during check', async () => {
      let resolveCheck: (value: unknown) => void;
      const checkPromise = new Promise((resolve) => {
        resolveCheck = resolve;
      });
      mockCheckForUpdates.mockReturnValueOnce(checkPromise as Promise<updaterModule.UpdateInfo>);

      const { result } = renderHook(() => useNative());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.checkForUpdates();
      });

      await waitFor(() => {
        expect(result.current.isCheckingUpdates).toBe(true);
      });

      await act(async () => {
        resolveCheck!({ available: false, version: null, notes: null, date: null });
        await checkPromise;
      });

      expect(result.current.isCheckingUpdates).toBe(false);
    });
  });

  describe('installUpdate', () => {
    it('should install update and return success', async () => {
      mockDownloadAndInstallUpdate.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useNative());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let installResult;
      await act(async () => {
        installResult = await result.current.installUpdate();
      });

      expect(installResult).toBe(true);
      expect(mockSetUpdateDownloading).toHaveBeenCalledWith(true);
      expect(mockSetUpdateDownloading).toHaveBeenCalledWith(false);
    });
  });

  describe('requestNotifications', () => {
    it('should request notification permission', async () => {
      mockRequestNotificationPermission.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useNative());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let granted;
      await act(async () => {
        granted = await result.current.requestNotifications();
      });

      expect(granted).toBe(true);
      expect(mockSetNotificationPermission).toHaveBeenCalledWith(true);
    });

    it('should handle denied permission', async () => {
      mockRequestNotificationPermission.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useNative());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let granted;
      await act(async () => {
        granted = await result.current.requestNotifications();
      });

      expect(granted).toBe(false);
    });
  });

  describe('options', () => {
    it('should check updates on mount when enabled', async () => {
      renderHook(() => useNative({ checkUpdatesOnMount: true }));

      await waitFor(() => {
        expect(mockCheckForUpdates).toHaveBeenCalled();
      });
    });

    it('should request notification permission on mount when enabled', async () => {
      renderHook(() => useNative({ requestNotificationPermission: true }));

      await waitFor(() => {
        expect(mockRequestNotificationPermission).toHaveBeenCalled();
      });
    });
  });
});

describe('useNative - non-desktop environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
  });

  afterEach(() => {
    mockIsTauri.mockReturnValue(true);
  });

  it('should set isDesktop to false when not in Tauri', async () => {
    renderHook(() => useNative());

    await waitFor(() => {
      expect(mockSetIsDesktop).toHaveBeenCalledWith(false);
    });
  });
});
