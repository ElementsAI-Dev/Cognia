/**
 * System Operations - Process and system control for desktop
 */

import { isTauri } from './utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;

/**
 * Exit the application
 */
export async function exitApp(code: number = 0): Promise<void> {
  if (!isTauri()) {
    log.warn('Exit is only available in Tauri');
    return;
  }

  try {
    const { exit } = await import('@tauri-apps/plugin-process');
    await exit(code);
  } catch (error) {
    log.error('Failed to exit app', error as Error);
  }
}

/**
 * Restart the application
 */
export async function restartApp(): Promise<void> {
  if (!isTauri()) {
    // Browser fallback
    window.location.reload();
    return;
  }

  try {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (error) {
    log.error('Failed to restart app', error as Error);
  }
}

/**
 * Open URL in default browser
 */
export async function openInBrowser(url: string): Promise<boolean> {
  if (!isTauri()) {
    window.open(url, '_blank');
    return true;
  }

  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
    return true;
  } catch (error) {
    log.error('Failed to open URL', error as Error);
    return false;
  }
}

/**
 * Open path in file explorer
 */
export async function openInFileExplorer(path: string): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(path);
    return true;
  } catch (error) {
    log.error('Failed to open path', error as Error);
    return false;
  }
}

/**
 * Get system info summary
 */
export async function getSystemInfo(): Promise<{
  platform: string | null;
  version: string | null;
  arch: string | null;
  locale: string | null;
  hostname: string | null;
  appVersion: string | null;
  appName: string | null;
}> {
  if (!isTauri()) {
    return {
      platform: navigator.platform || null,
      version: null,
      arch: null,
      locale: navigator.language || null,
      hostname: null,
      appVersion: null,
      appName: null,
    };
  }

  try {
    const os = await import('@tauri-apps/plugin-os');
    const app = await import('@tauri-apps/api/app');

    const [platform, version, arch, locale, hostname, appVersion, appName] =
      await Promise.all([
        Promise.resolve(os.platform()).catch(() => null),
        Promise.resolve(os.version()).catch(() => null),
        Promise.resolve(os.arch()).catch(() => null),
        Promise.resolve(os.locale()).catch(() => null),
        Promise.resolve(os.hostname()).catch(() => null),
        app.getVersion().catch(() => null),
        app.getName().catch(() => null),
      ]);

    return {
      platform,
      version,
      arch,
      locale,
      hostname,
      appVersion,
      appName,
    };
  } catch {
    return {
      platform: null,
      version: null,
      arch: null,
      locale: null,
      hostname: null,
      appVersion: null,
      appName: null,
    };
  }
}
