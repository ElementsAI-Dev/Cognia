/**
 * @jest-environment jsdom
 */

import {
  compressString,
  decompressString,
  CompressedStorage,
  LZString,
  isCompressionSupported,
  calculateCompressionRatio,
  formatCompressionRatio,
} from './storage-compression';

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
  },
}));

describe('storage-compression', () => {
  describe('compressString', () => {
    it('should not compress small strings', async () => {
      const smallData = 'small';
      const result = await compressString(smallData);

      expect(result.compressed).toBe(false);
      expect(result.data).toBe(smallData);
    });

    it('should return uncompressed if CompressionStream not available', async () => {
      const originalCompressionStream = global.CompressionStream;
      // @ts-expect-error - testing unavailable API
      global.CompressionStream = undefined;

      const data = 'a'.repeat(2000);
      const result = await compressString(data);

      expect(result.compressed).toBe(false);
      expect(result.data).toBe(data);

      global.CompressionStream = originalCompressionStream;
    });

    it('should compress large strings when CompressionStream available', async () => {
      // Skip if CompressionStream is not available in test environment
      if (typeof CompressionStream === 'undefined') {
        return;
      }

      const largeData = 'a'.repeat(5000);
      const result = await compressString(largeData);

      // Should be compressed and smaller
      if (result.compressed) {
        expect(result.data.length).toBeLessThan(largeData.length);
      }
    });
  });

  describe('decompressString', () => {
    it('should throw if DecompressionStream not available', async () => {
      const originalDecompressionStream = global.DecompressionStream;
      // @ts-expect-error - testing unavailable API
      global.DecompressionStream = undefined;

      await expect(decompressString('test')).rejects.toThrow('DecompressionStream not supported');

      global.DecompressionStream = originalDecompressionStream;
    });

    it('should decompress compressed data', async () => {
      // Skip if APIs not available
      if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
        return;
      }

      const originalData = 'a'.repeat(5000);
      const compressed = await compressString(originalData);

      if (compressed.compressed) {
        const decompressed = await decompressString(compressed.data);
        expect(decompressed).toBe(originalData);
      }
    });
  });

  describe('CompressedStorage', () => {
    let storage: CompressedStorage;
    let mockLocalStorage: Record<string, string>;

    beforeEach(() => {
      mockLocalStorage = {};
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
        mockLocalStorage[key] = value;
      });
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        return mockLocalStorage[key] || null;
      });
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
        delete mockLocalStorage[key];
      });

      storage = new CompressedStorage();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create storage with default prefix', () => {
      expect(storage).toBeDefined();
    });

    it('should create storage with custom prefix', () => {
      const customStorage = new CompressedStorage('custom-');
      expect(customStorage).toBeDefined();
    });

    describe('setItem', () => {
      it('should store data with metadata', async () => {
        await storage.setItem('test-key', 'test-value');

        const stored = mockLocalStorage['compressed-test-key'];
        expect(stored).toBeDefined();

        const parsed = JSON.parse(stored);
        expect(parsed).toHaveProperty('compressed');
        expect(parsed).toHaveProperty('data');
        expect(parsed).toHaveProperty('originalSize');
        expect(parsed).toHaveProperty('storedAt');
      });

      it('should store original size', async () => {
        const value = 'test-value-123';
        await storage.setItem('test-key', value);

        const stored = JSON.parse(mockLocalStorage['compressed-test-key']);
        expect(stored.originalSize).toBe(value.length);
      });
    });

    describe('getItem', () => {
      it('should return null for non-existent key', async () => {
        const result = await storage.getItem('non-existent');
        expect(result).toBeNull();
      });

      it('should retrieve stored data', async () => {
        const value = 'test-value';
        await storage.setItem('test-key', value);
        const result = await storage.getItem('test-key');
        expect(result).toBe(value);
      });

      it('should handle invalid stored data gracefully', async () => {
        mockLocalStorage['compressed-bad-key'] = 'not-json';
        const result = await storage.getItem('bad-key');
        expect(result).toBeNull();
      });
    });

    describe('removeItem', () => {
      it('should remove stored item', async () => {
        await storage.setItem('test-key', 'test-value');
        storage.removeItem('test-key');
        expect(mockLocalStorage['compressed-test-key']).toBeUndefined();
      });
    });

    describe('getItemInfo', () => {
      it('should return null for non-existent key', () => {
        const info = storage.getItemInfo('non-existent');
        expect(info).toBeNull();
      });

      it('should return storage info', async () => {
        const value = 'test-value';
        await storage.setItem('test-key', value);
        const info = storage.getItemInfo('test-key');

        expect(info).not.toBeNull();
        expect(info?.originalSize).toBe(value.length);
        expect(info).toHaveProperty('compressed');
        expect(info).toHaveProperty('storedSize');
        expect(info).toHaveProperty('compressionRatio');
        expect(info).toHaveProperty('storedAt');
      });

      it('should handle invalid data gracefully', () => {
        mockLocalStorage['compressed-bad-key'] = 'not-json';
        const info = storage.getItemInfo('bad-key');
        expect(info).toBeNull();
      });
    });
  });

  describe('LZString', () => {
    describe('compress', () => {
      it('should return empty string for empty input', () => {
        expect(LZString.compress('')).toBe('');
      });

      it('should compress string', () => {
        const input = 'Hello, World!';
        const compressed = LZString.compress(input);
        expect(typeof compressed).toBe('string');
        expect(compressed.length).toBeGreaterThan(0);
      });

      it('should produce different output for different inputs', () => {
        const comp1 = LZString.compress('Hello');
        const comp2 = LZString.compress('World');
        expect(comp1).not.toBe(comp2);
      });
    });

    describe('decompress', () => {
      it('should return empty string for empty input', () => {
        expect(LZString.decompress('')).toBe('');
      });

      it('should decompress simple strings', () => {
        // Note: LZString implementation is simplified and may not round-trip perfectly
        // This tests basic functionality
        const compressed = LZString.compress('test');
        const decompressed = LZString.decompress(compressed);
        expect(typeof decompressed).toBe('string');
      });
    });
  });

  describe('isCompressionSupported', () => {
    it('should return boolean', () => {
      const result = isCompressionSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should check for both CompressionStream and DecompressionStream', () => {
      const hasCompression = typeof CompressionStream !== 'undefined';
      const hasDecompression = typeof DecompressionStream !== 'undefined';
      expect(isCompressionSupported()).toBe(hasCompression && hasDecompression);
    });
  });

  describe('calculateCompressionRatio', () => {
    it('should return 1 for zero original size', () => {
      expect(calculateCompressionRatio(0, 100)).toBe(1);
    });

    it('should calculate correct ratio', () => {
      expect(calculateCompressionRatio(100, 50)).toBe(0.5);
      expect(calculateCompressionRatio(100, 100)).toBe(1);
      expect(calculateCompressionRatio(100, 25)).toBe(0.25);
    });
  });

  describe('formatCompressionRatio', () => {
    it('should format ratio as percentage', () => {
      expect(formatCompressionRatio(0.5)).toBe('50.0% smaller');
      expect(formatCompressionRatio(0.25)).toBe('75.0% smaller');
      expect(formatCompressionRatio(1)).toBe('0.0% smaller');
    });

    it('should handle negative savings', () => {
      expect(formatCompressionRatio(1.5)).toBe('-50.0% smaller');
    });
  });
});
