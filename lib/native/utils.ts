/**
 * Native Utils - Common utilities for native integrations
 */

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
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
