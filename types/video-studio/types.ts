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
  effects: Array<string | VideoEffectInstance>; // Legacy string[] is still supported
  transition?: {
    type: string;
    duration: number;
    params?: Record<string, unknown>;
  };
}

export interface VideoEffectKeyframe {
  id: string;
  time: number;
  value: unknown;
  interpolation?: 'linear' | 'bezier' | 'hold' | 'step';
}

export interface VideoEffectInstance {
  id: string;
  effectId: string;
  enabled: boolean;
  params: Record<string, unknown>;
  keyframes?: Record<string, VideoEffectKeyframe[]>;
}

export interface VideoTransitionInstance {
  id: string;
  type: string;
  duration: number;
  params?: Record<string, unknown>;
  fromClipId: string;
  toClipId: string;
}

export interface TimelineMarker {
  id: string;
  time: number;
  name?: string;
  label?: string;
  type?: 'marker' | 'chapter' | 'note' | 'todo';
  description?: string;
  completed?: boolean;
  color?: string;
}

export interface TimelineLayer {
  id: string;
  name: string;
  type: 'video' | 'image' | 'text' | 'overlay' | 'shape' | 'subtitle' | 'audio' | 'group';
  visible: boolean;
  locked: boolean;
  opacity: number;
  startTime: number;
  duration: number;
  zIndex: number;
  payload?: Record<string, unknown>;
}

export interface SubtitleTrackBinding {
  id: string;
  trackId: string;
  source?: string;
  format?: 'srt' | 'vtt' | 'ass' | 'ssa';
  burnIn?: boolean;
  offsetMs?: number;
}

export interface AudioMixTrack {
  id: string;
  sourceTrackId?: string;
  sourceClipId?: string;
  volume: number;
  muted: boolean;
  pan?: number;
  solo?: boolean;
}

export interface MediaProjectTimelineV2 {
  version: 2;
  duration: number;
  tracks: VideoTrack[];
  transitions: VideoTransitionInstance[];
  markers: TimelineMarker[];
  layers: TimelineLayer[];
  subtitleBindings: SubtitleTrackBinding[];
  audioMix: AudioMixTrack[];
  exportDefaults?: {
    format?: 'mp4' | 'webm' | 'gif';
    resolution?: '480p' | '720p' | '1080p' | '4k';
    fps?: number;
    quality?: 'low' | 'medium' | 'high' | 'maximum';
  };
}

export function isVideoEffectInstance(
  value: string | VideoEffectInstance
): value is VideoEffectInstance {
  return typeof value !== 'string';
}

export function normalizeClipEffects(
  effects: Array<string | VideoEffectInstance>
): VideoEffectInstance[] {
  return effects.map((effect, index) => {
    if (typeof effect === 'string') {
      return {
        id: `legacy-${index}-${effect}`,
        effectId: effect,
        enabled: true,
        params: {},
      };
    }
    return effect;
  });
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
