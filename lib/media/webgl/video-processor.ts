/**
 * WebGL Video Processor
 *
 * GPU-accelerated video processing using WebGL.
 * Provides 10-50x faster processing for pixel operations.
 */

import { VERTEX_SHADER, getFragmentShader, type ShaderType } from './video-shaders';

/**
 * Shader program with uniform locations
 */
interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

/**
 * Filter parameters
 */
export interface FilterParams {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  blur?: number;
  sharpen?: number;
  sepia?: number;
  vignette?: { amount: number; radius: number };
  colorCorrection?: { lift: number[]; gamma: number[]; gain: number[] };
  chromaticAberration?: { amount: number; center: number[] };
  filmGrain?: { amount: number; time: number };
  crossProcess?: number;
}

/**
 * WebGL Video Processor
 */
export class WebGLVideoProcessor {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private programs: Map<ShaderType, ShaderProgram> = new Map();
  private texture: WebGLTexture | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private framebufferTexture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the WebGL context
   */
  public initialize(width: number, height: number, useOffscreen: boolean = true): boolean {
    try {
      // Create canvas
      if (useOffscreen && typeof OffscreenCanvas !== 'undefined') {
        this.canvas = new OffscreenCanvas(width, height);
      } else {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
      }

      // Get WebGL context
      this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
      }) as WebGLRenderingContext | null;

      if (!this.gl) {
        console.error('WebGL not supported');
        return false;
      }

      // Initialize buffers
      this.initializeBuffers();

      // Create framebuffer for multi-pass rendering
      this.initializeFramebuffer(width, height);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGL:', error);
      return false;
    }
  }

  /**
   * Initialize vertex and texture coordinate buffers
   */
  private initializeBuffers(): void {
    if (!this.gl) return;

    // Position buffer (full-screen quad)
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    // Texture coordinate buffer
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );
  }

  /**
   * Initialize framebuffer for multi-pass rendering
   */
  private initializeFramebuffer(width: number, height: number): void {
    if (!this.gl) return;

    // Create framebuffer texture
    this.framebufferTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebufferTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Create framebuffer
    this.framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      this.framebufferTexture,
      0
    );

    // Reset bindings
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  /**
   * Compile and link a shader program
   */
  private compileProgram(shaderType: ShaderType): ShaderProgram | null {
    if (!this.gl) return null;

    const fragmentSource = getFragmentShader(shaderType);

    // Compile vertex shader
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!vertexShader) return null;
    this.gl.shaderSource(vertexShader, VERTEX_SHADER);
    this.gl.compileShader(vertexShader);

    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation failed:', this.gl.getShaderInfoLog(vertexShader));
      return null;
    }

    // Compile fragment shader
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) return null;
    this.gl.shaderSource(fragmentShader, fragmentSource);
    this.gl.compileShader(fragmentShader);

    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation failed:', this.gl.getShaderInfoLog(fragmentShader));
      return null;
    }

    // Link program
    const program = this.gl.createProgram();
    if (!program) return null;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking failed:', this.gl.getProgramInfoLog(program));
      return null;
    }

    // Get uniform locations
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = this.gl.getActiveUniform(program, i);
      if (info) {
        uniforms[info.name] = this.gl.getUniformLocation(program, info.name);
      }
    }

    // Clean up shaders
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    return { program, uniforms };
  }

  /**
   * Get or compile a shader program
   */
  private getProgram(shaderType: ShaderType): ShaderProgram | null {
    if (this.programs.has(shaderType)) {
      return this.programs.get(shaderType)!;
    }

    const program = this.compileProgram(shaderType);
    if (program) {
      this.programs.set(shaderType, program);
    }
    return program;
  }

  /**
   * Upload image data to texture
   */
  private uploadTexture(imageData: ImageData): void {
    if (!this.gl) return;

    if (!this.texture) {
      this.texture = this.gl.createTexture();
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      imageData
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  /**
   * Render with a specific shader
   */
  private render(
    shaderType: ShaderType,
    uniforms: Record<string, number | number[]> = {},
    toFramebuffer: boolean = false
  ): void {
    if (!this.gl || !this.canvas) return;

    const program = this.getProgram(shaderType);
    if (!program) return;

    // Bind framebuffer or default
    if (toFramebuffer) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    this.gl.useProgram(program.program);

    // Set up position attribute
    const positionLocation = this.gl.getAttribLocation(program.program, 'a_position');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set up texture coordinate attribute
    const texCoordLocation = this.gl.getAttribLocation(program.program, 'a_texCoord');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set texture uniform
    if (program.uniforms['u_texture'] !== undefined) {
      this.gl.uniform1i(program.uniforms['u_texture'], 0);
    }

    // Set resolution uniform
    if (program.uniforms['u_resolution'] !== undefined) {
      this.gl.uniform2f(
        program.uniforms['u_resolution'],
        this.canvas.width,
        this.canvas.height
      );
    }

    // Set custom uniforms
    for (const [name, value] of Object.entries(uniforms)) {
      const location = program.uniforms[name];
      if (location !== undefined && location !== null) {
        if (Array.isArray(value)) {
          switch (value.length) {
            case 2:
              this.gl.uniform2fv(location, value);
              break;
            case 3:
              this.gl.uniform3fv(location, value);
              break;
            case 4:
              this.gl.uniform4fv(location, value);
              break;
          }
        } else {
          this.gl.uniform1f(location, value);
        }
      }
    }

    // Draw
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Swap texture with framebuffer texture
   */
  private swapTextures(): void {
    if (!this.gl || !this.framebufferTexture) return;

    // Bind framebuffer texture as source
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebufferTexture);
  }

  /**
   * Process image data with filters
   */
  public process(imageData: ImageData, params: FilterParams): ImageData {
    if (!this.isInitialized || !this.gl || !this.canvas) {
      return imageData;
    }

    // Resize canvas if needed
    if (this.canvas.width !== imageData.width || this.canvas.height !== imageData.height) {
      this.canvas.width = imageData.width;
      this.canvas.height = imageData.height;
      this.initializeFramebuffer(imageData.width, imageData.height);
    }

    // Upload source texture
    this.uploadTexture(imageData);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    let needsSwap = false;

    // Apply filters in order
    if (params.brightness !== undefined && params.brightness !== 1) {
      this.render('brightness', { u_brightness: params.brightness - 1 }, true);
      this.swapTextures();
      needsSwap = true;
    }

    if (params.contrast !== undefined && params.contrast !== 1) {
      this.render('contrast', { u_contrast: params.contrast }, needsSwap);
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.saturation !== undefined && params.saturation !== 1) {
      this.render('saturation', { u_saturation: params.saturation }, needsSwap);
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.hue !== undefined && params.hue !== 0) {
      this.render('hue', { u_hue: params.hue / 360 }, needsSwap);
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.blur !== undefined && params.blur > 0) {
      // Horizontal blur pass
      this.render('blur_h', { u_radius: params.blur }, true);
      this.swapTextures();
      // Vertical blur pass
      this.render('blur_v', { u_radius: params.blur }, needsSwap);
      needsSwap = true;
    }

    if (params.sharpen !== undefined && params.sharpen > 0) {
      this.render('sharpen', { u_amount: params.sharpen }, needsSwap);
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.sepia !== undefined && params.sepia > 0) {
      this.render('sepia', { u_amount: params.sepia }, needsSwap);
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.vignette !== undefined) {
      this.render(
        'vignette',
        {
          u_amount: params.vignette.amount,
          u_radius: params.vignette.radius,
        },
        needsSwap
      );
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.colorCorrection !== undefined) {
      this.render(
        'color_correction',
        {
          u_lift: params.colorCorrection.lift,
          u_gamma: params.colorCorrection.gamma,
          u_gain: params.colorCorrection.gain,
        },
        needsSwap
      );
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.chromaticAberration !== undefined) {
      this.render(
        'chromatic_aberration',
        {
          u_amount: params.chromaticAberration.amount,
          u_center: params.chromaticAberration.center,
        },
        needsSwap
      );
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.filmGrain !== undefined) {
      this.render(
        'film_grain',
        {
          u_amount: params.filmGrain.amount,
          u_time: params.filmGrain.time,
        },
        needsSwap
      );
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    if (params.crossProcess !== undefined && params.crossProcess > 0) {
      this.render('cross_process', { u_amount: params.crossProcess }, needsSwap);
      if (!needsSwap) {
        this.swapTextures();
        needsSwap = true;
      }
    }

    // Final render to canvas (not framebuffer) if we had any filters
    if (needsSwap) {
      this.render('passthrough', {}, false);
    } else {
      // No filters applied, just render passthrough
      this.render('passthrough', {}, false);
    }

    // Read pixels from canvas
    const resultData = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(
      0,
      0,
      imageData.width,
      imageData.height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      resultData
    );

    // WebGL reads pixels from bottom-left, need to flip vertically
    const flippedData = new Uint8ClampedArray(resultData.length);
    const rowSize = imageData.width * 4;
    for (let y = 0; y < imageData.height; y++) {
      const srcRow = (imageData.height - y - 1) * rowSize;
      const dstRow = y * rowSize;
      flippedData.set(resultData.subarray(srcRow, srcRow + rowSize), dstRow);
    }

    return new ImageData(flippedData, imageData.width, imageData.height);
  }

  /**
   * Check if WebGL is available
   */
  public static isAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /**
   * Dispose of WebGL resources
   */
  public dispose(): void {
    if (!this.gl) return;

    // Delete programs
    this.programs.forEach((program) => {
      this.gl!.deleteProgram(program.program);
    });
    this.programs.clear();

    // Delete textures
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (this.framebufferTexture) {
      this.gl.deleteTexture(this.framebufferTexture);
      this.framebufferTexture = null;
    }

    // Delete framebuffer
    if (this.framebuffer) {
      this.gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }

    // Delete buffers
    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }

    if (this.texCoordBuffer) {
      this.gl.deleteBuffer(this.texCoordBuffer);
      this.texCoordBuffer = null;
    }

    this.gl = null;
    this.canvas = null;
    this.isInitialized = false;
  }
}

// Singleton instance
let processorInstance: WebGLVideoProcessor | null = null;

/**
 * Get the global WebGL processor instance
 */
export function getWebGLProcessor(width: number = 1920, height: number = 1080): WebGLVideoProcessor {
  if (!processorInstance) {
    processorInstance = new WebGLVideoProcessor();
    processorInstance.initialize(width, height);
  }
  return processorInstance;
}

/**
 * Dispose of the global WebGL processor
 */
export function disposeWebGLProcessor(): void {
  if (processorInstance) {
    processorInstance.dispose();
    processorInstance = null;
  }
}
