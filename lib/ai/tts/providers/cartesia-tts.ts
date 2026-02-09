/**
 * Cartesia TTS Provider - Ultra-low latency streaming TTS with 42 languages
 * Uses Cartesia Sonic 3 REST API
 */

import type { TTSResponse, CartesiaTTSVoice, CartesiaTTSModel } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

const CARTESIA_API_BASE = 'https://api.cartesia.ai';
const CARTESIA_API_VERSION = '2025-04-16';

export interface CartesiaTTSOptions {
  apiKey: string;
  voice?: CartesiaTTSVoice;
  model?: CartesiaTTSModel;
  language?: string;
  speed?: number; // -1.0 to 1.0 (normal = 0)
  emotion?: string; // e.g., 'positivity:high', 'curiosity:high'
  outputFormat?: 'mp3' | 'wav' | 'raw';
}

/**
 * Generate audio using Cartesia TTS REST API
 */
export async function generateCartesiaTTS(
  text: string,
  options: CartesiaTTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'a0e99841-438c-4a64-b679-ae501e7d6091',
    model = 'sonic-3',
    language = 'en',
    speed,
    emotion,
    outputFormat = 'mp3',
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.cartesia.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    // Build output format config
    const outputFormatConfig = outputFormat === 'mp3'
      ? { container: 'mp3', bit_rate: 128000 }
      : outputFormat === 'wav'
        ? { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 }
        : { container: 'raw', encoding: 'pcm_s16le', sample_rate: 24000 };

    // Build voice config with optional speed/emotion
    const voiceConfig: Record<string, unknown> = {
      mode: 'id',
      id: voice,
    };

    // Build request body
    const body: Record<string, unknown> = {
      model_id: model,
      transcript: text,
      voice: voiceConfig,
      language,
      output_format: outputFormatConfig,
    };

    // Add speed control if specified
    if (speed !== undefined && speed !== 0) {
      body.speed = speed > 0 ? 'fastest' : 'slowest';
    }

    // Add emotion control via SSML-like __emotion tags if specified
    if (emotion) {
      body.transcript = `<emotion name="${emotion}">${text}</emotion>`;
    }

    const response = await fetch(`${CARTESIA_API_BASE}/tts/bytes`, {
      method: 'POST',
      headers: {
        'Cartesia-Version': CARTESIA_API_VERSION,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: getTTSError('api-error', errorData.message || `API error: ${response.status}`).message,
      };
    }

    const audioData = await response.arrayBuffer();
    const mimeType = outputFormat === 'mp3' ? 'audio/mpeg'
      : outputFormat === 'wav' ? 'audio/wav'
        : 'audio/pcm';

    return {
      success: true,
      audioData,
      mimeType,
    };
  } catch (error) {
    log.error('Cartesia TTS error', error as Error);
    return {
      success: false,
      error: getTTSError('api-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using Cartesia TTS via API route (server-side key)
 */
export async function generateCartesiaTTSViaApi(
  text: string,
  options: Omit<CartesiaTTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const {
    voice = 'a0e99841-438c-4a64-b679-ae501e7d6091',
    model = 'sonic-3',
    language = 'en',
    speed,
    emotion,
  } = options;

  try {
    const response = await fetch('/api/tts/cartesia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        model,
        language,
        speed,
        emotion,
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

    return {
      success: true,
      audioData,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    log.error('Cartesia TTS API error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Stream audio using Cartesia TTS
 */
export async function streamCartesiaTTS(
  text: string,
  options: CartesiaTTSOptions,
  onChunk: (chunk: Uint8Array) => void
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'a0e99841-438c-4a64-b679-ae501e7d6091',
    model = 'sonic-3',
    language = 'en',
    speed,
    emotion,
  } = options;

  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  try {
    const body: Record<string, unknown> = {
      model_id: model,
      transcript: emotion ? `<emotion name="${emotion}">${text}</emotion>` : text,
      voice: { mode: 'id', id: voice },
      language,
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 24000,
      },
    };

    if (speed !== undefined && speed !== 0) {
      body.speed = speed > 0 ? 'fastest' : 'slowest';
    }

    const response = await fetch(`${CARTESIA_API_BASE}/tts/bytes`, {
      method: 'POST',
      headers: {
        'Cartesia-Version': CARTESIA_API_VERSION,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `API error: ${response.status}`,
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
      mimeType: 'audio/pcm',
    };
  } catch (error) {
    log.error('Cartesia TTS streaming error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Streaming failed',
    };
  }
}
