/**
 * Tests for Image Processing Web Worker
 */

import type {
  WorkerMessage,
  WorkerPayload,
  LevelsOptions,
  CurvesOptions,
  HSLOptions,
} from './worker-types';

// Polyfill ImageData for Node.js/Jest environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace = 'srgb';

  constructor(
    dataOrWidth: Uint8ClampedArray | number,
    widthOrHeight: number,
    height?: number
  ) {
    if (typeof dataOrWidth === 'number') {
      // Constructor: new ImageData(width, height)
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      // Constructor: new ImageData(data, width, height?)
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? (dataOrWidth.length / 4 / widthOrHeight);
    }
  }
}

// Install ImageData globally before any imports
Object.defineProperty(global, 'ImageData', {
  value: MockImageData,
  writable: true,
});

// Mock worker context
const mockPostMessage = jest.fn();
const mockSelf = {
  postMessage: mockPostMessage,
  onmessage: null as ((e: MessageEvent) => void) | null,
};

// Store original self
const originalSelf = global.self;

// Mock performance.now for duration tests
const mockPerformanceNow = jest.spyOn(performance, 'now');

beforeAll(() => {
  // Mock self as Worker
  Object.defineProperty(global, 'self', {
    value: mockSelf,
    writable: true,
  });
});

afterAll(() => {
  // Restore original self
  Object.defineProperty(global, 'self', {
    value: originalSelf,
    writable: true,
  });
  mockPerformanceNow.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPerformanceNow.mockReturnValue(0);
});

// Helper to create test ImageData
function createTestImageData(width: number, height: number, fill?: number[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0] ?? 0;     // R
      data[i + 1] = fill[1] ?? 0; // G
      data[i + 2] = fill[2] ?? 0; // B
      data[i + 3] = fill[3] ?? 255; // A
    }
  }
  return new ImageData(data, width, height);
}

// Helper to trigger worker message
function sendWorkerMessage(message: WorkerMessage): void {
  if (mockSelf.onmessage) {
    mockSelf.onmessage({ data: message } as MessageEvent);
  }
}

// Import worker to register onmessage handler
// Note: This must be done after mocking self
describe('image-worker', () => {
  beforeAll(async () => {
    // Dynamic import to ensure mocks are in place
    await import('./image-worker');
  });

  describe('clamp helper (tested via adjustments)', () => {
    it('should clamp brightness values within 0-255', () => {
      const imageData = createTestImageData(2, 2, [250, 250, 250, 255]);

      sendWorkerMessage({
        id: 'test-clamp',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 100, // Should push values to 255 max
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      expect(mockPostMessage).toHaveBeenCalled();
      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // All RGB values should be clamped to 255
      expect(resultData.data[0]).toBe(255);
      expect(resultData.data[1]).toBe(255);
      expect(resultData.data[2]).toBe(255);
    });

    it('should clamp brightness values to minimum 0', () => {
      const imageData = createTestImageData(2, 2, [10, 10, 10, 255]);

      sendWorkerMessage({
        id: 'test-clamp-min',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: -100, // Should push values to 0 min
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBe(0);
      expect(resultData.data[1]).toBe(0);
      expect(resultData.data[2]).toBe(0);
    });
  });

  describe('applyBrightness', () => {
    it('should increase brightness correctly', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-brightness-up',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 20,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // brightness 20 => adjustment = 20 * 2.55 = 51
      expect(resultData.data[0]).toBe(151);
    });

    it('should decrease brightness correctly', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-brightness-down',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: -20,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      const resultData = response.data as ImageData;
      // brightness -20 => adjustment = -20 * 2.55 = -51
      expect(resultData.data[0]).toBe(49);
    });
  });

  describe('applyContrast', () => {
    it('should increase contrast correctly', () => {
      const imageData = createTestImageData(2, 2, [100, 150, 200, 255]);

      sendWorkerMessage({
        id: 'test-contrast',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 0,
            contrast: 50,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      // Values should be pushed away from 128
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBeLessThan(100); // Was below 128, pushed lower
      expect(resultData.data[2]).toBeGreaterThan(200); // Was above 128, pushed higher
    });

    it('should handle zero contrast', () => {
      const imageData = createTestImageData(2, 2, [100, 150, 200, 255]);

      sendWorkerMessage({
        id: 'test-zero-contrast',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      const resultData = response.data as ImageData;
      // With contrast=0, factor ≈ 1, so values should be approximately unchanged
      expect(resultData.data[0]).toBeCloseTo(100, 0);
    });
  });

  describe('applySaturation', () => {
    it('should desaturate image correctly', () => {
      const imageData = createTestImageData(2, 2, [255, 0, 0, 255]); // Pure red

      sendWorkerMessage({
        id: 'test-desaturate',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: -100, // Full desaturation
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      const resultData = response.data as ImageData;
      // Should be grayscale - all channels approximately equal
      const r = resultData.data[0];
      const g = resultData.data[1];
      const b = resultData.data[2];
      expect(Math.abs(r - g)).toBeLessThan(2);
      expect(Math.abs(g - b)).toBeLessThan(2);
    });

    it('should increase saturation correctly', () => {
      const imageData = createTestImageData(2, 2, [200, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-saturate',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: 50,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      const resultData = response.data as ImageData;
      // Red channel should increase more relative to gray point
      expect(resultData.data[0]).toBeGreaterThan(200);
    });
  });

  describe('applyHue', () => {
    it('should rotate hue by 180 degrees', () => {
      const imageData = createTestImageData(2, 2, [255, 0, 0, 255]); // Pure red

      sendWorkerMessage({
        id: 'test-hue-180',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 180,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // After 180 degree rotation, red should become more cyan-ish
      expect(resultData.data[0]).toBeLessThan(resultData.data[1]); // Less red than green
    });

    it('should not change hue with 0 rotation', () => {
      const imageData = createTestImageData(2, 2, [100, 150, 200, 255]);

      sendWorkerMessage({
        id: 'test-hue-0',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBeCloseTo(100, 0);
      expect(resultData.data[1]).toBeCloseTo(150, 0);
      expect(resultData.data[2]).toBeCloseTo(200, 0);
    });
  });

  describe('processFilter', () => {
    it('should apply grayscale filter', () => {
      const imageData = createTestImageData(2, 2, [255, 0, 0, 255]);

      sendWorkerMessage({
        id: 'test-grayscale',
        type: 'filter',
        payload: {
          imageData,
          filter: { id: 'grayscale', name: 'Grayscale' },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // All channels should be equal (grayscale)
      expect(resultData.data[0]).toBe(resultData.data[1]);
      expect(resultData.data[1]).toBe(resultData.data[2]);
    });

    it('should apply sepia filter', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-sepia',
        type: 'filter',
        payload: {
          imageData,
          filter: { id: 'sepia', name: 'Sepia' },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Sepia should have warm tones (R > G > B)
      expect(resultData.data[0]).toBeGreaterThanOrEqual(resultData.data[1]);
      expect(resultData.data[1]).toBeGreaterThanOrEqual(resultData.data[2]);
    });

    it('should apply invert filter', () => {
      const imageData = createTestImageData(2, 2, [100, 150, 200, 255]);

      sendWorkerMessage({
        id: 'test-invert',
        type: 'filter',
        payload: {
          imageData,
          filter: { id: 'invert', name: 'Invert' },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBe(155); // 255 - 100
      expect(resultData.data[1]).toBe(105); // 255 - 150
      expect(resultData.data[2]).toBe(55);  // 255 - 200
    });

    it('should throw error for unknown filter', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-unknown-filter',
        type: 'filter',
        payload: {
          imageData,
          filter: { id: 'unknown', name: 'Unknown' },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
      expect(response.error).toContain('Unknown filter');
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-filter',
        type: 'filter',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
      expect(response.error).toContain('Missing required parameters');
    });
  });

  describe('processTransform', () => {
    it('should rotate image 90 degrees', () => {
      // 2x3 image
      const imageData = createTestImageData(2, 3, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-rotate-90',
        type: 'transform',
        payload: {
          imageData,
          transform: { rotate: 90 },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // After 90 degree rotation, dimensions should swap
      expect(resultData.width).toBe(3);
      expect(resultData.height).toBe(2);
    });

    it('should rotate image 180 degrees', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-rotate-180',
        type: 'transform',
        payload: {
          imageData,
          transform: { rotate: 180 },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Dimensions should remain the same
      expect(resultData.width).toBe(2);
      expect(resultData.height).toBe(2);
    });

    it('should rotate image 270 degrees', () => {
      const imageData = createTestImageData(2, 3, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-rotate-270',
        type: 'transform',
        payload: {
          imageData,
          transform: { rotate: 270 },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      expect(resultData.width).toBe(3);
      expect(resultData.height).toBe(2);
    });

    it('should flip image horizontally', () => {
      // Create image with different colors for left and right
      const imageData = new ImageData(2, 1);
      imageData.data.set([255, 0, 0, 255, 0, 255, 0, 255]); // Red, Green

      sendWorkerMessage({
        id: 'test-flip-h',
        type: 'transform',
        payload: {
          imageData,
          transform: { flipHorizontal: true },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Colors should be swapped
      expect(resultData.data[0]).toBe(0);   // Green first now
      expect(resultData.data[1]).toBe(255);
      expect(resultData.data[4]).toBe(255); // Red second now
      expect(resultData.data[5]).toBe(0);
    });

    it('should flip image vertically', () => {
      // Create image with different colors for top and bottom
      const imageData = new ImageData(1, 2);
      imageData.data.set([255, 0, 0, 255, 0, 0, 255, 255]); // Red, Blue

      sendWorkerMessage({
        id: 'test-flip-v',
        type: 'transform',
        payload: {
          imageData,
          transform: { flipVertical: true },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Colors should be swapped vertically
      expect(resultData.data[0]).toBe(0);   // Blue first now
      expect(resultData.data[2]).toBe(255);
      expect(resultData.data[4]).toBe(255); // Red second now
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-transform',
        type: 'transform',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processLevels', () => {
    it('should apply levels adjustment', () => {
      const imageData = createTestImageData(2, 2, [100, 128, 200, 255]);
      const levels: LevelsOptions = {
        inputBlack: 0,
        inputWhite: 255,
        inputGamma: 1.0,
        outputBlack: 0,
        outputWhite: 255,
        channel: 'rgb',
      };

      sendWorkerMessage({
        id: 'test-levels',
        type: 'levels',
        payload: { imageData, levels },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      // With default values, output should be similar to input
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBeCloseTo(100, 0);
    });

    it('should apply levels with gamma correction', () => {
      const imageData = createTestImageData(2, 2, [128, 128, 128, 255]);
      const levels: LevelsOptions = {
        inputBlack: 0,
        inputWhite: 255,
        inputGamma: 2.0, // Brighten midtones
        outputBlack: 0,
        outputWhite: 255,
        channel: 'rgb',
      };

      sendWorkerMessage({
        id: 'test-levels-gamma',
        type: 'levels',
        payload: { imageData, levels },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Gamma > 1 should brighten midtones
      expect(resultData.data[0]).toBeGreaterThan(128);
    });

    it('should apply levels to single channel', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);
      const levels: LevelsOptions = {
        inputBlack: 0,
        inputWhite: 255,
        inputGamma: 1.0,
        outputBlack: 0,
        outputWhite: 200, // Reduce output range
        channel: 'r', // Only red channel
      };

      sendWorkerMessage({
        id: 'test-levels-channel',
        type: 'levels',
        payload: { imageData, levels },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Red channel should be reduced, green and blue unchanged
      expect(resultData.data[0]).toBeLessThan(100);
      expect(resultData.data[1]).toBe(100);
      expect(resultData.data[2]).toBe(100);
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-levels',
        type: 'levels',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processCurves', () => {
    it('should apply linear curve (identity)', () => {
      const imageData = createTestImageData(2, 2, [100, 150, 200, 255]);
      const curves: CurvesOptions = {
        rgb: [
          { x: 0, y: 0 },
          { x: 255, y: 255 },
        ],
      };

      sendWorkerMessage({
        id: 'test-curves-linear',
        type: 'curves',
        payload: { imageData, curves },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Identity curve should not change values
      expect(resultData.data[0]).toBe(100);
      expect(resultData.data[1]).toBe(150);
      expect(resultData.data[2]).toBe(200);
    });

    it('should apply S-curve for contrast', () => {
      const imageData = createTestImageData(2, 2, [64, 128, 192, 255]);
      const curves: CurvesOptions = {
        rgb: [
          { x: 0, y: 0 },
          { x: 64, y: 32 },   // Darken shadows
          { x: 192, y: 224 }, // Brighten highlights
          { x: 255, y: 255 },
        ],
      };

      sendWorkerMessage({
        id: 'test-curves-s',
        type: 'curves',
        payload: { imageData, curves },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBeLessThan(64);   // Shadows darkened
      expect(resultData.data[2]).toBeGreaterThan(192); // Highlights brightened
    });

    it('should apply individual channel curves', () => {
      const imageData = createTestImageData(2, 2, [128, 128, 128, 255]);
      const curves: CurvesOptions = {
        rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        red: [{ x: 0, y: 0 }, { x: 255, y: 200 }], // Reduce red
      };

      sendWorkerMessage({
        id: 'test-curves-channel',
        type: 'curves',
        payload: { imageData, curves },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBeLessThan(128); // Red reduced
      expect(resultData.data[1]).toBe(128); // Green unchanged
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-curves',
        type: 'curves',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processHSL', () => {
    it('should adjust hue in HSL mode', () => {
      const imageData = createTestImageData(2, 2, [255, 0, 0, 255]); // Red
      const hsl: HSLOptions = {
        hue: 120, // Shift towards green
        saturation: 0,
        lightness: 0,
      };

      sendWorkerMessage({
        id: 'test-hsl-hue',
        type: 'hsl',
        payload: { imageData, hsl },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // After 120 degree shift, should be more green
      expect(resultData.data[1]).toBeGreaterThan(resultData.data[0]);
    });

    it('should adjust saturation in HSL mode', () => {
      const imageData = createTestImageData(2, 2, [200, 100, 100, 255]);
      const hsl: HSLOptions = {
        hue: 0,
        saturation: -50, // Reduce saturation
        lightness: 0,
      };

      sendWorkerMessage({
        id: 'test-hsl-sat',
        type: 'hsl',
        payload: { imageData, hsl },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      // Channels should be closer together (less saturated)
    });

    it('should adjust lightness in HSL mode', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);
      const hsl: HSLOptions = {
        hue: 0,
        saturation: 0,
        lightness: 20, // Increase lightness
      };

      sendWorkerMessage({
        id: 'test-hsl-light',
        type: 'hsl',
        payload: { imageData, hsl },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // All values should increase
      expect(resultData.data[0]).toBeGreaterThan(100);
    });

    it('should target specific hue range', () => {
      const imageData = createTestImageData(2, 2, [255, 0, 0, 255]); // Red (hue ~0)
      const hsl: HSLOptions = {
        hue: 30,
        saturation: 0,
        lightness: 0,
        targetHue: 0, // Target red
        hueRange: 30,
      };

      sendWorkerMessage({
        id: 'test-hsl-target',
        type: 'hsl',
        payload: { imageData, hsl },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-hsl',
        type: 'hsl',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processNoiseReduction', () => {
    it('should apply median filter', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-median',
        type: 'noise-reduction',
        payload: {
          imageData,
          noiseReduction: {
            strength: 20,
            method: 'median',
            preserveDetail: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should apply bilateral filter', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-bilateral',
        type: 'noise-reduction',
        payload: {
          imageData,
          noiseReduction: {
            strength: 20,
            method: 'bilateral',
            preserveDetail: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should apply gaussian filter', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-gaussian-nr',
        type: 'noise-reduction',
        payload: {
          imageData,
          noiseReduction: {
            strength: 20,
            method: 'gaussian',
            preserveDetail: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should preserve detail when specified', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-preserve-detail',
        type: 'noise-reduction',
        payload: {
          imageData,
          noiseReduction: {
            strength: 20,
            method: 'gaussian',
            preserveDetail: 50, // Blend 50% with original
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-nr',
        type: 'noise-reduction',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processSharpen', () => {
    it('should apply unsharp mask', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-sharpen',
        type: 'sharpen',
        payload: {
          imageData,
          sharpen: {
            amount: 100,
            radius: 1,
            threshold: 0,
            method: 'unsharp-mask',
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should respect threshold', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-sharpen-threshold',
        type: 'sharpen',
        payload: {
          imageData,
          sharpen: {
            amount: 100,
            radius: 1,
            threshold: 10, // Only sharpen edges with >10 difference
            method: 'unsharp-mask',
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-sharpen',
        type: 'sharpen',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processBlur', () => {
    it('should apply gaussian blur', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-blur',
        type: 'blur',
        payload: {
          imageData,
          blur: {
            radius: 2,
            method: 'gaussian',
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
    });

    it('should handle zero radius', () => {
      const imageData = createTestImageData(5, 5, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-blur-zero',
        type: 'blur',
        payload: {
          imageData,
          blur: {
            radius: 0,
            method: 'gaussian',
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Zero radius should return original data
      expect(resultData.data[0]).toBe(100);
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-blur',
        type: 'blur',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processHistogram', () => {
    it('should calculate histogram', () => {
      const imageData = createTestImageData(2, 2, [100, 150, 200, 255]);

      sendWorkerMessage({
        id: 'test-histogram',
        type: 'histogram',
        payload: { imageData },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const histogram = response.data;
      expect(histogram.red).toHaveLength(256);
      expect(histogram.green).toHaveLength(256);
      expect(histogram.blue).toHaveLength(256);
      expect(histogram.luminance).toHaveLength(256);
      // All 4 pixels have same color
      expect(histogram.red[100]).toBe(4);
      expect(histogram.green[150]).toBe(4);
      expect(histogram.blue[200]).toBe(4);
    });

    it('should throw error when missing imageData', () => {
      sendWorkerMessage({
        id: 'test-missing-histogram',
        type: 'histogram',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('processAdjustment', () => {
    it('should apply multiple adjustments', () => {
      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-multi-adjust',
        type: 'adjust',
        payload: {
          imageData,
          adjustments: {
            brightness: 10,
            contrast: 10,
            saturation: 10,
            hue: 10,
            blur: 0,
            sharpen: 0,
          },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      expect(response.duration).toBeDefined();
    });

    it('should throw error when missing parameters', () => {
      sendWorkerMessage({
        id: 'test-missing-adjust',
        type: 'adjust',
        payload: {},
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
    });
  });

  describe('error handling', () => {
    it('should handle unknown message type', () => {
      sendWorkerMessage({
        id: 'test-unknown',
        type: 'unknown' as WorkerPayload['imageData'] extends ImageData ? 'adjust' : never,
        payload: {},
      } as unknown as WorkerMessage);

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('error');
      expect(response.error).toContain('Unknown worker message type');
    });
  });

  describe('interpolateCurve (tested via curves)', () => {
    it('should handle single point curve', () => {
      const imageData = createTestImageData(2, 2, [128, 128, 128, 255]);
      const curves: CurvesOptions = {
        rgb: [{ x: 128, y: 128 }], // Only one point
      };

      sendWorkerMessage({
        id: 'test-single-point',
        type: 'curves',
        payload: { imageData, curves },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      // With single point, should default to identity
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBe(128);
    });

    it('should handle empty points array', () => {
      const imageData = createTestImageData(2, 2, [128, 128, 128, 255]);
      const curves: CurvesOptions = {
        rgb: [], // No points
      };

      sendWorkerMessage({
        id: 'test-no-points',
        type: 'curves',
        payload: { imageData, curves },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBe(128);
    });
  });

  describe('rgbToHsl and hslToRgb (tested via HSL)', () => {
    it('should convert pure red correctly', () => {
      const imageData = createTestImageData(1, 1, [255, 0, 0, 255]);
      const hsl: HSLOptions = {
        hue: 0,
        saturation: 0,
        lightness: 0,
      };

      sendWorkerMessage({
        id: 'test-rgb-hsl-red',
        type: 'hsl',
        payload: { imageData, hsl },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      expect(resultData.data[0]).toBe(255);
      expect(resultData.data[1]).toBe(0);
      expect(resultData.data[2]).toBe(0);
    });

    it('should convert grayscale correctly', () => {
      const imageData = createTestImageData(1, 1, [128, 128, 128, 255]);
      const hsl: HSLOptions = {
        hue: 0,
        saturation: 0,
        lightness: 0,
      };

      sendWorkerMessage({
        id: 'test-rgb-hsl-gray',
        type: 'hsl',
        payload: { imageData, hsl },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // Grayscale should remain grayscale
      expect(resultData.data[0]).toBe(resultData.data[1]);
      expect(resultData.data[1]).toBe(resultData.data[2]);
    });
  });

  describe('gaussian kernel (tested via blur)', () => {
    it('should create kernel and apply blur', () => {
      const imageData = createTestImageData(10, 10, [100, 100, 100, 255]);
      // Add some variation
      imageData.data[0] = 200;

      sendWorkerMessage({
        id: 'test-kernel',
        type: 'blur',
        payload: {
          imageData,
          blur: { radius: 2, method: 'gaussian' },
        },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.type).toBe('success');
      const resultData = response.data as ImageData;
      // First pixel should be blurred (less than 200)
      expect(resultData.data[0]).toBeLessThan(200);
    });
  });

  describe('duration tracking', () => {
    it('should include duration in response', () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(50);

      const imageData = createTestImageData(2, 2, [100, 100, 100, 255]);

      sendWorkerMessage({
        id: 'test-duration',
        type: 'histogram',
        payload: { imageData },
      });

      const response = mockPostMessage.mock.calls[0][0];
      expect(response.duration).toBe(50);
    });
  });
});
