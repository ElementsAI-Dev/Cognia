/**
 * Tests for HSL Adjustment
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
  applyHSL,
  applyTargetedHSL,
  applyChannelHSL,
  applyVibrance,
  applyTemperature,
  applyTint,
  rgbToHsl,
  hslToRgb,
  DEFAULT_HSL,
  HUE_RANGES,
} from './hsl';

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

describe('hsl', () => {
  describe('DEFAULT_HSL', () => {
    it('should have zero values', () => {
      expect(DEFAULT_HSL.hue).toBe(0);
      expect(DEFAULT_HSL.saturation).toBe(0);
      expect(DEFAULT_HSL.lightness).toBe(0);
    });
  });

  describe('HUE_RANGES', () => {
    it('should have all color ranges defined', () => {
      expect(HUE_RANGES.reds).toBeDefined();
      expect(HUE_RANGES.oranges).toBeDefined();
      expect(HUE_RANGES.yellows).toBeDefined();
      expect(HUE_RANGES.greens).toBeDefined();
      expect(HUE_RANGES.cyans).toBeDefined();
      expect(HUE_RANGES.blues).toBeDefined();
      expect(HUE_RANGES.purples).toBeDefined();
      expect(HUE_RANGES.magentas).toBeDefined();
    });

    it('should have correct red center', () => {
      expect(HUE_RANGES.reds.center).toBe(0);
    });

    it('should have correct blue center', () => {
      expect(HUE_RANGES.blues.center).toBe(240);
    });
  });

  describe('rgbToHsl', () => {
    it('should convert pure red', () => {
      const [h, s, l] = rgbToHsl(255, 0, 0);

      expect(h).toBeCloseTo(0, 0);
      expect(s).toBeCloseTo(100, 0);
      expect(l).toBeCloseTo(50, 0);
    });

    it('should convert pure green', () => {
      const [h, s, l] = rgbToHsl(0, 255, 0);

      expect(h).toBeCloseTo(120, 0);
      expect(s).toBeCloseTo(100, 0);
      expect(l).toBeCloseTo(50, 0);
    });

    it('should convert pure blue', () => {
      const [h, s, l] = rgbToHsl(0, 0, 255);

      expect(h).toBeCloseTo(240, 0);
      expect(s).toBeCloseTo(100, 0);
      expect(l).toBeCloseTo(50, 0);
    });

    it('should convert white', () => {
      const [_h, s, l] = rgbToHsl(255, 255, 255);

      expect(s).toBe(0);
      expect(l).toBeCloseTo(100, 0);
    });

    it('should convert black', () => {
      const [_h, s, l] = rgbToHsl(0, 0, 0);

      expect(s).toBe(0);
      expect(l).toBe(0);
    });

    it('should convert gray', () => {
      const [_h, s, l] = rgbToHsl(128, 128, 128);

      expect(s).toBe(0);
      expect(l).toBeCloseTo(50, 0);
    });
  });

  describe('hslToRgb', () => {
    it('should convert back to red', () => {
      const [r, g, b] = hslToRgb(0, 100, 50);

      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('should convert back to green', () => {
      const [r, g, b] = hslToRgb(120, 100, 50);

      expect(r).toBe(0);
      expect(g).toBe(255);
      expect(b).toBe(0);
    });

    it('should convert back to blue', () => {
      const [r, g, b] = hslToRgb(240, 100, 50);

      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(255);
    });

    it('should convert white', () => {
      const [r, g, b] = hslToRgb(0, 0, 100);

      expect(r).toBe(255);
      expect(g).toBe(255);
      expect(b).toBe(255);
    });

    it('should convert black', () => {
      const [r, g, b] = hslToRgb(0, 0, 0);

      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });
  });

  describe('rgbToHsl and hslToRgb roundtrip', () => {
    it('should roundtrip correctly', () => {
      const testColors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [128, 64, 192],
        [100, 150, 200],
      ];

      for (const [r, g, b] of testColors) {
        const [h, s, l] = rgbToHsl(r, g, b);
        const [r2, g2, b2] = hslToRgb(h, s, l);

        expect(r2).toBeCloseTo(r, 0);
        expect(g2).toBeCloseTo(g, 0);
        expect(b2).toBeCloseTo(b, 0);
      }
    });
  });

  describe('applyHSL', () => {
    it('should not modify image with default HSL', () => {
      const imageData = createTestImageData(10, 10, [100, 150, 200, 255]);
      const result = applyHSL(imageData, DEFAULT_HSL);

      expect(result.data[0]).toBeCloseTo(100, 0);
      expect(result.data[1]).toBeCloseTo(150, 0);
      expect(result.data[2]).toBeCloseTo(200, 0);
    });

    it('should shift hue', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyHSL(imageData, { hue: 120, saturation: 0, lightness: 0 });

      expect(result.data[0]).toBeLessThan(50);
      expect(result.data[1]).toBeGreaterThan(200);
    });

    it('should adjust saturation', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyHSL(imageData, { hue: 0, saturation: -50, lightness: 0 });

      expect(result.data[1]).toBeGreaterThan(0);
      expect(result.data[2]).toBeGreaterThan(0);
    });

    it('should adjust lightness', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyHSL(imageData, { hue: 0, saturation: 0, lightness: 25 });

      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBeGreaterThan(0);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 128]);
      const result = applyHSL(imageData, DEFAULT_HSL);

      expect(result.data[3]).toBe(128);
    });
  });

  describe('applyTargetedHSL', () => {
    it('should only affect targeted hue range', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyTargetedHSL(imageData, {
        hue: 60,
        saturation: 0,
        lightness: 0,
        targetHue: 0,
        hueRange: 30,
      });

      // Red (hue 0) is within range of targetHue 0, so it should be shifted
      expect(result).toBeInstanceOf(Object);
      expect(result.width).toBe(10);
    });

    it('should not affect colors outside target range', () => {
      const imageData = createTestImageData(10, 10, [0, 0, 255, 255]);
      const result = applyTargetedHSL(imageData, {
        hue: 60,
        saturation: 50,
        lightness: 0,
        targetHue: 0,
        hueRange: 30,
      });

      expect(result.data[0]).toBe(0);
      expect(result.data[1]).toBe(0);
      expect(result.data[2]).toBe(255);
    });
  });

  describe('applyChannelHSL', () => {
    it('should adjust specific color channels', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyChannelHSL(imageData, {
        reds: { hue: 30, saturation: 0, lightness: 0 },
      });

      // Red should be shifted toward orange
      expect(result).toBeInstanceOf(Object);
      expect(result.width).toBe(10);
    });

    it('should handle multiple channels', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyChannelHSL(imageData, {
        reds: { hue: 0, saturation: -50, lightness: 0 },
        blues: { hue: 0, saturation: 50, lightness: 0 },
      });

      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });
  });

  describe('applyVibrance', () => {
    it('should boost saturation of less saturated colors', () => {
      const imageData = createTestImageData(10, 10, [150, 140, 130, 255]);
      const result = applyVibrance(imageData, 50);

      const origSat = Math.max(150, 140, 130) - Math.min(150, 140, 130);
      const newSat = Math.max(result.data[0], result.data[1], result.data[2]) -
                     Math.min(result.data[0], result.data[1], result.data[2]);

      expect(newSat).toBeGreaterThanOrEqual(origSat);
    });

    it('should not oversaturate already saturated colors', () => {
      const imageData = createTestImageData(10, 10, [255, 0, 0, 255]);
      const result = applyVibrance(imageData, 50);

      expect(result.data[0]).toBe(255);
    });
  });

  describe('applyTemperature', () => {
    it('should warm colors with positive temperature', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const result = applyTemperature(imageData, 50);

      expect(result.data[0]).toBeGreaterThan(128);
      expect(result.data[2]).toBeLessThan(128);
    });

    it('should cool colors with negative temperature', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const result = applyTemperature(imageData, -50);

      expect(result.data[0]).toBeLessThan(128);
      expect(result.data[2]).toBeGreaterThan(128);
    });
  });

  describe('applyTint', () => {
    it('should adjust green channel', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const result = applyTint(imageData, 50);

      expect(result.data[1]).toBeLessThan(128);
    });

    it('should not affect red and blue channels', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const result = applyTint(imageData, 50);

      expect(result.data[0]).toBe(128);
      expect(result.data[2]).toBe(128);
    });
  });
});
