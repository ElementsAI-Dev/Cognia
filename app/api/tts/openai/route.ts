/**
 * OpenAI TTS API Route
 * Generates speech using OpenAI's TTS models
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'alloy',
      model = 'tts-1',
      speed = 1.0,
      responseFormat = 'mp3',
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key from environment or request
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Validate text length
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 4096 characters' },
        { status: 400 }
      );
    }

    // Call OpenAI TTS API
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed: Math.min(4.0, Math.max(0.25, speed)),
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || `OpenAI API error: ${response.status}` },
        { status: response.status }
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
