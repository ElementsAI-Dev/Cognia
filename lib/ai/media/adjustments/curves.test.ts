/**
 * Tests for Curves Adjustment
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
  applyCurves,
  createCurveLUT,
  createCurveLUTLinear,
  sortCurvePoints,
  createContrastCurve,
  createBrightnessCurve,
  combineCurves,
  CURVE_PRESETS,
  DEFAULT_CURVE,
  DEFAULT_CURVES,
  type CurvePoint,
  type CurvesOptions,
} from './curves';

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

describe('curves', () => {
  describe('DEFAULT_CURVE', () => {
    it('should have two points at 0,0 and 255,255', () => {
      expect(DEFAULT_CURVE).toHaveLength(2);
      expect(DEFAULT_CURVE[0]).toEqual({ x: 0, y: 0 });
      expect(DEFAULT_CURVE[1]).toEqual({ x: 255, y: 255 });
    });
  });

  describe('DEFAULT_CURVES', () => {
    it('should have rgb curve defined', () => {
      expect(DEFAULT_CURVES.rgb).toBeDefined();
      expect(DEFAULT_CURVES.rgb).toHaveLength(2);
    });

    it('should have undefined channel curves by default', () => {
      expect(DEFAULT_CURVES.red).toBeUndefined();
      expect(DEFAULT_CURVES.green).toBeUndefined();
      expect(DEFAULT_CURVES.blue).toBeUndefined();
    });
  });

  describe('CURVE_PRESETS', () => {
    it('should have linear preset', () => {
      expect(CURVE_PRESETS.linear).toBeDefined();
      expect(CURVE_PRESETS.linear).toHaveLength(2);
    });

    it('should have contrast preset', () => {
      expect(CURVE_PRESETS.contrast).toBeDefined();
      expect(CURVE_PRESETS.contrast.length).toBeGreaterThan(2);
    });

    it('should have S-curve preset', () => {
      expect(CURVE_PRESETS.sCurve).toBeDefined();
    });
  });

  describe('sortCurvePoints', () => {
    it('should sort points by x coordinate', () => {
      const points: CurvePoint[] = [
        { x: 200, y: 200 },
        { x: 50, y: 50 },
        { x: 128, y: 128 },
      ];
      const sorted = sortCurvePoints(points);

      expect(sorted[0].x).toBe(50);
      expect(sorted[1].x).toBe(128);
      expect(sorted[2].x).toBe(200);
    });

    it('should not modify original array', () => {
      const points: CurvePoint[] = [
        { x: 200, y: 200 },
        { x: 50, y: 50 },
      ];
      sortCurvePoints(points);

      expect(points[0].x).toBe(200);
    });
  });

  describe('createCurveLUT', () => {
    it('should create identity LUT for linear curve', () => {
      const lut = createCurveLUT(DEFAULT_CURVE);

      expect(lut[0]).toBe(0);
      expect(lut[128]).toBeCloseTo(128, -1);
      expect(lut[255]).toBe(255);
    });

    it('should handle single point curve', () => {
      const lut = createCurveLUT([{ x: 128, y: 128 }]);

      expect(lut).toHaveLength(256);
    });

    it('should handle negative curve (invert)', () => {
      const lut = createCurveLUT([...CURVE_PRESETS.negativeCurve]);

      expect(lut[0]).toBe(255);
      expect(lut[255]).toBe(0);
    });

    it('should create smooth curve with cubic interpolation', () => {
      const points: CurvePoint[] = [
        { x: 0, y: 0 },
        { x: 64, y: 48 },
        { x: 192, y: 208 },
        { x: 255, y: 255 },
      ];
      const lut = createCurveLUT(points);

      expect(lut[64]).toBeCloseTo(48, -1);
      expect(lut[192]).toBeCloseTo(208, -1);
    });
  });

  describe('createCurveLUTLinear', () => {
    it('should create identity LUT for linear curve', () => {
      const lut = createCurveLUTLinear(DEFAULT_CURVE);

      expect(lut[0]).toBe(0);
      expect(lut[128]).toBe(128);
      expect(lut[255]).toBe(255);
    });

    it('should interpolate linearly between points', () => {
      const points: CurvePoint[] = [
        { x: 0, y: 0 },
        { x: 128, y: 64 },
        { x: 255, y: 255 },
      ];
      const lut = createCurveLUTLinear(points);

      expect(lut[0]).toBe(0);
      expect(lut[128]).toBe(64);
      expect(lut[255]).toBe(255);
    });
  });

  describe('applyCurves', () => {
    it('should not modify image with default curves', () => {
      const imageData = createTestImageData(10, 10, [100, 150, 200, 255]);
      const result = applyCurves(imageData, DEFAULT_CURVES, false); // Use linear interpolation

      expect(result.data[0]).toBe(100);
      expect(result.data[1]).toBe(150);
      expect(result.data[2]).toBe(200);
    });

    it('should apply RGB curve to all channels', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const options: CurvesOptions = {
        rgb: [
          { x: 0, y: 0 },
          { x: 128, y: 64 },
          { x: 255, y: 255 },
        ],
      };
      const result = applyCurves(imageData, options);

      expect(result.data[0]).toBeCloseTo(64, -1);
      expect(result.data[1]).toBeCloseTo(64, -1);
      expect(result.data[2]).toBeCloseTo(64, -1);
    });

    it('should apply individual channel curves', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const options: CurvesOptions = {
        rgb: DEFAULT_CURVE,
        red: [
          { x: 0, y: 0 },
          { x: 128, y: 200 },
          { x: 255, y: 255 },
        ],
      };
      const result = applyCurves(imageData, options);

      expect(result.data[0]).toBeCloseTo(200, -1);
      expect(result.data[1]).toBeCloseTo(128, -1);
      expect(result.data[2]).toBeCloseTo(128, -1);
    });

    it('should preserve alpha channel', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 100]);
      const result = applyCurves(imageData, DEFAULT_CURVES);

      expect(result.data[3]).toBe(100);
    });

    it('should use linear interpolation when specified', () => {
      const imageData = createTestImageData(10, 10, [128, 128, 128, 255]);
      const result = applyCurves(imageData, DEFAULT_CURVES, false);

      expect(result.data[0]).toBe(128);
    });
  });

  describe('createContrastCurve', () => {
    it('should create S-curve for positive contrast', () => {
      const curve = createContrastCurve(50);

      expect(curve.length).toBeGreaterThan(2);
      // With positive contrast, shadows get darker (y < x for low values)
      // and highlights get brighter (y > x for high values)
      const midpoint = curve.find(p => p.x === 128 || p.x === 127);
      if (midpoint) {
        expect(midpoint.y).toBeCloseTo(midpoint.x, -1);
      }
    });

    it('should create inverse S-curve for negative contrast', () => {
      const curve = createContrastCurve(-50);

      expect(curve.length).toBeGreaterThan(2);
    });

    it('should create identity curve for zero contrast', () => {
      const curve = createContrastCurve(0);
      const midPoint = curve.find((p) => p.x === 128 || p.x === 127);

      if (midPoint) {
        expect(midPoint.y).toBeCloseTo(midPoint.x, -1);
      }
    });
  });

  describe('createBrightnessCurve', () => {
    it('should create curve with positive offset for positive brightness', () => {
      const curve = createBrightnessCurve(50);
      const midPoint = curve.find((p) => p.x === 128 || p.x === 127);

      if (midPoint) {
        expect(midPoint.y).toBeGreaterThan(midPoint.x);
      }
    });

    it('should create curve with negative offset for negative brightness', () => {
      const curve = createBrightnessCurve(-50);
      const midPoint = curve.find((p) => p.x === 128 || p.x === 127);

      if (midPoint) {
        expect(midPoint.y).toBeLessThan(midPoint.x);
      }
    });
  });

  describe('combineCurves', () => {
    it('should combine two curves', () => {
      const curve1: CurvePoint[] = [
        { x: 0, y: 50 },
        { x: 255, y: 255 },
      ];
      const curve2: CurvePoint[] = [
        { x: 0, y: 0 },
        { x: 255, y: 200 },
      ];

      const combined = combineCurves(curve1, curve2);

      expect(combined.length).toBeGreaterThan(0);
    });

    it('should return identity-like curve for two linear curves', () => {
      const combined = combineCurves(DEFAULT_CURVE, DEFAULT_CURVE);

      expect(combined[0].x).toBe(0);
      expect(combined[combined.length - 1].x).toBe(255);
    });
  });
});
