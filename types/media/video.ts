/**
 * Video Generation type definitions
 *
 * Supports AI video generation providers:
 * - Google Veo (veo-3, veo-3.1)
 * - OpenAI Sora
 */

export type VideoProvider = 'google-veo' | 'openai-sora';

export type VideoModel = 'veo-3' | 'veo-3.1' | 'sora-1' | 'sora-turbo';

export type VideoResolution = '480p' | '720p' | '1080p' | '4k';

export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';

export type VideoDuration = '5s' | '10s' | '15s' | '20s' | '30s' | '60s';

export type VideoStyle =
  | 'cinematic'
  | 'documentary'
  | 'animation'
  | 'timelapse'
  | 'slowmotion'
  | 'natural'
  | 'artistic'
  | 'commercial';

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface VideoGenerationOptions {
  /** Text prompt describing the video to generate */
  prompt: string;
  /** Video generation provider */
  provider?: VideoProvider;
  /** Model to use for generation */
  model?: VideoModel;
  /** Output resolution */
  resolution?: VideoResolution;
  /** Aspect ratio of the output video */
  aspectRatio?: VideoAspectRatio;
  /** Duration of the video */
  duration?: VideoDuration;
  /** Visual style of the video */
  style?: VideoStyle;
  /** Negative prompt - things to avoid */
  negativePrompt?: string;
  /** Seed for reproducibility */
  seed?: number;
  /** Number of frames per second */
  fps?: number;
  /** Whether to enhance the prompt with AI */
  enhancePrompt?: boolean;
  /** Reference image URL for image-to-video generation */
  referenceImageUrl?: string;
  /** Reference image base64 for image-to-video generation */
  referenceImageBase64?: string;
  /** Audio prompt for synchronized audio generation */
  audioPrompt?: string;
  /** Whether to include audio in the output */
  includeAudio?: boolean;
}

export interface GeneratedVideo {
  /** Unique identifier for the generated video */
  id: string;
  /** URL to the generated video */
  url?: string;
  /** Base64 encoded video data */
  base64?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Thumbnail base64 */
  thumbnailBase64?: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Frames per second */
  fps: number;
  /** File size in bytes */
  fileSizeBytes?: number;
  /** MIME type */
  mimeType: string;
  /** Revised prompt used by the model */
  revisedPrompt?: string;
  /** Generation timestamp */
  createdAt: Date;
}

export interface VideoGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated video data */
  video?: GeneratedVideo;
  /** Generation job ID for async operations */
  jobId?: string;
  /** Current status of the generation */
  status: VideoStatus;
  /** Provider used */
  provider: VideoProvider;
  /** Model used */
  model: VideoModel;
  /** Original prompt */
  prompt: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Error message if failed */
  error?: string;
  /** Usage information */
  usage?: VideoGenerationUsage;
}

export interface VideoGenerationUsage {
  /** Number of tokens used for prompt */
  promptTokens?: number;
  /** Duration billed */
  durationBilled?: number;
  /** Estimated cost in USD */
  estimatedCost?: number;
}

export interface VideoGenerationJob {
  /** Job ID */
  id: string;
  /** Provider */
  provider: VideoProvider;
  /** Model */
  model: VideoModel;
  /** Original prompt */
  prompt: string;
  /** Options used */
  options: VideoGenerationOptions;
  /** Current status */
  status: VideoStatus;
  /** Progress percentage */
  progress: number;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Result when completed */
  result?: GeneratedVideo;
  /** Error if failed */
  error?: string;
}

export interface VideoModelConfig {
  id: VideoModel;
  name: string;
  provider: VideoProvider;
  supportedResolutions: VideoResolution[];
  supportedAspectRatios: VideoAspectRatio[];
  supportedDurations: VideoDuration[];
  maxDurationSeconds: number;
  supportsImageToVideo: boolean;
  supportsAudio: boolean;
  supportsEnhancedPrompt: boolean;
  pricing?: {
    perSecond: number;
    currency: string;
  };
}

export interface VideoProviderConfig {
  id: VideoProvider;
  name: string;
  apiKeyRequired: boolean;
  baseURLRequired: boolean;
  models: VideoModelConfig[];
  defaultModel: VideoModel;
  description?: string;
  website?: string;
  docsUrl?: string;
}

/**
 * Video provider configurations
 */
export const VIDEO_PROVIDERS: Record<VideoProvider, VideoProviderConfig> = {
  'google-veo': {
    id: 'google-veo',
    name: 'Google Veo',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'veo-3.1',
    description: "Google's state-of-the-art video generation model",
    website: 'https://deepmind.google/technologies/veo/',
    docsUrl: 'https://cloud.google.com/vertex-ai/docs/generative-ai/video/overview',
    models: [
      {
        id: 'veo-3',
        name: 'Veo 3',
        provider: 'google-veo',
        supportedResolutions: ['720p', '1080p'],
        supportedAspectRatios: ['16:9', '9:16', '1:1'],
        supportedDurations: ['5s', '10s', '15s', '20s'],
        maxDurationSeconds: 20,
        supportsImageToVideo: true,
        supportsAudio: false,
        supportsEnhancedPrompt: true,
        pricing: { perSecond: 0.05, currency: 'USD' },
      },
      {
        id: 'veo-3.1',
        name: 'Veo 3.1',
        provider: 'google-veo',
        supportedResolutions: ['720p', '1080p', '4k'],
        supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '21:9'],
        supportedDurations: ['5s', '10s', '15s', '20s', '30s'],
        maxDurationSeconds: 30,
        supportsImageToVideo: true,
        supportsAudio: true,
        supportsEnhancedPrompt: true,
        pricing: { perSecond: 0.08, currency: 'USD' },
      },
    ],
  },
  'openai-sora': {
    id: 'openai-sora',
    name: 'OpenAI Sora',
    apiKeyRequired: true,
    baseURLRequired: false,
    defaultModel: 'sora-1',
    description: "OpenAI's video generation model",
    website: 'https://openai.com/sora',
    docsUrl: 'https://platform.openai.com/docs/api-reference/videos',
    models: [
      {
        id: 'sora-1',
        name: 'Sora',
        provider: 'openai-sora',
        supportedResolutions: ['480p', '720p', '1080p'],
        supportedAspectRatios: ['16:9', '9:16', '1:1'],
        supportedDurations: ['5s', '10s', '15s', '20s'],
        maxDurationSeconds: 20,
        supportsImageToVideo: true,
        supportsAudio: false,
        supportsEnhancedPrompt: true,
        pricing: { perSecond: 0.1, currency: 'USD' },
      },
      {
        id: 'sora-turbo',
        name: 'Sora Turbo',
        provider: 'openai-sora',
        supportedResolutions: ['480p', '720p', '1080p'],
        supportedAspectRatios: ['16:9', '9:16', '1:1'],
        supportedDurations: ['5s', '10s', '15s'],
        maxDurationSeconds: 15,
        supportsImageToVideo: true,
        supportsAudio: false,
        supportsEnhancedPrompt: true,
        pricing: { perSecond: 0.05, currency: 'USD' },
      },
    ],
  },
};

/**
 * Get video provider configuration
 */
export function getVideoProviderConfig(providerId: VideoProvider): VideoProviderConfig | undefined {
  return VIDEO_PROVIDERS[providerId];
}

/**
 * Get video model configuration
 */
export function getVideoModelConfig(
  providerId: VideoProvider,
  modelId: VideoModel
): VideoModelConfig | undefined {
  const provider = VIDEO_PROVIDERS[providerId];
  return provider?.models.find((m) => m.id === modelId);
}

/**
 * Get all available video models
 */
export function getAvailableVideoModels(): VideoModelConfig[] {
  const models: VideoModelConfig[] = [];
  for (const provider of Object.values(VIDEO_PROVIDERS)) {
    models.push(...provider.models);
  }
  return models;
}

/**
 * Estimate video generation cost
 */
export function estimateVideoCost(
  provider: VideoProvider,
  model: VideoModel,
  durationSeconds: number
): number {
  const modelConfig = getVideoModelConfig(provider, model);
  if (!modelConfig?.pricing) return 0;
  return modelConfig.pricing.perSecond * durationSeconds;
}

/**
 * Parse duration string to seconds
 */
export function parseDurationToSeconds(duration: VideoDuration): number {
  return parseInt(duration.replace('s', ''), 10);
}

/**
 * Format seconds to duration string
 */
export function formatSecondsToDuration(seconds: number): VideoDuration {
  const validDurations: VideoDuration[] = ['5s', '10s', '15s', '20s', '30s', '60s'];
  const closest = validDurations.reduce((prev, curr) => {
    const prevDiff = Math.abs(parseDurationToSeconds(prev) - seconds);
    const currDiff = Math.abs(parseDurationToSeconds(curr) - seconds);
    return currDiff < prevDiff ? curr : prev;
  });
  return closest;
}

/**
 * Get resolution dimensions
 */
export function getResolutionDimensions(
  resolution: VideoResolution,
  aspectRatio: VideoAspectRatio
): { width: number; height: number } {
  const baseHeights: Record<VideoResolution, number> = {
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '4k': 2160,
  };

  const aspectRatios: Record<VideoAspectRatio, number> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
    '21:9': 21 / 9,
  };

  const height = baseHeights[resolution];
  const ratio = aspectRatios[aspectRatio];

  // For vertical videos, swap the calculation
  if (ratio < 1) {
    const width = height;
    return { width, height: Math.round(width / ratio) };
  }

  return {
    width: Math.round(height * ratio),
    height,
  };
}
