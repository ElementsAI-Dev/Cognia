/**
 * Speech API Route - Server-side proxy for OpenAI Whisper API
 * 
 * This route handles audio transcription requests, using the API key
 * from the request or from environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/network/proxy-fetch';

// Whisper API endpoint
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Max file size (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string | null;
    const prompt = formData.get('prompt') as string | null;
    const temperature = formData.get('temperature') as string | null;
    const model = formData.get('model') as string | null;
    const apiKey = formData.get('apiKey') as string | null;

    // Get API key from request or environment
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 401 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      );
    }

    // Build form data for OpenAI API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', model || 'whisper-1');

    if (language) {
      // Whisper uses ISO-639-1 language codes (e.g., 'zh' not 'zh-CN')
      const langCode = language.split('-')[0];
      whisperFormData.append('language', langCode);
    }

    if (prompt) {
      whisperFormData.append('prompt', prompt);
    }

    if (temperature) {
      whisperFormData.append('temperature', temperature);
    }

    // Call OpenAI Whisper API (with proxy support)
    const response = await proxyFetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      text: result.text,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Speech API error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

