/**
 * Native Utils - Common utilities for native integrations
 */

/**
 * Check if running in Tauri environment
 * Note: Tauri v2 uses __TAURI_INTERNALS__
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Window label constants
 */
export const WINDOW_LABELS = {
  MAIN: 'main',
  CHAT_WIDGET: 'chat-widget',
  SELECTION_TOOLBAR: 'selection-toolbar',
  SPLASHSCREEN: 'splashscreen',
} as const;

export type WindowLabel = typeof WINDOW_LABELS[keyof typeof WINDOW_LABELS];

/**
 * Get the current window label
 */
export async function getWindowLabel(): Promise<string | null> {
  if (!isTauri()) return null;
  
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const window = getCurrentWindow();
    return window.label;
  } catch {
    return null;
  }
}

/**
 * Check if current window is the main window
 */
export async function isMainWindow(): Promise<boolean> {
  const label = await getWindowLabel();
  return label === WINDOW_LABELS.MAIN;
}

/**
 * Check if current window is a popup window (chat-widget or selection-toolbar)
 */
export async function isPopupWindow(): Promise<boolean> {
  const label = await getWindowLabel();
  return label === WINDOW_LABELS.CHAT_WIDGET || label === WINDOW_LABELS.SELECTION_TOOLBAR;
}

/**
 * Check if running on specific platform
 */
export async function getPlatform(): Promise<'windows' | 'macos' | 'linux' | 'unknown'> {
  if (!isTauri()) return 'unknown';
  
  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    const p = await platform();
    if (p === 'windows') return 'windows';
    if (p === 'macos') return 'macos';
    if (p === 'linux') return 'linux';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get OS version
 */
export async function getOSVersion(): Promise<string | null> {
  if (!isTauri()) return null;
  
  try {
    const { version } = await import('@tauri-apps/plugin-os');
    return await version();
  } catch {
    return null;
  }
}

/**
 * Get system architecture
 */
export async function getArch(): Promise<string | null> {
  if (!isTauri()) return null;
  
  try {
    const { arch } = await import('@tauri-apps/plugin-os');
    return await arch();
  } catch {
    return null;
  }
}

/**
 * Get system locale
 */
export async function getLocale(): Promise<string | null> {
  if (!isTauri()) return null;
  
  try {
    const { locale } = await import('@tauri-apps/plugin-os');
    return await locale();
  } catch {
    return null;
  }
}

/**
 * Get hostname
 */
export async function getHostname(): Promise<string | null> {
  if (!isTauri()) return null;
  
  try {
    const { hostname } = await import('@tauri-apps/plugin-os');
    return await hostname();
  } catch {
    return null;
  }
}
