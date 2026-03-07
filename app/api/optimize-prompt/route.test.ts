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

const mockOptimizePresetPrompt = jest.fn();
const mockIsProviderAvailable = jest.fn();
const mockRecordSuccess = jest.fn();
const mockRecordFailure = jest.fn();

jest.mock('@/lib/ai/presets/preset-ai-service', () => ({
  optimizePresetPrompt: (...args: unknown[]) => mockOptimizePresetPrompt(...args),
}));

jest.mock('@/lib/ai/infrastructure', () => ({
  isProviderAvailable: (...args: unknown[]) => mockIsProviderAvailable(...args),
  circuitBreakerRegistry: {
    get: jest.fn(() => ({
      recordSuccess: mockRecordSuccess,
      recordFailure: mockRecordFailure,
    })),
  },
}));

let routeModule: typeof import('./route');

beforeAll(async () => {
  routeModule = await import('./route');
});

describe('/api/optimize-prompt legacy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsProviderAvailable.mockReturnValue(true);
    mockOptimizePresetPrompt.mockResolvedValue({
      success: true,
      optimizedPrompt: 'Optimized prompt output',
    });
  });

  it('delegates to shared optimizer service and sets deprecation headers', async () => {
    const req = new Request('http://localhost/api/optimize-prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Original prompt',
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);
    const body = await res.json();

    expect(mockOptimizePresetPrompt).toHaveBeenCalledWith(
      'Original prompt',
      expect.objectContaining({ provider: 'openai', apiKey: 'test-key' })
    );
    expect(body.optimizedPrompt).toBe('Optimized prompt output');
    expect(res.headers.get('x-cognia-generation-capability-id')).toBe(
      'legacy-optimize-prompt-route'
    );
    expect(mockRecordSuccess).toHaveBeenCalled();
  });

  it('returns 503 when provider is unavailable and keeps deprecation metadata', async () => {
    mockIsProviderAvailable.mockReturnValue(false);

    const req = new Request('http://localhost/api/optimize-prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Original prompt',
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);

    expect(res.status).toBe(503);
    expect(res.headers.get('x-cognia-generation-route-status')).toBe('deprecated-compat');
    expect(mockOptimizePresetPrompt).not.toHaveBeenCalled();
  });
});

