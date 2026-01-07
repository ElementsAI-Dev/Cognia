/**
 * Updater Tests
 *
 * Tests for auto-updater functions.
 */

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-updater', () => ({
  check: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-process', () => ({
  relaunch: jest.fn(),
}));

jest.mock('@tauri-apps/api/app', () => ({
  getVersion: jest.fn(),
  getName: jest.fn(),
}));

import { isTauri } from './utils';
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  getCurrentVersion,
  getAppName,
  type UpdateInfo,
  type UpdateProgress,
} from './updater';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Updater - checkForUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return not available when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await checkForUpdates();
    expect(result).toEqual({ available: false });
  });

  it('should return not available when no update exists', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');
    (check as jest.Mock).mockResolvedValue(null);

    const result = await checkForUpdates();
    expect(result).toEqual({ available: false });
  });

  it('should return update info when update is available', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');
    (check as jest.Mock).mockResolvedValue({
      version: '2.0.0',
      currentVersion: '1.0.0',
      body: 'New features and bug fixes',
      date: '2024-01-15',
    });

    const result = await checkForUpdates();
    expect(result).toEqual({
      available: true,
      version: '2.0.0',
      currentVersion: '1.0.0',
      body: 'New features and bug fixes',
      date: '2024-01-15',
    });
  });

  it('should return not available on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');
    (check as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await checkForUpdates();
    expect(result).toEqual({ available: false });
  });
});

describe('Updater - downloadAndInstallUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await downloadAndInstallUpdate();
    expect(result).toBe(false);
  });

  it('should return false when no update is available', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');
    (check as jest.Mock).mockResolvedValue(null);

    const result = await downloadAndInstallUpdate();
    expect(result).toBe(false);
  });

  it('should download, install, and relaunch', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');
    const { relaunch } = await import('@tauri-apps/plugin-process');

    const mockDownloadAndInstall = jest.fn().mockImplementation(async (callback) => {
      callback({ event: 'Started', data: { contentLength: 1000 } });
      callback({ event: 'Progress', data: { chunkLength: 500 } });
      callback({ event: 'Progress', data: { chunkLength: 500 } });
      callback({ event: 'Finished', data: {} });
    });

    (check as jest.Mock).mockResolvedValue({
      version: '2.0.0',
      downloadAndInstall: mockDownloadAndInstall,
    });
    (relaunch as jest.Mock).mockResolvedValue(undefined);

    const result = await downloadAndInstallUpdate();
    expect(result).toBe(true);
    expect(mockDownloadAndInstall).toHaveBeenCalled();
    expect(relaunch).toHaveBeenCalled();
  });

  it('should call progress handler with progress updates', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');
    const { relaunch } = await import('@tauri-apps/plugin-process');

    const mockDownloadAndInstall = jest.fn().mockImplementation(async (callback) => {
      callback({ event: 'Started', data: { contentLength: 1000 } });
      callback({ event: 'Progress', data: { chunkLength: 500 } });
      callback({ event: 'Finished', data: {} });
    });

    (check as jest.Mock).mockResolvedValue({
      version: '2.0.0',
      downloadAndInstall: mockDownloadAndInstall,
    });
    (relaunch as jest.Mock).mockResolvedValue(undefined);

    const progressHandler = jest.fn();
    await downloadAndInstallUpdate(progressHandler);

    expect(progressHandler).toHaveBeenCalledWith({
      downloaded: 500,
      total: 1000,
      percentage: 50,
    });
  });

  it('should return false on download error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { check } = await import('@tauri-apps/plugin-updater');

    (check as jest.Mock).mockResolvedValue({
      version: '2.0.0',
      downloadAndInstall: jest.fn().mockRejectedValue(new Error('Download failed')),
    });

    const result = await downloadAndInstallUpdate();
    expect(result).toBe(false);
  });
});

describe('Updater - getCurrentVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await getCurrentVersion();
    expect(result).toBeNull();
  });

  it('should return version string', async () => {
    mockIsTauri.mockReturnValue(true);
    const { getVersion } = await import('@tauri-apps/api/app');
    (getVersion as jest.Mock).mockResolvedValue('1.2.3');

    const result = await getCurrentVersion();
    expect(result).toBe('1.2.3');
  });

  it('should return null on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { getVersion } = await import('@tauri-apps/api/app');
    (getVersion as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await getCurrentVersion();
    expect(result).toBeNull();
  });
});

describe('Updater - getAppName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await getAppName();
    expect(result).toBeNull();
  });

  it('should return app name', async () => {
    mockIsTauri.mockReturnValue(true);
    const { getName } = await import('@tauri-apps/api/app');
    (getName as jest.Mock).mockResolvedValue('Cognia');

    const result = await getAppName();
    expect(result).toBe('Cognia');
  });

  it('should return null on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { getName } = await import('@tauri-apps/api/app');
    (getName as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await getAppName();
    expect(result).toBeNull();
  });
});

describe('Updater Types', () => {
  it('should have correct UpdateInfo structure', () => {
    const updateInfo: UpdateInfo = {
      available: true,
      version: '2.0.0',
      currentVersion: '1.0.0',
      body: 'Release notes',
      date: '2024-01-15',
    };

    expect(updateInfo.available).toBe(true);
    expect(updateInfo.version).toBe('2.0.0');
  });

  it('should have correct UpdateProgress structure', () => {
    const progress: UpdateProgress = {
      downloaded: 500,
      total: 1000,
      percentage: 50,
    };

    expect(progress.percentage).toBe(50);
  });
});
