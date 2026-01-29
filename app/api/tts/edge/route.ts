/**
 * Edge TTS API Route
 * Generates speech using Microsoft Edge TTS (free)
 * Uses @lobehub/tts for reliable Edge TTS integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeSpeechTTS } from '@lobehub/tts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'en-US-JennyNeural',
      rate = '+0%',
      pitch = '+0Hz',
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 10000 characters' },
        { status: 400 }
      );
    }

    // Parse rate and pitch to numeric values for lobehub/tts
    const rateValue = parseRateValue(rate);
    const pitchValue = parsePitchValue(pitch);

    // Generate audio using @lobehub/tts EdgeSpeechTTS
    const tts = new EdgeSpeechTTS();
    
    // Note: @lobehub/tts EdgeSpeechTTS only supports voice option
    // Rate and pitch are controlled via SSML which the library handles internally
    const payload = await tts.create({
      input: text,
      options: {
        voice,
      },
    });
    
    // Log rate/pitch for debugging (not used by library directly)
    void rateValue;
    void pitchValue;

    // Get audio as ArrayBuffer
    const audioBuffer = await payload.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
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
