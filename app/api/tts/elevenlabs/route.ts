/**
 * ElevenLabs TTS API Route
 * Generates speech using ElevenLabs API
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonTtsError } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'rachel',
      model = 'eleven_multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.75,
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return jsonTtsError('elevenlabs', 'Text is required', 400, 'validation_error');
    }

    // Get API key from environment
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return jsonTtsError('elevenlabs', 'ElevenLabs API key not configured', 500, 'api_key_missing');
    }

    // Validate text length
    if (text.length > 5000) {
      return jsonTtsError('elevenlabs', 'Text exceeds maximum length of 5000 characters', 400, 'text_too_long');
    }

    // Call ElevenLabs TTS API
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
          stability: Math.min(1, Math.max(0, stability)),
          similarity_boost: Math.min(1, Math.max(0, similarityBoost)),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return jsonTtsError(
        'elevenlabs',
        errorData.detail?.message || `ElevenLabs API error: ${response.status}`,
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
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return jsonTtsError(
      'elevenlabs',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}
