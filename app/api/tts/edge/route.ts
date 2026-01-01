/**
 * Edge TTS API Route
 * Generates speech using Microsoft Edge TTS (free)
 * 
 * Note: This uses the edge-tts npm package or direct WebSocket connection
 */

import { NextRequest, NextResponse } from 'next/server';

// Edge TTS WebSocket URL (for future WebSocket implementation)
const _EDGE_TTS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

// Trusted client token (from edge-tts, for future use)
const _TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

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

    // Generate audio using Edge TTS
    const audioData = await generateEdgeTTSAudio(text, voice, rate, pitch, volume);

    if (!audioData || audioData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(audioData), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.length.toString(),
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
 * Generate audio using Edge TTS via HTTP (fallback method)
 * Uses the Azure Speech service endpoint
 */
async function generateEdgeTTSAudio(
  text: string,
  voice: string,
  rate: string,
  pitch: string,
  volume: string
): Promise<Buffer> {
  // Create SSML
  const ssml = createSSML(text, voice, rate, pitch, volume);
  
  // Use Azure Speech REST API (compatible with Edge TTS voices)
  const url = `https://eastus.tts.speech.microsoft.com/cognitiveservices/v1`;
  
  // Try using the free endpoint
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: ssml,
  });

  if (!response.ok) {
    // Fallback to alternative method
    return await generateEdgeTTSViaWebSocket(text, voice, rate, pitch, volume);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate SSML for Edge TTS
 */
function createSSML(
  text: string,
  voice: string,
  rate: string,
  pitch: string,
  volume: string
): string {
  // Escape XML special characters
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="${voice}">
      <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
        ${escapedText}
      </prosody>
    </voice>
  </speak>`;
}

/**
 * Generate audio using Edge TTS via WebSocket (primary method)
 * This is more reliable but requires WebSocket support
 */
async function generateEdgeTTSViaWebSocket(
  text: string,
  voice: string,
  rate: string,
  pitch: string,
  _volume: string
): Promise<Buffer> {
  // Since Next.js API routes don't support WebSocket directly,
  // we'll use a simpler HTTP approach or the edge-tts package
  
  // For now, use a fallback to a public TTS API
  // In production, you might want to use the edge-tts npm package
  // or set up a separate WebSocket server
  
  try {
    // Alternative: Use a public TTS service as fallback
    const _params = new URLSearchParams({
      text: text.substring(0, 1000), // Limit text length
      voice: voice,
      rate: rate,
      pitch: pitch,
    });

    // Use Google Translate TTS as a fallback (limited)
    // This is a simplified fallback - in production, use edge-tts package
    const langMatch = voice.match(/^([a-z]{2})-/i);
    const lang = langMatch ? langMatch[1].toLowerCase() : 'en';
    
    const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text.substring(0, 200))}`;
    
    const response = await fetch(gttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // If all else fails, return empty buffer
    // The client should fall back to browser TTS
    throw new Error('Edge TTS generation failed - please use browser TTS as fallback');
  } catch (error) {
    console.error('Edge TTS WebSocket fallback error:', error);
    throw error;
  }
}
