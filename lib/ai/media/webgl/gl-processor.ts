/**
 * WebGL Processor for GPU-Accelerated Image Processing
 * Provides hardware-accelerated image adjustments using WebGL shaders
 */

import { VERTEX_SHADER, getFragmentShader, type ShaderType } from './gl-shaders';

export interface GLProcessorOptions {
  canvas?: HTMLCanvasElement;
  contextType?: 'webgl' | 'webgl2';
  precision?: 'lowp' | 'mediump' | 'highp';
}

export interface GLAdjustmentParams {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  blur?: number;
  sharpen?: number;
}

export interface GLLevelsParams {
  inputBlack?: number;
  inputWhite?: number;
  inputGamma?: number;
  outputBlack?: number;
  outputWhite?: number;
}

export interface GLHSLParams {
  hue?: number;
  saturation?: number;
  lightness?: number;
}

export interface GLColorBalanceParams {
  shadows?: [number, number, number];
  midtones?: [number, number, number];
  highlights?: [number, number, number];
}

type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/**
 * WebGL-based image processor for GPU-accelerated operations
 */
export class GLProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGLContext | null = null;
  private programs: Map<ShaderType, WebGLProgram> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();
  private framebuffers: Map<string, WebGLFramebuffer> = new Map();
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private isInitialized = false;

  constructor(options: GLProcessorOptions = {}) {
    this.canvas = options.canvas || document.createElement('canvas');
    this.initContext(options.contextType);
  }

  private initContext(contextType?: 'webgl' | 'webgl2'): void {
    const contextOptions: WebGLContextAttributes = {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      antialias: false,
    };

    if (contextType === 'webgl2' || !contextType) {
      this.gl = this.canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
    }

    if (!this.gl) {
      this.gl = this.canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;
    }

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
  }

  /**
   * Initialize WebGL resources
   */
  initialize(): boolean {
    if (this.isInitialized || !this.gl) return this.isInitialized;

    const gl = this.gl;

    // Create position buffer (full-screen quad)
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    // Create texture coordinate buffer
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      gl.STATIC_DRAW
    );

    this.isInitialized = true;
    return true;
  }

  /**
   * Compile and cache a shader program
   */
  private getProgram(type: ShaderType): WebGLProgram | null {
    if (this.programs.has(type)) {
      return this.programs.get(type)!;
    }

    const gl = this.gl;
    if (!gl) return null;

    const program = this.createProgram(VERTEX_SHADER, getFragmentShader(type));
    if (program) {
      this.programs.set(type, program);
    }

    return program;
  }

  /**
   * Create shader program from source
   */
  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this.gl;
    if (!gl) return null;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  /**
   * Compile individual shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create texture from ImageData
   */
  private createTexture(imageData: ImageData, name: string): WebGLTexture | null {
    const gl = this.gl;
    if (!gl) return null;

    // Delete existing texture if any
    const existing = this.textures.get(name);
    if (existing) {
      gl.deleteTexture(existing);
    }

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      imageData.width,
      imageData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageData.data
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.textures.set(name, texture);
    return texture;
  }

  /**
   * Create framebuffer for render-to-texture
   */
  private createFramebuffer(width: number, height: number, name: string): WebGLFramebuffer | null {
    const gl = this.gl;
    if (!gl) return null;

    // Delete existing
    const existingFb = this.framebuffers.get(name);
    if (existingFb) {
      gl.deleteFramebuffer(existingFb);
    }
    const existingTex = this.textures.get(`${name}_tex`);
    if (existingTex) {
      gl.deleteTexture(existingTex);
    }

    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) return null;

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    this.framebuffers.set(name, framebuffer);
    this.textures.set(`${name}_tex`, texture);

    return framebuffer;
  }

  /**
   * Set up vertex attributes for rendering
   */
  private setupVertexAttributes(program: WebGLProgram): void {
    const gl = this.gl;
    if (!gl) return;

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

    if (positionLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    if (texCoordLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  /**
   * Render with specified program and uniforms
   */
  private render(
    program: WebGLProgram,
    sourceTexture: WebGLTexture,
    uniforms: Record<string, number | number[]>
  ): void {
    const gl = this.gl;
    if (!gl) return;

    gl.useProgram(program);
    this.setupVertexAttributes(program);

    // Bind source texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    const imageLoc = gl.getUniformLocation(program, 'u_image');
    gl.uniform1i(imageLoc, 0);

    // Set uniforms
    for (const [name, value] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(program, name);
      if (loc === null) continue;

      if (Array.isArray(value)) {
        switch (value.length) {
          case 2:
            gl.uniform2fv(loc, value);
            break;
          case 3:
            gl.uniform3fv(loc, value);
            break;
          case 4:
            gl.uniform4fv(loc, value);
            break;
        }
      } else {
        gl.uniform1f(loc, value);
      }
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Read pixels from current framebuffer
   */
  private readPixels(width: number, height: number): ImageData {
    const gl = this.gl;
    if (!gl) throw new Error('WebGL context not available');

    const pixels = new Uint8ClampedArray(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // WebGL reads from bottom-left, flip vertically
    const flipped = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4;
      const destRow = y * width * 4;
      flipped.set(pixels.subarray(srcRow, srcRow + width * 4), destRow);
    }

    return new ImageData(flipped, width, height);
  }

  /**
   * Process brightness and contrast adjustments
   */
  processBrightnessContrast(
    imageData: ImageData,
    brightness: number,
    contrast: number
  ): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('brightness-contrast');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_brightness: brightness / 255,
      u_contrast: (contrast + 100) / 100,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process saturation adjustment
   */
  processSaturation(imageData: ImageData, saturation: number): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('saturation');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_saturation: (saturation + 100) / 100,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process hue adjustment
   */
  processHue(imageData: ImageData, hue: number): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('hue');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_hue: hue / 360,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process Gaussian blur
   */
  processBlur(imageData: ImageData, radius: number): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');
    if (radius <= 0) return imageData;

    const gl = this.gl!;
    const program = this.getProgram('blur');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const sourceTexture = this.createTexture(imageData, 'source');
    if (!sourceTexture) throw new Error('Failed to create texture');

    // Two-pass blur: horizontal then vertical
    const fb = this.createFramebuffer(imageData.width, imageData.height, 'blur_pass');
    if (!fb) throw new Error('Failed to create framebuffer');

    // Horizontal pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    this.render(program, sourceTexture, {
      u_resolution: [imageData.width, imageData.height],
      u_direction: [1, 0],
      u_radius: radius,
    });

    // Vertical pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const tempTexture = this.textures.get('blur_pass_tex')!;
    this.render(program, tempTexture, {
      u_resolution: [imageData.width, imageData.height],
      u_direction: [0, 1],
      u_radius: radius,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process sharpening
   */
  processSharpen(imageData: ImageData, amount: number): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('sharpen');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_resolution: [imageData.width, imageData.height],
      u_amount: amount / 100,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process levels adjustment
   */
  processLevels(imageData: ImageData, params: GLLevelsParams): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('levels');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_inputBlack: (params.inputBlack ?? 0) / 255,
      u_inputWhite: (params.inputWhite ?? 255) / 255,
      u_inputGamma: params.inputGamma ?? 1,
      u_outputBlack: (params.outputBlack ?? 0) / 255,
      u_outputWhite: (params.outputWhite ?? 255) / 255,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process HSL adjustment
   */
  processHSL(imageData: ImageData, params: GLHSLParams): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('hsl');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_hue: (params.hue ?? 0) / 360,
      u_saturation: (params.saturation ?? 0) / 100,
      u_lightness: (params.lightness ?? 0) / 100,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process vibrance
   */
  processVibrance(imageData: ImageData, vibrance: number): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('vibrance');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_vibrance: vibrance / 100,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process curves adjustment using LUT texture
   */
  processCurves(imageData: ImageData, curveLUT: Uint8Array): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('curves');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    // Create LUT texture (256x1 RGBA)
    const lutTexture = gl.createTexture();
    if (!lutTexture) throw new Error('Failed to create LUT texture');

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, curveLUT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(program);
    this.setupVertexAttributes(program);

    // Bind source texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const imageLoc = gl.getUniformLocation(program, 'u_image');
    gl.uniform1i(imageLoc, 0);

    // Bind LUT texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
    const lutLoc = gl.getUniformLocation(program, 'u_curveLUT');
    gl.uniform1i(lutLoc, 1);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const result = this.readPixels(imageData.width, imageData.height);

    // Cleanup LUT texture
    gl.deleteTexture(lutTexture);

    return result;
  }

  /**
   * Process color balance adjustment
   */
  processColorBalance(imageData: ImageData, params: GLColorBalanceParams): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('color-balance');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_shadows: params.shadows ?? [0, 0, 0],
      u_midtones: params.midtones ?? [0, 0, 0],
      u_highlights: params.highlights ?? [0, 0, 0],
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process noise reduction
   */
  processNoiseReduction(
    imageData: ImageData,
    strength: number,
    preserveDetail: number = 0.1
  ): ImageData {
    if (!this.initialize()) throw new Error('Failed to initialize WebGL');

    const gl = this.gl!;
    const program = this.getProgram('noise-reduction');
    if (!program) throw new Error('Failed to create shader program');

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    gl.viewport(0, 0, imageData.width, imageData.height);

    const texture = this.createTexture(imageData, 'source');
    if (!texture) throw new Error('Failed to create texture');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.render(program, texture, {
      u_resolution: [imageData.width, imageData.height],
      u_strength: Math.max(0.5, strength / 100 * 2),
      u_preserveDetail: preserveDetail,
    });

    return this.readPixels(imageData.width, imageData.height);
  }

  /**
   * Process all adjustments in a single pass (combined)
   */
  processAdjustments(imageData: ImageData, params: GLAdjustmentParams): ImageData {
    let result = imageData;

    // Process each adjustment that has a non-zero value
    if (params.brightness || params.contrast) {
      result = this.processBrightnessContrast(
        result,
        params.brightness ?? 0,
        params.contrast ?? 0
      );
    }

    if (params.saturation) {
      result = this.processSaturation(result, params.saturation);
    }

    if (params.hue) {
      result = this.processHue(result, params.hue);
    }

    if (params.blur && params.blur > 0) {
      result = this.processBlur(result, params.blur);
    }

    if (params.sharpen && params.sharpen > 0) {
      result = this.processSharpen(result, params.sharpen);
    }

    return result;
  }

  /**
   * Check if WebGL is supported
   */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl2') || canvas.getContext('webgl')
      );
    } catch {
      return false;
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    const gl = this.gl;
    if (!gl) return;

    // Delete programs
    this.programs.forEach((program) => gl.deleteProgram(program));
    this.programs.clear();

    // Delete textures
    this.textures.forEach((texture) => gl.deleteTexture(texture));
    this.textures.clear();

    // Delete framebuffers
    this.framebuffers.forEach((fb) => gl.deleteFramebuffer(fb));
    this.framebuffers.clear();

    // Delete buffers
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);

    this.isInitialized = false;
  }
}

export default GLProcessor;
