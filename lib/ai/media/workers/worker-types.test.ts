/**
 * Tests for Worker Types
 */

import type {
  WorkerMessage,
  WorkerResponse,
  WorkerMessageType,
  LevelsOptions,
  CurvesOptions,
  HSLOptions,
  NoiseReductionOptions,
  SharpenOptions,
  BlurOptions,
  HistogramData,
  CurvePoint,
} from './worker-types';

describe('worker-types', () => {
  describe('WorkerMessage', () => {
    it('should have correct structure for adjust message', () => {
      const message: WorkerMessage = {
        id: 'test-123',
        type: 'adjust',
        payload: {
          imageData: new ImageData(1, 1),
          adjustments: {
            brightness: 10,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
          },
        },
      };

      expect(message.id).toBe('test-123');
      expect(message.type).toBe('adjust');
      expect(message.payload.adjustments?.brightness).toBe(10);
    });

    it('should have correct structure for filter message', () => {
      const message: WorkerMessage = {
        id: 'test-456',
        type: 'filter',
        payload: {
          imageData: new ImageData(1, 1),
          filter: {
            id: 'grayscale',
            name: 'Grayscale',
          },
        },
      };

      expect(message.type).toBe('filter');
      expect(message.payload.filter?.id).toBe('grayscale');
    });

    it('should have correct structure for transform message', () => {
      const message: WorkerMessage = {
        id: 'test-789',
        type: 'transform',
        payload: {
          imageData: new ImageData(1, 1),
          transform: {
            rotate: 90,
            flipHorizontal: false,
            flipVertical: false,
            scale: 1,
          },
        },
      };

      expect(message.type).toBe('transform');
      expect(message.payload.transform?.rotate).toBe(90);
    });
  });

  describe('WorkerResponse', () => {
    it('should have correct structure for success response', () => {
      const response: WorkerResponse = {
        id: 'test-123',
        type: 'success',
        data: new ImageData(1, 1),
        duration: 100,
      };

      expect(response.type).toBe('success');
      expect(response.duration).toBe(100);
    });

    it('should have correct structure for error response', () => {
      const response: WorkerResponse = {
        id: 'test-456',
        type: 'error',
        error: 'Something went wrong',
      };

      expect(response.type).toBe('error');
      expect(response.error).toBe('Something went wrong');
    });

    it('should have correct structure for progress response', () => {
      const response: WorkerResponse = {
        id: 'test-789',
        type: 'progress',
        progress: 0.5,
      };

      expect(response.type).toBe('progress');
      expect(response.progress).toBe(0.5);
    });
  });

  describe('WorkerMessageType', () => {
    it('should include all expected types', () => {
      const types: WorkerMessageType[] = [
        'load',
        'adjust',
        'filter',
        'transform',
        'export',
        'levels',
        'curves',
        'hsl',
        'noise-reduction',
        'sharpen',
        'blur',
        'histogram',
      ];

      expect(types).toHaveLength(12);
    });
  });

  describe('LevelsOptions', () => {
    it('should have correct structure', () => {
      const options: LevelsOptions = {
        inputBlack: 0,
        inputWhite: 255,
        inputGamma: 1.0,
        outputBlack: 0,
        outputWhite: 255,
        channel: 'rgb',
      };

      expect(options.inputBlack).toBe(0);
      expect(options.inputWhite).toBe(255);
      expect(options.channel).toBe('rgb');
    });
  });

  describe('CurvesOptions', () => {
    it('should have correct structure', () => {
      const options: CurvesOptions = {
        rgb: [
          { x: 0, y: 0 },
          { x: 255, y: 255 },
        ],
      };

      expect(options.rgb).toHaveLength(2);
    });

    it('should support individual channel curves', () => {
      const options: CurvesOptions = {
        rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        red: [{ x: 0, y: 0 }, { x: 255, y: 200 }],
      };

      expect(options.red).toHaveLength(2);
    });
  });

  describe('HSLOptions', () => {
    it('should have correct structure', () => {
      const options: HSLOptions = {
        hue: 0,
        saturation: 0,
        lightness: 0,
      };

      expect(options.hue).toBe(0);
      expect(options.saturation).toBe(0);
      expect(options.lightness).toBe(0);
    });
  });

  describe('NoiseReductionOptions', () => {
    it('should have correct structure', () => {
      const options: NoiseReductionOptions = {
        strength: 50,
        preserveDetail: 50,
        method: 'median',
      };

      expect(options.strength).toBe(50);
      expect(options.method).toBe('median');
    });
  });

  describe('SharpenOptions', () => {
    it('should have correct structure', () => {
      const options: SharpenOptions = {
        amount: 50,
        radius: 1,
        threshold: 0,
        method: 'unsharp-mask',
      };

      expect(options.amount).toBe(50);
      expect(options.radius).toBe(1);
    });
  });

  describe('BlurOptions', () => {
    it('should have correct structure', () => {
      const options: BlurOptions = {
        radius: 5,
        method: 'gaussian',
      };

      expect(options.radius).toBe(5);
      expect(options.method).toBe('gaussian');
    });
  });

  describe('HistogramData', () => {
    it('should have correct structure', () => {
      const histogram: HistogramData = {
        red: new Array(256).fill(0),
        green: new Array(256).fill(0),
        blue: new Array(256).fill(0),
        luminance: new Array(256).fill(0),
      };

      expect(histogram.red).toHaveLength(256);
      expect(histogram.green).toHaveLength(256);
      expect(histogram.blue).toHaveLength(256);
      expect(histogram.luminance).toHaveLength(256);
    });
  });

  describe('CurvePoint', () => {
    it('should have x and y coordinates', () => {
      const point: CurvePoint = { x: 128, y: 128 };

      expect(point.x).toBe(128);
      expect(point.y).toBe(128);
    });
  });
});
