/**
 * Storage Encryption Utilities
 * 
 * Provides Web Crypto API based encryption for sensitive data in browser-only
 * (non-Tauri) environments. In Tauri desktop mode, Stronghold is preferred.
 * 
 * Uses AES-GCM with PBKDF2-derived keys for symmetric encryption.
 * The encryption key is derived from a device fingerprint so data is
 * tied to the specific browser/device (not portable, but prevents
 * casual reading of localStorage).
 */

import { loggers } from '@/lib/logger';

const log = loggers.store;

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
const SALT_PREFIX = 'cognia-encryption-salt';
const ENCRYPTED_PREFIX = 'enc:';

/**
 * Check if Web Crypto API is available
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
}

/**
 * Generate a device-specific fingerprint for key derivation.
 * This is NOT cryptographically secure against determined attackers,
 * but prevents casual reading of localStorage values.
 */
function getDeviceFingerprint(): string {
  if (typeof navigator === 'undefined') return 'server-fallback';

  const parts = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen?.width?.toString() ?? '',
    screen?.height?.toString() ?? '',
    screen?.colorDepth?.toString() ?? '',
  ];

  return parts.join('|');
}

/**
 * Derive a CryptoKey from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseData = encoder.encode(passphrase);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passphraseData.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a string value using AES-GCM with device-derived key
 * Returns the encrypted string prefixed with "enc:" for identification
 */
export async function encryptValue(plainText: string): Promise<string> {
  if (!isWebCryptoAvailable()) {
    return plainText;
  }

  try {
    const encoder = new TextEncoder();
    const saltBytes = encoder.encode(SALT_PREFIX);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(getDeviceFingerprint(), saltBytes.buffer as ArrayBuffer);

    const plainData = encoder.encode(plainText);
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      plainData.buffer as ArrayBuffer
    );

    // Format: enc:<iv_base64>.<ciphertext_base64>
    const ivBase64 = bufferToBase64(iv.buffer);
    const cipherBase64 = bufferToBase64(encrypted);

    return `${ENCRYPTED_PREFIX}${ivBase64}.${cipherBase64}`;
  } catch (error) {
    log.error('Encryption failed, storing as plain text', error as Error);
    return plainText;
  }
}

/**
 * Decrypt a string value that was encrypted with encryptValue
 * Handles both encrypted (prefixed) and plain text values gracefully
 */
export async function decryptValue(storedValue: string): Promise<string> {
  if (!storedValue.startsWith(ENCRYPTED_PREFIX)) {
    return storedValue;
  }

  if (!isWebCryptoAvailable()) {
    log.warn('Cannot decrypt: Web Crypto API not available');
    return '';
  }

  try {
    const payload = storedValue.slice(ENCRYPTED_PREFIX.length);
    const [ivBase64, cipherBase64] = payload.split('.');

    if (!ivBase64 || !cipherBase64) {
      log.warn('Invalid encrypted format');
      return '';
    }

    const iv = new Uint8Array(base64ToBuffer(ivBase64));
    const ciphertext = base64ToBuffer(cipherBase64);
    const encoder = new TextEncoder();
    const saltBytes = encoder.encode(SALT_PREFIX);
    const key = await deriveKey(getDeviceFingerprint(), saltBytes.buffer as ArrayBuffer);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    log.error('Decryption failed', error as Error);
    return '';
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt sensitive fields in a sync config object
 * Only encrypts non-empty string values at specified field paths
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): Promise<T> {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0 && !isEncrypted(value)) {
      (result as Record<string, unknown>)[field] = await encryptValue(value);
    }
  }

  return result;
}

/**
 * Decrypt sensitive fields in a sync config object
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): Promise<T> {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      (result as Record<string, unknown>)[field] = await decryptValue(value);
    }
  }

  return result;
}
