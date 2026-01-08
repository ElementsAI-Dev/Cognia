/**
 * Media utilities for audio and video processing
 * Supports multimodal input for AI models that accept audio/video
 */

import { fileToBase64, urlToBase64, extractBase64 } from './image-utils';

// Supported audio formats based on OpenRouter and Google Gemini documentation
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/webm',
] as const;

// Supported video formats based on OpenRouter and Google Gemini documentation
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/quicktime',
  'video/webm',
  'video/avi',
  'video/x-msvideo',
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];
export type SupportedVideoFormat = typeof SUPPORTED_VIDEO_FORMATS[number];

/**
 * Check if a file is an audio file
 */
export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if a file is a video file
 */
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if an audio format is supported
 */
export function isSupportedAudioFormat(mimeType: string): boolean {
  return SUPPORTED_AUDIO_FORMATS.some(format => 
    mimeType.toLowerCase() === format || mimeType.toLowerCase().startsWith(format.split('/')[0] + '/')
  );
}

/**
 * Check if a video format is supported
 */
export function isSupportedVideoFormat(mimeType: string): boolean {
  return SUPPORTED_VIDEO_FORMATS.some(format => 
    mimeType.toLowerCase() === format || mimeType.toLowerCase().startsWith(format.split('/')[0] + '/')
  );
}

/**
 * Get audio format string from MIME type (for OpenRouter API)
 * Returns format like 'wav', 'mp3', etc.
 */
export function getAudioFormat(mimeType: string): string {
  const formatMap: Record<string, string> = {
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/aiff': 'aiff',
    'audio/x-aiff': 'aiff',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/webm': 'webm',
  };
  
  return formatMap[mimeType.toLowerCase()] || mimeType.split('/')[1] || 'wav';
}

/**
 * Check if a model supports audio input
 */
export function isAudioModel(model: string): boolean {
  const audioModels = [
    // OpenAI models with audio support
    'gpt-4o',
    'gpt-4o-mini',
    // Google Gemini models with audio support
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.5',
  ];

  return audioModels.some((am) => model.toLowerCase().includes(am.toLowerCase()));
}

/**
 * Check if a model supports video input
 */
export function isVideoModel(model: string): boolean {
  const videoModels = [
    // Google Gemini models with video support
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.5',
  ];

  return videoModels.some((vm) => model.toLowerCase().includes(vm.toLowerCase()));
}

/**
 * Audio content for multimodal API
 * OpenRouter uses input_audio format
 */
export interface AudioContent {
  type: 'audio';
  audio: string; // base64 data (without data: prefix)
  mimeType: string;
  format: string; // Audio format like 'wav', 'mp3', etc.
}

/**
 * Video content for multimodal API
 * OpenRouter uses video_url format
 */
export interface VideoContent {
  type: 'video';
  video: string; // base64 data URL or URL
  mimeType: string;
}

/**
 * Convert audio file to base64 for API submission
 */
export async function processAudioFile(
  file: File | Blob
): Promise<{ data: string; mimeType: string; format: string }> {
  const base64DataUrl = await fileToBase64(file);
  const { mimeType, data } = extractBase64(base64DataUrl);
  const format = getAudioFormat(mimeType);
  
  return {
    data,
    mimeType,
    format,
  };
}

/**
 * Convert video file to base64 data URL for API submission
 */
export async function processVideoFile(
  file: File | Blob
): Promise<{ dataUrl: string; mimeType: string }> {
  const base64DataUrl = await fileToBase64(file);
  const mimeType = file.type || 'video/mp4';
  
  return {
    dataUrl: base64DataUrl,
    mimeType,
  };
}

/**
 * Convert audio URL to base64 (for blob URLs)
 */
export async function audioUrlToBase64(url: string): Promise<{ data: string; mimeType: string; format: string }> {
  const base64DataUrl = await urlToBase64(url);
  const { mimeType, data } = extractBase64(base64DataUrl);
  const format = getAudioFormat(mimeType);
  
  return {
    data,
    mimeType,
    format,
  };
}

/**
 * Convert video URL to base64 data URL (for blob URLs)
 */
export async function videoUrlToBase64(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const base64DataUrl = await fileToBase64(blob);
  
  return {
    dataUrl: base64DataUrl,
    mimeType: blob.type || 'video/mp4',
  };
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === 'www.youtube.com' ||
      urlObj.hostname === 'youtube.com' ||
      urlObj.hostname === 'youtu.be' ||
      urlObj.hostname === 'm.youtube.com'
    );
  } catch {
    return false;
  }
}

/**
 * Get file size limit for media files (in bytes)
 * Based on API limitations
 */
export function getMediaFileSizeLimit(_type: 'audio' | 'video'): number {
  // 50MB general limit for most providers
  // Note: For files > 20MB, providers like Google recommend using their File API
  const GENERAL_LIMIT = 50 * 1024 * 1024;
  
  return GENERAL_LIMIT;
}

/**
 * Validate media file size
 */
export function validateMediaFileSize(
  file: File | Blob,
  type: 'audio' | 'video'
): { valid: boolean; error?: string } {
  const limit = getMediaFileSizeLimit(type);
  
  if (file.size > limit) {
    const limitMB = Math.round(limit / (1024 * 1024));
    return {
      valid: false,
      error: `${type === 'audio' ? 'Audio' : 'Video'} file size exceeds ${limitMB}MB limit`,
    };
  }
  
  return { valid: true };
}

/**
 * Get duration estimate for video (rough estimate based on file size)
 * This is a fallback when actual duration is not available
 */
export function estimateVideoDuration(fileSize: number, _mimeType: string): number {
  // Rough estimate: ~1MB per 10 seconds for compressed video
  // This varies significantly based on codec, resolution, and bitrate
  const bytesPerSecond = 100 * 1024; // ~100KB/s average
  return Math.round(fileSize / bytesPerSecond);
}

/**
 * Process video for text-based analysis (subtitle extraction or transcription)
 * Use this when the AI model doesn't support native video input
 * 
 * @param file - Video file to process
 * @param apiKey - OpenAI API key for Whisper transcription (optional)
 * @param options - Processing options
 * @returns Text content from video (subtitles or transcription)
 */
export async function processVideoForTextAnalysis(
  file: File | Blob,
  apiKey?: string,
  options: {
    preferredLanguage?: string;
    transcribeIfNoSubtitles?: boolean;
  } = {}
): Promise<{ 
  success: boolean; 
  text?: string; 
  source?: 'subtitles' | 'transcription' | 'none';
  error?: string;
}> {
  const { preferredLanguage = 'en', transcribeIfNoSubtitles: _transcribeIfNoSubtitles = true } = options;

  try {
    // For web-based processing, we need to use Whisper API for transcription
    // since we can't directly extract embedded subtitles from a blob without FFmpeg
    if (!apiKey) {
      return {
        success: false,
        source: 'none',
        error: 'OpenAI API key required for video transcription',
      };
    }

    // Import transcription function dynamically
    const { transcribeAudio } = await import('./speech-api');
    
    // Note: For full subtitle extraction support, the video file path 
    // is needed for FFmpeg processing via Tauri. For web uploads,
    // we fall back to Whisper transcription of the audio track.
    
    const result = await transcribeAudio(file, {
      apiKey,
      language: preferredLanguage as Parameters<typeof transcribeAudio>[1]['language'],
    });

    if (result.success && result.text) {
      return {
        success: true,
        text: result.text,
        source: 'transcription',
      };
    }

    return {
      success: false,
      source: 'none',
      error: result.error || 'Failed to transcribe video audio',
    };
  } catch (error) {
    return {
      success: false,
      source: 'none',
      error: error instanceof Error ? error.message : 'Video processing failed',
    };
  }
}

/**
 * Build video context message for AI when native video input is not supported
 * Extracts text from video and formats it for AI consumption
 */
export async function buildVideoContextMessage(
  file: File | Blob,
  fileName: string,
  apiKey?: string,
  options: {
    preferredLanguage?: string;
    includeTimestamps?: boolean;
  } = {}
): Promise<string> {
  const { preferredLanguage = 'en' } = options;

  const result = await processVideoForTextAnalysis(file, apiKey, {
    preferredLanguage,
    transcribeIfNoSubtitles: true,
  });

  if (!result.success || !result.text) {
    return `[Video file: ${fileName}]\n[Unable to extract text content from video${result.error ? `: ${result.error}` : ''}]`;
  }

  const sourceLabel = result.source === 'subtitles' ? 'Subtitles' : 'Transcription';
  
  return `[Video file: ${fileName}]
[${sourceLabel} extracted from video:]

${result.text}

[End of video content]`;
}
