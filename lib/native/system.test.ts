/**
 * System Tests
 *
 * Tests for system operation functions.
 */

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-process', () => ({
  exit: jest.fn(),
  relaunch: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-shell', () => ({
  open: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-os', () => ({
  platform: jest.fn(),
  version: jest.fn(),
  arch: jest.fn(),
  locale: jest.fn(),
  hostname: jest.fn(),
}));

jest.mock('@tauri-apps/api/app', () => ({
  getVersion: jest.fn(),
  getName: jest.fn(),
}));

import { isTauri } from './utils';
import {
  exitApp,
  restartApp,
  openInBrowser,
  openInFileExplorer,
  getSystemInfo,
} from './system';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('System - exitApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do nothing when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const { exit } = await import('@tauri-apps/plugin-process');

    await exitApp();
    expect(exit).not.toHaveBeenCalled();
  });

  it('should call exit with code 0 by default', async () => {
    mockIsTauri.mockReturnValue(true);
    const { exit } = await import('@tauri-apps/plugin-process');
    (exit as jest.Mock).mockResolvedValue(undefined);

    await exitApp();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('should call exit with specified code', async () => {
    mockIsTauri.mockReturnValue(true);
    const { exit } = await import('@tauri-apps/plugin-process');
    (exit as jest.Mock).mockResolvedValue(undefined);

    await exitApp(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should handle exit error gracefully', async () => {
    mockIsTauri.mockReturnValue(true);
    const { exit } = await import('@tauri-apps/plugin-process');
    (exit as jest.Mock).mockRejectedValue(new Error('Test error'));

    await expect(exitApp()).resolves.not.toThrow();
  });
});

describe('System - restartApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call relaunch in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { relaunch } = await import('@tauri-apps/plugin-process');
    (relaunch as jest.Mock).mockResolvedValue(undefined);

    await restartApp();
    expect(relaunch).toHaveBeenCalled();
  });

  it('should handle relaunch error gracefully', async () => {
    mockIsTauri.mockReturnValue(true);
    const { relaunch } = await import('@tauri-apps/plugin-process');
    (relaunch as jest.Mock).mockRejectedValue(new Error('Test error'));

    await expect(restartApp()).resolves.not.toThrow();
  });
});

describe('System - openInBrowser', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn();
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('should open URL in new tab when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await openInBrowser('https://example.com');
    expect(result).toBe(true);
    expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank');
  });

  it('should use shell open in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { open } = await import('@tauri-apps/plugin-shell');
    (open as jest.Mock).mockResolvedValue(undefined);

    const result = await openInBrowser('https://example.com');
    expect(result).toBe(true);
    expect(open).toHaveBeenCalledWith('https://example.com');
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { open } = await import('@tauri-apps/plugin-shell');
    (open as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await openInBrowser('https://example.com');
    expect(result).toBe(false);
  });
});

describe('System - openInFileExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await openInFileExplorer('/path/to/folder');
    expect(result).toBe(false);
  });

  it('should use shell open in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { open } = await import('@tauri-apps/plugin-shell');
    (open as jest.Mock).mockResolvedValue(undefined);

    const result = await openInFileExplorer('/path/to/folder');
    expect(result).toBe(true);
    expect(open).toHaveBeenCalledWith('/path/to/folder');
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { open } = await import('@tauri-apps/plugin-shell');
    (open as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await openInFileExplorer('/path/to/folder');
    expect(result).toBe(false);
  });
});

describe('System - getSystemInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Note: getSystemInfo relies on Tauri APIs that are difficult to mock
  // without a full Tauri runtime. These are tested via integration tests.
  it('should return an object with expected keys', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await getSystemInfo();
    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('arch');
    expect(result).toHaveProperty('locale');
    expect(result).toHaveProperty('hostname');
    expect(result).toHaveProperty('appVersion');
    expect(result).toHaveProperty('appName');
  });
});
