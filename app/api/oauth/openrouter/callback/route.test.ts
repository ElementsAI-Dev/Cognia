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
});
