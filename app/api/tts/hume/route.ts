/**
 * Hume AI TTS API Route
 * Generates emotionally expressive speech using Hume API
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonTtsError } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'kora',
      actingInstructions,
      version = 1,
      format = { type: 'mp3' },
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return jsonTtsError('hume', 'Text is required', 400, 'validation_error');
    }

    // Get API key from environment
    const apiKey = process.env.HUME_API_KEY;

    if (!apiKey) {
      return jsonTtsError('hume', 'Hume API key not configured', 500, 'api_key_missing');
    }

    // Validate text length
    if (text.length > 5000) {
      return jsonTtsError('hume', 'Text exceeds maximum length of 5000 characters', 400, 'text_too_long');
    }

    // Build request body (latest schema)
    const requestBody: Record<string, unknown> = {
      utterances: [
        {
          text,
          voice: { name: voice },
          ...(actingInstructions ? { description: actingInstructions } : {}),
        },
      ],
      version,
      format,
      num_generations: 1,
    };

    // Call Hume TTS API
    const response = await fetch('https://api.hume.ai/v0/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hume-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return jsonTtsError(
        'hume',
        errorData.message || `Hume API error: ${response.status}`,
        response.status,
        'upstream_error',
        response.status >= 500
      );
    }

    const result = await response.json().catch(() => null);
    const generation = result?.generations?.[0];
    const audioBase64 = generation?.audio;
    const encodingFormat = generation?.encoding?.format || 'mp3';

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return jsonTtsError('hume', 'No audio returned by Hume API', 500, 'upstream_invalid_response');
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const contentType =
      encodingFormat === 'wav'
        ? 'audio/wav'
        : encodingFormat === 'pcm'
          ? 'audio/pcm'
          : 'audio/mpeg';

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Hume TTS error:', error);
    return jsonTtsError(
      'hume',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}
