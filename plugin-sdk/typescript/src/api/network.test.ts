/**
 * Network API Tests
 *
 * @description Tests for network API type definitions.
 */

import type {
  PluginNetworkAPI,
  NetworkRequestOptions,
  NetworkResponse,
  DownloadOptions,
  DownloadProgress,
  DownloadResult,
  UploadOptions,
} from './network';

describe('Network API Types', () => {
  describe('NetworkRequestOptions', () => {
    it('should create valid request options', () => {
      const options: NetworkRequestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
        body: { data: 'test' },
        timeout: 30000,
        responseType: 'json',
      };

      expect(options.method).toBe('POST');
      expect(options.headers?.['Content-Type']).toBe('application/json');
      expect(options.timeout).toBe(30000);
      expect(options.responseType).toBe('json');
    });

    it('should support all HTTP methods', () => {
      const methods: NonNullable<NetworkRequestOptions['method']>[] = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'HEAD',
        'OPTIONS',
      ];

      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('HEAD');
      expect(methods).toContain('OPTIONS');
      expect(methods).toHaveLength(7);
    });

    it('should support all response types', () => {
      const types: NonNullable<NetworkRequestOptions['responseType']>[] = [
        'json',
        'text',
        'blob',
        'arraybuffer',
      ];

      expect(types).toContain('json');
      expect(types).toContain('text');
      expect(types).toContain('blob');
      expect(types).toContain('arraybuffer');
      expect(types).toHaveLength(4);
    });

    it('should support abort signal', () => {
      const controller = new AbortController();
      const options: NetworkRequestOptions = {
        method: 'GET',
        signal: controller.signal,
      };

      expect(options.signal?.aborted).toBe(false);
      controller.abort();
      expect(options.signal?.aborted).toBe(true);
    });
  });

  describe('NetworkResponse', () => {
    it('should create a successful response', () => {
      const response: NetworkResponse<{ id: number; name: string }> = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
        },
        data: { id: 1, name: 'Test' },
      };

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data.id).toBe(1);
    });

    it('should create an error response', () => {
      const response: NetworkResponse<{ error: string }> = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { error: 'Resource not found' },
      };

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Resource not found');
    });

    it('should support various status codes', () => {
      const responses: NetworkResponse<unknown>[] = [
        { ok: true, status: 200, statusText: 'OK', headers: {}, data: {} },
        { ok: true, status: 201, statusText: 'Created', headers: {}, data: {} },
        { ok: true, status: 204, statusText: 'No Content', headers: {}, data: null },
        { ok: false, status: 400, statusText: 'Bad Request', headers: {}, data: {} },
        { ok: false, status: 401, statusText: 'Unauthorized', headers: {}, data: {} },
        { ok: false, status: 500, statusText: 'Internal Server Error', headers: {}, data: {} },
      ];

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(201);
      expect(responses[2].status).toBe(204);
      expect(responses[3].status).toBe(400);
      expect(responses[4].status).toBe(401);
      expect(responses[5].status).toBe(500);
    });
  });

  describe('DownloadProgress', () => {
    it('should create valid progress', () => {
      const progress: DownloadProgress = {
        loaded: 500000,
        total: 1000000,
        percent: 50,
      };

      expect(progress.loaded).toBe(500000);
      expect(progress.total).toBe(1000000);
      expect(progress.percent).toBe(50);
    });

    it('should handle complete download', () => {
      const progress: DownloadProgress = {
        loaded: 1000000,
        total: 1000000,
        percent: 100,
      };

      expect(progress.percent).toBe(100);
      expect(progress.loaded).toBe(progress.total);
    });
  });

  describe('DownloadOptions', () => {
    it('should create valid download options', () => {
      const onProgress = jest.fn();
      const options: DownloadOptions = {
        headers: {
          Authorization: 'Bearer token',
        },
        onProgress,
      };

      expect(options.headers?.Authorization).toBe('Bearer token');
      expect(options.onProgress).toBeDefined();
    });

    it('should call progress callback', () => {
      const onProgress = jest.fn();
      const options: DownloadOptions = { onProgress };

      const progress: DownloadProgress = {
        loaded: 250000,
        total: 1000000,
        percent: 25,
      };

      options.onProgress?.(progress);
      expect(onProgress).toHaveBeenCalledWith(progress);
    });
  });

  describe('DownloadResult', () => {
    it('should create valid download result', () => {
      const result: DownloadResult = {
        path: '/downloads/file.pdf',
        size: 1000000,
        contentType: 'application/pdf',
      };

      expect(result.path).toBe('/downloads/file.pdf');
      expect(result.size).toBe(1000000);
      expect(result.contentType).toBe('application/pdf');
    });

    it('should create result without content type', () => {
      const result: DownloadResult = {
        path: '/downloads/file.bin',
        size: 500,
      };

      expect(result.contentType).toBeUndefined();
    });
  });

  describe('UploadOptions', () => {
    it('should create valid upload options', () => {
      const onProgress = jest.fn();
      const options: UploadOptions = {
        headers: {
          'X-Custom-Header': 'value',
        },
        fieldName: 'document',
        onProgress,
      };

      expect(options.headers?.['X-Custom-Header']).toBe('value');
      expect(options.fieldName).toBe('document');
      expect(options.onProgress).toBeDefined();
    });
  });

  describe('PluginNetworkAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginNetworkAPI = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        fetch: jest.fn(),
        download: jest.fn(),
        upload: jest.fn(),
      };

      expect(mockAPI.get).toBeDefined();
      expect(mockAPI.post).toBeDefined();
      expect(mockAPI.put).toBeDefined();
      expect(mockAPI.delete).toBeDefined();
      expect(mockAPI.patch).toBeDefined();
      expect(mockAPI.fetch).toBeDefined();
      expect(mockAPI.download).toBeDefined();
      expect(mockAPI.upload).toBeDefined();
    });

    it('should call GET method correctly', async () => {
      const mockAPI: PluginNetworkAPI = {
        get: jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { items: [] },
        }),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        fetch: jest.fn(),
        download: jest.fn(),
        upload: jest.fn(),
      };

      const result = await mockAPI.get<{ items: unknown[] }>('https://api.example.com/items');
      expect(mockAPI.get).toHaveBeenCalledWith('https://api.example.com/items');
      expect(result.data.items).toEqual([]);
    });

    it('should call POST method correctly', async () => {
      const mockAPI: PluginNetworkAPI = {
        get: jest.fn(),
        post: jest.fn().mockResolvedValue({
          ok: true,
          status: 201,
          statusText: 'Created',
          headers: {},
          data: { id: 1 },
        }),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        fetch: jest.fn(),
        download: jest.fn(),
        upload: jest.fn(),
      };

      const body = { name: 'New Item' };
      await mockAPI.post('https://api.example.com/items', body);
      expect(mockAPI.post).toHaveBeenCalledWith('https://api.example.com/items', body);
    });

    it('should call download method correctly', async () => {
      const mockAPI: PluginNetworkAPI = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        fetch: jest.fn(),
        download: jest.fn().mockResolvedValue({
          path: '/downloads/file.pdf',
          size: 1000,
        }),
        upload: jest.fn(),
      };

      const result = await mockAPI.download(
        'https://example.com/file.pdf',
        '/downloads/file.pdf',
        { onProgress: jest.fn() },
      );

      expect(mockAPI.download).toHaveBeenCalled();
      expect(result.path).toBe('/downloads/file.pdf');
    });
  });
});
