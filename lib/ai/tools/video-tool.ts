/**
 * Video Generation Tool - AI tool for generating videos
 * 
 * Provides tools for:
 * - Text-to-video generation
 * - Image-to-video generation
 * - Video generation status checking
 * 
 * Supports providers:
 * - Google Veo (veo-3, veo-3.1)
 * - OpenAI Sora (sora-1, sora-turbo)
 */

import { z } from 'zod';
import type { ToolDefinition } from './registry';
import {
  generateVideo,
  checkVideoGenerationStatus,
  getAvailableVideoModelsForUI,
} from '../media/video-generation';
import type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
  VideoGenerationResult,
} from '@/types/video';

/**
 * Video generation input schema
 */
export const videoGenerateInputSchema = z.object({
  prompt: z.string().min(1).describe('Text prompt describing the video to generate'),
  provider: z.enum(['google-veo', 'openai-sora']).optional().describe('Video generation provider (default: google-veo)'),
  model: z.enum(['veo-3', 'veo-3.1', 'sora-1', 'sora-turbo']).optional().describe('Model to use for generation'),
  resolution: z.enum(['480p', '720p', '1080p', '4k']).optional().describe('Output resolution (default: 1080p)'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']).optional().describe('Aspect ratio (default: 16:9)'),
  duration: z.enum(['5s', '10s', '15s', '20s', '30s', '60s']).optional().describe('Video duration (default: 10s)'),
  style: z.enum(['cinematic', 'documentary', 'animation', 'timelapse', 'slowmotion', 'natural', 'artistic', 'commercial']).optional().describe('Visual style'),
  negativePrompt: z.string().optional().describe('Things to avoid in the video'),
  seed: z.number().optional().describe('Seed for reproducibility'),
  fps: z.number().min(12).max(60).optional().describe('Frames per second (default: 24)'),
  enhancePrompt: z.boolean().optional().describe('Whether to enhance the prompt with AI (default: true)'),
  referenceImageUrl: z.string().url().optional().describe('Reference image URL for image-to-video generation'),
  includeAudio: z.boolean().optional().describe('Whether to include generated audio (Veo 3.1 only)'),
  audioPrompt: z.string().optional().describe('Audio description for synchronized audio generation'),
});

export type VideoGenerateInput = z.infer<typeof videoGenerateInputSchema>;

/**
 * Video status check input schema
 */
export const videoStatusInputSchema = z.object({
  jobId: z.string().describe('The job ID returned from video generation'),
  provider: z.enum(['google-veo', 'openai-sora']).describe('Video generation provider'),
});

export type VideoStatusInput = z.infer<typeof videoStatusInputSchema>;

/**
 * Video tool result interface
 */
export interface VideoToolResult {
  success: boolean;
  data?: {
    jobId?: string;
    status?: string;
    progress?: number;
    videoUrl?: string;
    videoBase64?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
    revisedPrompt?: string;
    estimatedCost?: number;
    provider?: string;
    model?: string;
  };
  error?: string;
}

/**
 * Execute video generation
 */
export async function executeVideoGenerate(
  input: VideoGenerateInput,
  apiKey: string
): Promise<VideoToolResult> {
  try {
    const result = await generateVideo(apiKey, {
      prompt: input.prompt,
      provider: input.provider as VideoProvider | undefined,
      model: input.model as VideoModel | undefined,
      resolution: input.resolution as VideoResolution | undefined,
      aspectRatio: input.aspectRatio as VideoAspectRatio | undefined,
      duration: input.duration as VideoDuration | undefined,
      style: input.style as VideoStyle | undefined,
      negativePrompt: input.negativePrompt,
      seed: input.seed,
      fps: input.fps,
      enhancePrompt: input.enhancePrompt,
      referenceImageUrl: input.referenceImageUrl,
      includeAudio: input.includeAudio,
      audioPrompt: input.audioPrompt,
    });

    return formatVideoResult(result);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate video',
    };
  }
}

/**
 * Execute video status check
 */
export async function executeVideoStatus(
  input: VideoStatusInput,
  apiKey: string
): Promise<VideoToolResult> {
  try {
    const result = await checkVideoGenerationStatus(
      apiKey,
      input.jobId,
      input.provider as VideoProvider
    );

    return formatVideoResult(result);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check video status',
    };
  }
}

/**
 * Format video generation result for tool output
 */
function formatVideoResult(result: VideoGenerationResult): VideoToolResult {
  if (!result.success && result.status === 'failed') {
    return {
      success: false,
      error: result.error || 'Video generation failed',
    };
  }

  const data: VideoToolResult['data'] = {
    jobId: result.jobId,
    status: result.status,
    progress: result.progress,
    provider: result.provider,
    model: result.model,
  };

  if (result.video) {
    data.videoUrl = result.video.url;
    data.videoBase64 = result.video.base64;
    data.thumbnailUrl = result.video.thumbnailUrl;
    data.durationSeconds = result.video.durationSeconds;
    data.width = result.video.width;
    data.height = result.video.height;
    data.revisedPrompt = result.video.revisedPrompt;
  }

  if (result.usage) {
    data.estimatedCost = result.usage.estimatedCost;
  }

  return {
    success: true,
    data,
  };
}

/**
 * Get available video models tool
 */
export function executeGetVideoModels(): VideoToolResult {
  try {
    const models = getAvailableVideoModelsForUI();
    return {
      success: true,
      data: {
        // @ts-expect-error - extending data for models list
        models: models.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          providerName: m.providerName,
          maxDuration: m.maxDuration,
          supportedResolutions: m.supportedResolutions,
          supportedAspectRatios: m.supportedAspectRatios,
          supportsImageToVideo: m.supportsImageToVideo,
          supportsAudio: m.supportsAudio,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video models',
    };
  }
}

/**
 * Video generation tool definition
 */
export const videoGenerateTool: ToolDefinition<typeof videoGenerateInputSchema> = {
  name: 'video_generate',
  description: `Generate a video from a text prompt using AI. Supports Google Veo (veo-3, veo-3.1) and OpenAI Sora (sora-1, sora-turbo).

Features:
- Text-to-video generation
- Image-to-video generation (provide referenceImageUrl)
- Multiple resolutions (480p to 4K)
- Various aspect ratios (16:9, 9:16, 1:1, etc.)
- Durations from 5s to 60s
- Visual styles (cinematic, animation, documentary, etc.)
- Audio generation (Veo 3.1 only)

Returns a jobId for async operations. Use video_status to check progress.`,
  parameters: videoGenerateInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    return (input: unknown) => executeVideoGenerate(input as VideoGenerateInput, apiKey);
  },
};

/**
 * Video status tool definition
 */
export const videoStatusTool: ToolDefinition<typeof videoStatusInputSchema> = {
  name: 'video_status',
  description: 'Check the status of a video generation job. Returns progress percentage and video URL when complete.',
  parameters: videoStatusInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    return (input: unknown) => executeVideoStatus(input as VideoStatusInput, apiKey);
  },
};

/**
 * Video tools collection
 */
export const videoTools = {
  video_generate: videoGenerateTool,
  video_status: videoStatusTool,
};

/**
 * Register video tools to a registry
 */
export function registerVideoTools(
  registry: { register: (tool: ToolDefinition) => void }
): void {
  registry.register(videoGenerateTool);
  registry.register(videoStatusTool);
}
