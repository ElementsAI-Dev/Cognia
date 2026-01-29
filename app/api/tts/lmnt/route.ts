/**
 * LMNT TTS API Route
 * Generates speech using LMNT API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'lily',
      speed = 1.0,
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.LMNT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'LMNT API key not configured' },
        { status: 500 }
      );
    }

    // Validate text length
    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 3000 characters' },
        { status: 400 }
      );
    }

    // Call LMNT TTS API
    const response = await fetch('https://api.lmnt.com/v1/ai/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        text,
        voice,
        speed: Math.min(2.0, Math.max(0.5, speed)),
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `LMNT API error: ${response.status}` },
        { status: response.status }
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
    console.error('LMNT TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
