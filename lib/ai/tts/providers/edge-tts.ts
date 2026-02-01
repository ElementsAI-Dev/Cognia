/**
 * Edge TTS Provider - Microsoft Edge neural voices (free)
 * Uses the Edge TTS service via API route
 */

import type { TTSResponse, EdgeTTSVoice } from '@/types/media/tts';
import { getTTSError, TTS_PROVIDERS, EDGE_TTS_VOICES } from '@/types/media/tts';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export interface EdgeTTSOptions {
  voice?: EdgeTTSVoice;
  rate?: string; // e.g., '+0%', '-10%', '+20%'
  pitch?: string; // e.g., '+0Hz', '-10Hz', '+20Hz'
  volume?: string; // e.g., '+0%', '-10%', '+20%'
}

/**
 * Generate audio using Edge TTS via local API route
 * Edge TTS requires server-side processing due to websocket requirements
 */
export async function generateEdgeTTS(
  text: string,
  options: EdgeTTSOptions = {}
): Promise<TTSResponse> {
  const {
    voice = 'en-US-JennyNeural',
    rate = '+0%',
    pitch = '+0Hz',
    volume = '+0%',
  } = options;

  // Validate text length
  const maxLength = TTS_PROVIDERS.edge.maxTextLength;
  if (text.length > maxLength) {
    return {
      success: false,
      error: getTTSError('text-too-long', `Maximum ${maxLength} characters`).message,
    };
  }

  try {
    const response = await fetch('/api/tts/edge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        rate,
        pitch,
        volume,
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
    log.error('Edge TTS API error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate speech',
    };
  }
}

/**
 * Get Edge TTS voices filtered by language
 */
export function getEdgeVoicesByLanguage(langCode: string): typeof EDGE_TTS_VOICES[number][] {
  const lang = langCode.split('-')[0];
  return EDGE_TTS_VOICES.filter(v => v.language.startsWith(lang));
}

/**
 * Get default Edge voice for a language
 */
export function getDefaultEdgeVoice(langCode: string): EdgeTTSVoice {
  const voices = getEdgeVoicesByLanguage(langCode);
  if (voices.length > 0) {
    return voices[0].id as EdgeTTSVoice;
  }
  return 'en-US-JennyNeural';
}

/**
 * Convert rate/pitch/volume values for Edge TTS
 * Takes numeric values and converts to Edge TTS format
 */
export function convertToEdgeFormat(value: number, type: 'rate' | 'pitch' | 'volume'): string {
  switch (type) {
    case 'rate':
      // rate: 0.5 = -50%, 1 = +0%, 2 = +100%
      const ratePercent = Math.round((value - 1) * 100);
      return `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;
    case 'pitch':
      // pitch: 0 = -100Hz, 1 = +0Hz, 2 = +100Hz (approximate)
      const pitchHz = Math.round((value - 1) * 50);
      return `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;
    case 'volume':
      // volume: 0 = -100%, 1 = +0%
      const volPercent = Math.round((value - 1) * 100);
      return `${volPercent >= 0 ? '+' : ''}${volPercent}%`;
    default:
      return '+0%';
  }
}

/**
 * Parse Edge TTS format back to numeric value
 */
export function parseEdgeFormat(value: string, type: 'rate' | 'pitch' | 'volume'): number {
  const match = value.match(/([+-]?\d+)/);
  if (!match) return 1;
  
  const num = parseInt(match[1], 10);
  
  switch (type) {
    case 'rate':
      return 1 + (num / 100);
    case 'pitch':
      return 1 + (num / 50);
    case 'volume':
      return 1 + (num / 100);
    default:
      return 1;
  }
}
