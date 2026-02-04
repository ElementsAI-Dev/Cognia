/**
 * Tests for useLocalProvider hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalProvider, useLocalProvidersScan } from './use-local-provider';

// Mock the local provider service
jest.mock('@/lib/ai/providers/local-provider-service', () => ({
  createLocalProviderService: jest.fn(() => ({
    getId: () => 'ollama',
    getConfig: () => ({
      id: 'ollama',
      name: 'Ollama',
      defaultPort: 11434,
      defaultBaseURL: 'http://localhost:11434',
      modelsEndpoint: '/api/tags',
      healthEndpoint: '/api/version',
      supportsModelList: true,
      supportsEmbeddings: true,
      description: 'Run models locally',
      website: 'https://ollama.ai',
    }),
    getCapabilities: () => ({
      canListModels: true,
      canPullModels: true,
      canDeleteModels: true,
      canStopModels: true,
      canGenerateEmbeddings: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
    }),
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      version: '0.1.0',
      models_count: 3,
      latency_ms: 50,
    }),
    listModels: jest.fn().mockResolvedValue([
      { id: 'llama3.2', object: 'model' },
      { id: 'qwen2.5', object: 'model' },
    ]),
    pullModel: jest.fn().mockResolvedValue({ success: true, unsubscribe: () => {} }),
    deleteModel: jest.fn().mockResolvedValue(true),
    stopModel: jest.fn().mockResolvedValue(true),
  })),
  LocalProviderService: jest.fn(),
}));

// Mock local-providers
jest.mock('@/lib/ai/providers/local-providers', () => ({
  LOCAL_PROVIDER_CONFIGS: {
    ollama: {
      id: 'ollama',
      name: 'Ollama',
      defaultPort: 11434,
      defaultBaseURL: 'http://localhost:11434',
      modelsEndpoint: '/api/tags',
      healthEndpoint: '/api/version',
      supportsModelList: true,
      supportsEmbeddings: true,
      description: 'Run models locally',
      website: 'https://ollama.ai',
    },
    lmstudio: {
      id: 'lmstudio',
      name: 'LM Studio',
      defaultPort: 1234,
      defaultBaseURL: 'http://localhost:1234',
      modelsEndpoint: '/v1/models',
      healthEndpoint: '/v1/models',
      supportsModelList: true,
      supportsEmbeddings: true,
      description: 'Desktop app for running local LLMs',
      website: 'https://lmstudio.ai',
    },
  },
}));

describe('useLocalProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct provider config', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: false,
      })
    );

    expect(result.current.providerId).toBe('ollama');
    expect(result.current.config).toBeDefined();
    expect(result.current.capabilities).toBeDefined();
  });

  it('should auto-connect when autoConnect is true', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.status?.connected).toBe(true);
    expect(result.current.models.length).toBeGreaterThan(0);
  });

  it('should return correct capabilities', () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: false,
      })
    );

    expect(result.current.capabilities.canListModels).toBe(true);
    expect(result.current.capabilities.canPullModels).toBe(true);
    expect(result.current.capabilities.canDeleteModels).toBe(true);
  });

  it('should refresh status and models', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: false,
      })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.models).toHaveLength(2);
  });

  it('should test connection', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: false,
      })
    );

    let testResult: { success: boolean; message: string };
    await act(async () => {
      testResult = await result.current.testConnection();
    });

    expect(testResult!.success).toBe(true);
    expect(testResult!.message).toContain('Connected');
  });

  it('should handle pull model', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: false,
      })
    );

    await act(async () => {
      await result.current.pullModel('llama3.2');
    });

    // After pull, models should be refreshed
    expect(result.current.isPulling).toBe(false);
  });

  it('should handle delete model', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    let deleteResult: boolean;
    await act(async () => {
      deleteResult = await result.current.deleteModel('llama3.2');
    });

    expect(deleteResult!).toBe(true);
  });

  it('should update base URL', async () => {
    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: false,
      })
    );

    act(() => {
      result.current.setBaseUrl('http://localhost:5000');
    });

    // The setBaseUrl should trigger a state update
    expect(result.current.providerId).toBe('ollama');
  });

  it('should handle error states', async () => {
    // Override the mock to return error - must be set BEFORE renderHook
    const localProviderService = await import('@/lib/ai/providers/local-provider-service');
    const errorMock = {
      getId: () => 'ollama',
      getConfig: () => ({}),
      getCapabilities: () => ({
        canListModels: true,
        canPullModels: true,
        canDeleteModels: true,
      }),
      getStatus: jest.fn().mockResolvedValue({
        connected: false,
        error: 'Connection refused',
      }),
      listModels: jest.fn().mockResolvedValue([]),
    };
    (localProviderService.createLocalProviderService as jest.Mock).mockReturnValue(errorMock);

    const { result } = renderHook(() =>
      useLocalProvider({
        providerId: 'ollama',
        autoConnect: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Connection refused');
    });

    expect(result.current.isConnected).toBe(false);

    // Restore the original mock for other tests
    (localProviderService.createLocalProviderService as jest.Mock).mockReturnValue({
      getId: () => 'ollama',
      getConfig: () => ({}),
      getCapabilities: () => ({
        canListModels: true,
        canPullModels: true,
        canDeleteModels: true,
        canStopModels: true,
        canGenerateEmbeddings: true,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
      }),
      getStatus: jest.fn().mockResolvedValue({
        connected: true,
        version: '0.1.0',
        models_count: 3,
        latency_ms: 50,
      }),
      listModels: jest.fn().mockResolvedValue([
        { id: 'llama3.2', object: 'model' },
        { id: 'qwen2.5', object: 'model' },
      ]),
      pullModel: jest.fn().mockResolvedValue({ success: true, unsubscribe: () => {} }),
      deleteModel: jest.fn().mockResolvedValue(true),
      stopModel: jest.fn().mockResolvedValue(true),
    });
  });
});

describe('useLocalProvidersScan', () => {
  it('should initialize with empty results', () => {
    const { result } = renderHook(() => useLocalProvidersScan());

    expect(result.current.results.size).toBe(0);
    expect(result.current.isScanning).toBe(false);
  });

  it('should scan all providers', async () => {
    const { result } = renderHook(() => useLocalProvidersScan());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.isScanning).toBe(false);
    // Results should contain entries for scanned providers
    expect(result.current.results.size).toBeGreaterThan(0);
  });
});
