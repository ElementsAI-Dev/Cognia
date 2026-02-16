/**
 * Video Studio Hooks
 * Custom hooks for video editing functionality
 */

export * from './use-video-editor';
export * from './use-track-management';
export * from './use-playback';
export * from './use-clip-effects';
export * from './use-video-timeline';
export * from './use-video-subtitles';
export * from './use-recording-mode';
export * from './use-ai-generation-mode';
export {
  useWorkerProcessor as useVideoWorkerProcessor,
  type UseWorkerProcessorOptions as UseVideoWorkerProcessorOptions,
  type UseWorkerProcessorReturn as UseVideoWorkerProcessorReturn,
} from './use-worker-processor';
