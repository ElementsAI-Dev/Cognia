/**
 * Credential Storage - Secure storage for sync credentials using Tauri Stronghold
 */

import { isTauri } from '@/lib/utils';
import { loggers } from '@/lib/logger';

const log = loggers.auth;

// Storage keys
const WEBDAV_PASSWORD_KEY = 'sync:webdav:password';
const GITHUB_TOKEN_KEY = 'sync:github:token';

/**
 * Store WebDAV password securely
 */
export async function storeWebDAVPassword(password: string): Promise<boolean> {
  if (!isTauri()) {
    // Fallback to localStorage (not recommended for production)
    try {
      localStorage.setItem(WEBDAV_PASSWORD_KEY, btoa(password));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_store_sync_credential', {
      key: WEBDAV_PASSWORD_KEY,
      value: password,
    });
    return true;
  } catch (error) {
    log.error('Failed to store WebDAV password', error as Error);
    // Fallback to localStorage
    try {
      localStorage.setItem(WEBDAV_PASSWORD_KEY, btoa(password));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get WebDAV password
 */
export async function getWebDAVPassword(): Promise<string | null> {
  if (!isTauri()) {
    try {
      const stored = localStorage.getItem(WEBDAV_PASSWORD_KEY);
      return stored ? atob(stored) : null;
    } catch {
      return null;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const password = await invoke<string | null>('stronghold_get_sync_credential', {
      key: WEBDAV_PASSWORD_KEY,
    });
    return password;
  } catch (error) {
    log.error('Failed to get WebDAV password', error as Error);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(WEBDAV_PASSWORD_KEY);
      return stored ? atob(stored) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Remove WebDAV password
 */
export async function removeWebDAVPassword(): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.removeItem(WEBDAV_PASSWORD_KEY);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_remove_sync_credential', {
      key: WEBDAV_PASSWORD_KEY,
    });
    localStorage.removeItem(WEBDAV_PASSWORD_KEY);
    return true;
  } catch (error) {
    log.error('Failed to remove WebDAV password', error as Error);
    localStorage.removeItem(WEBDAV_PASSWORD_KEY);
    return true;
  }
}

/**
 * Store GitHub token securely
 */
export async function storeGitHubToken(token: string): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.setItem(GITHUB_TOKEN_KEY, btoa(token));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_store_sync_credential', {
      key: GITHUB_TOKEN_KEY,
      value: token,
    });
    return true;
  } catch (error) {
    log.error('Failed to store GitHub token', error as Error);
    try {
      localStorage.setItem(GITHUB_TOKEN_KEY, btoa(token));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get GitHub token
 */
export async function getGitHubToken(): Promise<string | null> {
  if (!isTauri()) {
    try {
      const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
      return stored ? atob(stored) : null;
    } catch {
      return null;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const token = await invoke<string | null>('stronghold_get_sync_credential', {
      key: GITHUB_TOKEN_KEY,
    });
    return token;
  } catch (error) {
    log.error('Failed to get GitHub token', error as Error);
    try {
      const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
      return stored ? atob(stored) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Remove GitHub token
 */
export async function removeGitHubToken(): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_remove_sync_credential', {
      key: GITHUB_TOKEN_KEY,
    });
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    return true;
  } catch (error) {
    log.error('Failed to remove GitHub token', error as Error);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    return true;
  }
}

/**
 * Check if credentials are stored
 */
export async function hasStoredCredentials(provider: 'webdav' | 'github'): Promise<boolean> {
  if (provider === 'webdav') {
    const password = await getWebDAVPassword();
    return password !== null && password.length > 0;
  } else {
    const token = await getGitHubToken();
    return token !== null && token.length > 0;
  }
}
