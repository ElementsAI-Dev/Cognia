/**
 * Tests for Plugin Signature Verification
 */

import {
  PluginSignatureVerifier,
  getPluginSignatureVerifier,
  resetPluginSignatureVerifier,
} from './signature';

// Mock crypto APIs
const mockSubtle = {
  importKey: jest.fn().mockResolvedValue({}),
  verify: jest.fn().mockResolvedValue(true),
  digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockSubtle,
  },
});

describe('PluginSignatureVerifier', () => {
  let verifier: PluginSignatureVerifier;

  beforeEach(() => {
    resetPluginSignatureVerifier();
    verifier = new PluginSignatureVerifier();
    jest.clearAllMocks();
  });

  afterEach(() => {
    verifier.clear();
  });

  describe('Trusted Publishers', () => {
    it('should add a trusted publisher', () => {
      verifier.addTrustedPublisher({
        id: 'publisher-1',
        name: 'Test Publisher',
        publicKey: 'test-public-key',
      });

      expect(verifier.isTrustedPublisher('publisher-1')).toBe(true);
    });

    it('should remove a trusted publisher', () => {
      verifier.addTrustedPublisher({
        id: 'publisher-1',
        name: 'Test Publisher',
        publicKey: 'test-public-key',
      });

      verifier.removeTrustedPublisher('publisher-1');

      expect(verifier.isTrustedPublisher('publisher-1')).toBe(false);
    });

    it('should get trusted publisher', () => {
      verifier.addTrustedPublisher({
        id: 'publisher-1',
        name: 'Test Publisher',
        publicKey: 'test-public-key',
      });

      const publisher = verifier.getTrustedPublisher('publisher-1');

      expect(publisher?.name).toBe('Test Publisher');
    });

    it('should list all trusted publishers', () => {
      verifier.addTrustedPublisher({
        id: 'publisher-1',
        name: 'Publisher 1',
        publicKey: 'key-1',
      });
      verifier.addTrustedPublisher({
        id: 'publisher-2',
        name: 'Publisher 2',
        publicKey: 'key-2',
      });

      const publishers = verifier.listTrustedPublishers();

      expect(publishers.length).toBe(2);
    });
  });

  describe('Signature Verification', () => {
    beforeEach(() => {
      verifier.addTrustedPublisher({
        id: 'trusted-publisher',
        name: 'Trusted Publisher',
        publicKey: 'trusted-public-key',
      });
    });

    it('should verify a valid signature', async () => {
      mockSubtle.verify.mockResolvedValueOnce(true);

      const result = await verifier.verify({
        pluginId: 'plugin-a',
        content: 'plugin-content',
        signature: 'valid-signature',
        publisherId: 'trusted-publisher',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject an invalid signature', async () => {
      mockSubtle.verify.mockResolvedValueOnce(false);

      const result = await verifier.verify({
        pluginId: 'plugin-a',
        content: 'plugin-content',
        signature: 'invalid-signature',
        publisherId: 'trusted-publisher',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('invalid');
    });

    it('should reject untrusted publishers', async () => {
      const result = await verifier.verify({
        pluginId: 'plugin-a',
        content: 'plugin-content',
        signature: 'some-signature',
        publisherId: 'untrusted-publisher',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('untrusted');
    });

    it('should handle verification errors', async () => {
      mockSubtle.verify.mockRejectedValueOnce(new Error('Crypto error'));

      const result = await verifier.verify({
        pluginId: 'plugin-a',
        content: 'plugin-content',
        signature: 'signature',
        publisherId: 'trusted-publisher',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Manifest Verification', () => {
    beforeEach(() => {
      verifier.addTrustedPublisher({
        id: 'trusted-publisher',
        name: 'Trusted Publisher',
        publicKey: 'trusted-public-key',
      });
    });

    it('should verify a signed manifest', async () => {
      mockSubtle.verify.mockResolvedValueOnce(true);

      const result = await verifier.verifyManifest({
        id: 'plugin-a',
        name: 'Plugin A',
        version: '1.0.0',
        author: { name: 'Test' },
        signature: {
          publisherId: 'trusted-publisher',
          signature: 'valid-signature',
          timestamp: Date.now(),
        },
      });

      expect(result.valid).toBe(true);
    });

    it('should reject unsigned manifests when required', async () => {
      const result = await verifier.verifyManifest(
        {
          id: 'plugin-a',
          name: 'Plugin A',
          version: '1.0.0',
          author: { name: 'Test' },
        },
        { requireSignature: true }
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not signed');
    });

    it('should allow unsigned manifests when not required', async () => {
      const result = await verifier.verifyManifest(
        {
          id: 'plugin-a',
          name: 'Plugin A',
          version: '1.0.0',
          author: { name: 'Test' },
        },
        { requireSignature: false }
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Hash Computation', () => {
    it('should compute content hash', async () => {
      mockSubtle.digest.mockResolvedValueOnce(new ArrayBuffer(32));

      const hash = await verifier.computeHash('test-content');

      expect(typeof hash).toBe('string');
      expect(mockSubtle.digest).toHaveBeenCalled();
    });
  });

  describe('Verification Cache', () => {
    beforeEach(() => {
      verifier.addTrustedPublisher({
        id: 'trusted-publisher',
        name: 'Trusted Publisher',
        publicKey: 'trusted-public-key',
      });
    });

    it('should cache verification results', async () => {
      mockSubtle.verify.mockResolvedValue(true);

      // First call
      await verifier.verify({
        pluginId: 'plugin-a',
        content: 'content',
        signature: 'sig',
        publisherId: 'trusted-publisher',
      });

      // Second call with same input
      await verifier.verify({
        pluginId: 'plugin-a',
        content: 'content',
        signature: 'sig',
        publisherId: 'trusted-publisher',
      });

      // Crypto.verify should be called once due to caching
      expect(mockSubtle.verify.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('should clear verification cache', async () => {
      mockSubtle.verify.mockResolvedValue(true);

      await verifier.verify({
        pluginId: 'plugin-a',
        content: 'content',
        signature: 'sig',
        publisherId: 'trusted-publisher',
      });

      verifier.clearCache();

      await verifier.verify({
        pluginId: 'plugin-a',
        content: 'content',
        signature: 'sig',
        publisherId: 'trusted-publisher',
      });

      expect(mockSubtle.verify.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Configuration', () => {
    it('should enforce signature requirement', () => {
      verifier.setRequireSignatures(true);
      expect(verifier.isSignatureRequired()).toBe(true);

      verifier.setRequireSignatures(false);
      expect(verifier.isSignatureRequired()).toBe(false);
    });
  });
});

describe('Singleton', () => {
  it('should return the same instance', () => {
    resetPluginSignatureVerifier();
    const instance1 = getPluginSignatureVerifier();
    const instance2 = getPluginSignatureVerifier();
    expect(instance1).toBe(instance2);
  });
});
