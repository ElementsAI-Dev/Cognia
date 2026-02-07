/**
 * Credential Storage - Secure storage for sync credentials
 * Desktop: Uses Tauri Stronghold encrypted vault
 * Browser: Uses Web Crypto API (AES-GCM) with device-derived keys
 */

import { isTauri } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { encryptValue, decryptValue, isEncrypted } from '@/lib/storage/storage-encryption';

const log = loggers.auth;

// Storage keys
const WEBDAV_PASSWORD_KEY = 'sync:webdav:password';
const GITHUB_TOKEN_KEY = 'sync:github:token';
const GOOGLE_ACCESS_TOKEN_KEY = 'sync:google:access_token';
const GOOGLE_REFRESH_TOKEN_KEY = 'sync:google:refresh_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'sync:google:token_expiry';

/**
 * Store WebDAV password securely
 */
export async function storeWebDAVPassword(password: string): Promise<boolean> {
  if (!isTauri()) {
    try {
      const encrypted = await encryptValue(password);
      localStorage.setItem(WEBDAV_PASSWORD_KEY, encrypted);
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
    try {
      const encrypted = await encryptValue(password);
      localStorage.setItem(WEBDAV_PASSWORD_KEY, encrypted);
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
      if (!stored) return null;
      // Handle both encrypted and legacy base64 values
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      // Legacy base64 fallback
      try { return atob(stored); } catch { return stored; }
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
    try {
      const stored = localStorage.getItem(WEBDAV_PASSWORD_KEY);
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
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
      const encrypted = await encryptValue(token);
      localStorage.setItem(GITHUB_TOKEN_KEY, encrypted);
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
      const encrypted = await encryptValue(token);
      localStorage.setItem(GITHUB_TOKEN_KEY, encrypted);
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
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
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
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
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
export async function hasStoredCredentials(
  provider: 'webdav' | 'github' | 'googledrive'
): Promise<boolean> {
  if (provider === 'webdav') {
    const password = await getWebDAVPassword();
    return password !== null && password.length > 0;
  } else if (provider === 'github') {
    const token = await getGitHubToken();
    return token !== null && token.length > 0;
  } else if (provider === 'googledrive') {
    const token = await getGoogleAccessToken();
    return token !== null && token.length > 0;
  }
  return false;
}

// ============================================
// Google Drive Token Storage
// ============================================

/**
 * Store Google Drive tokens securely
 */
export async function storeGoogleTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, await encryptValue(accessToken));
      localStorage.setItem(GOOGLE_REFRESH_TOKEN_KEY, await encryptValue(refreshToken));
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(expiresAt));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_store_sync_credential', {
      key: GOOGLE_ACCESS_TOKEN_KEY,
      value: accessToken,
    });
    await invoke('stronghold_store_sync_credential', {
      key: GOOGLE_REFRESH_TOKEN_KEY,
      value: refreshToken,
    });
    await invoke('stronghold_store_sync_credential', {
      key: GOOGLE_TOKEN_EXPIRY_KEY,
      value: String(expiresAt),
    });
    return true;
  } catch (error) {
    log.error('Failed to store Google tokens', error as Error);
    try {
      localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, await encryptValue(accessToken));
      localStorage.setItem(GOOGLE_REFRESH_TOKEN_KEY, await encryptValue(refreshToken));
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(expiresAt));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Update Google access token (after refresh)
 */
export async function updateGoogleAccessToken(
  accessToken: string,
  expiresAt: number
): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, await encryptValue(accessToken));
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(expiresAt));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_store_sync_credential', {
      key: GOOGLE_ACCESS_TOKEN_KEY,
      value: accessToken,
    });
    await invoke('stronghold_store_sync_credential', {
      key: GOOGLE_TOKEN_EXPIRY_KEY,
      value: String(expiresAt),
    });
    return true;
  } catch (error) {
    log.error('Failed to update Google access token', error as Error);
    try {
      localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, await encryptValue(accessToken));
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(expiresAt));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get Google access token
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (!isTauri()) {
    try {
      const stored = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
    } catch {
      return null;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const token = await invoke<string | null>('stronghold_get_sync_credential', {
      key: GOOGLE_ACCESS_TOKEN_KEY,
    });
    return token;
  } catch (error) {
    log.error('Failed to get Google access token', error as Error);
    try {
      const stored = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
    } catch {
      return null;
    }
  }
}

/**
 * Get Google refresh token
 */
export async function getGoogleRefreshToken(): Promise<string | null> {
  if (!isTauri()) {
    try {
      const stored = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
    } catch {
      return null;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const token = await invoke<string | null>('stronghold_get_sync_credential', {
      key: GOOGLE_REFRESH_TOKEN_KEY,
    });
    return token;
  } catch (error) {
    log.error('Failed to get Google refresh token', error as Error);
    try {
      const stored = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
      if (!stored) return null;
      if (isEncrypted(stored)) {
        const decrypted = await decryptValue(stored);
        return decrypted || null;
      }
      try { return atob(stored); } catch { return stored; }
    } catch {
      return null;
    }
  }
}

/**
 * Get Google token expiry timestamp
 */
export async function getGoogleTokenExpiry(): Promise<number | null> {
  if (!isTauri()) {
    try {
      const stored = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const expiry = await invoke<string | null>('stronghold_get_sync_credential', {
      key: GOOGLE_TOKEN_EXPIRY_KEY,
    });
    return expiry ? parseInt(expiry, 10) : null;
  } catch (error) {
    log.error('Failed to get Google token expiry', error as Error);
    try {
      const stored = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Check if Google token is expired
 */
export async function isGoogleTokenExpired(): Promise<boolean> {
  const expiry = await getGoogleTokenExpiry();
  if (!expiry) return true;
  // Consider expired 5 minutes before actual expiry
  const buffer = 5 * 60 * 1000;
  return Date.now() >= expiry - buffer;
}

/**
 * Remove all Google tokens
 */
export async function removeGoogleTokens(): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stronghold_remove_sync_credential', {
      key: GOOGLE_ACCESS_TOKEN_KEY,
    });
    await invoke('stronghold_remove_sync_credential', {
      key: GOOGLE_REFRESH_TOKEN_KEY,
    });
    await invoke('stronghold_remove_sync_credential', {
      key: GOOGLE_TOKEN_EXPIRY_KEY,
    });
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    return true;
  } catch (error) {
    log.error('Failed to remove Google tokens', error as Error);
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    return true;
  }
}
