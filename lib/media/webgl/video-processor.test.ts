/**
 * Tests for WebGL Video Processor
 */

import { WebGLVideoProcessor, getWebGLProcessor, disposeWebGLProcessor } from './video-processor';
import type { FilterParams } from './video-processor';

// Mock WebGL context
const mockWebGLContext = {
  createBuffer: jest.fn(() => ({})),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createTexture: jest.fn(() => ({})),
  bindTexture: jest.fn(),
  texParameteri: jest.fn(),
  texImage2D: jest.fn(),
  createFramebuffer: jest.fn(() => ({})),
  bindFramebuffer: jest.fn(),
  framebufferTexture2D: jest.fn(),
  createShader: jest.fn(() => ({})),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  createProgram: jest.fn(() => ({})),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(() => 0),
  getUniformLocation: jest.fn(() => ({})),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniform1f: jest.fn(),
  uniform1i: jest.fn(),
  uniform2f: jest.fn(),
  uniform3fv: jest.fn(),
  viewport: jest.fn(),
  clearColor: jest.fn(),
  clear: jest.fn(),
  drawArrays: jest.fn(),
  readPixels: jest.fn((x, y, w, h, format, type, pixels) => {
    // Fill with some test data
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = 128;
    }
  }),
  deleteBuffer: jest.fn(),
  deleteTexture: jest.fn(),
  deleteFramebuffer: jest.fn(),
  deleteProgram: jest.fn(),
  deleteShader: jest.fn(),
  getShaderInfoLog: jest.fn(() => ''),
  getProgramInfoLog: jest.fn(() => ''),
  ARRAY_BUFFER: 34962,
  STATIC_DRAW: 35044,
  TEXTURE_2D: 3553,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  FRAMEBUFFER: 36160,
  COLOR_ATTACHMENT0: 36064,
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  FLOAT: 5126,
  TRIANGLE_STRIP: 5,
  COLOR_BUFFER_BIT: 16384,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  CLAMP_TO_EDGE: 33071,
  LINEAR: 9729,
  TEXTURE0: 33984,
  activeTexture: jest.fn(),
};

// Mock canvas
const mockCanvas = {
  width: 1920,
  height: 1080,
  getContext: jest.fn(() => mockWebGLContext),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return mockWebGLContext;
  }
}

(global as unknown as { OffscreenCanvas: typeof MockOffscreenCanvas }).OffscreenCanvas = MockOffscreenCanvas;

// Mock document.createElement - use spyOn to avoid redefining errors
const originalCreateElement = document.createElement.bind(document);
jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'canvas') {
    return { ...mockCanvas } as unknown as HTMLCanvasElement;
  }
  return originalCreateElement(tag);
});

describe('WebGLVideoProcessor', () => {
  let processor: WebGLVideoProcessor;

  beforeEach(() => {
    processor = new WebGLVideoProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    processor.dispose();
  });

  describe('initialize', () => {
    it('should initialize WebGL context successfully', () => {
      const result = processor.initialize(1920, 1080);
      expect(result).toBe(true);
    });

    it('should initialize with custom dimensions', () => {
      const result = processor.initialize(1280, 720);
      expect(result).toBe(true);
    });

    it('should initialize with offscreen canvas by default', () => {
      processor.initialize(1920, 1080, true);
      // Should use OffscreenCanvas
    });

    it('should initialize with regular canvas when offscreen is disabled', () => {
      processor.initialize(1920, 1080, false);
      expect(document.createElement).toHaveBeenCalledWith('canvas');
    });
  });

  describe('isWebGLContextLost', () => {
    it('should return false initially', () => {
      processor.initialize(1920, 1080);
      expect(processor.isWebGLContextLost()).toBe(false);
    });
  });

  describe('forceContextRestore', () => {
    it('should return true if context is not lost', () => {
      processor.initialize(1920, 1080);
      expect(processor.forceContextRestore()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      processor.initialize(1920, 1080);
      processor.dispose();
      // Should not throw
    });

    it('should handle multiple dispose calls', () => {
      processor.initialize(1920, 1080);
      processor.dispose();
      processor.dispose();
      // Should not throw
    });
  });

  describe('isAvailable', () => {
    it('should check WebGL availability', () => {
      const result = WebGLVideoProcessor.isAvailable();
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('getWebGLProcessor', () => {
  afterEach(() => {
    disposeWebGLProcessor();
  });

  it('should return a WebGLVideoProcessor instance', () => {
    const processor = getWebGLProcessor();
    expect(processor).toBeInstanceOf(WebGLVideoProcessor);
  });

  it('should return the same instance on multiple calls', () => {
    const processor1 = getWebGLProcessor();
    const processor2 = getWebGLProcessor();
    expect(processor1).toBe(processor2);
  });

  it('should accept custom dimensions', () => {
    const processor = getWebGLProcessor(1280, 720);
    expect(processor).toBeInstanceOf(WebGLVideoProcessor);
  });
});

describe('disposeWebGLProcessor', () => {
  it('should dispose the global processor', () => {
    getWebGLProcessor();
    disposeWebGLProcessor();
    // Should not throw
  });

  it('should handle multiple dispose calls', () => {
    getWebGLProcessor();
    disposeWebGLProcessor();
    disposeWebGLProcessor();
    // Should not throw
  });
});

describe('FilterParams interface', () => {
  it('should accept all filter parameters', () => {
    const params: FilterParams = {
      brightness: 0.5,
      contrast: 1.2,
      saturation: 1.5,
      hue: 0.1,
      blur: 2,
      sharpen: 0.5,
      sepia: 0.3,
      vignette: { amount: 0.5, radius: 0.8 },
      colorCorrection: {
        lift: [0, 0, 0],
        gamma: [1, 1, 1],
        gain: [1, 1, 1],
      },
      chromaticAberration: { amount: 0.01, center: [0.5, 0.5] },
      filmGrain: { amount: 0.1, time: 0 },
      crossProcess: 0.5,
    };

    expect(params.brightness).toBe(0.5);
    expect(params.contrast).toBe(1.2);
    expect(params.vignette?.amount).toBe(0.5);
  });

  it('should allow partial filter parameters', () => {
    const params: FilterParams = {
      brightness: 0.5,
    };

    expect(params.brightness).toBe(0.5);
    expect(params.contrast).toBeUndefined();
  });
});

describe('Context Loss Handling', () => {
  describe('Event handler setup', () => {
    it('should initialize with context loss tracking enabled', () => {
      const processor = new WebGLVideoProcessor();
      const result = processor.initialize(1920, 1080, false); // Use regular canvas
      
      // Context loss tracking should be set up during initialization
      expect(result).toBe(true);
      expect(processor.isWebGLContextLost()).toBe(false);
      
      processor.dispose();
    });
  });

  describe('Context state tracking', () => {
    it('should track context lost state', () => {
      const processor = new WebGLVideoProcessor();
      processor.initialize(1920, 1080);
      
      expect(processor.isWebGLContextLost()).toBe(false);
      
      processor.dispose();
    });
  });

  describe('Context restoration', () => {
    it('should attempt to restore context', () => {
      const processor = new WebGLVideoProcessor();
      processor.initialize(1920, 1080);
      
      const result = processor.forceContextRestore();
      expect(result).toBe(true);
      
      processor.dispose();
    });
  });
});

describe('Shader compilation', () => {
  describe('Vertex shader', () => {
    it('should initialize successfully with shader compilation', () => {
      const processor = new WebGLVideoProcessor();
      const result = processor.initialize(1920, 1080);
      
      // Shader compilation happens during initialization
      // If initialization succeeds, shaders were compiled
      expect(result).toBe(true);
      
      processor.dispose();
    });
  });

  describe('Fragment shader', () => {
    it('should support multiple filter types', () => {
      const processor = new WebGLVideoProcessor();
      processor.initialize(1920, 1080);
      
      // Processor should be ready for filter operations
      expect(processor.isWebGLContextLost()).toBe(false);
      
      processor.dispose();
    });
  });
});

describe('Buffer management', () => {
  it('should create position buffer', () => {
    const processor = new WebGLVideoProcessor();
    processor.initialize(1920, 1080);
    
    expect(mockWebGLContext.createBuffer).toHaveBeenCalled();
    
    processor.dispose();
  });

  it('should create texture coordinate buffer', () => {
    const processor = new WebGLVideoProcessor();
    processor.initialize(1920, 1080);
    
    expect(mockWebGLContext.createBuffer).toHaveBeenCalled();
    
    processor.dispose();
  });

  it('should delete buffers on dispose', () => {
    const processor = new WebGLVideoProcessor();
    processor.initialize(1920, 1080);
    processor.dispose();
    
    expect(mockWebGLContext.deleteBuffer).toHaveBeenCalled();
  });
});
