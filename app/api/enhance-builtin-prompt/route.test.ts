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

const mockGenerateBuiltinPrompts = jest.fn();

jest.mock('@/lib/ai/presets/preset-ai-service', () => ({
  generateBuiltinPrompts: (...args: unknown[]) => mockGenerateBuiltinPrompts(...args),
}));

let routeModule: typeof import('./route');

beforeAll(async () => {
  routeModule = await import('./route');
});

describe('/api/enhance-builtin-prompt legacy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateBuiltinPrompts.mockResolvedValue({
      success: true,
      prompts: [
        {
          name: 'Prompt A',
          content: 'Do X',
          description: 'Desc',
        },
      ],
    });
  });

  it('delegates to shared builtin prompts service and sets deprecation headers', async () => {
    const req = new Request('http://localhost/api/enhance-builtin-prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        presetName: 'Coding',
        action: 'generate',
        provider: 'openai',
        apiKey: 'test-key',
        count: 2,
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);
    const body = await res.json();

    expect(mockGenerateBuiltinPrompts).toHaveBeenCalledWith(
      'Coding',
      undefined,
      undefined,
      [],
      expect.objectContaining({ provider: 'openai', apiKey: 'test-key' }),
      2
    );
    expect(body.prompts).toHaveLength(1);
    expect(res.headers.get('x-cognia-generation-capability-id')).toBe(
      'legacy-enhance-builtin-prompt-route'
    );
  });

  it('returns 400 when presetName is missing', async () => {
    const req = new Request('http://localhost/api/enhance-builtin-prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);

    expect(res.status).toBe(400);
    expect(res.headers.get('deprecation')).toBe('true');
    expect(mockGenerateBuiltinPrompts).not.toHaveBeenCalled();
  });
});

