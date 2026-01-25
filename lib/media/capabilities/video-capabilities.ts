/**
 * Video Capabilities Detection
 *
 * Detects browser and device capabilities for video processing:
 * - Hardware acceleration support
 * - Available APIs
 * - Performance characteristics
 * - Recommended settings
 */

import { detectCodecSupport, type CodecDetectionResult } from '../codecs/codec-detection';

/**
 * Hardware acceleration status
 */
export interface HardwareAcceleration {
  webgl: boolean;
  webgl2: boolean;
  webgpu: boolean;
  videoDecodeHardware: boolean;
  videoEncodeHardware: boolean;
}

/**
 * Available APIs
 */
export interface AvailableAPIs {
  mediaRecorder: boolean;
  mediaSource: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  imageCapture: boolean;
  webWorkers: boolean;
  sharedArrayBuffer: boolean;
  wasm: boolean;
  simd: boolean;
  threads: boolean;
}

/**
 * Performance characteristics
 */
export interface PerformanceProfile {
  cpuCores: number;
  deviceMemory: number; // in GB
  maxTextureSize: number;
  maxRenderbufferSize: number;
  gpuRenderer: string;
  gpuVendor: string;
  performanceTier: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Recommended settings based on capabilities
 */
export interface RecommendedSettings {
  maxResolution: { width: number; height: number };
  maxFrameRate: number;
  useHardwareAcceleration: boolean;
  workerCount: number;
  chunkSize: number;
  preferredCodec: string;
  useWebGL: boolean;
}

/**
 * Complete video capabilities
 */
export interface VideoCapabilities {
  hardware: HardwareAcceleration;
  apis: AvailableAPIs;
  performance: PerformanceProfile;
  codecs: CodecDetectionResult | null;
  recommended: RecommendedSettings;
  timestamp: number;
}

/**
 * Check WebGL support
 */
function checkWebGLSupport(): { webgl: boolean; webgl2: boolean; maxTextureSize: number; maxRenderbufferSize: number; renderer: string; vendor: string } {
  const result = {
    webgl: false,
    webgl2: false,
    maxTextureSize: 0,
    maxRenderbufferSize: 0,
    renderer: 'unknown',
    vendor: 'unknown',
  };

  try {
    const canvas = document.createElement('canvas');

    // Check WebGL2 first
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      result.webgl2 = true;
      result.webgl = true;
      result.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE);
      result.maxRenderbufferSize = gl2.getParameter(gl2.MAX_RENDERBUFFER_SIZE);

      const debugInfo = gl2.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        result.renderer = gl2.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        result.vendor = gl2.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
      return result;
    }

    // Fallback to WebGL1
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      result.webgl = true;
      const glContext = gl as WebGLRenderingContext;
      result.maxTextureSize = glContext.getParameter(glContext.MAX_TEXTURE_SIZE);
      result.maxRenderbufferSize = glContext.getParameter(glContext.MAX_RENDERBUFFER_SIZE);

      const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        result.renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        result.vendor = glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
    }
  } catch {
    // WebGL not supported
  }

  return result;
}

/**
 * Check WebGPU support
 */
async function checkWebGPUSupport(): Promise<boolean> {
  if (!('gpu' in navigator)) return false;

  try {
    const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Check WASM SIMD support
 */
function checkWasmSimdSupport(): boolean {
  try {
    // SIMD detection via feature detection
    const simdTest = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0,
      65, 0, 253, 15, 253, 98, 11,
    ]);
    return WebAssembly.validate(simdTest);
  } catch {
    return false;
  }
}

/**
 * Check WASM threads support
 */
function checkWasmThreadsSupport(): boolean {
  try {
    // Check for SharedArrayBuffer (required for threads)
    if (typeof SharedArrayBuffer === 'undefined') return false;

    // Check for Atomics
    if (typeof Atomics === 'undefined') return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Detect hardware acceleration capabilities
 */
async function detectHardwareAcceleration(): Promise<HardwareAcceleration> {
  const webglInfo = checkWebGLSupport();
  const webgpu = await checkWebGPUSupport();

  // Check for hardware video decode/encode
  let videoDecodeHardware = false;
  let videoEncodeHardware = false;

  if (typeof VideoDecoder !== 'undefined') {
    try {
      const config = { codec: 'avc1.42E01E' };
      const support = await VideoDecoder.isConfigSupported(config);
      videoDecodeHardware = support.config?.hardwareAcceleration === 'prefer-hardware';
    } catch {
      // Not supported
    }
  }

  if (typeof VideoEncoder !== 'undefined') {
    try {
      const config = {
        codec: 'avc1.42E01E',
        width: 1920,
        height: 1080,
        bitrate: 8_000_000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware' as const,
      };
      const support = await VideoEncoder.isConfigSupported(config);
      videoEncodeHardware = support.supported ?? false;
    } catch {
      // Not supported
    }
  }

  return {
    webgl: webglInfo.webgl,
    webgl2: webglInfo.webgl2,
    webgpu,
    videoDecodeHardware,
    videoEncodeHardware,
  };
}

/**
 * Detect available APIs
 */
function detectAvailableAPIs(): AvailableAPIs {
  return {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    mediaSource: typeof MediaSource !== 'undefined',
    webCodecs:
      typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    imageCapture: typeof ImageCapture !== 'undefined',
    webWorkers: typeof Worker !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    wasm: typeof WebAssembly !== 'undefined',
    simd: checkWasmSimdSupport(),
    threads: checkWasmThreadsSupport(),
  };
}

/**
 * Detect performance profile
 */
function detectPerformanceProfile(): PerformanceProfile {
  const webglInfo = checkWebGLSupport();

  // Get CPU cores
  const cpuCores = navigator.hardwareConcurrency || 4;

  // Get device memory (may not be available)
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;

  // Determine performance tier
  let performanceTier: 'low' | 'medium' | 'high' | 'ultra' = 'medium';

  if (cpuCores >= 8 && deviceMemory >= 8 && webglInfo.webgl2) {
    performanceTier = 'ultra';
  } else if (cpuCores >= 4 && deviceMemory >= 4 && webglInfo.webgl) {
    performanceTier = 'high';
  } else if (cpuCores >= 2 && deviceMemory >= 2) {
    performanceTier = 'medium';
  } else {
    performanceTier = 'low';
  }

  return {
    cpuCores,
    deviceMemory,
    maxTextureSize: webglInfo.maxTextureSize,
    maxRenderbufferSize: webglInfo.maxRenderbufferSize,
    gpuRenderer: webglInfo.renderer,
    gpuVendor: webglInfo.vendor,
    performanceTier,
  };
}

/**
 * Calculate recommended settings based on capabilities
 */
function calculateRecommendedSettings(
  hardware: HardwareAcceleration,
  apis: AvailableAPIs,
  performance: PerformanceProfile,
  codecs: CodecDetectionResult | null
): RecommendedSettings {
  // Determine max resolution based on performance tier
  let maxResolution = { width: 1920, height: 1080 };
  let maxFrameRate = 30;
  let workerCount = Math.min(performance.cpuCores, 8);
  let chunkSize = 1024 * 1024; // 1MB

  switch (performance.performanceTier) {
    case 'ultra':
      maxResolution = { width: 3840, height: 2160 };
      maxFrameRate = 60;
      workerCount = Math.min(performance.cpuCores, 16);
      chunkSize = 4 * 1024 * 1024; // 4MB
      break;
    case 'high':
      maxResolution = { width: 1920, height: 1080 };
      maxFrameRate = 60;
      workerCount = Math.min(performance.cpuCores, 8);
      chunkSize = 2 * 1024 * 1024; // 2MB
      break;
    case 'medium':
      maxResolution = { width: 1280, height: 720 };
      maxFrameRate = 30;
      workerCount = Math.min(performance.cpuCores, 4);
      chunkSize = 1024 * 1024; // 1MB
      break;
    case 'low':
      maxResolution = { width: 854, height: 480 };
      maxFrameRate = 24;
      workerCount = Math.min(performance.cpuCores, 2);
      chunkSize = 512 * 1024; // 512KB
      break;
  }

  // Determine preferred codec
  const preferredCodec = codecs?.recommendedVideoCodec || 'h264';

  return {
    maxResolution,
    maxFrameRate,
    useHardwareAcceleration:
      hardware.videoEncodeHardware || hardware.videoDecodeHardware,
    workerCount,
    chunkSize,
    preferredCodec,
    useWebGL: hardware.webgl2 || hardware.webgl,
  };
}

/**
 * Detect all video capabilities
 */
export async function detectVideoCapabilities(): Promise<VideoCapabilities> {
  const hardware = await detectHardwareAcceleration();
  const apis = detectAvailableAPIs();
  const performance = detectPerformanceProfile();

  let codecs: CodecDetectionResult | null = null;
  try {
    codecs = await detectCodecSupport();
  } catch {
    // Codec detection failed
  }

  const recommended = calculateRecommendedSettings(
    hardware,
    apis,
    performance,
    codecs
  );

  return {
    hardware,
    apis,
    performance,
    codecs,
    recommended,
    timestamp: Date.now(),
  };
}

/**
 * Quick check if video processing is supported
 */
export function isVideoProcessingSupported(): boolean {
  // Minimum requirements
  return (
    typeof Worker !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    (typeof OffscreenCanvas !== 'undefined' ||
      typeof document.createElement('canvas').getContext('2d') !== 'undefined')
  );
}

/**
 * Get a simple capability summary
 */
export async function getCapabilitySummary(): Promise<{
  canProcess: boolean;
  canEncode: boolean;
  canDecode: boolean;
  hasHardwareAcceleration: boolean;
  performanceTier: string;
  recommendedMaxResolution: string;
}> {
  const caps = await detectVideoCapabilities();

  return {
    canProcess: isVideoProcessingSupported(),
    canEncode: caps.apis.mediaRecorder || caps.apis.webCodecs,
    canDecode: caps.apis.mediaSource || caps.apis.webCodecs,
    hasHardwareAcceleration:
      caps.hardware.videoEncodeHardware || caps.hardware.videoDecodeHardware,
    performanceTier: caps.performance.performanceTier,
    recommendedMaxResolution: `${caps.recommended.maxResolution.width}x${caps.recommended.maxResolution.height}`,
  };
}

// Cache for capabilities
let cachedCapabilities: VideoCapabilities | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Get cached video capabilities
 */
export async function getCachedVideoCapabilities(): Promise<VideoCapabilities> {
  const now = Date.now();

  if (cachedCapabilities && now - cacheTimestamp < CACHE_DURATION) {
    return cachedCapabilities;
  }

  cachedCapabilities = await detectVideoCapabilities();
  cacheTimestamp = now;
  return cachedCapabilities;
}

/**
 * Clear capabilities cache
 */
export function clearCapabilitiesCache(): void {
  cachedCapabilities = null;
  cacheTimestamp = 0;
}
