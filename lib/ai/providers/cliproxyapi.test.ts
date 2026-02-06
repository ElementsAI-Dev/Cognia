/**
 * CLIProxyAPI Provider Integration Tests
 */

import {
  getBaseURL,
  getAPIURL,
  getWebUIURL,
  maskCLIProxyApiKey,
  parseCLIProxyModelId,
  buildModelId,
  DEFAULT_CONFIG,
  COMMON_MODEL_ALIASES,
} from './cliproxyapi';

describe('CLIProxyAPI Provider', () => {
  describe('URL helpers', () => {
    it('should generate correct base URL with default values', () => {
      expect(getBaseURL()).toBe('http://localhost:8317');
    });

    it('should generate correct base URL with custom host and port', () => {
      expect(getBaseURL('192.168.1.100', 9000)).toBe('http://192.168.1.100:9000');
    });

    it('should generate correct API URL', () => {
      expect(getAPIURL()).toBe('http://localhost:8317/v1');
      expect(getAPIURL('example.com', 8080)).toBe('http://example.com:8080/v1');
    });

    it('should generate correct WebUI URL', () => {
      expect(getWebUIURL()).toBe('http://localhost:8317/management.html');
      expect(getWebUIURL('example.com', 8080)).toBe('http://example.com:8080/management.html');
    });
  });

  describe('maskCLIProxyApiKey', () => {
    it('should mask API key correctly', () => {
      expect(maskCLIProxyApiKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
    });

    it('should handle short keys', () => {
      expect(maskCLIProxyApiKey('short')).toBe('****');
    });

    it('should handle empty keys', () => {
      expect(maskCLIProxyApiKey('')).toBe('****');
    });
  });

  describe('parseCLIProxyModelId', () => {
    it('should parse model ID with prefix', () => {
      const result = parseCLIProxyModelId('test/gemini-2.5-pro');
      expect(result.prefix).toBe('test');
      expect(result.model).toBe('gemini-2.5-pro');
    });

    it('should parse model ID without prefix', () => {
      const result = parseCLIProxyModelId('gpt-4o');
      expect(result.prefix).toBeUndefined();
      expect(result.model).toBe('gpt-4o');
    });

    it('should handle model ID with multiple slashes', () => {
      const result = parseCLIProxyModelId('provider/path/model');
      expect(result.prefix).toBe('provider');
      expect(result.model).toBe('path/model');
    });
  });

  describe('buildModelId', () => {
    it('should build model ID with prefix', () => {
      expect(buildModelId('gemini-2.5-pro', 'test')).toBe('test/gemini-2.5-pro');
    });

    it('should build model ID without prefix', () => {
      expect(buildModelId('gpt-4o')).toBe('gpt-4o');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONFIG.host).toBe('localhost');
      expect(DEFAULT_CONFIG.port).toBe(8317);
      expect(DEFAULT_CONFIG.apiKey).toBe('');
    });
  });

  describe('COMMON_MODEL_ALIASES', () => {
    it('should have common aliases', () => {
      expect(COMMON_MODEL_ALIASES['gemini-flash']).toBe('gemini-2.5-flash');
      expect(COMMON_MODEL_ALIASES['claude-sonnet']).toBe('claude-sonnet-4-20250514');
      expect(COMMON_MODEL_ALIASES['gpt4o']).toBe('gpt-4o');
    });
  });
});

describe('CLIProxyAPI Network Functions', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('testConnection', () => {
    it('should return success when server responds', async () => {
      const { testConnection } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await testConnection('test-api-key');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Connected');
      expect(result.latency).toBeDefined();
    });

    it('should return failure when server returns error', async () => {
      const { testConnection } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const result = await testConnection('invalid-key');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('401');
    });

    it('should return failure when connection fails', async () => {
      const { testConnection } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await testConnection('test-key');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('ECONNREFUSED');
    });
  });

  describe('fetchModels', () => {
    it('should return models when server responds', async () => {
      const { fetchModels } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'gemini-2.5-flash', object: 'model', owned_by: 'google' },
            { id: 'gpt-4o', object: 'model', owned_by: 'openai' },
          ],
        }),
      });

      const models = await fetchModels('test-api-key');
      
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('gemini-2.5-flash');
      expect(models[0].provider).toBe('google');
      expect(models[1].id).toBe('gpt-4o');
    });

    it('should throw error when request fails', async () => {
      const { fetchModels, CLIProxyAPIError } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchModels('test-key')).rejects.toThrow(CLIProxyAPIError);
    });
  });

  describe('fetchHealthStatus', () => {
    it('should return healthy when server responds', async () => {
      const { fetchHealthStatus } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const result = await fetchHealthStatus();
      
      expect(result.healthy).toBe(true);
    });

    it('should return unhealthy when server fails', async () => {
      const { fetchHealthStatus } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await fetchHealthStatus();
      
      expect(result.healthy).toBe(false);
    });
  });

  describe('checkWebUIAccess', () => {
    it('should return true when WebUI is accessible', async () => {
      const { checkWebUIAccess } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const result = await checkWebUIAccess();
      
      expect(result).toBe(true);
    });

    it('should return false when WebUI is not accessible', async () => {
      const { checkWebUIAccess } = await import('./cliproxyapi');
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await checkWebUIAccess();
      
      expect(result).toBe(false);
    });
  });
});
