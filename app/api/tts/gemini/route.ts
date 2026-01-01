/**
 * Gemini TTS API Route
 * Generates speech using Google Gemini's native TTS
 */

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'Kore' } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    // Validate text length
    if (text.length > 8000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 8000 characters' },
        { status: 400 }
      );
    }

    // Call Gemini TTS API
    const url = `${GEMINI_API_BASE}/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: text,
          }],
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || `Gemini API error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Extract audio data from response
    const audioBase64 = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioBase64) {
      return NextResponse.json(
        { error: 'No audio data in response' },
        { status: 500 }
      );
    }

    // Decode base64 to binary
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Convert PCM to WAV (Gemini outputs s16le at 24kHz mono)
    const wavBuffer = pcmToWav(audioBuffer, 24000, 1);

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Gemini TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

/**
 * Convert raw PCM audio to WAV format
 */
function pcmToWav(pcmData: Buffer, sampleRate: number = 24000, channels: number = 1): Buffer {
  const bytesPerSample = 2; // 16-bit
  const dataLength = pcmData.length;
  const headerLength = 44;
  const wavBuffer = Buffer.alloc(headerLength + dataLength);

  // RIFF header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataLength, 4);
  wavBuffer.write('WAVE', 8);

  // fmt chunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16); // chunk size
  wavBuffer.writeUInt16LE(1, 20); // audio format (PCM)
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
  wavBuffer.writeUInt16LE(channels * bytesPerSample, 32); // block align
  wavBuffer.writeUInt16LE(bytesPerSample * 8, 34); // bits per sample

  // data chunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataLength, 40);

  // Copy PCM data
  pcmData.copy(wavBuffer, headerLength);

  return wavBuffer;
}
