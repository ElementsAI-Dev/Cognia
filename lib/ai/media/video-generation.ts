/**
 * Video Generation - Multi-provider video generation support
 * 
 * Supported providers:
 * - Google Veo (veo-3, veo-3.1)
 * - OpenAI Sora (sora-1, sora-turbo)
 * 
 * Features:
 * - Text-to-video generation
 * - Image-to-video generation
 * - Async job management with polling
 * - Progress tracking
 * - Multiple resolutions and aspect ratios
 */

import OpenAI from 'openai';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import type {
  VideoProvider,
  VideoModel,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoGenerationJob,
  GeneratedVideo,
  VideoStatus,
  VideoResolution,
  VideoAspectRatio,
} from '@/types/video';
import {
  VIDEO_PROVIDERS,
  getVideoModelConfig,
  parseDurationToSeconds,
  getResolutionDimensions,
  estimateVideoCost,
} from '@/types/video';

/**
 * In-memory job storage for tracking async video generation
 */
const activeJobs = new Map<string, VideoGenerationJob>();

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `video_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validate generation options against model capabilities
 */
export function validateVideoOptions(
  provider: VideoProvider,
  model: VideoModel,
  options: VideoGenerationOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const modelConfig = getVideoModelConfig(provider, model);

  if (!modelConfig) {
    errors.push(`Unknown model: ${model} for provider ${provider}`);
    return { valid: false, errors };
  }

  // Validate resolution
  if (options.resolution && !modelConfig.supportedResolutions.includes(options.resolution)) {
    errors.push(`Resolution ${options.resolution} not supported. Supported: ${modelConfig.supportedResolutions.join(', ')}`);
  }

  // Validate aspect ratio
  if (options.aspectRatio && !modelConfig.supportedAspectRatios.includes(options.aspectRatio)) {
    errors.push(`Aspect ratio ${options.aspectRatio} not supported. Supported: ${modelConfig.supportedAspectRatios.join(', ')}`);
  }

  // Validate duration
  if (options.duration && !modelConfig.supportedDurations.includes(options.duration)) {
    errors.push(`Duration ${options.duration} not supported. Supported: ${modelConfig.supportedDurations.join(', ')}`);
  }

  // Validate image-to-video support
  if ((options.referenceImageUrl || options.referenceImageBase64) && !modelConfig.supportsImageToVideo) {
    errors.push(`Image-to-video generation not supported by ${model}`);
  }

  // Validate audio support
  if (options.includeAudio && !modelConfig.supportsAudio) {
    errors.push(`Audio generation not supported by ${model}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get default options for a model
 */
export function getDefaultVideoOptions(
  provider: VideoProvider,
  model: VideoModel
): Partial<VideoGenerationOptions> {
  const modelConfig = getVideoModelConfig(provider, model);
  if (!modelConfig) return {};

  return {
    provider,
    model,
    resolution: modelConfig.supportedResolutions[1] || modelConfig.supportedResolutions[0],
    aspectRatio: '16:9',
    duration: modelConfig.supportedDurations[1] || modelConfig.supportedDurations[0],
    fps: 24,
    enhancePrompt: modelConfig.supportsEnhancedPrompt,
  };
}

/**
 * Generate video using the specified provider
 */
export async function generateVideo(
  apiKey: string,
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const provider = options.provider || 'google-veo';
  const providerConfig = VIDEO_PROVIDERS[provider];
  const model = options.model || providerConfig.defaultModel;

  // Validate options
  const validation = validateVideoOptions(provider, model, options);
  if (!validation.valid) {
    return {
      success: false,
      status: 'failed',
      provider,
      model,
      prompt: options.prompt,
      error: validation.errors.join('; '),
    };
  }

  try {
    switch (provider) {
      case 'google-veo':
        return await generateVideoWithGoogleVeo(apiKey, options, model);
      case 'openai-sora':
        return await generateVideoWithOpenAISora(apiKey, options, model);
      default:
        return {
          success: false,
          status: 'failed',
          provider,
          model,
          prompt: options.prompt,
          error: `Unsupported provider: ${provider}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      provider,
      model,
      prompt: options.prompt,
      error: error instanceof Error ? error.message : 'Video generation failed',
    };
  }
}

/**
 * Generate video using Google Veo via Vertex AI
 */
async function generateVideoWithGoogleVeo(
  apiKey: string,
  options: VideoGenerationOptions,
  model: VideoModel
): Promise<VideoGenerationResult> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

  if (!projectId) {
    return {
      success: false,
      status: 'failed',
      provider: 'google-veo',
      model,
      prompt: options.prompt,
      error: 'Google Cloud project not configured. Set GOOGLE_CLOUD_PROJECT environment variable.',
    };
  }

  const resolution = options.resolution || '1080p';
  const aspectRatio = options.aspectRatio || '16:9';
  const duration = options.duration || '10s';
  const durationSeconds = parseDurationToSeconds(duration);
  const { width, height } = getResolutionDimensions(resolution, aspectRatio);

  // Create generation job
  const jobId = generateJobId();
  const job: VideoGenerationJob = {
    id: jobId,
    provider: 'google-veo',
    model,
    prompt: options.prompt,
    options,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  activeJobs.set(jobId, job);

  try {
    // Vertex AI Video Generation endpoint
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateVideo`;

    // Build request body
    const requestBody: Record<string, unknown> = {
      instances: [
        {
          prompt: options.prompt,
        },
      ],
      parameters: {
        aspectRatio,
        durationSeconds,
        outputWidth: width,
        outputHeight: height,
        fps: options.fps || 24,
        enhancePrompt: options.enhancePrompt ?? true,
      },
    };

    // Add reference image if provided
    if (options.referenceImageUrl) {
      (requestBody.instances as Record<string, unknown>[])[0].image = {
        gcsUri: options.referenceImageUrl,
      };
    } else if (options.referenceImageBase64) {
      (requestBody.instances as Record<string, unknown>[])[0].image = {
        bytesBase64Encoded: options.referenceImageBase64,
      };
    }

    // Add negative prompt if provided
    if (options.negativePrompt) {
      (requestBody.parameters as Record<string, unknown>).negativePrompt = options.negativePrompt;
    }

    // Add seed if provided
    if (options.seed !== undefined) {
      (requestBody.parameters as Record<string, unknown>).seed = options.seed;
    }

    // Add audio settings for Veo 3.1
    if (model === 'veo-3.1' && options.includeAudio) {
      (requestBody.parameters as Record<string, unknown>).generateAudio = true;
      if (options.audioPrompt) {
        (requestBody.parameters as Record<string, unknown>).audioPrompt = options.audioPrompt;
      }
    }

    // Make the API request
    const response = await proxyFetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      updateJobStatus(jobId, 'failed', 0, `Veo API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        jobId,
        status: 'failed',
        provider: 'google-veo',
        model,
        prompt: options.prompt,
        error: `Veo API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();

    // Check if this is an async operation (long-running)
    if (data.name && !data.videos) {
      // This is an async operation, return the job ID for polling
      updateJobStatus(jobId, 'processing', 10);
      return {
        success: true,
        jobId,
        status: 'processing',
        provider: 'google-veo',
        model,
        prompt: options.prompt,
        progress: 10,
        usage: {
          estimatedCost: estimateVideoCost('google-veo', model, durationSeconds),
        },
      };
    }

    // Synchronous response with video data
    const videoData = data.videos?.[0] || data.predictions?.[0];
    if (!videoData) {
      updateJobStatus(jobId, 'failed', 0, 'No video returned from Veo API');
      return {
        success: false,
        jobId,
        status: 'failed',
        provider: 'google-veo',
        model,
        prompt: options.prompt,
        error: 'No video returned from Veo API',
      };
    }

    const generatedVideo: GeneratedVideo = {
      id: jobId,
      url: videoData.uri || videoData.gcsUri,
      base64: videoData.bytesBase64Encoded,
      thumbnailBase64: videoData.thumbnailBytesBase64Encoded,
      durationSeconds,
      width,
      height,
      fps: options.fps || 24,
      mimeType: 'video/mp4',
      revisedPrompt: videoData.revisedPrompt,
      createdAt: new Date(),
    };

    updateJobStatus(jobId, 'completed', 100, undefined, generatedVideo);

    return {
      success: true,
      video: generatedVideo,
      jobId,
      status: 'completed',
      provider: 'google-veo',
      model,
      prompt: options.prompt,
      progress: 100,
      usage: {
        estimatedCost: estimateVideoCost('google-veo', model, durationSeconds),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Google Veo generation failed';
    updateJobStatus(jobId, 'failed', 0, errorMessage);
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: 'google-veo',
      model,
      prompt: options.prompt,
      error: errorMessage,
    };
  }
}

/**
 * Generate video using OpenAI Sora
 */
async function generateVideoWithOpenAISora(
  apiKey: string,
  options: VideoGenerationOptions,
  model: VideoModel
): Promise<VideoGenerationResult> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const resolution = options.resolution || '1080p';
  const aspectRatio = options.aspectRatio || '16:9';
  const duration = options.duration || '10s';
  const durationSeconds = parseDurationToSeconds(duration);
  const { width, height } = getResolutionDimensions(resolution, aspectRatio);

  // Create generation job
  const jobId = generateJobId();
  const job: VideoGenerationJob = {
    id: jobId,
    provider: 'openai-sora',
    model,
    prompt: options.prompt,
    options,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  activeJobs.set(jobId, job);

  try {
    // Note: OpenAI Sora API is not yet publicly available
    // This implementation is based on expected API structure
    // The actual API may differ when released
    
    // Build request for Sora API
    const requestBody: Record<string, unknown> = {
      model,
      prompt: options.prompt,
      size: `${width}x${height}`,
      duration: durationSeconds,
      fps: options.fps || 24,
    };

    // Add reference image if provided
    if (options.referenceImageUrl) {
      requestBody.image = options.referenceImageUrl;
    } else if (options.referenceImageBase64) {
      requestBody.image = `data:image/png;base64,${options.referenceImageBase64}`;
    }

    // Add style if provided
    if (options.style) {
      requestBody.style = options.style;
    }

    // Add seed if provided
    if (options.seed !== undefined) {
      requestBody.seed = options.seed;
    }

    // Use the videos endpoint (expected API structure)
    // @ts-expect-error - Sora API not yet in OpenAI SDK types
    const response = await openai.videos?.generate?.(requestBody) || 
      await proxyFetch('https://api.openai.com/v1/videos/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }).then(res => res.json());

    // Check for async operation
    if (response.id && response.status === 'processing') {
      updateJobStatus(jobId, 'processing', 10);
      return {
        success: true,
        jobId: response.id || jobId,
        status: 'processing',
        provider: 'openai-sora',
        model,
        prompt: options.prompt,
        progress: 10,
        usage: {
          estimatedCost: estimateVideoCost('openai-sora', model, durationSeconds),
        },
      };
    }

    // Direct response with video
    const videoData = response.data?.[0] || response;
    if (!videoData?.url && !videoData?.b64_json) {
      updateJobStatus(jobId, 'failed', 0, 'No video returned from Sora API');
      return {
        success: false,
        jobId,
        status: 'failed',
        provider: 'openai-sora',
        model,
        prompt: options.prompt,
        error: 'No video returned from Sora API',
      };
    }

    const generatedVideo: GeneratedVideo = {
      id: jobId,
      url: videoData.url,
      base64: videoData.b64_json,
      thumbnailUrl: videoData.thumbnail_url,
      durationSeconds,
      width,
      height,
      fps: options.fps || 24,
      mimeType: 'video/mp4',
      revisedPrompt: videoData.revised_prompt,
      createdAt: new Date(),
    };

    updateJobStatus(jobId, 'completed', 100, undefined, generatedVideo);

    return {
      success: true,
      video: generatedVideo,
      jobId,
      status: 'completed',
      provider: 'openai-sora',
      model,
      prompt: options.prompt,
      progress: 100,
      usage: {
        estimatedCost: estimateVideoCost('openai-sora', model, durationSeconds),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'OpenAI Sora generation failed';
    updateJobStatus(jobId, 'failed', 0, errorMessage);
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: 'openai-sora',
      model,
      prompt: options.prompt,
      error: errorMessage,
    };
  }
}

/**
 * Update job status in the active jobs map
 */
function updateJobStatus(
  jobId: string,
  status: VideoStatus,
  progress: number,
  error?: string,
  result?: GeneratedVideo
): void {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = status;
    job.progress = progress;
    job.updatedAt = new Date();
    if (error) job.error = error;
    if (result) {
      job.result = result;
      job.completedAt = new Date();
    }
  }
}

/**
 * Check the status of a video generation job
 */
export async function checkVideoGenerationStatus(
  apiKey: string,
  jobId: string,
  provider: VideoProvider
): Promise<VideoGenerationResult> {
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return {
      success: false,
      status: 'failed',
      provider,
      model: 'veo-3.1',
      prompt: '',
      error: `Job ${jobId} not found`,
    };
  }

  // If job is already completed or failed, return cached result
  if (job.status === 'completed' || job.status === 'failed') {
    return {
      success: job.status === 'completed',
      video: job.result,
      jobId,
      status: job.status,
      provider: job.provider,
      model: job.model,
      prompt: job.prompt,
      progress: job.progress,
      error: job.error,
    };
  }

  // Poll the provider for status update
  try {
    if (provider === 'google-veo') {
      return await pollGoogleVeoStatus(apiKey, jobId, job);
    } else if (provider === 'openai-sora') {
      return await pollOpenAISoraStatus(apiKey, jobId, job);
    }
  } catch (error) {
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: job.provider,
      model: job.model,
      prompt: job.prompt,
      error: error instanceof Error ? error.message : 'Failed to check status',
    };
  }

  return {
    success: false,
    jobId,
    status: job.status,
    provider: job.provider,
    model: job.model,
    prompt: job.prompt,
    progress: job.progress,
  };
}

/**
 * Poll Google Veo for job status
 */
async function pollGoogleVeoStatus(
  apiKey: string,
  jobId: string,
  job: VideoGenerationJob
): Promise<VideoGenerationResult> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

  if (!projectId) {
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: 'google-veo',
      model: job.model,
      prompt: job.prompt,
      error: 'Google Cloud project not configured',
    };
  }

  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/operations/${jobId}`;

  const response = await proxyFetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: 'google-veo',
      model: job.model,
      prompt: job.prompt,
      error: `Status check failed: ${response.status} - ${errorText}`,
    };
  }

  const data = await response.json();

  if (data.done) {
    if (data.error) {
      updateJobStatus(jobId, 'failed', 0, data.error.message);
      return {
        success: false,
        jobId,
        status: 'failed',
        provider: 'google-veo',
        model: job.model,
        prompt: job.prompt,
        error: data.error.message,
      };
    }

    const videoData = data.response?.videos?.[0];
    if (videoData) {
      const resolution = job.options.resolution || '1080p';
      const aspectRatio = job.options.aspectRatio || '16:9';
      const { width, height } = getResolutionDimensions(resolution, aspectRatio);

      const generatedVideo: GeneratedVideo = {
        id: jobId,
        url: videoData.uri || videoData.gcsUri,
        base64: videoData.bytesBase64Encoded,
        durationSeconds: parseDurationToSeconds(job.options.duration || '10s'),
        width,
        height,
        fps: job.options.fps || 24,
        mimeType: 'video/mp4',
        revisedPrompt: videoData.revisedPrompt,
        createdAt: new Date(),
      };

      updateJobStatus(jobId, 'completed', 100, undefined, generatedVideo);

      return {
        success: true,
        video: generatedVideo,
        jobId,
        status: 'completed',
        provider: 'google-veo',
        model: job.model,
        prompt: job.prompt,
        progress: 100,
      };
    }
  }

  // Still processing
  const progress = data.metadata?.progressPercent || job.progress + 10;
  updateJobStatus(jobId, 'processing', Math.min(progress, 90));

  return {
    success: true,
    jobId,
    status: 'processing',
    provider: 'google-veo',
    model: job.model,
    prompt: job.prompt,
    progress: Math.min(progress, 90),
  };
}

/**
 * Poll OpenAI Sora for job status
 */
async function pollOpenAISoraStatus(
  apiKey: string,
  jobId: string,
  job: VideoGenerationJob
): Promise<VideoGenerationResult> {
  const response = await proxyFetch(`https://api.openai.com/v1/videos/generations/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: 'openai-sora',
      model: job.model,
      prompt: job.prompt,
      error: `Status check failed: ${response.status} - ${errorText}`,
    };
  }

  const data = await response.json();

  if (data.status === 'succeeded' || data.status === 'completed') {
    const videoData = data.data?.[0] || data;
    const resolution = job.options.resolution || '1080p';
    const aspectRatio = job.options.aspectRatio || '16:9';
    const { width, height } = getResolutionDimensions(resolution, aspectRatio);

    const generatedVideo: GeneratedVideo = {
      id: jobId,
      url: videoData.url,
      base64: videoData.b64_json,
      durationSeconds: parseDurationToSeconds(job.options.duration || '10s'),
      width,
      height,
      fps: job.options.fps || 24,
      mimeType: 'video/mp4',
      revisedPrompt: videoData.revised_prompt,
      createdAt: new Date(),
    };

    updateJobStatus(jobId, 'completed', 100, undefined, generatedVideo);

    return {
      success: true,
      video: generatedVideo,
      jobId,
      status: 'completed',
      provider: 'openai-sora',
      model: job.model,
      prompt: job.prompt,
      progress: 100,
    };
  }

  if (data.status === 'failed') {
    updateJobStatus(jobId, 'failed', 0, data.error?.message || 'Generation failed');
    return {
      success: false,
      jobId,
      status: 'failed',
      provider: 'openai-sora',
      model: job.model,
      prompt: job.prompt,
      error: data.error?.message || 'Generation failed',
    };
  }

  // Still processing
  const progress = data.progress || job.progress + 10;
  updateJobStatus(jobId, 'processing', Math.min(progress, 90));

  return {
    success: true,
    jobId,
    status: 'processing',
    provider: 'openai-sora',
    model: job.model,
    prompt: job.prompt,
    progress: Math.min(progress, 90),
  };
}

/**
 * Cancel a video generation job
 */
export async function cancelVideoGeneration(
  apiKey: string,
  jobId: string,
  provider: VideoProvider
): Promise<boolean> {
  const job = activeJobs.get(jobId);
  if (!job) return false;

  try {
    if (provider === 'google-veo') {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
      
      if (projectId) {
        await proxyFetch(
          `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/operations/${jobId}:cancel`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          }
        );
      }
    } else if (provider === 'openai-sora') {
      await proxyFetch(`https://api.openai.com/v1/videos/generations/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
    }

    updateJobStatus(jobId, 'cancelled', job.progress);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all active jobs
 */
export function getActiveVideoJobs(): VideoGenerationJob[] {
  return Array.from(activeJobs.values()).filter(
    job => job.status === 'pending' || job.status === 'processing'
  );
}

/**
 * Get job by ID
 */
export function getVideoJob(jobId: string): VideoGenerationJob | undefined {
  return activeJobs.get(jobId);
}

/**
 * Clear completed/failed jobs from memory
 */
export function clearCompletedVideoJobs(): number {
  let cleared = 0;
  for (const [jobId, job] of activeJobs.entries()) {
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      activeJobs.delete(jobId);
      cleared++;
    }
  }
  return cleared;
}

/**
 * Download video from URL
 */
export async function downloadVideoAsBlob(url: string): Promise<Blob> {
  const response = await proxyFetch(url);
  return response.blob();
}

/**
 * Save video to file (browser)
 */
export function saveVideoToFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert base64 to video blob
 */
export function base64ToVideoBlob(base64: string, mimeType: string = 'video/mp4'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert base64 to data URL
 */
export function base64ToVideoDataUrl(base64: string, mimeType: string = 'video/mp4'): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get available video models for UI
 */
export function getAvailableVideoModelsForUI(): Array<{
  id: VideoModel;
  name: string;
  provider: VideoProvider;
  providerName: string;
  maxDuration: number;
  supportedResolutions: VideoResolution[];
  supportedAspectRatios: VideoAspectRatio[];
  supportsImageToVideo: boolean;
  supportsAudio: boolean;
}> {
  const models: Array<{
    id: VideoModel;
    name: string;
    provider: VideoProvider;
    providerName: string;
    maxDuration: number;
    supportedResolutions: VideoResolution[];
    supportedAspectRatios: VideoAspectRatio[];
    supportsImageToVideo: boolean;
    supportsAudio: boolean;
  }> = [];

  for (const [providerId, providerConfig] of Object.entries(VIDEO_PROVIDERS)) {
    for (const modelConfig of providerConfig.models) {
      models.push({
        id: modelConfig.id,
        name: modelConfig.name,
        provider: providerId as VideoProvider,
        providerName: providerConfig.name,
        maxDuration: modelConfig.maxDurationSeconds,
        supportedResolutions: modelConfig.supportedResolutions,
        supportedAspectRatios: modelConfig.supportedAspectRatios,
        supportsImageToVideo: modelConfig.supportsImageToVideo,
        supportsAudio: modelConfig.supportsAudio,
      });
    }
  }

  return models;
}
