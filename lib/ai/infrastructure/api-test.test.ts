/**
 * Tests for API Test Utilities
 */

import {
  probeProviderConnection,
  testOpenAIConnection,
  testAnthropicConnection,
  testGoogleConnection,
  testProviderConnection,
  type ApiTestResult,
} from './api-test';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock proxyFetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: jest.fn(),
}));

import { proxyFetch } from '@/lib/network/proxy-fetch';

const mockProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;

describe('testOpenAIConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ApiTestResult structure', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Connected',
      latency_ms: 100,
    });

    const result = await testOpenAIConnection('sk-test-key');
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });

  it('should handle connection errors', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

    const result = await testOpenAIConnection('invalid-key');
    
    expect(result.success).toBe(false);
  });

  it('should accept optional base URL', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Connected',
    });

    const result = await testOpenAIConnection('sk-test-key', 'https://custom.api.com');
    
    expect(result).toBeDefined();
  });
});

describe('testAnthropicConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should test Anthropic API', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Connected to Anthropic',
    });

    const result = await testAnthropicConnection('sk-ant-test-key');
    
    expect(result).toHaveProperty('success');
  });
});

describe('testGoogleConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should test Google AI API', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Connected to Google AI',
    });

    const result = await testGoogleConnection('AIza-test-key');
    
    expect(result).toHaveProperty('success');
  });
});

describe('testProviderConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route to OpenAI for openai provider', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Connected',
    });

    const result = await testProviderConnection('openai', 'sk-test-key');
    
    expect(result).toHaveProperty('success');
  });

  it('should route to Anthropic for anthropic provider', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    (invoke as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Connected',
    });

    const result = await testProviderConnection('anthropic', 'sk-ant-test');
    
    expect(result).toHaveProperty('success');
  });

  it('should handle unknown providers', async () => {
    const result = await testProviderConnection('unknown-provider', 'api-key');
    
    expect(result.success).toBe(false);
  });
});

describe('probeProviderConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns runtime-limited results for anthropic in non-tauri environments', async () => {
    const result = await probeProviderConnection({
      providerId: 'anthropic',
      apiKey: 'sk-ant-test-key-1234567890',
      protocol: 'anthropic',
    });

    expect(result.success).toBe(false);
    expect(result.outcome).toBe('limited');
    expect(result.authoritative).toBe(false);
  });

  it('returns authoritative success for openai-compatible custom endpoints', async () => {
    mockProxyFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'alpha-1' }] }),
    } as Response);

    const result = await probeProviderConnection({
      providerId: 'custom-openai',
      apiKey: 'sk-custom',
      baseURL: 'https://custom.example.com/v1',
      protocol: 'openai',
    });

    expect(mockProxyFetch).toHaveBeenCalledWith(
      'https://custom.example.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-custom',
        }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('verified');
    expect(result.authoritative).toBe(true);
  });
});

describe('ApiTestResult type', () => {
  it('should have correct success structure', () => {
    const result: ApiTestResult = {
      success: true,
      message: 'Connection successful',
      latency_ms: 150,
    };
    expect(result.success).toBe(true);
    expect(result.message).toBe('Connection successful');
  });

  it('should have correct failure structure', () => {
    const result: ApiTestResult = {
      success: false,
      message: 'Connection failed: Invalid API key',
    };
    expect(result.success).toBe(false);
  });
});
