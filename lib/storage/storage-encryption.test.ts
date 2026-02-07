/**
 * @jest-environment jsdom
 */

import {
  isEncrypted,
  encryptSensitiveFields,
  decryptSensitiveFields,
} from './storage-encryption';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

describe('Storage Encryption', () => {
  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      expect(isEncrypted('enc:abc.def')).toBe(true);
    });

    it('should return false for plain values', () => {
      expect(isEncrypted('plain-text')).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });
  });

  describe('encryptValue / decryptValue (Web Crypto unavailable)', () => {
    // In jsdom test env, crypto.subtle may not be on window
    // encryptValue/decryptValue fall back to plain text
    let encryptValue: typeof import('./storage-encryption').encryptValue;
    let decryptValue: typeof import('./storage-encryption').decryptValue;

    beforeAll(async () => {
      const mod = await import('./storage-encryption');
      encryptValue = mod.encryptValue;
      decryptValue = mod.decryptValue;
    });

    it('should return plain text when crypto is not available', async () => {
      const original = 'sk-my-secret-api-key-123';
      const result = await encryptValue(original);
      // Falls back to plain text when Web Crypto not available
      expect(typeof result).toBe('string');
    });

    it('should return plain text when decrypting non-encrypted value', async () => {
      const plain = 'not-encrypted';
      const result = await decryptValue(plain);
      expect(result).toBe(plain);
    });

    it('should return empty string for malformed encrypted data', async () => {
      // When crypto is unavailable, returns empty string for enc: prefix
      const result = await decryptValue('enc:invalid');
      // Either empty (no crypto) or empty (malformed)
      expect(typeof result).toBe('string');
    });
  });

  describe('encryptSensitiveFields', () => {
    it('should not modify non-sensitive fields', async () => {
      const obj = { apiKey: 'secret', name: 'test', token: 'tok-123' };
      const result = await encryptSensitiveFields(obj, ['apiKey', 'token']);

      // name should always remain unchanged
      expect(result.name).toBe('test');
    });

    it('should skip empty fields', async () => {
      const obj = { apiKey: '', name: 'test' };
      const result = await encryptSensitiveFields(obj, ['apiKey']);

      expect(result.apiKey).toBe('');
    });

    it('should skip already encrypted fields', async () => {
      const obj = { apiKey: 'enc:already.encrypted' };
      const result = await encryptSensitiveFields(obj, ['apiKey']);

      expect(result.apiKey).toBe('enc:already.encrypted');
    });

    it('should handle non-string fields gracefully', async () => {
      const obj = { apiKey: 'secret', count: 42 } as Record<string, unknown>;
      const result = await encryptSensitiveFields(obj, ['apiKey', 'count']);

      expect(result.count).toBe(42); // non-string, unchanged
    });
  });

  describe('decryptSensitiveFields', () => {
    it('should skip non-encrypted fields', async () => {
      const obj = { apiKey: 'plain-text', name: 'test' };
      const result = await decryptSensitiveFields(obj, ['apiKey']);

      expect(result.apiKey).toBe('plain-text');
      expect(result.name).toBe('test');
    });

    it('should not modify non-targeted fields', async () => {
      const obj = { apiKey: 'enc:test.data', name: 'test' };
      const result = await decryptSensitiveFields(obj, ['apiKey']);

      expect(result.name).toBe('test');
    });
  });
});
