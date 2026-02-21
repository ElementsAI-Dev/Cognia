import { NextRequest, NextResponse } from 'next/server';
import { jsonTtsError } from '../_utils';

const DEEPGRAM_SPEAK_URL = 'https://api.deepgram.com/v1/speak';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'aura-2-asteria-en',
      encoding = 'mp3',
      container,
      sampleRate,
    } = body;

    if (!text || typeof text !== 'string') {
      return jsonTtsError('deepgram', 'Text is required', 400, 'validation_error');
    }

    if (text.length > 10000) {
      return jsonTtsError('deepgram', 'Text exceeds maximum length of 10000 characters', 400, 'text_too_long');
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return jsonTtsError('deepgram', 'Deepgram API key not configured', 500, 'api_key_missing');
    }

    const params = new URLSearchParams({
      model: voice,
      encoding,
    });
    if (container) {
      params.set('container', String(container));
    }
    if (sampleRate) {
      params.set('sample_rate', String(sampleRate));
    }

    const response = await fetch(`${DEEPGRAM_SPEAK_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return jsonTtsError(
        'deepgram',
        errorData?.err_msg || `Deepgram API error: ${response.status}`,
        response.status,
        'upstream_error',
        response.status >= 500
      );
    }

    const audioData = await response.arrayBuffer();
    const contentType =
      encoding === 'linear16'
        ? 'audio/wav'
        : encoding === 'aac'
          ? 'audio/aac'
          : encoding === 'opus'
            ? 'audio/opus'
            : encoding === 'flac'
              ? 'audio/flac'
              : 'audio/mpeg';

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    return jsonTtsError(
      'deepgram',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}
