/**
 * @jest-environment jsdom
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { ProviderProvider, useProviderContext } from './provider-context';
import { probeProviderConnection } from '@/lib/ai/infrastructure/api-test';

const mockState = {
  providerSettings: {
    openai: {
      providerId: 'openai',
      apiKey: '',
      apiKeys: ['sk-openai-pooled'],
      defaultModel: 'gpt-4o',
      enabled: true,
    },
    zhipu: {
      providerId: 'zhipu',
      apiKey: 'sk-zhipu',
      defaultModel: 'glm-4-flash',
      enabled: true,
    },
    minimax: {
      providerId: 'minimax',
      apiKey: 'sk-minimax',
      defaultModel: 'abab6.5s-chat',
      enabled: true,
    },
    ollama: {
      providerId: 'ollama',
      enabled: true,
      baseURL: 'http://localhost:11434',
      defaultModel: 'llama3.2',
    },
  },
  customProviders: {
    'custom-alpha': {
      id: 'custom-alpha',
      customName: 'Custom Alpha',
      customModels: ['alpha-1'],
      apiProtocol: 'openai',
      apiKey: 'sk-custom-alpha',
      baseURL: 'https://custom.example.com/v1',
      defaultModel: 'alpha-1',
      enabled: true,
    },
  },
  defaultProvider: 'openai',
};

jest.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

jest.mock('@/lib/ai/core/provider-registry', () => ({
  createCogniaProviderRegistry: jest.fn(() => ({
    getProvider: jest.fn(),
    getAvailableProviders: jest.fn(() => ['openai', 'zhipu', 'minimax']),
    hasProvider: jest.fn(() => true),
    languageModel: jest.fn(),
  })),
}));

jest.mock('@/lib/ai/infrastructure/api-test', () => ({
  probeProviderConnection: jest.fn().mockResolvedValue({
    success: true,
    authoritative: true,
    outcome: 'verified',
    message: 'Connected',
    latency_ms: 100,
  }),
}));

describe('ProviderProvider catalog integration', () => {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ProviderProvider enableHealthChecks={false}>{children}</ProviderProvider>;
  }

  it('hydrates zhipu metadata from the built-in catalog', () => {
    const { result } = renderHook(() => useProviderContext(), { wrapper: Wrapper });

    expect(result.current.getProvider('zhipu')?.metadata.name).toBe('Zhipu AI (智谱清言)');
    expect(result.current.getProvider('zhipu')?.metadata.supportsTools).toBe(true);
  });

  it('hydrates minimax models from provider config', () => {
    const { result } = renderHook(() => useProviderContext(), { wrapper: Wrapper });

    expect(result.current.getProviderModels('minimax')).toContain('abab6.5s-chat');
  });

  it('treats pooled API keys as configured and available', () => {
    const { result } = renderHook(() => useProviderContext(), { wrapper: Wrapper });

    expect(result.current.isProviderConfigured('openai')).toBe(true);
    expect(
      result.current.getAvailableProviders().some((provider) => provider.settings.providerId === 'openai')
    ).toBe(true);
  });

  it('exposes custom provider model lists through the shared projection path', () => {
    const { result } = renderHook(() => useProviderContext(), { wrapper: Wrapper });

    expect(result.current.getProvider('custom-alpha')?.metadata.name).toBe('Custom Alpha');
    expect(result.current.getProviderModels('custom-alpha')).toContain('alpha-1');
  });

  it('uses the active pooled credential for built-in health checks', async () => {
    const { result } = renderHook(() => useProviderContext(), { wrapper: Wrapper });

    await act(async () => {
      const status = await result.current.checkProviderHealth('openai');
      expect(status).toBe('healthy');
    });

    expect(probeProviderConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'openai',
        apiKey: 'sk-openai-pooled',
      })
    );
  });

  it('allows keyless local provider health checks through the shared probe contract', async () => {
    const { result } = renderHook(() => useProviderContext(), { wrapper: Wrapper });

    await act(async () => {
      const status = await result.current.checkProviderHealth('ollama');
      expect(status).toBe('healthy');
    });

    expect(probeProviderConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'ollama',
        apiKey: '',
        baseURL: 'http://localhost:11434',
      })
    );
  });
});
