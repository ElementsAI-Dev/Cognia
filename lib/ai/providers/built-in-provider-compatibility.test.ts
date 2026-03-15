import {
  buildBuiltInSettingsFromCustomProvider,
  findEquivalentBuiltInProviderCandidates,
  resolveEquivalentBuiltInProviderId,
} from './built-in-provider-compatibility';

describe('built-in-provider-compatibility', () => {
  it('detects Zhipu-compatible custom providers', () => {
    expect(
      resolveEquivalentBuiltInProviderId({
        customName: 'Zhipu Mirror',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
        apiProtocol: 'openai',
        customModels: ['glm-4-flash'],
      })
    ).toBe('zhipu');
  });

  it('detects MiniMax-compatible custom providers', () => {
    expect(
      resolveEquivalentBuiltInProviderId({
        customName: 'MiniMax API',
        baseURL: 'https://api.minimax.chat/v1',
        apiProtocol: 'openai',
        customModels: ['abab6.5s-chat'],
      })
    ).toBe('minimax');
  });

  it('ignores non-equivalent custom providers', () => {
    expect(
      resolveEquivalentBuiltInProviderId({
        customName: 'Other OpenAI Compatible',
        baseURL: 'https://example.com/v1',
        apiProtocol: 'openai',
        customModels: ['custom-model'],
      })
    ).toBeUndefined();
  });

  it('builds built-in settings from an equivalent custom provider', () => {
    expect(
      buildBuiltInSettingsFromCustomProvider('zhipu', {
        customName: 'Zhipu API',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: 'zhipu-key',
        apiProtocol: 'openai',
        customModels: ['glm-4.6', 'glm-4-flash'],
        defaultModel: 'glm-4.6',
        enabled: true,
      })
    ).toEqual(
      expect.objectContaining({
        providerId: 'zhipu',
        apiKey: 'zhipu-key',
        defaultModel: 'glm-4.6',
        enabled: true,
      })
    );
  });

  it('indexes equivalent custom providers by built-in provider id', () => {
    const result = findEquivalentBuiltInProviderCandidates({
      'custom-zhipu': {
        providerId: 'custom-zhipu',
        customName: 'Zhipu API',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: 'zhipu-key',
        apiProtocol: 'openai',
        customModels: ['glm-4-flash'],
        defaultModel: 'glm-4-flash',
        enabled: true,
      },
      'custom-minimax': {
        providerId: 'custom-minimax',
        customName: 'MiniMax API',
        baseURL: 'https://api.minimax.chat/v1',
        apiKey: 'minimax-key',
        apiProtocol: 'openai',
        customModels: ['abab6.5s-chat'],
        defaultModel: 'abab6.5s-chat',
        enabled: true,
      },
    });

    expect(result.zhipu?.customProviderId).toBe('custom-zhipu');
    expect(result.minimax?.customProviderId).toBe('custom-minimax');
  });
});
