/**
 * LMNT TTS Provider - Ultra-low latency voice synthesis
 * Uses AI SDK for integration
 */

import type { TTSResponse, LMNTTTSVoice } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';

export interface LMNTTTSOptions {
  apiKey: string;
  voice?: LMNTTTSVoice;
  speed?: number; // 0.5 - 2.0
  format?: 'mp3' | 'wav';
}

/**
 * Generate audio using LMNT TTS via AI SDK
 */
export async function generateLMNTTTS(
  text: string,
  options: LMNTTTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'lily',
    speed = 1.0,
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.lmnt.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    // Use LMNT REST API directly for better compatibility
    const response = await fetch('https://api.lmnt.com/v1/ai/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        text,
        voice,
        speed: Math.min(2.0, Math.max(0.5, speed)),
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: getTTSError('api-error', errorData.error || `API error: ${response.status}`).message,
      };
    }

    const audioData = await response.arrayBuffer();

    return {
      success: true,
      audioData,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('LMNT TTS error:', error);
    return {
      success: false,
      error: getTTSError('api-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using LMNT TTS via API route (server-side key)
 */
export async function generateLMNTTTSViaApi(
  text: string,
  options: Omit<LMNTTTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const {
    voice = 'lily',
    speed = 1.0,
  } = options;

  try {
    const response = await fetch('/api/tts/lmnt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        speed,
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
    console.error('LMNT TTS API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Stream audio using LMNT TTS
 */
export async function streamLMNTTTS(
  text: string,
  options: LMNTTTSOptions,
  onChunk: (chunk: Uint8Array) => void
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'lily',
    speed = 1.0,
  } = options;

  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  try {
    const response = await fetch('https://api.lmnt.com/v1/ai/speech/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        text,
        voice,
        speed: Math.min(2.0, Math.max(0.5, speed)),
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `API error: ${response.status}`,
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
    console.error('LMNT TTS streaming error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Streaming failed',
    };
  }
}
