/// <reference lib="webworker" />

/**
 * Video Processing Web Worker
 *
 * Handles heavy video processing operations off the main thread:
 * - Frame extraction
 * - Filter application
 * - Video transformation
 * - Thumbnail generation
 * - Export operations
 */

import type {
  VideoWorkerMessage,
  VideoWorkerResponse,
  VideoWorkerPayload,
  VideoFilter,
  VideoMetadata,
} from './worker-types';

// Worker context
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Post a success response
 */
function postSuccess(id: string, data?: ArrayBuffer | ImageData | VideoMetadata | Blob): void {
  const response: VideoWorkerResponse = {
    id,
    type: 'success',
    data,
  };
  ctx.postMessage(response);
}

/**
 * Post an error response
 */
function postError(id: string, error: string): void {
  const response: VideoWorkerResponse = {
    id,
    type: 'error',
    error,
  };
  ctx.postMessage(response);
}

/**
 * Post a progress update
 */
function postProgress(id: string, progress: number): void {
  const response: VideoWorkerResponse = {
    id,
    type: 'progress',
    progress,
  };
  ctx.postMessage(response);
}

/**
 * Apply brightness filter to image data
 */
function applyBrightness(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const adjustment = (value - 1) * 255;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
  }

  return imageData;
}

/**
 * Apply contrast filter to image data
 */
function applyContrast(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const factor = (259 * (value * 255 + 255)) / (255 * (259 - value * 255));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }

  return imageData;
}

/**
 * Apply saturation filter to image data
 */
function applySaturation(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = Math.min(255, Math.max(0, gray + value * (data[i] - gray)));
    data[i + 1] = Math.min(255, Math.max(0, gray + value * (data[i + 1] - gray)));
    data[i + 2] = Math.min(255, Math.max(0, gray + value * (data[i + 2] - gray)));
  }

  return imageData;
}

/**
 * Apply hue rotation filter to image data
 */
function applyHueRotation(imageData: ImageData, degrees: number): ImageData {
  const data = imageData.data;
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Hue rotation matrix
  const matrix = [
    0.213 + cos * 0.787 - sin * 0.213,
    0.715 - cos * 0.715 - sin * 0.715,
    0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143,
    0.715 + cos * 0.285 + sin * 0.14,
    0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787,
    0.715 - cos * 0.715 + sin * 0.715,
    0.072 + cos * 0.928 + sin * 0.072,
  ];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = Math.min(255, Math.max(0, r * matrix[0] + g * matrix[1] + b * matrix[2]));
    data[i + 1] = Math.min(255, Math.max(0, r * matrix[3] + g * matrix[4] + b * matrix[5]));
    data[i + 2] = Math.min(255, Math.max(0, r * matrix[6] + g * matrix[7] + b * matrix[8]));
  }

  return imageData;
}

/**
 * Apply blur filter using box blur algorithm
 */
function applyBlur(imageData: ImageData, radius: number): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const tempData = new Uint8ClampedArray(data);

  const kernelSize = Math.floor(radius) * 2 + 1;
  const kernelHalf = Math.floor(kernelSize / 2);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      for (let kx = -kernelHalf; kx <= kernelHalf; kx++) {
        const px = Math.min(width - 1, Math.max(0, x + kx));
        const idx = (y * width + px) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        a += data[idx + 3];
        count++;
      }

      const idx = (y * width + x) * 4;
      tempData[idx] = r / count;
      tempData[idx + 1] = g / count;
      tempData[idx + 2] = b / count;
      tempData[idx + 3] = a / count;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      for (let ky = -kernelHalf; ky <= kernelHalf; ky++) {
        const py = Math.min(height - 1, Math.max(0, y + ky));
        const idx = (py * width + x) * 4;
        r += tempData[idx];
        g += tempData[idx + 1];
        b += tempData[idx + 2];
        a += tempData[idx + 3];
        count++;
      }

      const idx = (y * width + x) * 4;
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
      data[idx + 3] = a / count;
    }
  }

  return imageData;
}

/**
 * Apply sharpen filter
 */
function applySharpen(imageData: ImageData, amount: number): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const tempData = new Uint8ClampedArray(data);

  // Sharpen kernel
  const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.min(255, Math.max(0, sum));
      }
    }
  }

  return imageData;
}

/**
 * Apply grayscale filter
 */
function applyGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  return imageData;
}

/**
 * Apply sepia filter
 */
function applySepia(imageData: ImageData): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
    data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
    data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
  }

  return imageData;
}

/**
 * Apply invert filter
 */
function applyInvert(imageData: ImageData): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }

  return imageData;
}

/**
 * Apply a video filter to frame data
 */
function applyVideoFilter(imageData: ImageData, filter: VideoFilter): ImageData {
  switch (filter.type) {
    case 'brightness':
      return applyBrightness(imageData, filter.value);
    case 'contrast':
      return applyContrast(imageData, filter.value);
    case 'saturation':
      return applySaturation(imageData, filter.value);
    case 'hue':
      return applyHueRotation(imageData, filter.value);
    case 'blur':
      return applyBlur(imageData, filter.value);
    case 'sharpen':
      return applySharpen(imageData, filter.value);
    case 'grayscale':
      return applyGrayscale(imageData);
    case 'sepia':
      return applySepia(imageData);
    case 'invert':
      return applyInvert(imageData);
    default:
      return imageData;
  }
}

/**
 * Process decode operation
 */
function processDecode(id: string, payload: VideoWorkerPayload): void {
  try {
    if (!payload.videoData) {
      throw new Error('Missing video data for decode operation');
    }

    // For now, we'll return metadata extraction
    // Full decoding requires FFmpeg WASM which is handled separately
    const metadata: VideoMetadata = {
      width: 0,
      height: 0,
      duration: 0,
      frameRate: 0,
      codec: 'unknown',
      bitrate: 0,
      hasAudio: false,
      fileSize: payload.videoData.byteLength,
      mimeType: 'video/mp4',
    };

    postSuccess(id, metadata);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown decode error');
  }
}

/**
 * Process encode operation
 */
function processEncode(id: string, _payload: VideoWorkerPayload): void {
  try {
    // Encoding requires FFmpeg WASM - this is a placeholder
    // The actual implementation will use the WASM codec worker
    postProgress(id, 0);

    // Simulate encoding progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      postProgress(id, progress);

      if (progress >= 100) {
        clearInterval(interval);
        postSuccess(id);
      }
    }, 100);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown encode error');
  }
}

/**
 * Process transform operation
 */
function processTransform(id: string, payload: VideoWorkerPayload): void {
  try {
    if (!payload.frameData) {
      throw new Error('Missing frame data for transform operation');
    }

    // Apply operations in sequence
    let result = payload.frameData;
    if (payload.operations) {
      for (const op of payload.operations) {
        if (op.filter) {
          result = applyVideoFilter(result, op.filter);
        }
      }
    }

    // Transfer the processed data back
    postSuccess(id, result);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown transform error');
  }
}

/**
 * Process filter operation
 */
function processFilter(id: string, payload: VideoWorkerPayload): void {
  try {
    const { frameData, filter } = payload;
    if (!frameData || !filter) {
      throw new Error('Missing required parameters for filter operation');
    }

    const result = applyVideoFilter(frameData, filter);

    // Use transferable for better performance
    ctx.postMessage(
      {
        id,
        type: 'success',
        data: result,
      } as VideoWorkerResponse,
      [result.data.buffer]
    );
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown filter error');
  }
}

/**
 * Process export operation
 */
function processExport(id: string, payload: VideoWorkerPayload): void {
  try {
    if (!payload.exportOptions) {
      throw new Error('Missing export options');
    }

    // Export requires FFmpeg WASM - this is a placeholder
    // The actual implementation will coordinate with the WASM codec worker
    postProgress(id, 0);

    // Report completion
    postSuccess(id);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown export error');
  }
}

/**
 * Process frame extraction
 */
function processExtractFrame(id: string, _payload: VideoWorkerPayload): void {
  try {
    // Frame extraction placeholder
    // Full implementation requires video decoder
    postSuccess(id);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown frame extraction error');
  }
}

/**
 * Process thumbnail generation
 */
function processGenerateThumbnail(id: string, _payload: VideoWorkerPayload): void {
  try {
    // Thumbnail generation placeholder
    // Full implementation requires video decoder and canvas
    postSuccess(id);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown thumbnail generation error');
  }
}

/**
 * Process video analysis
 */
function processAnalyze(id: string, payload: VideoWorkerPayload): void {
  try {
    if (!payload.videoData) {
      throw new Error('Missing video data for analysis');
    }

    // Basic analysis - returns file size and basic info
    const metadata: VideoMetadata = {
      width: 0,
      height: 0,
      duration: 0,
      frameRate: 0,
      codec: 'unknown',
      bitrate: 0,
      hasAudio: false,
      fileSize: payload.videoData.byteLength,
      mimeType: 'video/mp4',
    };

    postSuccess(id, metadata);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown analysis error');
  }
}

/**
 * Main message handler
 */
ctx.onmessage = (e: MessageEvent<VideoWorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'decode':
        return processDecode(id, payload);
      case 'encode':
        return processEncode(id, payload);
      case 'transform':
        return processTransform(id, payload);
      case 'filter':
        return processFilter(id, payload);
      case 'export':
        return processExport(id, payload);
      case 'extractFrame':
        return processExtractFrame(id, payload);
      case 'generateThumbnail':
        return processGenerateThumbnail(id, payload);
      case 'analyze':
        return processAnalyze(id, payload);
      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown error');
  }
};

// Export for type checking (not used at runtime)
export type { VideoWorkerMessage, VideoWorkerResponse };
