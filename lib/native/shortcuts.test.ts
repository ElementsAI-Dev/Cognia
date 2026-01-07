/**
 * Shortcuts Tests
 *
 * Tests for global shortcut functions.
 */

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: jest.fn(),
  unregister: jest.fn(),
  unregisterAll: jest.fn(),
  isRegistered: jest.fn(),
}));

import { isTauri } from './utils';
import {
  registerShortcut,
  unregisterShortcut,
  unregisterAllShortcuts,
  isShortcutRegistered,
  getRegisteredShortcuts,
  Shortcuts,
  type ShortcutHandler,
} from './shortcuts';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Shortcuts - registerShortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const handler = jest.fn();

    const result = await registerShortcut('CommandOrControl+N', handler);
    expect(result).toBe(false);
  });

  it('should register shortcut in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { register } = await import('@tauri-apps/plugin-global-shortcut');
    (register as jest.Mock).mockResolvedValue(undefined);
    const handler = jest.fn();

    const result = await registerShortcut('CommandOrControl+N', handler);
    expect(result).toBe(true);
    expect(register).toHaveBeenCalledWith('CommandOrControl+N', expect.any(Function));
  });

  it('should return false on registration error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { register } = await import('@tauri-apps/plugin-global-shortcut');
    (register as jest.Mock).mockRejectedValue(new Error('Test error'));
    const handler = jest.fn();

    const result = await registerShortcut('CommandOrControl+N', handler);
    expect(result).toBe(false);
  });

  it('should call handler when shortcut is triggered', async () => {
    mockIsTauri.mockReturnValue(true);
    const { register } = await import('@tauri-apps/plugin-global-shortcut');
    let capturedHandler: ShortcutHandler | null = null;
    (register as jest.Mock).mockImplementation((_, handler) => {
      capturedHandler = handler;
      return Promise.resolve();
    });
    const handler = jest.fn();

    await registerShortcut('CommandOrControl+N', handler);
    capturedHandler!();
    expect(handler).toHaveBeenCalled();
  });
});

describe('Shortcuts - unregisterShortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await unregisterShortcut('CommandOrControl+N');
    expect(result).toBe(false);
  });

  it('should unregister shortcut in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
    (unregister as jest.Mock).mockResolvedValue(undefined);

    const result = await unregisterShortcut('CommandOrControl+N');
    expect(result).toBe(true);
    expect(unregister).toHaveBeenCalledWith('CommandOrControl+N');
  });

  it('should return false on unregistration error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
    (unregister as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await unregisterShortcut('CommandOrControl+N');
    expect(result).toBe(false);
  });
});

describe('Shortcuts - unregisterAllShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await unregisterAllShortcuts();
    expect(result).toBe(false);
  });

  it('should unregister all shortcuts in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    (unregisterAll as jest.Mock).mockResolvedValue(undefined);

    const result = await unregisterAllShortcuts();
    expect(result).toBe(true);
    expect(unregisterAll).toHaveBeenCalled();
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    (unregisterAll as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await unregisterAllShortcuts();
    expect(result).toBe(false);
  });
});

describe('Shortcuts - isShortcutRegistered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await isShortcutRegistered('CommandOrControl+N');
    expect(result).toBe(false);
  });

  it('should check if shortcut is registered in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isRegistered } = await import('@tauri-apps/plugin-global-shortcut');
    (isRegistered as jest.Mock).mockResolvedValue(true);

    const result = await isShortcutRegistered('CommandOrControl+N');
    expect(result).toBe(true);
    expect(isRegistered).toHaveBeenCalledWith('CommandOrControl+N');
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    const { isRegistered } = await import('@tauri-apps/plugin-global-shortcut');
    (isRegistered as jest.Mock).mockRejectedValue(new Error('Test error'));

    const result = await isShortcutRegistered('CommandOrControl+N');
    expect(result).toBe(false);
  });
});

describe('Shortcuts - getRegisteredShortcuts', () => {
  it('should return array of registered shortcuts', () => {
    const shortcuts = getRegisteredShortcuts();
    expect(Array.isArray(shortcuts)).toBe(true);
  });
});

describe('Shortcuts - Shortcuts constants', () => {
  it('should have window control shortcuts', () => {
    expect(Shortcuts.TOGGLE_FULLSCREEN).toBe('F11');
    expect(Shortcuts.TOGGLE_DEVTOOLS).toBe('CommandOrControl+Shift+I');
    expect(Shortcuts.RELOAD).toBe('CommandOrControl+R');
    expect(Shortcuts.QUIT).toBe('CommandOrControl+Q');
  });

  it('should have app shortcuts', () => {
    expect(Shortcuts.NEW_CHAT).toBe('CommandOrControl+N');
    expect(Shortcuts.OPEN_SETTINGS).toBe('CommandOrControl+,');
    expect(Shortcuts.SEARCH).toBe('CommandOrControl+K');
    expect(Shortcuts.TOGGLE_SIDEBAR).toBe('CommandOrControl+B');
  });

  it('should have edit shortcuts', () => {
    expect(Shortcuts.UNDO).toBe('CommandOrControl+Z');
    expect(Shortcuts.REDO).toBe('CommandOrControl+Shift+Z');
    expect(Shortcuts.CUT).toBe('CommandOrControl+X');
    expect(Shortcuts.COPY).toBe('CommandOrControl+C');
    expect(Shortcuts.PASTE).toBe('CommandOrControl+V');
    expect(Shortcuts.SELECT_ALL).toBe('CommandOrControl+A');
  });

  it('should have navigation shortcuts', () => {
    expect(Shortcuts.FOCUS_INPUT).toBe('CommandOrControl+L');
    expect(Shortcuts.PREVIOUS_CHAT).toBe('CommandOrControl+[');
    expect(Shortcuts.NEXT_CHAT).toBe('CommandOrControl+]');
  });
});
