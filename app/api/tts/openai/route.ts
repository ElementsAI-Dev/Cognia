/**
 * OpenAI TTS API Route
 * Generates speech using OpenAI's TTS models
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonTtsError } from '../_utils';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'alloy',
      model = 'gpt-4o-mini-tts',
      speed = 1.0,
      instructions,
      responseFormat = 'mp3',
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return jsonTtsError('openai', 'Text is required', 400, 'validation_error');
    }

    // Get API key from environment or request
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return jsonTtsError('openai', 'OpenAI API key not configured', 500, 'api_key_missing');
    }

    // Validate text length
    if (text.length > 4096) {
      return jsonTtsError('openai', 'Text exceeds maximum length of 4096 characters', 400, 'text_too_long');
    }

    const requestBody: Record<string, unknown> = {
      model,
      input: text,
      voice,
      speed: Math.min(4.0, Math.max(0.25, speed)),
      response_format: responseFormat,
    };

    if (instructions && model === 'gpt-4o-mini-tts') {
      requestBody.instructions = instructions;
    }

    // Call OpenAI TTS API
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return jsonTtsError(
        'openai',
        errorData.error?.message || `OpenAI API error: ${response.status}`,
        response.status,
        'upstream_error',
        response.status >= 500
      );
    }

    // Get audio data
    const audioData = await response.arrayBuffer();

    // Return audio with appropriate headers
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      aac: 'audio/aac',
      flac: 'audio/flac',
      wav: 'audio/wav',
      pcm: 'audio/pcm',
    };

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[responseFormat] || 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    return jsonTtsError(
      'openai',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}
