/**
 * LMNT TTS API Route
 * Generates speech using LMNT API
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonTtsError } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'lily',
      speed = 1.0,
      format = 'mp3',
      sampleRate = 24000,
      language = 'auto',
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return jsonTtsError('lmnt', 'Text is required', 400, 'validation_error');
    }

    // Get API key from environment
    const apiKey = process.env.LMNT_API_KEY;

    if (!apiKey) {
      return jsonTtsError('lmnt', 'LMNT API key not configured', 500, 'api_key_missing');
    }

    // Validate text length
    if (text.length > 3000) {
      return jsonTtsError('lmnt', 'Text exceeds maximum length of 3000 characters', 400, 'text_too_long');
    }

    // Call LMNT TTS API
    const response = await fetch('https://api.lmnt.com/v1/ai/speech/bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        text,
        voice,
        speed: Math.min(2.0, Math.max(0.5, speed)),
        format,
        sample_rate: sampleRate,
        language,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return jsonTtsError(
        'lmnt',
        errorData.error || `LMNT API error: ${response.status}`,
        response.status,
        'upstream_error',
        response.status >= 500
      );
    }

    // Get audio data
    const audioData = await response.arrayBuffer();

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': format === 'wav' ? 'audio/wav' : 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('LMNT TTS error:', error);
    return jsonTtsError(
      'lmnt',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}
