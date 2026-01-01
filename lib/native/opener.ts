/**
 * Opener Service - Open files, URLs, and reveal items in file explorer
 * Wraps @tauri-apps/plugin-opener for Tauri desktop environment
 */

import { isTauri } from './utils';

export interface OpenResult {
  success: boolean;
  error?: string;
}

/**
 * Open a file with the default or specified application
 * @param path - The absolute path to the file
 * @param openWith - Optional: application command to open the file with
 */
export async function openPath(
  path: string,
  openWith?: string
): Promise<OpenResult> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Opener requires Tauri desktop environment',
    };
  }

  try {
    const { openPath: tauriOpenPath } = await import('@tauri-apps/plugin-opener');
    await tauriOpenPath(path, openWith);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open path',
    };
  }
}

/**
 * Open a URL with the default browser or specified application
 * @param url - The URL to open (http://, https://, mailto:, tel:, etc.)
 * @param openWith - Optional: application command to open the URL with
 */
export async function openUrl(
  url: string,
  openWith?: string
): Promise<OpenResult> {
  if (!isTauri()) {
    // Fallback to window.open for browser environment
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open URL',
      };
    }
  }

  try {
    const { openUrl: tauriOpenUrl } = await import('@tauri-apps/plugin-opener');
    await tauriOpenUrl(url, openWith);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open URL',
    };
  }
}

/**
 * Reveal a file or directory in the system's file explorer
 * - Windows: Opens Explorer with the item selected
 * - macOS: Opens Finder with the item selected
 * - Linux: Opens the default file manager with the item's parent directory
 * @param path - The absolute path to reveal
 */
export async function revealInFileExplorer(path: string): Promise<OpenResult> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Reveal in file explorer requires Tauri desktop environment',
    };
  }

  try {
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
    await revealItemInDir(path);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reveal in file explorer',
    };
  }
}

/**
 * Open a file with the default application based on its type
 * Convenience wrapper around openPath
 */
export async function openFile(path: string): Promise<OpenResult> {
  return openPath(path);
}

/**
 * Open a directory in the file explorer
 * Convenience wrapper around openPath
 */
export async function openDirectory(path: string): Promise<OpenResult> {
  return openPath(path);
}

/**
 * Open an email client with the specified email address
 */
export async function openEmail(email: string): Promise<OpenResult> {
  const mailtoUrl = email.startsWith('mailto:') ? email : `mailto:${email}`;
  return openUrl(mailtoUrl);
}

/**
 * Open the phone dialer with the specified phone number
 */
export async function openPhone(phone: string): Promise<OpenResult> {
  const telUrl = phone.startsWith('tel:') ? phone : `tel:${phone}`;
  return openUrl(telUrl);
}
