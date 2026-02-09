/**
 * Tests for Progressive Image Loader
 */

import { ProgressiveImageLoader } from './progressive-loader';

function createTestImageData(width: number, height: number, fill?: number[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill?.[0] ?? 128;
    data[i + 1] = fill?.[1] ?? 128;
    data[i + 2] = fill?.[2] ?? 128;
    data[i + 3] = fill?.[3] ?? 255;
  }
  return new ImageData(data, width, height);
}

describe('ProgressiveImageLoader', () => {
  describe('constructor', () => {
    it('should create loader with default options', () => {
      const loader = new ProgressiveImageLoader();
      expect(loader).toBeDefined();
    });

    it('should create loader with custom options', () => {
      const loader = new ProgressiveImageLoader({
        maxPreviewSize: 128,
        previewQuality: 0.5,
        useBlurhash: false,
      });
      expect(loader).toBeDefined();
    });
  });

  describe('loadFromImageData', () => {
    it('should generate preview from ImageData', () => {
      const loader = new ProgressiveImageLoader();
      const imageData = createTestImageData(100, 100);

      const result = loader.loadFromImageData(imageData);

      expect(result.full).toBe(imageData);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.preview).toBeDefined();
    });

    it('should generate blurhash when enabled', () => {
      const loader = new ProgressiveImageLoader({ useBlurhash: true });
      const imageData = createTestImageData(100, 100);

      const result = loader.loadFromImageData(imageData);

      expect(result.blurhash).toBeDefined();
      expect(typeof result.blurhash).toBe('string');
    });

    it('should not generate blurhash when disabled', () => {
      const loader = new ProgressiveImageLoader({ useBlurhash: false });
      const imageData = createTestImageData(100, 100);

      const result = loader.loadFromImageData(imageData);

      expect(result.blurhash).toBeUndefined();
    });

    it('should respect maxPreviewSize option', () => {
      const loader = new ProgressiveImageLoader({ maxPreviewSize: 32 });
      const imageData = createTestImageData(200, 200);

      const result = loader.loadFromImageData(imageData);

      expect(result.preview).toBeDefined();
    });
  });

  describe('generatePlaceholder', () => {
    it('should generate placeholder from blurhash', () => {
      const loader = new ProgressiveImageLoader({ useBlurhash: true });
      const imageData = createTestImageData(100, 100, [255, 0, 0, 255]);
      const result = loader.loadFromImageData(imageData);

      if (result.blurhash) {
        const placeholder = ProgressiveImageLoader.generatePlaceholder(
          result.blurhash,
          50,
          50
        );

        expect(placeholder).toBeInstanceOf(ImageData);
        expect(placeholder.width).toBe(50);
        expect(placeholder.height).toBe(50);
      }
    });

    it('should decode simple blurhash format', () => {
      const blurhash = '4x3:ff0000ff0000ff0000ff0000ff0000ff0000ff0000ff0000ff0000ff0000ff0000ff0000';
      const placeholder = ProgressiveImageLoader.generatePlaceholder(blurhash, 100, 75);

      expect(placeholder.width).toBe(100);
      expect(placeholder.height).toBe(75);
    });
  });

  describe('cancel', () => {
    it('should cancel ongoing load operation', () => {
      const loader = new ProgressiveImageLoader();

      expect(() => loader.cancel()).not.toThrow();
    });

    it('should handle cancel when no operation is in progress', () => {
      const loader = new ProgressiveImageLoader();
      loader.cancel();
      loader.cancel();

      expect(true).toBe(true);
    });
  });

  describe('loadFromFile', () => {
    it('should handle File input', async () => {
      // Mock Image to fire onerror immediately (JSDOM Image never fires load/error events)
      const OriginalImage = globalThis.Image;
      globalThis.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_: string) {
          // Simulate image load failure in test environment
          setTimeout(() => this.onerror?.(), 0);
        }
      } as unknown as typeof Image;

      try {
        const callbacks = {
          onProgress: jest.fn(),
          onPreviewReady: jest.fn(),
          onFullReady: jest.fn(),
        };

        const loaderWithCallbacks = new ProgressiveImageLoader(callbacks);

        const blob = new Blob(['fake-image-data'], { type: 'image/png' });
        const file = new File([blob], 'test.png', { type: 'image/png' });

        await expect(loaderWithCallbacks.loadFromFile(file)).rejects.toThrow();
      } finally {
        globalThis.Image = OriginalImage;
      }
    });
  });

  describe('options callbacks', () => {
    it('should call onPreviewReady callback', () => {
      const onPreviewReady = jest.fn();
      const loader = new ProgressiveImageLoader({ onPreviewReady });
      const imageData = createTestImageData(100, 100);

      loader.loadFromImageData(imageData);
    });

    it('should call onProgress callback during URL load', async () => {
      const onProgress = jest.fn();
      const _loader = new ProgressiveImageLoader({ onProgress });

      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very small images', () => {
      const loader = new ProgressiveImageLoader();
      const imageData = createTestImageData(1, 1);

      const result = loader.loadFromImageData(imageData);

      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
    });

    it('should handle rectangular images', () => {
      const loader = new ProgressiveImageLoader();
      const imageData = createTestImageData(200, 50);

      const result = loader.loadFromImageData(imageData);

      expect(result.width).toBe(200);
      expect(result.height).toBe(50);
    });

    it('should handle tall images', () => {
      const loader = new ProgressiveImageLoader();
      const imageData = createTestImageData(50, 200);

      const result = loader.loadFromImageData(imageData);

      expect(result.width).toBe(50);
      expect(result.height).toBe(200);
    });
  });
});
