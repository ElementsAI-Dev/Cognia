/**
 * ElevenLabs TTS Provider - Industry-leading AI voice synthesis
 * Uses AI SDK for integration
 */

import type { TTSResponse, ElevenLabsTTSVoice, ElevenLabsTTSModel } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';

export interface ElevenLabsTTSOptions {
  apiKey: string;
  voice?: ElevenLabsTTSVoice;
  model?: ElevenLabsTTSModel;
  stability?: number; // 0 - 1
  similarityBoost?: number; // 0 - 1
  style?: number; // 0 - 1
  useSpeakerBoost?: boolean;
}

/**
 * Generate audio using ElevenLabs TTS via AI SDK
 */
export async function generateElevenLabsTTS(
  text: string,
  options: ElevenLabsTTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'rachel',
    model = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.elevenlabs.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    // Use ElevenLabs REST API directly for better compatibility
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: getTTSError('api-error', errorData.detail?.message || `API error: ${response.status}`).message,
      };
    }

    const audioData = await response.arrayBuffer();

    return {
      success: true,
      audioData,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return {
      success: false,
      error: getTTSError('api-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using ElevenLabs TTS via API route (server-side key)
 */
export async function generateElevenLabsTTSViaApi(
  text: string,
  options: Omit<ElevenLabsTTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const {
    voice = 'rachel',
    model = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    const response = await fetch('/api/tts/elevenlabs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        model,
        stability,
        similarityBoost,
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
    console.error('ElevenLabs TTS API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Stream audio using ElevenLabs TTS
 */
export async function streamElevenLabsTTS(
  text: string,
  options: ElevenLabsTTSOptions,
  onChunk: (chunk: Uint8Array) => void
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'rachel',
    model = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail?.message || `API error: ${response.status}`,
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
    console.error('ElevenLabs TTS streaming error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Streaming failed',
    };
  }
}
