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

const mockAnalyzePrompt = jest.fn();
const mockOptimizePromptFromAnalysis = jest.fn();
const mockIsProviderAvailable = jest.fn();
const mockRecordSuccess = jest.fn();
const mockRecordFailure = jest.fn();

jest.mock('@/lib/ai/prompts/prompt-self-optimizer', () => ({
  analyzePrompt: (...args: unknown[]) => mockAnalyzePrompt(...args),
  optimizePromptFromAnalysis: (...args: unknown[]) =>
    mockOptimizePromptFromAnalysis(...args),
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

describe('/api/prompt-self-optimize legacy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsProviderAvailable.mockReturnValue(true);
    mockAnalyzePrompt.mockResolvedValue({
      success: true,
      originalContent: 'Original',
      suggestions: [],
      analysis: {
        clarity: 80,
        specificity: 82,
        structureQuality: 81,
        overallScore: 81,
      },
      abTestRecommendation: {
        shouldTest: false,
        hypothesis: '',
      },
    });
    mockOptimizePromptFromAnalysis.mockResolvedValue({
      success: true,
      originalContent: 'Original',
      optimizedContent: 'Optimized content',
      suggestions: [],
      analysis: {
        clarity: 0,
        specificity: 0,
        structureQuality: 0,
        overallScore: 0,
      },
    });
  });

  it('delegates analyze action to shared optimizer service and sets deprecation headers', async () => {
    const req = new Request('http://localhost/api/prompt-self-optimize?action=analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Prompt body',
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);
    const body = await res.json();

    expect(mockAnalyzePrompt).toHaveBeenCalled();
    expect(body.success).toBe(true);
    expect(body.analysis.scores.overallScore).toBe(81);
    expect(res.headers.get('x-cognia-generation-capability-id')).toBe(
      'legacy-prompt-self-optimize-route'
    );
    expect(mockRecordSuccess).toHaveBeenCalled();
  });

  it('delegates optimize action to shared optimizer service', async () => {
    const req = new Request('http://localhost/api/prompt-self-optimize?action=optimize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Prompt body',
        suggestions: [
          { type: 'clarity', priority: 'high', description: 'Improve clarity' },
        ],
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);
    const body = await res.json();

    expect(mockOptimizePromptFromAnalysis).toHaveBeenCalled();
    expect(body.optimizedContent).toBe('Optimized content');
  });

  it('returns 503 when provider is unavailable', async () => {
    mockIsProviderAvailable.mockReturnValue(false);

    const req = new Request('http://localhost/api/prompt-self-optimize?action=analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Prompt body',
        provider: 'openai',
        apiKey: 'test-key',
      }),
    });

    const res = await routeModule.POST(req as unknown as Parameters<typeof routeModule.POST>[0]);

    expect(res.status).toBe(503);
    expect(res.headers.get('x-cognia-generation-route-status')).toBe('deprecated-compat');
  });
});

