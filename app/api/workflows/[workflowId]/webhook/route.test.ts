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

let routeModule: typeof import('./route');

beforeAll(async () => {
  routeModule = await import('./route');
});

describe('route module', () => {
  it('exports dynamic config', () => {
    expect(routeModule.dynamic).toBeDefined();
  });
  it('returns Response for GET', async () => {
    const handler = routeModule.GET as (...args: unknown[]) => Promise<Response> | Response;

    const req = {
      json: jest.fn().mockResolvedValue({}),
      formData: jest.fn().mockResolvedValue(new FormData()),
      headers: new Headers(),
      method: 'GET',
      nextUrl: new URL('http://localhost/api/test?action=analyze'),
      clone() {
        return this;
      },
    } as unknown as Request;

    const ctx = {
      params: Promise.resolve({ workflowId: 'wf-1', id: 'id-1' }),
    };

    let res: Response;
    if (handler.length >= 2) {
      res = await handler(req, ctx);
    } else if (handler.length === 1) {
      res = await handler(req);
    } else {
      res = await handler();
    }

    expect(res).toBeInstanceOf(Response);
  });

  it('returns Response for POST', async () => {
    const handler = routeModule.POST as (...args: unknown[]) => Promise<Response> | Response;

    const req = {
      json: jest.fn().mockResolvedValue({}),
      formData: jest.fn().mockResolvedValue(new FormData()),
      headers: new Headers(),
      method: 'POST',
      nextUrl: new URL('http://localhost/api/test?action=analyze'),
      clone() {
        return this;
      },
    } as unknown as Request;

    const ctx = {
      params: Promise.resolve({ workflowId: 'wf-1', id: 'id-1' }),
    };

    let res: Response;
    if (handler.length >= 2) {
      res = await handler(req, ctx);
    } else if (handler.length === 1) {
      res = await handler(req);
    } else {
      res = await handler();
    }

    expect(res).toBeInstanceOf(Response);
  });

  it('returns Response for PUT', async () => {
    const handler = routeModule.PUT as (...args: unknown[]) => Promise<Response> | Response;

    const req = {
      json: jest.fn().mockResolvedValue({}),
      formData: jest.fn().mockResolvedValue(new FormData()),
      headers: new Headers(),
      method: 'PUT',
      nextUrl: new URL('http://localhost/api/test?action=analyze'),
      clone() {
        return this;
      },
    } as unknown as Request;

    const ctx = {
      params: Promise.resolve({ workflowId: 'wf-1', id: 'id-1' }),
    };

    let res: Response;
    if (handler.length >= 2) {
      res = await handler(req, ctx);
    } else if (handler.length === 1) {
      res = await handler(req);
    } else {
      res = await handler();
    }

    expect(res).toBeInstanceOf(Response);
  });
});
