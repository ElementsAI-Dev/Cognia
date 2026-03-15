import * as providerLibrary from './index';
import { getProviderIconPath } from '@/lib/ai/icons';

describe('provider state projection', () => {
  it('builds canonical projections for built-in, local, and custom providers', () => {
    const buildProviderStateProjections = (
      providerLibrary as typeof providerLibrary & {
        buildProviderStateProjections?: (input: unknown) => Array<Record<string, unknown>>;
      }
    ).buildProviderStateProjections;

    expect(buildProviderStateProjections).toBeDefined();
    if (!buildProviderStateProjections) return;

    const projections = buildProviderStateProjections({
      providerSettings: {
        openai: {
          providerId: 'openai',
          enabled: true,
          apiKey: '',
          apiKeys: ['sk-pooled-openai'],
          defaultModel: 'gpt-4o',
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
          enabled: true,
          apiKey: 'sk-custom-alpha',
          baseURL: 'https://custom.example.com/v1',
          defaultModel: 'alpha-1',
          customName: 'Custom Alpha',
          customModels: ['alpha-1'],
          apiProtocol: 'openai',
        },
      },
    });

    const openai = projections.find((projection) => projection.id === 'openai');
    const ollama = projections.find((projection) => projection.id === 'ollama');
    const custom = projections.find((projection) => projection.id === 'custom-alpha');

    expect(openai?.selectable).toBe(true);
    expect(openai?.codingPackage).toBeUndefined();
    expect(ollama?.kind).toBe('local');
    expect(custom?.kind).toBe('custom');
    expect(custom?.displayName).toBe('Custom Alpha');
    expect(custom?.models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'alpha-1', name: 'alpha-1' })])
    );
  });

  it('surfaces stale verification and blocked guidance in projections', () => {
    const buildProviderStateProjections = (
      providerLibrary as typeof providerLibrary & {
        buildProviderStateProjections?: (input: unknown) => Array<Record<string, unknown>>;
      }
    ).buildProviderStateProjections;

    expect(buildProviderStateProjections).toBeDefined();
    if (!buildProviderStateProjections) return;

    const projections = buildProviderStateProjections({
      providerSettings: {
        openai: {
          providerId: 'openai',
          enabled: true,
          apiKey: 'sk-updated-openai',
          defaultModel: 'gpt-4o',
          verificationStatus: 'verified',
          verificationFingerprint: JSON.stringify({
            apiKey: 'sk-old-openai',
            apiKeys: [],
            currentKeyIndex: 0,
            baseURL: '',
            defaultModel: 'gpt-4o',
          }),
        },
        anthropic: {
          providerId: 'anthropic',
          enabled: true,
          apiKey: '',
          defaultModel: 'claude-sonnet-4-20250514',
        },
      },
      customProviders: {},
    });

    const openai = projections.find((projection) => projection.id === 'openai');
    const anthropic = projections.find((projection) => projection.id === 'anthropic');

    expect(openai?.verificationStatus).toBe('stale');
    expect(openai?.recommendedRemediation).toMatch(/Re-run verification/i);
    expect(anthropic?.selectable).toBe(false);
    expect(anthropic?.blockedReason).toMatch(/API key/i);
  });

  it('uses centralized provider icon resolution in built-in projections', () => {
    const buildProviderStateProjections = (
      providerLibrary as typeof providerLibrary & {
        buildProviderStateProjections?: (input: unknown) => Array<Record<string, unknown>>;
      }
    ).buildProviderStateProjections;

    expect(buildProviderStateProjections).toBeDefined();
    if (!buildProviderStateProjections) return;

    const projections = buildProviderStateProjections({
      providerSettings: {
        minimax: {
          providerId: 'minimax',
          enabled: true,
          apiKey: 'sk-minimax',
          defaultModel: 'abab6.5s-chat',
        },
      },
      customProviders: {},
    });

    const minimax = projections.find((projection) => projection.id === 'minimax');

    expect(minimax?.icon).toBe(getProviderIconPath('minimax'));
    expect(minimax?.metadata).toEqual(
      expect.objectContaining({
        icon: getProviderIconPath('minimax'),
      })
    );
  });
});
