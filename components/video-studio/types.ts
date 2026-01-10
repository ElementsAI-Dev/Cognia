import type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
  VideoStatus,
} from '@/types/video';

// Studio modes
export type StudioMode = 'recording' | 'ai-generation';

// Video job interface for AI generation
export interface VideoJob {
  id: string;
  jobId?: string;
  prompt: string;
  provider: VideoProvider;
  model: VideoModel;
  status: VideoStatus;
  progress: number;
  videoUrl?: string;
  videoBase64?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
  settings: {
    resolution: VideoResolution;
    aspectRatio: VideoAspectRatio;
    duration: VideoDuration;
    style: VideoStyle;
    fps?: number;
  };
  isFavorite?: boolean;
}

// AI Generation settings
export interface AIGenerationSettings {
  provider: VideoProvider;
  model: VideoModel;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  style: VideoStyle;
  fps: number;
  enhancePrompt: boolean;
  includeAudio: boolean;
  audioPrompt: string;
  seed?: number;
}

// Recording export state
export interface ExportState {
  isExporting: boolean;
  progress: number;
  message: string;
}
