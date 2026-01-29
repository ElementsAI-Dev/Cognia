/**
 * Hume AI TTS API Route
 * Generates emotionally expressive speech using Hume API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'kora',
      actingInstructions,
    } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.HUME_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Hume API key not configured' },
        { status: 500 }
      );
    }

    // Validate text length
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 5000 characters' },
        { status: 400 }
      );
    }

    // Build request body
    const requestBody: Record<string, unknown> = {
      text,
      voice: { name: voice },
    };

    if (actingInstructions) {
      requestBody.acting_instructions = actingInstructions;
    }

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
      return NextResponse.json(
        { error: errorData.message || `Hume API error: ${response.status}` },
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
    console.error('Hume TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
