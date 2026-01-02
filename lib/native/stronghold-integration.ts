/**
 * Stronghold Integration Service
 * 
 * Provides integration between Stronghold secure storage and the application's
 * settings store. Handles migration of API keys from plain text storage to
 * encrypted Stronghold storage.
 */

import {
  initStronghold,
  isStrongholdReady,
  closeStronghold,
  storeProviderApiKey,
  getProviderApiKey,
  removeProviderApiKey,
  storeProviderApiKeys,
  getProviderApiKeys,
  storeSearchApiKey,
  getSearchApiKey,
  storeCustomProviderApiKey,
  getCustomProviderApiKey,
  migrateApiKeyToStronghold,
} from './stronghold';
import { isTauri } from './utils';

// Track initialization state
let initializationPromise: Promise<boolean> | null = null;
let isInitialized = false;

/**
 * Initialize Stronghold with user password
 * Should be called early in app startup
 */
export async function initializeStronghold(password: string): Promise<boolean> {
  if (!isTauri()) {
    console.log('Stronghold not available outside Tauri environment');
    return false;
  }

  if (isInitialized) {
    return true;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initStronghold(password);
  const result = await initializationPromise;
  isInitialized = result;
  initializationPromise = null;
  
  return result;
}

/**
 * Check if Stronghold is available and initialized
 */
export function isStrongholdAvailable(): boolean {
  return isTauri() && isStrongholdReady();
}

/**
 * Lock Stronghold (clear from memory)
 */
export async function lockStronghold(): Promise<void> {
  await closeStronghold();
  isInitialized = false;
}

// ============================================================================
// Provider API Key Operations with Fallback
// ============================================================================

/**
 * Store a provider API key securely
 * Falls back to returning false if Stronghold not available
 */
export async function secureStoreProviderApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  if (!isStrongholdAvailable()) {
    console.warn('Stronghold not available, API key not stored securely');
    return false;
  }
  return storeProviderApiKey(providerId, apiKey);
}

/**
 * Get a provider API key from secure storage
 * Returns null if Stronghold not available or key not found
 */
export async function secureGetProviderApiKey(
  providerId: string
): Promise<string | null> {
  if (!isStrongholdAvailable()) {
    return null;
  }
  return getProviderApiKey(providerId);
}

/**
 * Remove a provider API key from secure storage
 */
export async function secureRemoveProviderApiKey(
  providerId: string
): Promise<boolean> {
  if (!isStrongholdAvailable()) {
    return false;
  }
  return removeProviderApiKey(providerId);
}

/**
 * Store multiple API keys for a provider (for rotation)
 */
export async function secureStoreProviderApiKeys(
  providerId: string,
  apiKeys: string[]
): Promise<boolean> {
  if (!isStrongholdAvailable()) {
    return false;
  }
  return storeProviderApiKeys(providerId, apiKeys);
}

/**
 * Get multiple API keys for a provider
 */
export async function secureGetProviderApiKeys(
  providerId: string
): Promise<string[]> {
  if (!isStrongholdAvailable()) {
    return [];
  }
  return getProviderApiKeys(providerId);
}

// ============================================================================
// Search Provider API Key Operations
// ============================================================================

/**
 * Store a search provider API key securely
 */
export async function secureStoreSearchApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  if (!isStrongholdAvailable()) {
    return false;
  }
  return storeSearchApiKey(providerId, apiKey);
}

/**
 * Get a search provider API key from secure storage
 */
export async function secureGetSearchApiKey(
  providerId: string
): Promise<string | null> {
  if (!isStrongholdAvailable()) {
    return null;
  }
  return getSearchApiKey(providerId);
}

// ============================================================================
// Custom Provider API Key Operations
// ============================================================================

/**
 * Store a custom provider API key securely
 */
export async function secureStoreCustomProviderApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  if (!isStrongholdAvailable()) {
    return false;
  }
  return storeCustomProviderApiKey(providerId, apiKey);
}

/**
 * Get a custom provider API key from secure storage
 */
export async function secureGetCustomProviderApiKey(
  providerId: string
): Promise<string | null> {
  if (!isStrongholdAvailable()) {
    return null;
  }
  return getCustomProviderApiKey(providerId);
}

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Migrate all API keys from settings store to Stronghold
 * Call this after Stronghold initialization to migrate existing keys
 */
export async function migrateApiKeysToStronghold(settings: {
  providerSettings: Record<string, { apiKey?: string; apiKeys?: string[] }>;
  customProviders: Record<string, { apiKey?: string }>;
  searchProviders: Record<string, { apiKey?: string }>;
  tavilyApiKey?: string;
}): Promise<{
  migrated: string[];
  failed: string[];
}> {
  const migrated: string[] = [];
  const failed: string[] = [];

  if (!isStrongholdAvailable()) {
    console.warn('Stronghold not available, migration skipped');
    return { migrated, failed };
  }

  // Migrate provider API keys
  for (const [providerId, providerSettings] of Object.entries(settings.providerSettings)) {
    if (providerSettings.apiKey) {
      const success = await migrateApiKeyToStronghold(providerId, providerSettings.apiKey);
      if (success) {
        migrated.push(`provider:${providerId}`);
      } else {
        failed.push(`provider:${providerId}`);
      }
    }

    // Migrate multiple API keys (for rotation)
    if (providerSettings.apiKeys && providerSettings.apiKeys.length > 0) {
      const success = await secureStoreProviderApiKeys(providerId, providerSettings.apiKeys);
      if (success) {
        migrated.push(`provider:${providerId}:multi`);
      } else {
        failed.push(`provider:${providerId}:multi`);
      }
    }
  }

  // Migrate custom provider API keys
  for (const [providerId, customProvider] of Object.entries(settings.customProviders)) {
    if (customProvider.apiKey) {
      const success = await secureStoreCustomProviderApiKey(providerId, customProvider.apiKey);
      if (success) {
        migrated.push(`custom:${providerId}`);
      } else {
        failed.push(`custom:${providerId}`);
      }
    }
  }

  // Migrate search provider API keys
  for (const [providerId, searchSettings] of Object.entries(settings.searchProviders)) {
    if (searchSettings.apiKey) {
      const success = await secureStoreSearchApiKey(providerId, searchSettings.apiKey);
      if (success) {
        migrated.push(`search:${providerId}`);
      } else {
        failed.push(`search:${providerId}`);
      }
    }
  }

  // Migrate legacy Tavily API key
  if (settings.tavilyApiKey) {
    const success = await secureStoreSearchApiKey('tavily', settings.tavilyApiKey);
    if (success) {
      migrated.push('search:tavily:legacy');
    } else {
      failed.push('search:tavily:legacy');
    }
  }

  console.log(`API key migration complete: ${migrated.length} migrated, ${failed.length} failed`);
  return { migrated, failed };
}

/**
 * Check if an API key exists in Stronghold for a provider
 */
export async function hasSecureApiKey(providerId: string): Promise<boolean> {
  const key = await secureGetProviderApiKey(providerId);
  return key !== null;
}

/**
 * Get API key with fallback to plain text
 * First tries Stronghold, then falls back to provided plain text key
 */
export async function getApiKeyWithFallback(
  providerId: string,
  plainTextKey: string | undefined
): Promise<string | undefined> {
  // Try secure storage first
  const secureKey = await secureGetProviderApiKey(providerId);
  if (secureKey) {
    return secureKey;
  }
  
  // Fall back to plain text key
  return plainTextKey;
}
