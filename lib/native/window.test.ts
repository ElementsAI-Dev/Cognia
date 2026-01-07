/**
 * Window Tests
 *
 * Tests for native window control functions.
 */

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

const mockWindowMethods = {
  setAlwaysOnTop: jest.fn(),
  isAlwaysOnTop: jest.fn(),
  minimize: jest.fn(),
  maximize: jest.fn(),
  unmaximize: jest.fn(),
  toggleMaximize: jest.fn(),
  isMaximized: jest.fn(),
  setFullscreen: jest.fn(),
  isFullscreen: jest.fn(),
  setTitle: jest.fn(),
  title: jest.fn(),
  center: jest.fn(),
  setSize: jest.fn(),
  innerSize: jest.fn(),
  setPosition: jest.fn(),
  outerPosition: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  close: jest.fn(),
  setFocus: jest.fn(),
  isFocused: jest.fn(),
  setDecorations: jest.fn(),
  requestUserAttention: jest.fn(),
};

jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: jest.fn(() => mockWindowMethods),
}));

jest.mock('@tauri-apps/api/dpi', () => ({
  LogicalSize: jest.fn().mockImplementation((w, h) => ({ width: w, height: h })),
  LogicalPosition: jest.fn().mockImplementation((x, y) => ({ x, y })),
}));

import { isTauri } from './utils';
import {
  setAlwaysOnTop,
  isAlwaysOnTop,
  minimizeWindow,
  maximizeWindow,
  unmaximizeWindow,
  toggleMaximize,
  isMaximized,
  setFullscreen,
  isFullscreen,
  setTitle,
  getTitle,
  centerWindow,
  setWindowSize,
  getWindowSize,
  setWindowPosition,
  getWindowPosition,
  showWindow,
  hideWindow,
  closeWindow,
  focusWindow,
  isFocused,
  setDecorations,
  requestAttention,
} from './window';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Window - setAlwaysOnTop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await setAlwaysOnTop(true);
    expect(result).toBe(false);
  });

  it('should set always on top in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setAlwaysOnTop.mockResolvedValue(undefined);

    const result = await setAlwaysOnTop(true);
    expect(result).toBe(true);
    expect(mockWindowMethods.setAlwaysOnTop).toHaveBeenCalledWith(true);
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setAlwaysOnTop.mockRejectedValue(new Error('Test error'));

    const result = await setAlwaysOnTop(true);
    expect(result).toBe(false);
  });
});

describe('Window - isAlwaysOnTop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await isAlwaysOnTop();
    expect(result).toBe(false);
  });

  it('should return true when window is always on top', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.isAlwaysOnTop.mockResolvedValue(true);

    const result = await isAlwaysOnTop();
    expect(result).toBe(true);
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.isAlwaysOnTop.mockRejectedValue(new Error('Test error'));

    const result = await isAlwaysOnTop();
    expect(result).toBe(false);
  });
});

describe('Window - minimizeWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await minimizeWindow();
    expect(result).toBe(false);
  });

  it('should minimize window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.minimize.mockResolvedValue(undefined);

    const result = await minimizeWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.minimize).toHaveBeenCalled();
  });
});

describe('Window - maximizeWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await maximizeWindow();
    expect(result).toBe(false);
  });

  it('should maximize window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.maximize.mockResolvedValue(undefined);

    const result = await maximizeWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.maximize).toHaveBeenCalled();
  });
});

describe('Window - unmaximizeWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await unmaximizeWindow();
    expect(result).toBe(false);
  });

  it('should unmaximize window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.unmaximize.mockResolvedValue(undefined);

    const result = await unmaximizeWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.unmaximize).toHaveBeenCalled();
  });
});

describe('Window - toggleMaximize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await toggleMaximize();
    expect(result).toBe(false);
  });

  it('should toggle maximize in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.toggleMaximize.mockResolvedValue(undefined);

    const result = await toggleMaximize();
    expect(result).toBe(true);
    expect(mockWindowMethods.toggleMaximize).toHaveBeenCalled();
  });
});

describe('Window - isMaximized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await isMaximized();
    expect(result).toBe(false);
  });

  it('should return maximized state in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.isMaximized.mockResolvedValue(true);

    const result = await isMaximized();
    expect(result).toBe(true);
  });
});

describe('Window - setFullscreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await setFullscreen(true);
    expect(result).toBe(false);
  });

  it('should set fullscreen in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setFullscreen.mockResolvedValue(undefined);

    const result = await setFullscreen(true);
    expect(result).toBe(true);
    expect(mockWindowMethods.setFullscreen).toHaveBeenCalledWith(true);
  });
});

describe('Window - isFullscreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await isFullscreen();
    expect(result).toBe(false);
  });

  it('should return fullscreen state in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.isFullscreen.mockResolvedValue(true);

    const result = await isFullscreen();
    expect(result).toBe(true);
  });
});

describe('Window - setTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await setTitle('New Title');
    expect(result).toBe(false);
  });

  it('should set title in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setTitle.mockResolvedValue(undefined);

    const result = await setTitle('New Title');
    expect(result).toBe(true);
    expect(mockWindowMethods.setTitle).toHaveBeenCalledWith('New Title');
  });
});

describe('Window - getTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await getTitle();
    expect(result).toBeNull();
  });

  it('should return title in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.title.mockResolvedValue('Window Title');

    const result = await getTitle();
    expect(result).toBe('Window Title');
  });
});

describe('Window - centerWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await centerWindow();
    expect(result).toBe(false);
  });

  it('should center window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.center.mockResolvedValue(undefined);

    const result = await centerWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.center).toHaveBeenCalled();
  });
});

describe('Window - setWindowSize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await setWindowSize({ width: 800, height: 600 });
    expect(result).toBe(false);
  });

  it('should set window size in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setSize.mockResolvedValue(undefined);

    const result = await setWindowSize({ width: 800, height: 600 });
    expect(result).toBe(true);
    expect(mockWindowMethods.setSize).toHaveBeenCalled();
  });
});

describe('Window - getWindowSize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await getWindowSize();
    expect(result).toBeNull();
  });

  it('should return window size in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.innerSize.mockResolvedValue({ width: 800, height: 600 });

    const result = await getWindowSize();
    expect(result).toEqual({ width: 800, height: 600 });
  });
});

describe('Window - setWindowPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await setWindowPosition({ x: 100, y: 100 });
    expect(result).toBe(false);
  });

  it('should set window position in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setPosition.mockResolvedValue(undefined);

    const result = await setWindowPosition({ x: 100, y: 100 });
    expect(result).toBe(true);
    expect(mockWindowMethods.setPosition).toHaveBeenCalled();
  });
});

describe('Window - getWindowPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await getWindowPosition();
    expect(result).toBeNull();
  });

  it('should return window position in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.outerPosition.mockResolvedValue({ x: 100, y: 200 });

    const result = await getWindowPosition();
    expect(result).toEqual({ x: 100, y: 200 });
  });
});

describe('Window - showWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await showWindow();
    expect(result).toBe(false);
  });

  it('should show window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.show.mockResolvedValue(undefined);

    const result = await showWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.show).toHaveBeenCalled();
  });
});

describe('Window - hideWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await hideWindow();
    expect(result).toBe(false);
  });

  it('should hide window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.hide.mockResolvedValue(undefined);

    const result = await hideWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.hide).toHaveBeenCalled();
  });
});

describe('Window - closeWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await closeWindow();
    expect(result).toBe(false);
  });

  it('should close window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.close.mockResolvedValue(undefined);

    const result = await closeWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.close).toHaveBeenCalled();
  });
});

describe('Window - focusWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await focusWindow();
    expect(result).toBe(false);
  });

  it('should focus window in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setFocus.mockResolvedValue(undefined);

    const result = await focusWindow();
    expect(result).toBe(true);
    expect(mockWindowMethods.setFocus).toHaveBeenCalled();
  });
});

describe('Window - isFocused', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await isFocused();
    expect(result).toBe(false);
  });

  it('should return focused state in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.isFocused.mockResolvedValue(true);

    const result = await isFocused();
    expect(result).toBe(true);
  });
});

describe('Window - setDecorations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await setDecorations(true);
    expect(result).toBe(false);
  });

  it('should set decorations in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.setDecorations.mockResolvedValue(undefined);

    const result = await setDecorations(false);
    expect(result).toBe(true);
    expect(mockWindowMethods.setDecorations).toHaveBeenCalledWith(false);
  });
});

describe('Window - requestAttention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await requestAttention();
    expect(result).toBe(false);
  });

  it('should request non-critical attention by default', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.requestUserAttention.mockResolvedValue(undefined);

    const result = await requestAttention();
    expect(result).toBe(true);
    expect(mockWindowMethods.requestUserAttention).toHaveBeenCalledWith(1);
  });

  it('should request critical attention when specified', async () => {
    mockIsTauri.mockReturnValue(true);
    mockWindowMethods.requestUserAttention.mockResolvedValue(undefined);

    const result = await requestAttention(true);
    expect(result).toBe(true);
    expect(mockWindowMethods.requestUserAttention).toHaveBeenCalledWith(2);
  });
});
