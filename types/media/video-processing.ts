/**
 * Video Processing Settings Types
 *
 * Type definitions for video processing configuration.
 */

/**
 * Worker pool configuration
 */
export interface VideoWorkerSettings {
  enabled: boolean;
  maxWorkers: number;
  taskTimeout: number; // in ms
  idleTimeout: number; // in ms
}

/**
 * GPU acceleration settings
 */
export interface GPUAccelerationSettings {
  enabled: boolean;
  preferWebGL2: boolean;
  fallbackToCPU: boolean;
}

/**
 * Codec preferences
 */
export interface CodecSettings {
  preferredVideoCodec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'auto';
  preferredAudioCodec: 'aac' | 'opus' | 'mp3' | 'auto';
  useHardwareAcceleration: boolean;
  enableFFmpegWasm: boolean;
}

/**
 * Progressive loading settings
 */
export interface ProgressiveLoadingSettings {
  enabled: boolean;
  preloadSegments: number;
  thumbnailCount: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  initialQuality: 'thumbnail' | 'preview' | 'standard' | 'high' | 'original';
}

/**
 * Export settings
 */
export interface VideoExportSettings {
  defaultPresetId: string;
  showAdvancedOptions: boolean;
  autoEstimateFileSize: boolean;
  confirmBeforeExport: boolean;
}

/**
 * Timeline settings
 */
export interface TimelineSettings {
  defaultZoom: number;
  snapToGrid: boolean;
  gridSize: number; // in ms
  showWaveform: boolean;
  showThumbnails: boolean;
  autoScroll: boolean;
}

/**
 * Keyframe editor settings
 */
export interface KeyframeEditorSettings {
  defaultEasing: string;
  defaultInterpolation: 'linear' | 'bezier' | 'step' | 'spline';
  showGraph: boolean;
  graphHeight: number;
}

/**
 * Complete video processing settings
 */
export interface VideoProcessingSettings {
  worker: VideoWorkerSettings;
  gpu: GPUAccelerationSettings;
  codec: CodecSettings;
  progressiveLoading: ProgressiveLoadingSettings;
  export: VideoExportSettings;
  timeline: TimelineSettings;
  keyframeEditor: KeyframeEditorSettings;
}

/**
 * Default video processing settings
 */
export const DEFAULT_VIDEO_PROCESSING_SETTINGS: VideoProcessingSettings = {
  worker: {
    enabled: true,
    maxWorkers: navigator?.hardwareConcurrency || 4,
    taskTimeout: 60000, // 1 minute
    idleTimeout: 30000, // 30 seconds
  },
  gpu: {
    enabled: true,
    preferWebGL2: true,
    fallbackToCPU: true,
  },
  codec: {
    preferredVideoCodec: 'auto',
    preferredAudioCodec: 'auto',
    useHardwareAcceleration: true,
    enableFFmpegWasm: true,
  },
  progressiveLoading: {
    enabled: true,
    preloadSegments: 3,
    thumbnailCount: 20,
    thumbnailWidth: 160,
    thumbnailHeight: 90,
    initialQuality: 'preview',
  },
  export: {
    defaultPresetId: 'youtube-1080p',
    showAdvancedOptions: false,
    autoEstimateFileSize: true,
    confirmBeforeExport: true,
  },
  timeline: {
    defaultZoom: 1,
    snapToGrid: true,
    gridSize: 100, // 100ms
    showWaveform: true,
    showThumbnails: true,
    autoScroll: true,
  },
  keyframeEditor: {
    defaultEasing: 'ease-in-out',
    defaultInterpolation: 'linear',
    showGraph: true,
    graphHeight: 150,
  },
};
