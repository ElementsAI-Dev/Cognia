/**
 * Native Window Control - Window management for desktop app
 */

import { isTauri } from './utils';

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

/**
 * Get the current window
 */
async function getCurrentWindow() {
  if (!isTauri()) return null;
  
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return getCurrentWindow();
  } catch {
    return null;
  }
}

/**
 * Set window always on top
 */
export async function setAlwaysOnTop(enabled: boolean): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.setAlwaysOnTop(enabled);
    return true;
  } catch (error) {
    console.error('Failed to set always on top:', error);
    return false;
  }
}

/**
 * Check if window is always on top
 */
export async function isAlwaysOnTop(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    return await window.isAlwaysOnTop();
  } catch {
    return false;
  }
}

/**
 * Minimize window
 */
export async function minimizeWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.minimize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Maximize window
 */
export async function maximizeWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.maximize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Unmaximize window
 */
export async function unmaximizeWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.unmaximize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Toggle maximize state
 */
export async function toggleMaximize(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.toggleMaximize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if window is maximized
 */
export async function isMaximized(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    return await window.isMaximized();
  } catch {
    return false;
  }
}

/**
 * Set fullscreen mode
 */
export async function setFullscreen(enabled: boolean): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.setFullscreen(enabled);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if window is fullscreen
 */
export async function isFullscreen(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    return await window.isFullscreen();
  } catch {
    return false;
  }
}

/**
 * Set window title
 */
export async function setTitle(title: string): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.setTitle(title);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get window title
 */
export async function getTitle(): Promise<string | null> {
  const window = await getCurrentWindow();
  if (!window) return null;

  try {
    return await window.title();
  } catch {
    return null;
  }
}

/**
 * Center window on screen
 */
export async function centerWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.center();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set window size
 */
export async function setWindowSize(size: WindowSize): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    const { LogicalSize } = await import('@tauri-apps/api/dpi');
    await window.setSize(new LogicalSize(size.width, size.height));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get window size
 */
export async function getWindowSize(): Promise<WindowSize | null> {
  const window = await getCurrentWindow();
  if (!window) return null;

  try {
    const size = await window.innerSize();
    return { width: size.width, height: size.height };
  } catch {
    return null;
  }
}

/**
 * Set window position
 */
export async function setWindowPosition(position: WindowPosition): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    const { LogicalPosition } = await import('@tauri-apps/api/dpi');
    await window.setPosition(new LogicalPosition(position.x, position.y));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get window position
 */
export async function getWindowPosition(): Promise<WindowPosition | null> {
  const window = await getCurrentWindow();
  if (!window) return null;

  try {
    const position = await window.outerPosition();
    return { x: position.x, y: position.y };
  } catch {
    return null;
  }
}

/**
 * Show window
 */
export async function showWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.show();
    return true;
  } catch {
    return false;
  }
}

/**
 * Hide window
 */
export async function hideWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.hide();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close window
 */
export async function closeWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Focus window
 */
export async function focusWindow(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.setFocus();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if window is focused
 */
export async function isFocused(): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    return await window.isFocused();
  } catch {
    return false;
  }
}

/**
 * Set window decorations
 */
export async function setDecorations(enabled: boolean): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.setDecorations(enabled);
    return true;
  } catch {
    return false;
  }
}

/**
 * Request user attention
 */
export async function requestAttention(critical: boolean = false): Promise<boolean> {
  const window = await getCurrentWindow();
  if (!window) return false;

  try {
    await window.requestUserAttention(critical ? 2 : 1);
    return true;
  } catch {
    return false;
  }
}
