/**
 * @jest-environment jsdom
 */

import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { TextDecoder, TextEncoder } from 'util';

Object.assign(globalThis, {
  ReadableStream: globalThis.ReadableStream ?? ReadableStream,
  TextDecoder: globalThis.TextDecoder ?? TextDecoder,
  TextEncoder: globalThis.TextEncoder ?? TextEncoder,
  TransformStream: globalThis.TransformStream ?? TransformStream,
  WritableStream: globalThis.WritableStream ?? WritableStream,
});

const {
  Blob: EdgeBlob,
  File: EdgeFile,
  FormData: EdgeFormData,
  Headers: EdgeHeaders,
  Request: EdgeRequest,
  Response: EdgeResponse,
} = require('next/dist/compiled/@edge-runtime/primitives/fetch');

Object.assign(globalThis, {
  Blob: globalThis.Blob ?? EdgeBlob,
  File: globalThis.File ?? EdgeFile,
  FormData: globalThis.FormData ?? EdgeFormData,
  Headers: globalThis.Headers ?? EdgeHeaders,
  Request: globalThis.Request ?? EdgeRequest,
  Response: globalThis.Response ?? EdgeResponse,
});

const mockGeneratePresetFromDescription = jest.fn();

jest.mock('@/lib/ai/presets/preset-ai-service', () => ({
  generatePresetFromDescription: (...args: unknown[]) =>
    mockGeneratePresetFromDescription(...args),
}));

let routeModule: typeof import('./route');

beforeAll(async () => {
  routeModule = await import('./route');
});

describe('/api/generate-preset legacy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePresetFromDescription.mockResolvedValue({
      success: true,
      preset: {
        name: 'Preset',
        description: 'desc',
        icon: '✨',
        color: '#6366f1',
        mode: 'chat',
        systemPrompt: 'You are helpful.',
        temperature: 0.7,
        webSearchEnabled: false,
        thinkingEnabled: false,
      },
    });
  });

  it('delegates to shared preset service and sets deprecation headers', async () => {
    const req = new Request('http://localhost/api/generate-preset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        description: 'coding assistant',
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);
    const body = await res.json();

    expect(mockGeneratePresetFromDescription).toHaveBeenCalledWith(
      'coding assistant',
      expect.objectContaining({ provider: 'openai', apiKey: 'test-key' })
    );
    expect(res.status).toBe(200);
    expect(body.preset).toBeDefined();
    expect(res.headers.get('x-cognia-generation-route-status')).toBe('deprecated-compat');
    expect(res.headers.get('x-cognia-generation-capability-id')).toBe(
      'legacy-generate-preset-route'
    );
  });

  it('returns bad request with deprecation headers when description is missing', async () => {
    const req = new Request('http://localhost/api/generate-preset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', apiKey: 'test-key' }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);

    expect(res.status).toBe(400);
    expect(res.headers.get('deprecation')).toBe('true');
    expect(res.headers.get('x-cognia-migration-target')).toContain(
      'generatePresetFromDescription'
    );
  });
});

