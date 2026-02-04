/**
 * Video Worker Type Definitions
 *
 * Types for Web Worker communication and video processing operations.
 */

// Video operation types
export type VideoOperationType =
  | 'decode'
  | 'encode'
  | 'transform'
  | 'filter'
  | 'export'
  | 'extractFrame'
  | 'generateThumbnail'
  | 'analyze';

// Filter types
export type VideoFilterType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'custom';

// Transform types
export type VideoTransformType =
  | 'scale'
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'mirror';

// Codec types
export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'prores' | 'dnxhd';
export type AudioCodec = 'aac' | 'opus' | 'mp3' | 'pcm' | 'flac';

// Bitrate modes
export type BitrateMode = 'cbr' | 'vbr' | 'crf';

/**
 * Video filter configuration
 */
export interface VideoFilter {
  type: VideoFilterType;
  value: number;
  options?: Record<string, unknown>;
}

/**
 * Video transform configuration
 */
export interface VideoTransform {
  type: VideoTransformType;
  params: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    angle?: number;
    direction?: 'horizontal' | 'vertical';
  };
}

/**
 * Video operation to be performed
 */
export interface VideoOperation {
  type: VideoOperationType;
  filter?: VideoFilter;
  transform?: VideoTransform;
  options?: Record<string, unknown>;
}

/**
 * Video export options
 */
export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
  codec: VideoCodec;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitrateMode: BitrateMode;
  bitrate?: number;
  crf?: number;
  audioCodec: AudioCodec;
  audioBitrate: number;
  audioChannels: 1 | 2 | 6;
  audioSampleRate: number;
  twoPass?: boolean;
  hardwareAcceleration?: boolean;
  preserveMetadata?: boolean;
  startTime?: number;
  endTime?: number;
}

/**
 * Video metadata
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  codec: string;
  bitrate: number;
  audioCodec?: string;
  audioBitrate?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  hasAudio: boolean;
  fileSize: number;
  mimeType: string;
}

/**
 * Frame data for processing
 */
export interface FrameData {
  imageData: ImageData;
  timestamp: number;
  frameNumber: number;
}

/**
 * Worker message payload
 */
export interface VideoWorkerPayload {
  videoData?: ArrayBuffer;
  frameData?: ImageData;
  operations?: VideoOperation[];
  filter?: VideoFilter;
  exportOptions?: VideoExportOptions;
  timestamp?: number;
  frameNumber?: number;
  quality?: number;
}

/**
 * Message sent to the video worker
 */
export interface VideoWorkerMessage {
  id: string;
  type: VideoOperationType;
  payload: VideoWorkerPayload;
  transferables?: Transferable[];
}

/**
 * Response type from worker
 */
export type VideoWorkerResponseType = 'success' | 'error' | 'progress';

/**
 * Response from the video worker
 */
export interface VideoWorkerResponse {
  id: string;
  type: VideoWorkerResponseType;
  data?: ArrayBuffer | ImageData | VideoMetadata | Blob;
  progress?: number;
  error?: string;
  metadata?: VideoMetadata;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  maxWorkers: number;
  idleTimeout: number;
  taskTimeout: number;
  maxQueueSize: number;
}

/**
 * Worker status
 */
export type WorkerStatus = 'idle' | 'busy' | 'error' | 'terminated';

/**
 * Worker instance info
 */
export interface WorkerInstance {
  id: string;
  worker: Worker;
  status: WorkerStatus;
  currentTaskId: string | null;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Task in the worker queue
 */
export interface WorkerTask {
  id: string;
  message: VideoWorkerMessage;
  priority: number;
  createdAt: number;
  resolve: (response: VideoWorkerResponse) => void;
  reject: (error: Error) => void;
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: number, message?: string) => void;

/**
 * Options for worker processor operations
 */
export interface WorkerProcessorOptions {
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  priority?: number;
  timeout?: number;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: VideoExportOptions = {
  format: 'mp4',
  codec: 'h264',
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  bitrateMode: 'vbr',
  bitrate: 8000000,
  audioCodec: 'aac',
  audioBitrate: 320000,
  audioChannels: 2,
  audioSampleRate: 48000,
  twoPass: false,
  hardwareAcceleration: true,
  preserveMetadata: true,
};

/**
 * Default worker pool configuration
 */
export const DEFAULT_WORKER_POOL_CONFIG: WorkerPoolConfig = {
  maxWorkers: navigator?.hardwareConcurrency ?? 4,
  idleTimeout: 30000, // 30 seconds
  taskTimeout: 300000, // 5 minutes
  maxQueueSize: 1000, // Maximum pending tasks
};
