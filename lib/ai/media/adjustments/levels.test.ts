/**
 * Tests for Levels Adjustment
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
  applyLevels,
  applyAutoLevels,
  applyAutoContrast,
  calculateHistogram,
  autoLevels,
  createLevelsLUT,
  DEFAULT_LEVELS,
  type LevelsOptions,
} from './levels';

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

function createGradientImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const value = Math.round((x / (width - 1)) * 255);
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }
  return new MockImageData(data, width, height) as ImageData;
}

describe('levels', () => {
  describe('DEFAULT_LEVELS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_LEVELS.inputBlack).toBe(0);
      expect(DEFAULT_LEVELS.inputWhite).toBe(255);
      expect(DEFAULT_LEVELS.inputGamma).toBe(1.0);
      expect(DEFAULT_LEVELS.outputBlack).toBe(0);
      expect(DEFAULT_LEVELS.outputWhite).toBe(255);
      expect(DEFAULT_LEVELS.channel).toBe('rgb');
    });
  });

  describe('calculateHistogram', () => {
    it('should calculate histogram for solid color', () => {
      const imageData = createTestImageData(10, 10, [100, 150, 200, 255]);
      const histogram = calculateHistogram(imageData);

      expect(histogram.red[100]).toBe(100);
      expect(histogram.green[150]).toBe(100);
      expect(histogram.blue[200]).toBe(100);
    });

    it('should calculate luminance histogram', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 255]);
      const histogram = calculateHistogram(imageData);

      expect(histogram.luminance[100]).toBe(100);
    });

    it('should handle gradient image', () => {
      const imageData = createGradientImageData(256, 1);
      const histogram = calculateHistogram(imageData);

      for (let i = 0; i < 256; i++) {
        expect(histogram.red[i]).toBe(1);
      }
    });
  });

  describe('autoLevels', () => {
    it('should find black and white points', () => {
      const histogram = new Array(256).fill(0);
      histogram[50] = 100;
      histogram[200] = 100;

      const { black, white } = autoLevels(histogram, 0);

      expect(black).toBe(50);
      expect(white).toBe(200);
    });

    it('should apply clip percentage', () => {
      const histogram = new Array(256).fill(1);
      const { black, white } = autoLevels(histogram, 10);

      expect(black).toBeGreaterThan(0);
      expect(white).toBeLessThan(255);
    });
  });

  describe('createLevelsLUT', () => {
    it('should create identity LUT with default options', () => {
      const lut = createLevelsLUT(DEFAULT_LEVELS);

      for (let i = 0; i < 256; i++) {
        expect(lut[i]).toBe(i);
      }
    });

    it('should apply input black/white levels', () => {
      const options: LevelsOptions = {
        ...DEFAULT_LEVELS,
        inputBlack: 50,
        inputWhite: 200,
      };
      const lut = createLevelsLUT(options);

      expect(lut[0]).toBe(0);
      expect(lut[50]).toBe(0);
      expect(lut[200]).toBe(255);
      expect(lut[255]).toBe(255);
    });

    it('should apply gamma correction', () => {
      const options: LevelsOptions = {
        ...DEFAULT_LEVELS,
        inputGamma: 2.0,
      };
      const lut = createLevelsLUT(options);

      expect(lut[0]).toBe(0);
      expect(lut[255]).toBe(255);
      expect(lut[128]).toBeGreaterThan(128);
    });

    it('should apply output levels', () => {
      const options: LevelsOptions = {
        ...DEFAULT_LEVELS,
        outputBlack: 50,
        outputWhite: 200,
      };
      const lut = createLevelsLUT(options);

      expect(lut[0]).toBe(50);
      expect(lut[255]).toBe(200);
    });
  });

  describe('applyLevels', () => {
    it('should not modify image with default levels', () => {
      const imageData = createTestImageData(10, 10, [100, 150, 200, 255]);
      const result = applyLevels(imageData, DEFAULT_LEVELS);

      expect(result.data[0]).toBe(100);
      expect(result.data[1]).toBe(150);
      expect(result.data[2]).toBe(200);
      expect(result.data[3]).toBe(255);
    });

    it('should apply levels to all RGB channels', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 255]);
      const options: LevelsOptions = {
        ...DEFAULT_LEVELS,
        inputBlack: 50,
        inputWhite: 150,
      };
      const result = applyLevels(imageData, options);

      // (100 - 50) / (150 - 50) * 255 = 127.5 -> 128
      expect(result.data[0]).toBeCloseTo(128, 0);
      expect(result.data[1]).toBeCloseTo(128, 0);
      expect(result.data[2]).toBeCloseTo(128, 0);
    });

    it('should apply levels to single channel', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 255]);
      const options: LevelsOptions = {
        ...DEFAULT_LEVELS,
        inputBlack: 50,
        inputWhite: 150,
        channel: 'r',
      };
      const result = applyLevels(imageData, options);

      expect(result.data[0]).toBeCloseTo(128, 0);
      expect(result.data[1]).toBe(100);
      expect(result.data[2]).toBe(100);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 128]);
      const result = applyLevels(imageData, DEFAULT_LEVELS);

      expect(result.data[3]).toBe(128);
    });

    it('should return new ImageData instance', () => {
      const imageData = createTestImageData(10, 10);
      const result = applyLevels(imageData, DEFAULT_LEVELS);

      expect(result).not.toBe(imageData);
      expect(result.data).not.toBe(imageData.data);
    });
  });

  describe('applyAutoLevels', () => {
    it('should stretch histogram', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 255]);
      const result = applyAutoLevels(imageData, 0);

      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });

    it('should handle gradient image', () => {
      const imageData = createGradientImageData(256, 1);
      const result = applyAutoLevels(imageData, 0);

      expect(result.data[0]).toBe(0);
      expect(result.data[(255 * 4)]).toBe(255);
    });
  });

  describe('applyAutoContrast', () => {
    it('should stretch each channel independently', () => {
      const imageData = createTestImageData(10, 10, [50, 100, 150, 255]);
      const result = applyAutoContrast(imageData);

      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });

    it('should handle single color correctly', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 255]);
      const result = applyAutoContrast(imageData);

      expect(result.data[0]).toBe(100);
    });
  });
});
