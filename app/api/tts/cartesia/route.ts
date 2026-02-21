import { NextRequest, NextResponse } from 'next/server';
import { jsonTtsError } from '../_utils';

const CARTESIA_API_BASE = 'https://api.cartesia.ai';
const CARTESIA_API_VERSION = '2025-04-16';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'a0e99841-438c-4a64-b679-ae501e7d6091',
      model = 'sonic-3',
      language = 'en',
      speed,
      emotion,
      outputFormat = 'mp3',
    } = body;

    if (!text || typeof text !== 'string') {
      return jsonTtsError('cartesia', 'Text is required', 400, 'validation_error');
    }

    if (text.length > 10000) {
      return jsonTtsError('cartesia', 'Text exceeds maximum length of 10000 characters', 400, 'text_too_long');
    }

    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) {
      return jsonTtsError('cartesia', 'Cartesia API key not configured', 500, 'api_key_missing');
    }

    const output_format =
      outputFormat === 'wav'
        ? { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 }
        : outputFormat === 'raw'
          ? { container: 'raw', encoding: 'pcm_s16le', sample_rate: 24000 }
          : { container: 'mp3', bit_rate: 128000 };

    const generation_config: Record<string, unknown> = {};
    if (typeof speed === 'number') {
      generation_config.speed = speed;
    }
    if (typeof emotion === 'string' && emotion.trim()) {
      generation_config.emotion = emotion.trim();
    }

    const payload: Record<string, unknown> = {
      model_id: model,
      transcript: text,
      voice: { mode: 'id', id: voice },
      language,
      output_format,
      ...(Object.keys(generation_config).length > 0 ? { generation_config } : {}),
    };

    const response = await fetch(`${CARTESIA_API_BASE}/tts/bytes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Cartesia-Version': CARTESIA_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return jsonTtsError(
        'cartesia',
        errorData?.message || `Cartesia API error: ${response.status}`,
        response.status,
        'upstream_error',
        response.status >= 500
      );
    }

    const audioData = await response.arrayBuffer();
    const contentType =
      outputFormat === 'wav'
        ? 'audio/wav'
        : outputFormat === 'raw'
          ? 'audio/pcm'
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
      'cartesia',
      error instanceof Error ? error.message : 'Failed to generate speech',
      500,
      'internal_error',
      true
    );
  }
}
