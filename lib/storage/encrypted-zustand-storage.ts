/**
 * Encrypted Zustand Storage Adapter
 * 
 * Wraps the standard JSON storage with field-level encryption for sensitive data.
 * Encrypts specified fields when writing to localStorage and decrypts when reading.
 * Uses Web Crypto API (AES-GCM) with device-derived keys for browser environments.
 * 
 * In Tauri desktop mode, Stronghold handles encryption at the vault level,
 * so this adapter primarily benefits browser-only deployments.
 */

import type { StateStorage } from 'zustand/middleware';
import { encryptValue, decryptValue, isEncrypted, isWebCryptoAvailable } from './storage-encryption';
import { loggers } from '@/lib/logger';

const log = loggers.store;

type SensitiveFieldPath = string;

interface EncryptedStorageOptions {
  /** Field paths to encrypt (dot-notation for nested, e.g. "providerSettings.*.apiKey") */
  sensitiveFields: SensitiveFieldPath[];
}

/**
 * Recursively apply encryption to sensitive fields in a parsed JSON state object.
 * Supports wildcard patterns like "providerSettings.*.apiKey"
 */
async function encryptFields(
  obj: Record<string, unknown>,
  patterns: SensitiveFieldPath[]
): Promise<Record<string, unknown>> {
  const result = structuredClone(obj);

  for (const pattern of patterns) {
    const parts = pattern.split('.');
    await applyToPath(result, parts, 0, async (value) => {
      if (typeof value === 'string' && value.length > 0 && !isEncrypted(value)) {
        return encryptValue(value);
      }
      if (Array.isArray(value)) {
        const encrypted: string[] = [];
        for (const item of value) {
          if (typeof item === 'string' && item.length > 0 && !isEncrypted(item)) {
            encrypted.push(await encryptValue(item));
          } else {
            encrypted.push(item as string);
          }
        }
        return encrypted;
      }
      return value;
    });
  }

  return result;
}

/**
 * Recursively apply decryption to sensitive fields in a parsed JSON state object.
 */
async function decryptFields(
  obj: Record<string, unknown>,
  patterns: SensitiveFieldPath[]
): Promise<Record<string, unknown>> {
  const result = structuredClone(obj);

  for (const pattern of patterns) {
    const parts = pattern.split('.');
    await applyToPath(result, parts, 0, async (value) => {
      if (typeof value === 'string' && isEncrypted(value)) {
        return decryptValue(value);
      }
      if (Array.isArray(value)) {
        const decrypted: string[] = [];
        for (const item of value) {
          if (typeof item === 'string' && isEncrypted(item)) {
            decrypted.push(await decryptValue(item));
          } else {
            decrypted.push(item as string);
          }
        }
        return decrypted;
      }
      return value;
    });
  }

  return result;
}

/**
 * Navigate object by path parts, applying transform at leaf.
 * Supports "*" wildcard for iterating over object keys.
 */
async function applyToPath(
  obj: Record<string, unknown>,
  parts: string[],
  index: number,
  transform: (value: unknown) => Promise<unknown>
): Promise<void> {
  if (index >= parts.length) return;

  const key = parts[index];
  const isLast = index === parts.length - 1;

  if (key === '*') {
    // Wildcard: iterate all keys of current object
    if (typeof obj !== 'object' || obj === null) return;
    for (const childKey of Object.keys(obj)) {
      const child = obj[childKey];
      if (isLast) {
        obj[childKey] = await transform(child);
      } else if (typeof child === 'object' && child !== null) {
        await applyToPath(child as Record<string, unknown>, parts, index + 1, transform);
      }
    }
  } else {
    if (!(key in obj)) return;
    if (isLast) {
      obj[key] = await transform(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      await applyToPath(obj[key] as Record<string, unknown>, parts, index + 1, transform);
    }
  }
}

/**
 * Create an encrypted storage adapter for Zustand persist middleware.
 * Wraps localStorage with field-level AES-GCM encryption for sensitive data.
 * 
 * @example
 * ```ts
 * persist(storeCreator, {
 *   name: 'cognia-settings',
 *   storage: createEncryptedStorage({
 *     sensitiveFields: [
 *       'providerSettings.*.apiKey',
 *       'providerSettings.*.apiKeys',
 *       'customProviders.*.apiKey',
 *       'searchProviders.*.apiKey',
 *       'tavilyApiKey',
 *     ],
 *   }),
 * })
 * ```
 */
export function createEncryptedStorage(options: EncryptedStorageOptions): StateStorage {
  const { sensitiveFields } = options;

  return {
    getItem: async (name: string): Promise<string | null> => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;

      // If Web Crypto not available or no sensitive fields, return as-is
      if (!isWebCryptoAvailable() || sensitiveFields.length === 0) {
        return raw;
      }

      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.state) {
          parsed.state = await decryptFields(
            parsed.state as Record<string, unknown>,
            sensitiveFields
          );
          return JSON.stringify(parsed);
        }
        return raw;
      } catch (error) {
        log.error('Failed to decrypt storage fields', error as Error);
        return raw;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      // If Web Crypto not available or no sensitive fields, store as-is
      if (!isWebCryptoAvailable() || sensitiveFields.length === 0) {
        localStorage.setItem(name, value);
        return;
      }

      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && parsed.state) {
          parsed.state = await encryptFields(
            parsed.state as Record<string, unknown>,
            sensitiveFields
          );
          localStorage.setItem(name, JSON.stringify(parsed));
          return;
        }
        localStorage.setItem(name, value);
      } catch (error) {
        log.error('Failed to encrypt storage fields, storing as-is', error as Error);
        localStorage.setItem(name, value);
      }
    },

    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
}
