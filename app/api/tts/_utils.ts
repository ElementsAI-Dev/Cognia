import { NextResponse } from 'next/server';
import type { TTSNormalizedError, TTSProvider } from '@/types/media/tts';

export function jsonTtsError(
  provider: TTSProvider | 'unknown',
  error: string,
  status: number,
  code: string,
  retriable = false
): NextResponse<TTSNormalizedError> {
  return NextResponse.json(
    {
      error,
      provider,
      status,
      code,
      retriable,
    },
    { status }
  );
}
