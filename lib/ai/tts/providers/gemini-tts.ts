/**
 * Gemini TTS Provider - Native text-to-speech from Google Gemini 2.5
 * Uses the Gemini API with response_modalities: ["AUDIO"]
 */

import type { TTSResponse, GeminiTTSVoice } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS } from '@/types/media/tts';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiTTSOptions {
  apiKey: string;
  voice?: GeminiTTSVoice;
  model?: string;
}

/**
 * Generate audio using Gemini TTS API
 */
export async function generateGeminiTTS(
  text: string,
  options: GeminiTTSOptions
): Promise<TTSResponse> {
  const {
    apiKey,
    voice = 'Kore',
    model = GEMINI_TTS_MODEL,
  } = options;

  // Validate API key
  if (!apiKey) {
    return {
      success: false,
      error: getTTSError('api-key-missing').message,
    };
  }

  // Validate text length
  const maxLength = TTS_PROVIDERS.gemini.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    const response = await proxyFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: text,
          }],
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
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

    const result = await response.json();
    
    // Extract audio data from response
    const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      return {
        success: false,
        error: getTTSError('api-error', 'No audio data in response').message,
      };
    }

    // Decode base64 audio data
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return {
      success: true,
      audioData: bytes.buffer,
      mimeType: 'audio/wav', // Gemini returns PCM at 24kHz, single channel
    };
  } catch (error) {
    log.error('Gemini TTS error', error as Error);
    return {
      success: false,
      error: getTTSError('network-error', error instanceof Error ? error.message : 'Unknown error').message,
    };
  }
}

/**
 * Generate audio using Gemini TTS via local API route
 */
export async function generateGeminiTTSViaApi(
  text: string,
  options: Omit<GeminiTTSOptions, 'apiKey'>
): Promise<TTSResponse> {
  const { voice = 'Kore' } = options;

  try {
    const response = await fetch('/api/tts/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
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
      mimeType: 'audio/wav',
    };
  } catch (error) {
    log.error('Gemini TTS API error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Convert Gemini's raw PCM audio to WAV format
 * Gemini outputs s16le (signed 16-bit little-endian) at 24kHz mono
 */
export function pcmToWav(pcmData: ArrayBuffer, sampleRate: number = 24000, channels: number = 1): ArrayBuffer {
  const bytesPerSample = 2; // 16-bit
  const dataLength = pcmData.byteLength;
  const headerLength = 44;
  const wavBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // byte rate
  view.setUint16(32, channels * bytesPerSample, true); // block align
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Copy PCM data
  const pcmView = new Uint8Array(pcmData);
  const wavData = new Uint8Array(wavBuffer, headerLength);
  wavData.set(pcmView);

  return wavBuffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
