/**
 * Tests for Noise Reduction & Smart Sharpen
 */

// Mock ImageData for Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
    if (typeof data === 'number') {
      this.width = data;
      this.height = widthOrHeight as number;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = data;
      this.width = widthOrHeight as number;
      this.height = height as number;
    }
  }
}

global.ImageData = MockImageData as unknown as typeof ImageData;

import {
  applyNoiseReduction,
  applySharpen,
  applyClarity,
  applyDehaze,
  DEFAULT_NOISE_REDUCTION,
  DEFAULT_SHARPEN,
} from './noise-sharpen';

function createTestImageData(width: number, height: number, fill?: number[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill?.[0] ?? 128;
    data[i + 1] = fill?.[1] ?? 128;
    data[i + 2] = fill?.[2] ?? 128;
    data[i + 3] = fill?.[3] ?? 255;
  }
  return new MockImageData(data, width, height) as ImageData;
}

function createNoisyImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 50 - 25;
    data[i] = Math.max(0, Math.min(255, 128 + noise));
    data[i + 1] = Math.max(0, Math.min(255, 128 + noise));
    data[i + 2] = Math.max(0, Math.min(255, 128 + noise));
    data[i + 3] = 255;
  }
  return new MockImageData(data, width, height) as ImageData;
}

describe('noise-sharpen', () => {
  describe('DEFAULT_NOISE_REDUCTION', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_NOISE_REDUCTION.strength).toBe(50);
      expect(DEFAULT_NOISE_REDUCTION.preserveDetail).toBe(50);
      expect(DEFAULT_NOISE_REDUCTION.method).toBe('bilateral');
    });
  });

  describe('DEFAULT_SHARPEN', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SHARPEN.amount).toBe(100);
      expect(DEFAULT_SHARPEN.radius).toBe(1);
      expect(DEFAULT_SHARPEN.threshold).toBe(0);
      expect(DEFAULT_SHARPEN.method).toBe('unsharp-mask');
    });
  });

  describe('applyNoiseReduction', () => {
    it('should return ImageData with same dimensions', () => {
      const imageData = createTestImageData(50, 50);
      const result = applyNoiseReduction(imageData, DEFAULT_NOISE_REDUCTION);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
      expect(result.data.length).toBe(imageData.data.length);
    });

    it('should apply median filter', () => {
      const imageData = createNoisyImageData(20, 20);
      const result = applyNoiseReduction(imageData, {
        strength: 50,
        preserveDetail: 50,
        method: 'median',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should apply bilateral filter', () => {
      const imageData = createNoisyImageData(20, 20);
      const result = applyNoiseReduction(imageData, {
        strength: 50,
        preserveDetail: 50,
        method: 'bilateral',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should apply gaussian filter', () => {
      const imageData = createNoisyImageData(20, 20);
      const result = applyNoiseReduction(imageData, {
        strength: 50,
        preserveDetail: 50,
        method: 'gaussian',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 100]);
      const result = applyNoiseReduction(imageData, DEFAULT_NOISE_REDUCTION);

      expect(result.data[3]).toBe(100);
    });

    it('should reduce noise in image', () => {
      const imageData = createNoisyImageData(30, 30);
      const result = applyNoiseReduction(imageData, {
        strength: 80,
        preserveDetail: 30,
        method: 'bilateral',
      });

      // Calculate variance before and after
      const calcVariance = (data: Uint8ClampedArray) => {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += data[i];
          sumSq += data[i] * data[i];
          count++;
        }
        const mean = sum / count;
        return sumSq / count - mean * mean;
      };

      const origVariance = calcVariance(imageData.data);
      const resultVariance = calcVariance(result.data);

      expect(resultVariance).toBeLessThanOrEqual(origVariance);
    });
  });

  describe('applySharpen', () => {
    it('should return ImageData with same dimensions', () => {
      const imageData = createTestImageData(50, 50);
      const result = applySharpen(imageData, DEFAULT_SHARPEN);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should apply unsharp mask', () => {
      const imageData = createTestImageData(20, 20);
      const result = applySharpen(imageData, {
        amount: 100,
        radius: 1,
        threshold: 0,
        method: 'unsharp-mask',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should apply high-pass sharpening', () => {
      const imageData = createTestImageData(20, 20);
      const result = applySharpen(imageData, {
        amount: 100,
        radius: 1,
        threshold: 0,
        method: 'high-pass',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should apply laplacian sharpening', () => {
      const imageData = createTestImageData(20, 20);
      const result = applySharpen(imageData, {
        amount: 100,
        radius: 1,
        threshold: 0,
        method: 'laplacian',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should respect threshold parameter', () => {
      const imageData = createTestImageData(20, 20);
      const result = applySharpen(imageData, {
        amount: 100,
        radius: 1,
        threshold: 128,
        method: 'unsharp-mask',
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 150]);
      const result = applySharpen(imageData, DEFAULT_SHARPEN);

      expect(result.data[3]).toBe(150);
    });
  });

  describe('applyClarity', () => {
    it('should return ImageData with same dimensions', () => {
      const imageData = createTestImageData(50, 50);
      const result = applyClarity(imageData, 50);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should enhance local contrast', () => {
      const imageData = createTestImageData(30, 30, [128, 128, 128, 255]);
      const result = applyClarity(imageData, 50);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle zero amount', () => {
      const imageData = createTestImageData(20, 20, [128, 128, 128, 255]);
      const result = applyClarity(imageData, 0);

      // With zero amount, image should be mostly unchanged
      expect(Math.abs(result.data[0] - imageData.data[0])).toBeLessThan(5);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 200]);
      const result = applyClarity(imageData, 50);

      expect(result.data[3]).toBe(200);
    });
  });

  describe('applyDehaze', () => {
    it('should return ImageData with same dimensions', () => {
      const imageData = createTestImageData(50, 50);
      const result = applyDehaze(imageData, 50);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should remove haze from image', () => {
      // Create a "hazy" image (low contrast, grayish)
      const imageData = createTestImageData(30, 30, [150, 160, 170, 255]);
      const result = applyDehaze(imageData, 50);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle zero amount', () => {
      const imageData = createTestImageData(20, 20, [128, 128, 128, 255]);
      const result = applyDehaze(imageData, 0);

      expect(result.data[0]).toBeCloseTo(128, 0);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 175]);
      const result = applyDehaze(imageData, 50);

      expect(result.data[3]).toBe(175);
    });
  });

  describe('edge cases', () => {
    it('should handle 1x1 image', () => {
      const imageData = createTestImageData(1, 1);

      const noiseResult = applyNoiseReduction(imageData, DEFAULT_NOISE_REDUCTION);
      const sharpenResult = applySharpen(imageData, DEFAULT_SHARPEN);

      expect(noiseResult.width).toBe(1);
      expect(sharpenResult.width).toBe(1);
    });

    it('should handle extreme strength values', () => {
      const imageData = createTestImageData(20, 20);

      const result1 = applyNoiseReduction(imageData, {
        ...DEFAULT_NOISE_REDUCTION,
        strength: 0,
      });
      const result2 = applyNoiseReduction(imageData, {
        ...DEFAULT_NOISE_REDUCTION,
        strength: 100,
      });

      expect(result1).toBeInstanceOf(ImageData);
      expect(result2).toBeInstanceOf(ImageData);
    });

    it('should handle extreme amount values for sharpen', () => {
      const imageData = createTestImageData(20, 20);

      const result1 = applySharpen(imageData, { ...DEFAULT_SHARPEN, amount: 0 });
      const result2 = applySharpen(imageData, { ...DEFAULT_SHARPEN, amount: 200 });

      expect(result1).toBeInstanceOf(ImageData);
      expect(result2).toBeInstanceOf(ImageData);
    });
  });
});
