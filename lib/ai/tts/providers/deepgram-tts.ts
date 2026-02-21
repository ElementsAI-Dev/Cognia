/**
 * Deepgram TTS Provider - Enterprise-grade low-latency TTS
 * Uses Deepgram Aura-2 REST API
 */

import type { TTSResponse, DeepgramTTSVoice } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

const DEEPGRAM_API_BASE = 'https://api.deepgram.com/v1/speak';

export interface DeepgramTTSOptions {
  apiKey: string;
  voice?: DeepgramTTSVoice;
  encoding?: 'mp3' | 'linear16' | 'aac' | 'opus' | 'flac';
  container?: 'none' | 'wav';
  sampleRate?: number;
}

/**
 * Generate audio using Deepgram TTS REST API
 */
export async function generateDeepgramTTS(
  text: string,
  options: DeepgramTTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'aura-2-asteria-en',
    encoding = 'mp3',
    container,
    sampleRate,
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.deepgram.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      model: voice,
      encoding,
    });
    if (container) {
      params.set('container', container);
    }
    if (sampleRate) {
      params.set('sample_rate', String(sampleRate));
    }

    const response = await proxyFetch(`${DEEPGRAM_API_BASE}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: getTTSError('api-error', errorData.err_msg || `API error: ${response.status}`).message,
      };
    }

    const audioData = await response.arrayBuffer();

    const mimeType = encoding === 'mp3' ? 'audio/mpeg'
      : encoding === 'linear16' ? 'audio/wav'
        : encoding === 'aac' ? 'audio/aac'
          : encoding === 'opus' ? 'audio/opus'
            : encoding === 'flac' ? 'audio/flac'
              : 'audio/mpeg';

    return {
      success: true,
      audioData,
      mimeType,
    };
  } catch (error) {
    log.error('Deepgram TTS error', error as Error);
    return {
      success: false,
      error: getTTSError('api-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using Deepgram TTS via API route (server-side key)
 */
export async function generateDeepgramTTSViaApi(
  text: string,
  options: Omit<DeepgramTTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const {
    voice = 'aura-2-asteria-en',
    encoding = 'mp3',
    container,
    sampleRate,
  } = options;

  try {
    const response = await fetch('/api/tts/deepgram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        encoding,
        container,
        sampleRate,
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
    const mimeType = response.headers.get('content-type') || 'audio/mpeg';

    return {
      success: true,
      audioData,
      mimeType,
    };
  } catch (error) {
    log.error('Deepgram TTS API error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Stream audio using Deepgram TTS
 */
export async function streamDeepgramTTS(
  text: string,
  options: DeepgramTTSOptions,
  onChunk: (chunk: Uint8Array) => void
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'aura-2-asteria-en',
    encoding = 'linear16',
    container = 'wav',
  } = options;

  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  try {
    const params = new URLSearchParams({
      model: voice,
      encoding,
      container,
    });

    const response = await proxyFetch(`${DEEPGRAM_API_BASE}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.err_msg || `API error: ${response.status}`,
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

    const mimeType = encoding === 'linear16' ? 'audio/wav' : 'audio/mpeg';

    return {
      success: true,
      audioData: audioData.buffer,
      mimeType,
    };
  } catch (error) {
    log.error('Deepgram TTS streaming error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Streaming failed',
    };
  }
}
