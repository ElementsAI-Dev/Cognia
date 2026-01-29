/**
 * Tests for WebGL Processor
 * Note: These tests mock WebGL context since Jest runs in Node.js
 */

import { GLProcessor } from './gl-processor';

// Polyfill ImageData for Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace = 'srgb';

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? dataOrWidth.length / (widthOrHeight * 4);
    }
  }
}

if (typeof globalThis.ImageData === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ImageData = MockImageData;
}

const mockWebGLContext = {
  createBuffer: jest.fn(() => ({})),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createShader: jest.fn(() => ({})),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  createProgram: jest.fn(() => ({})),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  deleteShader: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(() => 0),
  getUniformLocation: jest.fn(() => ({})),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  activeTexture: jest.fn(),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  createTexture: jest.fn(() => ({})),
  createFramebuffer: jest.fn(() => ({})),
  bindFramebuffer: jest.fn(),
  framebufferTexture2D: jest.fn(),
  viewport: jest.fn(),
  uniform1i: jest.fn(),
  uniform1f: jest.fn(),
  uniform2fv: jest.fn(),
  uniform3fv: jest.fn(),
  drawArrays: jest.fn(),
  readPixels: jest.fn((x, y, w, h, format, type, pixels) => {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 128;
      pixels[i + 1] = 128;
      pixels[i + 2] = 128;
      pixels[i + 3] = 255;
    }
  }),
  deleteProgram: jest.fn(),
  deleteTexture: jest.fn(),
  deleteFramebuffer: jest.fn(),
  deleteBuffer: jest.fn(),
  ARRAY_BUFFER: 34962,
  STATIC_DRAW: 35044,
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  TEXTURE_2D: 3553,
  TEXTURE0: 33984,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  CLAMP_TO_EDGE: 33071,
  LINEAR: 9729,
  FRAMEBUFFER: 36160,
  COLOR_ATTACHMENT0: 36064,
  TRIANGLE_STRIP: 5,
  FLOAT: 5126,
};

describe('GLProcessor', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn((contextId) => {
      if (contextId === 'webgl' || contextId === 'webgl2') {
        return mockWebGLContext as unknown as WebGLRenderingContext;
      }
      return null;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create processor with default options', () => {
      const processor = new GLProcessor();
      expect(processor).toBeDefined();
    });

    it('should create processor with custom canvas', () => {
      const canvas = document.createElement('canvas');
      const processor = new GLProcessor({ canvas });
      expect(processor).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize WebGL resources', () => {
      const processor = new GLProcessor();
      const result = processor.initialize();

      expect(result).toBe(true);
      expect(mockWebGLContext.createBuffer).toHaveBeenCalled();
    });

    it('should only initialize once', () => {
      const processor = new GLProcessor();
      processor.initialize();
      processor.initialize();

      expect(mockWebGLContext.createBuffer).toHaveBeenCalledTimes(2);
    });
  });

  describe('isSupported', () => {
    it('should return true when WebGL is available', () => {
      expect(GLProcessor.isSupported()).toBe(true);
    });
  });

  describe('processBrightnessContrast', () => {
    it('should process brightness and contrast', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processBrightnessContrast(imageData, 10, 20);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });
  });

  describe('processSaturation', () => {
    it('should process saturation', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processSaturation(imageData, 50);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processHue', () => {
    it('should process hue shift', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processHue(imageData, 90);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processBlur', () => {
    it('should process blur with positive radius', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processBlur(imageData, 5);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should return original for zero radius', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processBlur(imageData, 0);

      expect(result).toBe(imageData);
    });
  });

  describe('processSharpen', () => {
    it('should process sharpening', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processSharpen(imageData, 50);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processLevels', () => {
    it('should process levels adjustment', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processLevels(imageData, {
        inputBlack: 0,
        inputWhite: 255,
        inputGamma: 1,
        outputBlack: 0,
        outputWhite: 255,
      });

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processHSL', () => {
    it('should process HSL adjustment', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processHSL(imageData, {
        hue: 30,
        saturation: 20,
        lightness: 10,
      });

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processVibrance', () => {
    it('should process vibrance', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processVibrance(imageData, 50);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processCurves', () => {
    it('should process curves with LUT', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      // Create a simple identity LUT (256x1 RGBA)
      const lut = new Uint8Array(256 * 4);
      for (let i = 0; i < 256; i++) {
        lut[i * 4] = i; // R
        lut[i * 4 + 1] = i; // G
        lut[i * 4 + 2] = i; // B
        lut[i * 4 + 3] = 255; // A
      }

      const result = processor.processCurves(imageData, lut);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });
  });

  describe('processColorBalance', () => {
    it('should process color balance', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processColorBalance(imageData, {
        shadows: [0.1, 0, -0.1],
        midtones: [0, 0.05, 0],
        highlights: [-0.05, 0, 0.1],
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should use default values when params not provided', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processColorBalance(imageData, {});

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processNoiseReduction', () => {
    it('should process noise reduction', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processNoiseReduction(imageData, 50, 0.1);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should use default preserveDetail value', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processNoiseReduction(imageData, 30);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('processAdjustments', () => {
    it('should process multiple adjustments', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processAdjustments(imageData, {
        brightness: 10,
        contrast: 20,
        saturation: 30,
      });

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should skip zero-value adjustments', () => {
      const processor = new GLProcessor();
      const imageData = new ImageData(10, 10);

      const result = processor.processAdjustments(imageData, {
        brightness: 0,
        contrast: 0,
      });

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      const processor = new GLProcessor();
      processor.initialize();
      processor.cleanup();

      expect(mockWebGLContext.deleteBuffer).toHaveBeenCalled();
    });
  });
});
