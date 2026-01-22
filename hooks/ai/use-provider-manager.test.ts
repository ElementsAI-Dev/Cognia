/**
 * Tests for useProviderManager hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: {
          apiKey: 'sk-test-key',
          enabled: true,
          baseURL: 'https://api.openai.com/v1',
        },
        anthropic: {
          apiKey: 'sk-ant-key',
          enabled: true,
        },
      },
      customProviders: {},
    };
    return selector ? selector(state) : state;
  }),
}));

const mockManager = {
  initialize: jest.fn(),
  getAllProviderStates: jest.fn(() => new Map()),
  getSummary: jest.fn(() => ({
    totalProviders: 2,
    enabledProviders: 2,
    availableProviders: 2,
    openCircuits: [],
    quotaAlerts: 0,
  })),
  getProviderState: jest.fn((id: string) => ({
    providerId: id,
    enabled: true,
    circuitState: 'closed',
    availability: { status: 'available' },
    metrics: { successRate: 1, avgLatency: 100 },
    quota: null,
  })),
  execute: jest.fn(async (fn: (ctx: { providerId: string }) => Promise<unknown>) => {
    const result = await fn({ providerId: 'openai' });
    return { success: true, data: result, providerId: 'openai' };
  }),
  getQuotaStatus: jest.fn(() => ({
    usage: 100,
    remaining: 900,
    alerts: [],
    isBlocked: false,
  })),
  checkAllProvidersHealth: jest.fn(),
  resetCircuitBreaker: jest.fn(),
  onQuotaAlert: jest.fn(() => jest.fn()),
  onAvailabilityChange: jest.fn(() => jest.fn()),
};

jest.mock('@/lib/ai/infrastructure/provider-manager', () => ({
  getProviderManager: jest.fn(() => mockManager),
  ProviderManager: jest.fn(),
}));

import {
  useProviderManager,
  useProviderExecution,
  useProviderHealth,
  useProviderQuota,
} from './use-provider-manager';
import { getProviderManager } from '@/lib/ai/infrastructure/provider-manager';

const _mockGetProviderManager = jest.mocked(getProviderManager);

describe('useProviderManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManager.getAllProviderStates.mockReturnValue(new Map());
    mockManager.getSummary.mockReturnValue({
      totalProviders: 2,
      enabledProviders: 2,
      availableProviders: 2,
      openCircuits: [],
      quotaAlerts: 0,
    });
  });

  it('initializes provider manager on mount', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(mockManager.initialize).toHaveBeenCalled();
  });

  it('skips initialization when autoInitialize is false', () => {
    const { result } = renderHook(() => useProviderManager({ autoInitialize: false }));

    expect(result.current.isInitialized).toBe(false);
    expect(mockManager.initialize).not.toHaveBeenCalled();
  });

  it('returns provider summary', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.summary).toEqual({
      totalProviders: 2,
      enabledProviders: 2,
      availableProviders: 2,
      openCircuits: [],
      quotaAlerts: 0,
    });
  });

  it('gets provider state by id', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const state = result.current.getProviderState('openai');
    expect(mockManager.getProviderState).toHaveBeenCalledWith('openai');
    expect(state).toBeTruthy();
  });

  it('checks provider availability', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const isAvailable = result.current.isProviderAvailable('openai');
    expect(isAvailable).toBe(true);
  });

  it('returns false for unavailable provider', async () => {
    mockManager.getProviderState.mockReturnValueOnce({
      providerId: 'openai',
      enabled: true,
      circuitState: 'open',
      availability: { status: 'unavailable' },
      metrics: { successRate: 0, avgLatency: 0 },
      quota: null,
    });

    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const isAvailable = result.current.isProviderAvailable('openai');
    expect(isAvailable).toBe(false);
  });

  it('executes request with provider management', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const testFn = jest.fn().mockResolvedValue('test-result');

    await act(async () => {
      const execResult = await result.current.execute(testFn, {
        preferredProvider: 'openai',
        modelId: 'gpt-4',
      });
      expect(execResult.success).toBe(true);
    });

    expect(mockManager.execute).toHaveBeenCalled();
  });

  it('throws error when executing without initialization', async () => {
    const { result } = renderHook(() => useProviderManager({ autoInitialize: false }));

    const testFn = jest.fn();

    await expect(
      result.current.execute(testFn, { preferredProvider: 'openai', modelId: 'gpt-4' })
    ).rejects.toThrow('Provider Manager not initialized');
  });

  it('gets quota status', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const quota = result.current.getQuotaStatus('openai');
    expect(mockManager.getQuotaStatus).toHaveBeenCalledWith('openai');
    expect(quota).toEqual({
      usage: 100,
      remaining: 900,
      alerts: [],
      isBlocked: false,
    });
  });

  it('refreshes provider health', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    await act(async () => {
      await result.current.refreshHealth();
    });

    expect(mockManager.checkAllProvidersHealth).toHaveBeenCalled();
  });

  it('resets circuit breaker', async () => {
    const { result } = renderHook(() => useProviderManager());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.resetCircuitBreaker('openai');
    });

    expect(mockManager.resetCircuitBreaker).toHaveBeenCalledWith('openai');
  });

  it('subscribes to quota alerts when enabled', async () => {
    renderHook(() => useProviderManager({ enableQuotaAlerts: true }));

    await waitFor(() => {
      expect(mockManager.onQuotaAlert).toHaveBeenCalled();
    });
  });

  it('subscribes to availability changes when enabled', async () => {
    renderHook(() => useProviderManager({ enableAvailabilityMonitoring: true }));

    await waitFor(() => {
      expect(mockManager.onAvailabilityChange).toHaveBeenCalled();
    });
  });
});

describe('useProviderExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes AI request successfully', async () => {
    const { result } = renderHook(() => useProviderExecution());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const testFn = jest.fn().mockResolvedValue('ai-result');

    await act(async () => {
      const execResult = await result.current.executeAI(testFn, {
        preferredProvider: 'openai',
        modelId: 'gpt-4',
      });
      expect(execResult).toBe('ai-result');
    });
  });

  it('throws error on failed execution', async () => {
    mockManager.execute.mockResolvedValueOnce({
      success: false,
      data: null,
      providerId: 'openai',
      error: new Error('Execution failed'),
    } as unknown as { success: boolean; data: unknown; providerId: string });

    const { result } = renderHook(() => useProviderExecution());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const testFn = jest.fn();

    await expect(
      result.current.executeAI(testFn, { preferredProvider: 'openai', modelId: 'gpt-4' })
    ).rejects.toThrow('Execution failed');
  });
});

describe('useProviderHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns provider health state', async () => {
    const { result } = renderHook(() => useProviderHealth('openai'));

    await waitFor(() => {
      expect(result.current.state).toBeTruthy();
    });

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.circuitState).toBe('closed');
  });

  it('refreshes health on demand', async () => {
    const { result } = renderHook(() => useProviderHealth('openai'));

    await waitFor(() => {
      expect(result.current.state).toBeTruthy();
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockManager.checkAllProvidersHealth).toHaveBeenCalled();
  });

  it('resets circuit breaker', async () => {
    const { result } = renderHook(() => useProviderHealth('openai'));

    await waitFor(() => {
      expect(result.current.state).toBeTruthy();
    });

    act(() => {
      result.current.resetCircuit();
    });

    expect(mockManager.resetCircuitBreaker).toHaveBeenCalledWith('openai');
  });
});

describe('useProviderQuota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns quota information', async () => {
    const { result } = renderHook(() => useProviderQuota('openai'));

    await waitFor(() => {
      expect(result.current.quota).toBeTruthy();
    });

    expect(result.current.usage).toBe(100);
    expect(result.current.remaining).toBe(900);
    expect(result.current.isBlocked).toBe(false);
  });

  it('refreshes quota on demand', async () => {
    const { result } = renderHook(() => useProviderQuota('openai'));

    await waitFor(() => {
      expect(result.current.quota).toBeTruthy();
    });

    act(() => {
      result.current.refresh();
    });

    expect(mockManager.getQuotaStatus).toHaveBeenCalledWith('openai');
  });
});
