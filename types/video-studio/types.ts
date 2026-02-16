import type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
  VideoStatus,
} from '@/types/media/video';

// ─── Core Video Editing Types ───────────────────────────────────────────────

export interface VideoClip {
  id: string;
  name: string;
  sourceUrl: string;
  sourceThumbnail?: string;
  trackIndex: number;
  startTime: number; // Position in timeline (seconds)
  duration: number; // Duration in timeline (seconds)
  sourceStartTime: number; // Start position in source video
  sourceEndTime: number; // End position in source video
  volume: number; // 0-1
  playbackSpeed: number; // 0.25-4
  muted: boolean;
  locked: boolean;
  effects: string[]; // Applied effect IDs
  transition?: {
    type: string;
    duration: number;
    params?: Record<string, unknown>;
  };
}

export interface VideoTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'overlay';
  clips: VideoClip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume: number; // For audio tracks
  height: number; // Track height in UI
}

export interface VideoEditorState {
  isLoading: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  zoom: number; // Timeline zoom level
  tracks: VideoTrack[];
  selectedClipIds: string[];
  selectedTrackId: string | null;
  previewUrl: string | null;
}

// ─── Editor UI Types ────────────────────────────────────────────────────────

export type EditorMode = 'timeline' | 'trim' | 'effects' | 'transitions' | 'subtitles' | 'color' | 'speed' | 'markers' | 'audio' | 'layers';
export type SidePanelTab = 'effects' | 'color' | 'audio' | 'layers';

// ─── Studio Types ───────────────────────────────────────────────────────────

// Studio modes
export type StudioMode = 'recording' | 'ai-generation' | 'editor';

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
