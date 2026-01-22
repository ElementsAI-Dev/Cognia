/**
 * Auto Updater - Application update management for desktop
 */

import { isTauri } from './utils';

export interface UpdateInfo {
  available: boolean;
  version?: string;
  currentVersion?: string;
  body?: string;
  date?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export type UpdateProgressHandler = (progress: UpdateProgress) => void;

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  if (!isTauri()) {
    return { available: false };
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    
    if (!update) {
      return { available: false };
    }
    
    return {
      available: true,
      version: update.version,
      currentVersion: update.currentVersion,
      body: update.body,
      date: update.date,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Suppress "plugin not found" errors as the updater might be intentionally disabled
    if (errorMessage.includes('Plugin not found') || errorMessage.includes('updater.check not allowed')) {
      console.debug('Updater plugin not found or not allowed, skipping update check');
      return { available: false };
    }

    console.error('Failed to check for updates:', error);
    return { available: false };
  }
}

/**
 * Download and install update
 */
export async function downloadAndInstallUpdate(
  onProgress?: UpdateProgressHandler
): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const { relaunch } = await import('@tauri-apps/plugin-process');
    
    const update = await check();
    if (!update) {
      console.log('No update available');
      return false;
    }

    let downloaded = 0;
    let total = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          total = event.data.contentLength || 0;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength || 0;
          if (onProgress && total > 0) {
            onProgress({
              downloaded,
              total,
              percentage: Math.round((downloaded / total) * 100),
            });
          }
          break;
        case 'Finished':
          if (onProgress && total > 0) {
            onProgress({
              downloaded: total,
              total,
              percentage: 100,
            });
          }
          break;
      }
    });

    // Relaunch the app after update
    await relaunch();
    return true;
  } catch (error) {
    console.error('Failed to download and install update:', error);
    return false;
  }
}

/**
 * Get current app version
 */
export async function getCurrentVersion(): Promise<string | null> {
  if (!isTauri()) return null;

  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch {
    return null;
  }
}

/**
 * Get app name
 */
export async function getAppName(): Promise<string | null> {
  if (!isTauri()) return null;

  try {
    const { getName } = await import('@tauri-apps/api/app');
    return await getName();
  } catch {
    return null;
  }
}
