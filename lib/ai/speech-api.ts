/**
 * Speech API - OpenAI Whisper API integration for speech-to-text
 */

import type { WhisperTranscriptionResponse, SpeechLanguageCode } from '@/types/speech';
import { proxyFetch } from '@/lib/proxy-fetch';

// Whisper API endpoint
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Supported audio formats for Whisper
const SUPPORTED_FORMATS = ['flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'wav', 'webm'];

// Max file size (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export interface TranscribeOptions {
  apiKey: string;
  language?: SpeechLanguageCode;
  prompt?: string;
  temperature?: number;
  model?: string;
}

export interface TranscribeResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  error?: string;
}

/**
 * Convert audio blob to the format expected by Whisper API
 */
async function prepareAudioFile(blob: Blob): Promise<File> {
  // Whisper accepts webm directly, so we can use it as-is
  const extension = blob.type.includes('webm') ? 'webm' : 
                    blob.type.includes('mp3') ? 'mp3' :
                    blob.type.includes('wav') ? 'wav' :
                    blob.type.includes('ogg') ? 'ogg' : 'webm';
  
  return new File([blob], `audio.${extension}`, { type: blob.type });
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  audio: Blob,
  options: TranscribeOptions
): Promise<TranscribeResult> {
  const {
    apiKey,
    language,
    prompt,
    temperature = 0,
    model = 'whisper-1',
  } = options;

  // Validate
  if (!apiKey) {
    return { success: false, error: 'OpenAI API key is required' };
  }

  if (audio.size > MAX_FILE_SIZE) {
    return { success: false, error: `Audio file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (audio.size === 0) {
    return { success: false, error: 'Audio file is empty' };
  }

  try {
    const audioFile = await prepareAudioFile(audio);
    
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', model);
    
    if (language) {
      // Whisper uses ISO-639-1 language codes (e.g., 'zh' not 'zh-CN')
      const langCode = language.split('-')[0];
      formData.append('language', langCode);
    }
    
    if (prompt) {
      formData.append('prompt', prompt);
    }
    
    if (temperature !== undefined) {
      formData.append('temperature', temperature.toString());
    }

    const response = await proxyFetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      return { success: false, error: errorMessage };
    }

    const result: WhisperTranscriptionResponse = await response.json();
    
    return {
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
    };
  }
}

/**
 * Transcribe audio via the local API route (for server-side processing)
 */
export async function transcribeViaApi(
  audio: Blob,
  options: Omit<TranscribeOptions, 'apiKey'>
): Promise<TranscribeResult> {
  const { language, prompt, temperature, model } = options;

  try {
    const audioFile = await prepareAudioFile(audio);
    
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    if (language) {
      formData.append('language', language);
    }
    
    if (prompt) {
      formData.append('prompt', prompt);
    }
    
    if (temperature !== undefined) {
      formData.append('temperature', temperature.toString());
    }
    
    if (model) {
      formData.append('model', model);
    }

    const response = await fetch('/api/speech', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `API error: ${response.status}` };
    }

    const result = await response.json();
    return {
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
    };
  } catch (error) {
    console.error('Speech API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
    };
  }
}

/**
 * Check if audio format is supported by Whisper
 */
export function isSupportedAudioFormat(mimeType: string): boolean {
  return SUPPORTED_FORMATS.some(format => mimeType.includes(format));
}

/**
 * Get audio duration from blob
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration * 1000); // Return in milliseconds
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve(0);
    };
  });
}

/**
 * Format duration in milliseconds to mm:ss
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
