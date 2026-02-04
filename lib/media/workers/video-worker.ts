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
 * Parse MP4 box structure to extract metadata
 */
function parseMP4Metadata(buffer: ArrayBuffer): Partial<VideoMetadata> {
  const view = new DataView(buffer);
  const metadata: Partial<VideoMetadata> = {};
  let offset = 0;

  const readUint32 = (pos: number) => view.getUint32(pos, false);
  const readString = (pos: number, len: number) => {
    let str = '';
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(view.getUint8(pos + i));
    }
    return str;
  };

  try {
    while (offset < buffer.byteLength - 8) {
      const size = readUint32(offset);
      const type = readString(offset + 4, 4);

      if (size === 0 || size > buffer.byteLength - offset) break;

      if (type === 'moov' || type === 'trak' || type === 'mdia' || type === 'minf' || type === 'stbl') {
        // Container boxes - recurse into them
        offset += 8;
        continue;
      }

      if (type === 'mvhd') {
        // Movie header - contains duration and timescale
        const version = view.getUint8(offset + 8);
        let timescale: number, duration: number;
        if (version === 1) {
          timescale = readUint32(offset + 28);
          duration = readUint32(offset + 36); // Lower 32 bits of 64-bit duration
        } else {
          timescale = readUint32(offset + 20);
          duration = readUint32(offset + 24);
        }
        if (timescale > 0) {
          metadata.duration = duration / timescale;
        }
      }

      if (type === 'tkhd') {
        // Track header - contains width/height
        const version = view.getUint8(offset + 8);
        const widthOffset = version === 1 ? offset + 92 : offset + 84;
        const heightOffset = version === 1 ? offset + 96 : offset + 88;
        const width = readUint32(widthOffset) >> 16;
        const height = readUint32(heightOffset) >> 16;
        if (width > 0 && height > 0) {
          metadata.width = width;
          metadata.height = height;
        }
      }

      if (type === 'stts') {
        // Time-to-sample box - can derive frame rate
        const entryCount = readUint32(offset + 12);
        if (entryCount > 0) {
          const sampleDelta = readUint32(offset + 20);
          // Frame rate calculation needs timescale from mdhd
          if (sampleDelta > 0 && metadata.duration) {
            // Approximate frame rate
            metadata.frameRate = Math.round(1000 / sampleDelta * 10) / 10;
          }
        }
      }

      if (type === 'avcC' || type === 'hvcC' || type === 'vpcC' || type === 'av1C') {
        // Codec configuration boxes
        const codecMap: Record<string, string> = {
          avcC: 'h264',
          hvcC: 'h265',
          vpcC: 'vp9',
          av1C: 'av1',
        };
        metadata.codec = codecMap[type] || 'unknown';
      }

      offset += size;
    }
  } catch {
    // Parsing error - return what we have
  }

  return metadata;
}

/**
 * Detect video mime type from magic bytes
 */
function detectMimeType(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer.slice(0, 12));
  
  // Check for MP4/MOV (ftyp box)
  if (view[4] === 0x66 && view[5] === 0x74 && view[6] === 0x79 && view[7] === 0x70) {
    return 'video/mp4';
  }
  // Check for WebM (EBML header)
  if (view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3) {
    return 'video/webm';
  }
  // Check for AVI (RIFF header)
  if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
    return 'video/x-msvideo';
  }
  // Check for MKV (EBML with specific doctype)
  if (view[0] === 0x1A && view[1] === 0x45) {
    return 'video/x-matroska';
  }
  
  return 'video/mp4'; // Default
}

/**
 * Process decode operation - Extract video metadata
 */
function processDecode(id: string, payload: VideoWorkerPayload): void {
  try {
    if (!payload.videoData) {
      throw new Error('Missing video data for decode operation');
    }

    const buffer = payload.videoData;
    const mimeType = detectMimeType(buffer);
    
    // Parse metadata from container
    const parsedMetadata = mimeType.includes('mp4') || mimeType.includes('quicktime')
      ? parseMP4Metadata(buffer)
      : {};

    // Build complete metadata with parsed values and defaults
    const metadata: VideoMetadata = {
      width: parsedMetadata.width || 0,
      height: parsedMetadata.height || 0,
      duration: parsedMetadata.duration || 0,
      frameRate: parsedMetadata.frameRate || 30,
      codec: parsedMetadata.codec || 'unknown',
      bitrate: buffer.byteLength * 8 / Math.max(parsedMetadata.duration || 1, 1),
      hasAudio: true, // Assume audio present, will be confirmed by full decode
      fileSize: buffer.byteLength,
      mimeType,
    };

    postSuccess(id, metadata);
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown decode error');
  }
}

/**
 * Check if WebCodecs API is available
 */
function isWebCodecsAvailable(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

/**
 * Encode frames using WebCodecs API
 */
async function encodeWithWebCodecs(
  frames: ImageData[],
  options: { width: number; height: number; frameRate: number; bitrate: number },
  onProgress: (progress: number) => void
): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  let encodedFrames = 0;

  const encoder = new VideoEncoder({
    output: (chunk) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      chunks.push(data);
    },
    error: (e) => {
      throw new Error(`Encoding error: ${e.message}`);
    },
  });

  encoder.configure({
    codec: 'avc1.42001f', // H.264 Baseline
    width: options.width,
    height: options.height,
    bitrate: options.bitrate,
    framerate: options.frameRate,
  });

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const videoFrame = new VideoFrame(frame.data.buffer, {
      format: 'RGBA',
      codedWidth: frame.width,
      codedHeight: frame.height,
      timestamp: (i / options.frameRate) * 1_000_000, // microseconds
    });

    encoder.encode(videoFrame, { keyFrame: i % 30 === 0 });
    videoFrame.close();

    encodedFrames++;
    onProgress(Math.round((encodedFrames / frames.length) * 100));
  }

  await encoder.flush();
  encoder.close();

  // Combine chunks into single buffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Process encode operation using WebCodecs or fallback
 */
function processEncode(id: string, payload: VideoWorkerPayload): void {
  postProgress(id, 0);

  (async () => {
    try {
      const { frameData, exportOptions } = payload;

      if (!isWebCodecsAvailable()) {
        // Fallback: Signal that main thread should use FFmpeg WASM
        postError(id, 'WEBCODECS_UNAVAILABLE:Use FFmpeg WASM for encoding');
        return;
      }

      if (!frameData) {
        throw new Error('Missing frame data for encoding');
      }

      // For single frame, create a simple encoded result
      const options = {
        width: frameData.width,
        height: frameData.height,
        frameRate: exportOptions?.frameRate || 30,
        bitrate: exportOptions?.bitrate || 5_000_000,
      };

      const result = await encodeWithWebCodecs([frameData], options, (p) => postProgress(id, p));
      postSuccess(id, result);
    } catch (error) {
      postError(id, error instanceof Error ? error.message : 'Unknown encode error');
    }
  })();
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
 * Process export operation - Encode and package video for export
 */
function processExport(id: string, payload: VideoWorkerPayload): void {
  postProgress(id, 0);

  (async () => {
    try {
      const { videoData, frameData, exportOptions } = payload;

      if (!exportOptions) {
        throw new Error('Missing export options');
      }

      // If we have raw video data, signal to use FFmpeg for transcoding
      if (videoData && !frameData) {
        // Cannot do full video export in worker without FFmpeg
        // Return signal for main thread to handle with FFmpeg WASM
        postError(id, 'FFMPEG_REQUIRED:Full video export requires FFmpeg WASM');
        return;
      }

      // If we have frame data, try WebCodecs encoding
      if (frameData) {
        if (!isWebCodecsAvailable()) {
          postError(id, 'WEBCODECS_UNAVAILABLE:WebCodecs not available for export');
          return;
        }

        postProgress(id, 10);

        const options = {
          width: exportOptions.resolution?.width || frameData.width,
          height: exportOptions.resolution?.height || frameData.height,
          frameRate: exportOptions.frameRate || 30,
          bitrate: exportOptions.bitrate || 5_000_000,
        };

        const result = await encodeWithWebCodecs(
          [frameData],
          options,
          (p) => postProgress(id, 10 + p * 0.9)
        );

        postSuccess(id, result);
        return;
      }

      throw new Error('No video data or frame data provided for export');
    } catch (error) {
      postError(id, error instanceof Error ? error.message : 'Unknown export error');
    }
  })();
}

/**
 * Extract frame from video using VideoDecoder (WebCodecs API)
 */
async function extractFrameWithWebCodecs(
  videoData: ArrayBuffer,
  timestamp: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    let frameExtracted = false;
    let canvas: OffscreenCanvas | null = null;

    const decoder = new VideoDecoder({
      output: (frame) => {
        if (!frameExtracted && frame.timestamp !== null) {
          frameExtracted = true;
          
          // Create canvas and draw frame
          canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(frame, 0, 0);
            const imageData = ctx.getImageData(0, 0, frame.displayWidth, frame.displayHeight);
            frame.close();
            resolve(imageData);
          } else {
            frame.close();
            reject(new Error('Failed to get canvas context'));
          }
        } else {
          frame.close();
        }
      },
      error: (e) => reject(new Error(`Decoder error: ${e.message}`)),
    });

    // Configure decoder based on detected codec
    const mimeType = detectMimeType(videoData);
    const codec = mimeType.includes('webm') ? 'vp8' : 'avc1.42001f';

    try {
      decoder.configure({ codec });

      // Create EncodedVideoChunk from data
      const chunk = new EncodedVideoChunk({
        type: 'key',
        timestamp: timestamp * 1_000_000, // Convert to microseconds
        data: new Uint8Array(videoData),
      });

      decoder.decode(chunk);
      decoder.flush().then(() => {
        if (!frameExtracted) {
          reject(new Error('No frame extracted'));
        }
        decoder.close();
      });
    } catch (e) {
      decoder.close();
      reject(e);
    }
  });
}

/**
 * Process frame extraction - Extract a single frame at specified timestamp
 */
function processExtractFrame(id: string, payload: VideoWorkerPayload): void {
  (async () => {
    try {
      const { videoData, timestamp } = payload;

      if (!videoData) {
        throw new Error('Missing video data for frame extraction');
      }

      const targetTime = timestamp || 0;

      // Try WebCodecs first
      if (isWebCodecsAvailable()) {
        try {
          const imageData = await extractFrameWithWebCodecs(videoData, targetTime);
          ctx.postMessage(
            { id, type: 'success', data: imageData } as VideoWorkerResponse,
            [imageData.data.buffer]
          );
          return;
        } catch {
          // WebCodecs failed, signal for FFmpeg fallback
        }
      }

      // Signal main thread to use FFmpeg WASM for extraction
      postError(id, 'FFMPEG_REQUIRED:Frame extraction requires FFmpeg WASM');
    } catch (error) {
      postError(id, error instanceof Error ? error.message : 'Unknown frame extraction error');
    }
  })();
}

/**
 * Generate thumbnail from ImageData
 */
function createThumbnail(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
  quality: number
): { data: Uint8Array; width: number; height: number } {
  // Calculate dimensions maintaining aspect ratio
  const aspectRatio = imageData.width / imageData.height;
  let finalWidth = targetWidth;
  let finalHeight = targetHeight;

  if (targetWidth / targetHeight > aspectRatio) {
    finalWidth = Math.round(targetHeight * aspectRatio);
  } else {
    finalHeight = Math.round(targetWidth / aspectRatio);
  }

  // Create source canvas
  const sourceCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Failed to create source canvas context');
  sourceCtx.putImageData(imageData, 0, 0);

  // Create target canvas and scale
  const targetCanvas = new OffscreenCanvas(finalWidth, finalHeight);
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) throw new Error('Failed to create target canvas context');

  // Use high-quality scaling
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';
  targetCtx.drawImage(sourceCanvas, 0, 0, finalWidth, finalHeight);

  // Get thumbnail data
  const thumbnailData = targetCtx.getImageData(0, 0, finalWidth, finalHeight);

  // Apply quality compression by reducing color depth if quality < 100
  if (quality < 100) {
    const factor = Math.max(1, Math.round((100 - quality) / 10));
    const data = thumbnailData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / factor) * factor;
      data[i + 1] = Math.round(data[i + 1] / factor) * factor;
      data[i + 2] = Math.round(data[i + 2] / factor) * factor;
    }
  }

  return {
    data: new Uint8Array(thumbnailData.data.buffer),
    width: finalWidth,
    height: finalHeight,
  };
}

/**
 * Process thumbnail generation - Create thumbnail from video frame
 */
function processGenerateThumbnail(id: string, payload: VideoWorkerPayload): void {
  (async () => {
    try {
      const { videoData, frameData, timestamp, quality } = payload;
      const targetWidth = 160;
      const targetHeight = 90;
      const thumbnailQuality = quality || 80;

      let sourceFrame: ImageData;

      // If we have frame data, use it directly
      if (frameData) {
        sourceFrame = frameData;
      } else if (videoData) {
        // Extract frame from video first
        if (isWebCodecsAvailable()) {
          try {
            sourceFrame = await extractFrameWithWebCodecs(videoData, timestamp || 0);
          } catch {
            // WebCodecs failed, signal for FFmpeg fallback
            postError(id, 'FFMPEG_REQUIRED:Thumbnail generation requires FFmpeg WASM');
            return;
          }
        } else {
          postError(id, 'FFMPEG_REQUIRED:Thumbnail generation requires FFmpeg WASM');
          return;
        }
      } else {
        throw new Error('Missing video data or frame data for thumbnail generation');
      }

      // Create thumbnail from the frame
      const thumbnail = createThumbnail(sourceFrame, targetWidth, targetHeight, thumbnailQuality);

      // Create ImageData for the thumbnail
      const thumbnailImageData = new ImageData(
        new Uint8ClampedArray(thumbnail.data),
        thumbnail.width,
        thumbnail.height
      );

      ctx.postMessage(
        { id, type: 'success', data: thumbnailImageData } as VideoWorkerResponse,
        [thumbnailImageData.data.buffer]
      );
    } catch (error) {
      postError(id, error instanceof Error ? error.message : 'Unknown thumbnail generation error');
    }
  })();
}

/**
 * Analyze video content for quality metrics
 */
function _analyzeVideoQuality(imageData: ImageData): {
  brightness: number;
  contrast: number;
  sharpness: number;
} {
  const data = imageData.data;
  const pixelCount = data.length / 4;

  // Calculate brightness (average luminance)
  let totalLuminance = 0;
  const luminanceValues: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    totalLuminance += luminance;
    luminanceValues.push(luminance);
  }

  const brightness = totalLuminance / pixelCount / 255; // Normalize to 0-1

  // Calculate contrast (standard deviation of luminance)
  const meanLuminance = totalLuminance / pixelCount;
  let varianceSum = 0;
  for (const lum of luminanceValues) {
    varianceSum += (lum - meanLuminance) ** 2;
  }
  const contrast = Math.sqrt(varianceSum / pixelCount) / 128; // Normalize to 0-1 range

  // Calculate sharpness using Laplacian variance
  let laplacianSum = 0;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = luminanceValues[y * width + x];
      const top = luminanceValues[(y - 1) * width + x];
      const bottom = luminanceValues[(y + 1) * width + x];
      const left = luminanceValues[y * width + (x - 1)];
      const right = luminanceValues[y * width + (x + 1)];

      const laplacian = Math.abs(4 * center - top - bottom - left - right);
      laplacianSum += laplacian * laplacian;
    }
  }

  const sharpness = Math.min(1, Math.sqrt(laplacianSum / pixelCount) / 50);

  return { brightness, contrast, sharpness };
}

/**
 * Process video analysis - Extract metadata and quality metrics
 */
function processAnalyze(id: string, payload: VideoWorkerPayload): void {
  try {
    if (!payload.videoData) {
      throw new Error('Missing video data for analysis');
    }

    const buffer = payload.videoData;
    const mimeType = detectMimeType(buffer);

    // Parse container metadata
    const parsedMetadata = mimeType.includes('mp4') || mimeType.includes('quicktime')
      ? parseMP4Metadata(buffer)
      : {};

    // Build complete metadata
    const metadata: VideoMetadata = {
      width: parsedMetadata.width || 0,
      height: parsedMetadata.height || 0,
      duration: parsedMetadata.duration || 0,
      frameRate: parsedMetadata.frameRate || 0,
      codec: parsedMetadata.codec || 'unknown',
      bitrate: buffer.byteLength * 8 / Math.max(parsedMetadata.duration || 1, 1),
      hasAudio: false, // Will be detected during full analysis
      fileSize: buffer.byteLength,
      mimeType,
    };

    // Check for audio track indicator in MP4
    const bufferView = new Uint8Array(buffer);
    const bufferStr = String.fromCharCode.apply(null, Array.from(bufferView.slice(0, 1000)));
    metadata.hasAudio = bufferStr.includes('mp4a') || bufferStr.includes('samr') || bufferStr.includes('sowt');

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
