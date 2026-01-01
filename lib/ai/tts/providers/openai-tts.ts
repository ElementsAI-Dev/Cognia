/**
 * OpenAI TTS Provider - High-quality neural voices from OpenAI
 * Supports tts-1 and tts-1-hd models
 */

import type { TTSResponse, OpenAITTSVoice, OpenAITTSModel } from '@/types/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/tts';
import { proxyFetch } from '@/lib/proxy-fetch';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

export interface OpenAITTSOptions {
  apiKey: string;
  voice?: OpenAITTSVoice;
  model?: OpenAITTSModel;
  speed?: number; // 0.25 - 4.0
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

/**
 * Generate audio using OpenAI TTS API
 */
export async function generateOpenAITTS(
  text: string,
  options: OpenAITTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'alloy',
    model = 'tts-1',
    speed = 1.0,
    responseFormat = 'mp3',
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.openai.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  // Validate speed
  const clampedSpeed = Math.min(4.0, Math.max(0.25, speed));

  try {
    const response = await proxyFetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed: clampedSpeed,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      return {
        success: false,
        error: getTTSError('api-error', errorMessage).message,
      };
    }

    const audioData = await response.arrayBuffer();
    const mimeType = getMimeType(responseFormat);

    return {
      success: true,
      audioData,
      mimeType,
    };
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    return {
      success: false,
      error: getTTSError('network-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using OpenAI TTS via local API route
 */
export async function generateOpenAITTSViaApi(
  text: string,
  options: Omit<OpenAITTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const {
    voice = 'alloy',
    model = 'tts-1',
    speed = 1.0,
    responseFormat = 'mp3',
  } = options;

  try {
    const response = await fetch('/api/tts/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        model,
        speed,
        responseFormat,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `API error: ${response.status}`,
      };
    }

    const audioData = await response.arrayBuffer();
    const mimeType = getMimeType(responseFormat);

    return {
      success: true,
      audioData,
      mimeType,
    };
  } catch (error) {
    console.error('OpenAI TTS API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Stream audio using OpenAI TTS (for real-time playback)
 */
export async function streamOpenAITTS(
  text: string,
  options: OpenAITTSOptions,
  onChunk: (chunk: Uint8Array) => void
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'alloy',
    model = 'tts-1',
    speed = 1.0,
  } = options;

  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  try {
    const response = await proxyFetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed: Math.min(4.0, Math.max(0.25, speed)),
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API error: ${response.status}`,
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return {
        success: false,
        error: 'Failed to get response stream',
      };
    }

    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      onChunk(value);
    }

    // Combine all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      success: true,
      audioData: audioData.buffer,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('OpenAI TTS streaming error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Streaming failed',
    };
  }
}

function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    opus: 'audio/opus',
    aac: 'audio/aac',
    flac: 'audio/flac',
    wav: 'audio/wav',
    pcm: 'audio/pcm',
  };
  return mimeTypes[format] || 'audio/mpeg';
}
