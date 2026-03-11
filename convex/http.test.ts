declare global {
  var __convexHttpRouteCalls: Array<Record<string, unknown>> | undefined;
}

class MockResponse {
  status: number;
  headers: Map<string, string>;
  private body: unknown;

  constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    this.status = init?.status ?? 200;
    this.body = body;
    this.headers = new Map(
      Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
    );
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }
}

// Convex HTTP module uses Web Fetch Response in route handlers.
(global as unknown as { Response: typeof MockResponse }).Response = MockResponse;

jest.mock('convex/server', () => {
  global.__convexHttpRouteCalls = [];
  return {
    httpRouter: () => ({
      route: (entry: Record<string, unknown>) => {
        global.__convexHttpRouteCalls?.push(entry);
      },
    }),
  };
});

jest.mock('./_generated/server', () => ({
  httpAction: (handler: unknown) => handler,
}), { virtual: true });

jest.mock('./_generated/api', () => ({
  api: {
    sync: {
      getMetadata: 'sync:getMetadata',
      exportAll: 'sync:exportAll',
      exportPage: 'sync:exportPage',
      bulkImport: 'sync:bulkImport',
    },
  },
}), { virtual: true });

import { buildCorsHeaders, parseAllowedOrigins } from './http';

function getRegisteredRoutes() {
  return global.__convexHttpRouteCalls ?? [];
}

function getRoute(path: string, method: string) {
  const registered = getRegisteredRoutes().find(
    (entry) => entry.path === path && entry.method === method
  );
  if (!registered) {
    throw new Error(`Route not found: ${method} ${path}`);
  }
  return registered as { handler: (ctx: unknown, request: Request) => Promise<Response> };
}

function createRequest(url: string, init?: { method?: string; headers?: Record<string, string> }) {
  const headerEntries = Object.entries(init?.headers ?? {}).map(([key, value]) => [
    key.toLowerCase(),
    value,
  ]);
  const headerMap = new Map(headerEntries);
  return {
    url,
    method: init?.method ?? 'GET',
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) ?? null,
    },
  } as unknown as Request;
}

describe('convex/http contract', () => {
  beforeEach(() => {
    delete process.env.CONVEX_SYNC_ALLOWED_ORIGINS;
    delete process.env.CONVEX_SYNC_SECRET;
    process.env.NODE_ENV = 'test';
  });

  it('parses allowlist origins from env string', () => {
    expect(parseAllowedOrigins(' https://a.com,https://b.com, ,')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('returns CORS headers with reflected origin when allowlist matches', () => {
    process.env.CONVEX_SYNC_ALLOWED_ORIGINS = 'https://app.example.com';
    const request = createRequest('https://convex.example/api/sync/export', {
      headers: { Origin: 'https://app.example.com' },
    });

    const headers = buildCorsHeaders(request);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('rejects preflight from disallowed origin', async () => {
    process.env.CONVEX_SYNC_ALLOWED_ORIGINS = 'https://allowed.example.com';
    const route = getRoute('/api/sync/export', 'OPTIONS');

    const response = await route.handler(
      {},
      createRequest('https://convex.example/api/sync/export', {
        method: 'OPTIONS',
        headers: { Origin: 'https://blocked.example.com' },
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.code).toBe('sync_origin_not_allowed');
  });

  it('fails closed when sync secret is missing in production-like runtime', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CONVEX_SYNC_SECRET;

    const route = getRoute('/api/sync/metadata', 'GET');
    const runQuery = jest.fn();
    const response = await route.handler(
      { runQuery },
      createRequest('https://convex.example/api/sync/metadata')
    );

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.code).toBe('sync_auth_not_configured');
    expect(runQuery).not.toHaveBeenCalled();
  });
});
