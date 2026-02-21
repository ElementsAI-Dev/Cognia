/**
 * Edge TTS API Route
 * Generates speech using Microsoft Edge TTS (free)
 * Uses @lobehub/tts for reliable Edge TTS integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeSpeechTTS } from '@lobehub/tts';
import { jsonTtsError } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'en-US-JennyNeural',
      rate = '+0%',
      pitch = '+0Hz',
      volume = '+0%',
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return jsonTtsError('edge', 'Text is required', 400, 'validation_error');
    }

    // Validate text length
    if (text.length > 10000) {
      return jsonTtsError('edge', 'Text exceeds maximum length of 10000 characters', 400, 'text_too_long');
    }

    // Parse rate and pitch to numeric values for lobehub/tts
    const rateValue = parseRateValue(rate);
    const pitchValue = parsePitchValue(pitch);
    const volumeValue = parseVolumeValue(volume);

    // Generate audio using @lobehub/tts EdgeSpeechTTS
    const tts = new EdgeSpeechTTS();
    
    const payload = await tts.create({
      input: text,
      options: {
        voice,
        rate: rateValue,
        pitch: pitchValue,
        volume: volumeValue,
      },
    } as unknown as Parameters<typeof tts.create>[0]);

    // Get audio as ArrayBuffer
    const audioBuffer = await payload.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return jsonTtsError('edge', 'Failed to generate audio', 500, 'empty_audio', true);
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Edge TTS error:', error);
    return jsonTtsError(
      'edge',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}

/**
 * Parse rate string (e.g., '+10%', '-20%') to numeric value
 * Default rate is 1.0 (0%)
 */
function parseRateValue(rate: string): number {
  const match = rate.match(/([+-]?\d+)/);
  if (!match) return 1.0;
  const percent = parseInt(match[1], 10);
  return 1.0 + (percent / 100);
}

/**
 * Parse pitch string (e.g., '+10Hz', '-20Hz') to numeric value
 * Default pitch is 1.0 (0Hz)
 */
function parsePitchValue(pitch: string): number {
  const match = pitch.match(/([+-]?\d+)/);
  if (!match) return 1.0;
  const hz = parseInt(match[1], 10);
  // Convert Hz to a multiplier (approximate)
  return 1.0 + (hz / 50);
}

/**
 * Parse volume string (e.g., '+10%', '-20%') to numeric value
 * Default volume is 1.0 (0%)
 */
function parseVolumeValue(volume: string): number {
  const match = volume.match(/([+-]?\d+)/);
  if (!match) return 1.0;
  const percent = parseInt(match[1], 10);
  return Math.max(0, 1.0 + (percent / 100));
}
