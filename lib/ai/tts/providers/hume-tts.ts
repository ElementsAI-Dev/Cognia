/**
 * Hume AI TTS Provider - Emotionally expressive voice synthesis
 * Uses AI SDK for integration
 */

import type { TTSResponse, HumeTTSVoice } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export interface HumeTTSOptions {
  apiKey: string;
  voice?: HumeTTSVoice;
  actingInstructions?: string;
  sampleRate?: number;
  version?: 1 | 2;
}

/**
 * Generate audio using Hume TTS via AI SDK
 */
export async function generateHumeTTS(
  text: string,
  options: HumeTTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'kora',
    actingInstructions,
    version = 1,
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.hume.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    // Use Hume REST API directly for better compatibility
    const requestBody: Record<string, unknown> = {
      utterances: [
        {
          text,
          voice: { name: voice },
          ...(actingInstructions ? { description: actingInstructions } : {}),
        },
      ],
      version,
      format: { type: 'mp3' },
      num_generations: 1,
    };

    const response = await proxyFetch('https://api.hume.ai/v0/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hume-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: getTTSError('api-error', errorData.message || `API error: ${response.status}`).message,
      };
    }

    const result = await response.json().catch(() => null);
    const generation = result?.generations?.[0];
    const audioBase64 = generation?.audio;
    const formatType = generation?.encoding?.format || 'mp3';

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return {
        success: false,
        error: getTTSError('api-error', 'No audio returned by Hume API').message,
      };
    }

    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let index = 0; index < binaryString.length; index++) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return {
      success: true,
      audioData: bytes.buffer,
      mimeType: formatType === 'wav' ? 'audio/wav' : formatType === 'pcm' ? 'audio/pcm' : 'audio/mpeg',
    };
  } catch (error) {
    log.error('Hume TTS error', error as Error);
    return {
      success: false,
      error: getTTSError('api-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using Hume TTS via API route (server-side key)
 */
export async function generateHumeTTSViaApi(
  text: string,
  options: Omit<HumeTTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const {
    voice = 'kora',
    actingInstructions,
  } = options;

  try {
    const response = await fetch('/api/tts/hume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        actingInstructions,
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
    log.error('Hume TTS API error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Generate audio with emotional expression
 */
export async function generateHumeTTSWithEmotion(
  text: string,
  options: HumeTTSOptions & { emotion?: string }
): Promise<TTSResponse> {
  const { emotion, ...baseOptions } = options;

  // If emotion is provided, use it as acting instructions
  const actingInstructions = emotion
    ? `Speak with a ${emotion} tone`
    : baseOptions.actingInstructions;

  return generateHumeTTS(text, {
    ...baseOptions,
    actingInstructions,
  });
}
