import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    lmnt: Boolean(process.env.LMNT_API_KEY),
    hume: Boolean(process.env.HUME_API_KEY),
    cartesia: Boolean(process.env.CARTESIA_API_KEY),
    deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
  };

  return NextResponse.json({ status });
}

