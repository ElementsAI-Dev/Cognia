/**
 * Stronghold - Secure storage service for sensitive data using Tauri Stronghold plugin
 *
 * Provides encrypted storage for API keys, tokens, and other secrets using
 * IOTA Stronghold's secure memory management and encryption.
 */

import { Client, Stronghold } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';
import { isTauri } from './utils';

// Store name for the Stronghold vault
const VAULT_FILE = 'vault.hold';
const CLIENT_NAME = 'cognia-secrets';

// Key prefixes for organizing stored secrets
export const KEY_PREFIX = {
  PROVIDER_API_KEY: 'provider:apikey:',
  SEARCH_API_KEY: 'search:apikey:',
  CUSTOM_PROVIDER_API_KEY: 'custom:apikey:',
  OAUTH_TOKEN: 'oauth:token:',
  OAUTH_REFRESH: 'oauth:refresh:',
} as const;

// Singleton instances
let strongholdInstance: Stronghold | null = null;
let clientInstance: Client | null = null;

/**
 * Initialize Stronghold with the given password
 * Must be called before any other Stronghold operations
 */
export async function initStronghold(password: string): Promise<boolean> {
  if (!isTauri()) {
    console.warn('Stronghold is only available in Tauri environment');
    return false;
  }

  try {
    const vaultPath = `${await appDataDir()}/${VAULT_FILE}`;
    strongholdInstance = await Stronghold.load(vaultPath, password);

    try {
      clientInstance = await strongholdInstance.loadClient(CLIENT_NAME);
    } catch {
      // Client doesn't exist, create it
      clientInstance = await strongholdInstance.createClient(CLIENT_NAME);
    }

    console.log('Stronghold initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Stronghold:', error);
    strongholdInstance = null;
    clientInstance = null;
    return false;
  }
}

/**
 * Check if Stronghold is initialized and ready
 */
export function isStrongholdReady(): boolean {
  return strongholdInstance !== null && clientInstance !== null;
}

/**
 * Save the current Stronghold state to disk
 */
export async function saveStronghold(): Promise<boolean> {
  if (!strongholdInstance) {
    console.warn('Stronghold not initialized');
    return false;
  }

  try {
    await strongholdInstance.save();
    return true;
  } catch (error) {
    console.error('Failed to save Stronghold:', error);
    return false;
  }
}

/**
 * Close and cleanup Stronghold
 */
export async function closeStronghold(): Promise<void> {
  if (strongholdInstance) {
    try {
      await strongholdInstance.save();
    } catch (error) {
      console.warn('Failed to save before closing:', error);
    }
  }
  strongholdInstance = null;
  clientInstance = null;
}

/**
 * Store a secret value in Stronghold
 */
export async function storeSecret(key: string, value: string): Promise<boolean> {
  if (!clientInstance) {
    console.warn('Stronghold client not initialized');
    return false;
  }

  try {
    const store = clientInstance.getStore();
    const data = Array.from(new TextEncoder().encode(value));
    await store.insert(key, data);
    await saveStronghold();
    return true;
  } catch (error) {
    console.error(`Failed to store secret for key ${key}:`, error);
    return false;
  }
}

/**
 * Retrieve a secret value from Stronghold
 */
export async function getSecret(key: string): Promise<string | null> {
  if (!clientInstance) {
    console.warn('Stronghold client not initialized');
    return null;
  }

  try {
    const store = clientInstance.getStore();
    const data = await store.get(key);
    if (!data || data.length === 0) {
      return null;
    }
    return new TextDecoder().decode(new Uint8Array(data));
  } catch {
    // Key not found is expected behavior, don't log as error
    return null;
  }
}

/**
 * Remove a secret from Stronghold
 */
export async function removeSecret(key: string): Promise<boolean> {
  if (!clientInstance) {
    console.warn('Stronghold client not initialized');
    return false;
  }

  try {
    const store = clientInstance.getStore();
    await store.remove(key);
    await saveStronghold();
    return true;
  } catch (error) {
    console.error(`Failed to remove secret for key ${key}:`, error);
    return false;
  }
}

// ============================================================================
// Provider API Key Management
// ============================================================================

/**
 * Store a provider API key securely
 */
export async function storeProviderApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  const key = `${KEY_PREFIX.PROVIDER_API_KEY}${providerId}`;
  return storeSecret(key, apiKey);
}

/**
 * Get a provider API key
 */
export async function getProviderApiKey(
  providerId: string
): Promise<string | null> {
  const key = `${KEY_PREFIX.PROVIDER_API_KEY}${providerId}`;
  return getSecret(key);
}

/**
 * Remove a provider API key
 */
export async function removeProviderApiKey(
  providerId: string
): Promise<boolean> {
  const key = `${KEY_PREFIX.PROVIDER_API_KEY}${providerId}`;
  return removeSecret(key);
}

/**
 * Store multiple API keys for a provider (for rotation)
 */
export async function storeProviderApiKeys(
  providerId: string,
  apiKeys: string[]
): Promise<boolean> {
  const key = `${KEY_PREFIX.PROVIDER_API_KEY}${providerId}:multi`;
  return storeSecret(key, JSON.stringify(apiKeys));
}

/**
 * Get multiple API keys for a provider
 */
export async function getProviderApiKeys(
  providerId: string
): Promise<string[]> {
  const key = `${KEY_PREFIX.PROVIDER_API_KEY}${providerId}:multi`;
  const data = await getSecret(key);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ============================================================================
// Search Provider API Key Management
// ============================================================================

/**
 * Store a search provider API key
 */
export async function storeSearchApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  const key = `${KEY_PREFIX.SEARCH_API_KEY}${providerId}`;
  return storeSecret(key, apiKey);
}

/**
 * Get a search provider API key
 */
export async function getSearchApiKey(
  providerId: string
): Promise<string | null> {
  const key = `${KEY_PREFIX.SEARCH_API_KEY}${providerId}`;
  return getSecret(key);
}

/**
 * Remove a search provider API key
 */
export async function removeSearchApiKey(
  providerId: string
): Promise<boolean> {
  const key = `${KEY_PREFIX.SEARCH_API_KEY}${providerId}`;
  return removeSecret(key);
}

// ============================================================================
// Custom Provider API Key Management
// ============================================================================

/**
 * Store a custom provider API key
 */
export async function storeCustomProviderApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  const key = `${KEY_PREFIX.CUSTOM_PROVIDER_API_KEY}${providerId}`;
  return storeSecret(key, apiKey);
}

/**
 * Get a custom provider API key
 */
export async function getCustomProviderApiKey(
  providerId: string
): Promise<string | null> {
  const key = `${KEY_PREFIX.CUSTOM_PROVIDER_API_KEY}${providerId}`;
  return getSecret(key);
}

/**
 * Remove a custom provider API key
 */
export async function removeCustomProviderApiKey(
  providerId: string
): Promise<boolean> {
  const key = `${KEY_PREFIX.CUSTOM_PROVIDER_API_KEY}${providerId}`;
  return removeSecret(key);
}

// ============================================================================
// OAuth Token Management
// ============================================================================

/**
 * Store OAuth tokens for a provider
 */
export async function storeOAuthTokens(
  providerId: string,
  accessToken: string,
  refreshToken?: string
): Promise<boolean> {
  const accessKey = `${KEY_PREFIX.OAUTH_TOKEN}${providerId}`;
  const success = await storeSecret(accessKey, accessToken);

  if (refreshToken) {
    const refreshKey = `${KEY_PREFIX.OAUTH_REFRESH}${providerId}`;
    await storeSecret(refreshKey, refreshToken);
  }

  return success;
}

/**
 * Get OAuth access token for a provider
 */
export async function getOAuthAccessToken(
  providerId: string
): Promise<string | null> {
  const key = `${KEY_PREFIX.OAUTH_TOKEN}${providerId}`;
  return getSecret(key);
}

/**
 * Get OAuth refresh token for a provider
 */
export async function getOAuthRefreshToken(
  providerId: string
): Promise<string | null> {
  const key = `${KEY_PREFIX.OAUTH_REFRESH}${providerId}`;
  return getSecret(key);
}

/**
 * Remove OAuth tokens for a provider
 */
export async function removeOAuthTokens(providerId: string): Promise<boolean> {
  const accessKey = `${KEY_PREFIX.OAUTH_TOKEN}${providerId}`;
  const refreshKey = `${KEY_PREFIX.OAUTH_REFRESH}${providerId}`;

  const accessRemoved = await removeSecret(accessKey);
  const refreshRemoved = await removeSecret(refreshKey);

  return accessRemoved || refreshRemoved;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Stronghold has a specific key stored
 */
export async function hasSecret(key: string): Promise<boolean> {
  const value = await getSecret(key);
  return value !== null;
}

/**
 * Check if a provider has an API key stored
 */
export async function hasProviderApiKey(providerId: string): Promise<boolean> {
  const key = `${KEY_PREFIX.PROVIDER_API_KEY}${providerId}`;
  return hasSecret(key);
}

/**
 * Migrate an API key from plain text storage to Stronghold
 * Returns true if migration was successful or key didn't exist
 */
export async function migrateApiKeyToStronghold(
  providerId: string,
  plainTextKey: string | undefined
): Promise<boolean> {
  if (!plainTextKey) return true;

  // Store in Stronghold
  const stored = await storeProviderApiKey(providerId, plainTextKey);
  return stored;
}
