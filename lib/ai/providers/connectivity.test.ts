import type { ProviderVerificationStatus } from '@/types/provider';

import {
  deriveVerificationStatusFromConnectivityResult,
  resolveBuiltInProviderConnectivityTarget,
  resolveCustomProviderConnectivityTarget,
} from './connectivity';

describe('provider connectivity helpers', () => {
  it('resolves built-in provider connectivity targets with active pooled credentials and catalog defaults', () => {
    const target = resolveBuiltInProviderConnectivityTarget('groq', {
      providerId: 'groq',
      apiKey: '',
      apiKeys: ['sk-one', 'sk-two'],
      currentKeyIndex: 1,
      enabled: true,
    });

    expect(target).toEqual(
      expect.objectContaining({
        providerId: 'groq',
        protocol: 'openai',
        apiKey: 'sk-two',
        baseURL: 'https://api.groq.com/openai/v1',
        requiresCredential: true,
        requiresBaseURL: false,
        isLocal: false,
      })
    );
  });

  it('resolves keyless local built-in provider targets without inventing credentials', () => {
    const target = resolveBuiltInProviderConnectivityTarget('ollama', {
      providerId: 'ollama',
      enabled: true,
      baseURL: 'http://localhost:11434',
      defaultModel: 'llama3.2',
    });

    expect(target).toEqual(
      expect.objectContaining({
        providerId: 'ollama',
        protocol: 'openai',
        apiKey: '',
        baseURL: 'http://localhost:11434',
        requiresCredential: false,
        requiresBaseURL: true,
        isLocal: true,
      })
    );
  });

  it('resolves custom provider targets with explicit protocol metadata', () => {
    const target = resolveCustomProviderConnectivityTarget('custom-anthropic', {
      apiKey: 'sk-custom',
      baseURL: 'https://custom.example.com',
      apiProtocol: 'anthropic',
      enabled: true,
    });

    expect(target).toEqual(
      expect.objectContaining({
        providerId: 'custom-anthropic',
        protocol: 'anthropic',
        apiKey: 'sk-custom',
        baseURL: 'https://custom.example.com',
        requiresCredential: true,
        requiresBaseURL: true,
        isLocal: false,
      })
    );
  });

  it('does not promote runtime-limited results to verified status', () => {
    expect(
      deriveVerificationStatusFromConnectivityResult('verified', {
        success: false,
        outcome: 'limited',
        authoritative: false,
        message: 'Authoritative verification requires the desktop app.',
      })
    ).toBe<ProviderVerificationStatus>('stale');

    expect(
      deriveVerificationStatusFromConnectivityResult('unverified', {
        success: false,
        outcome: 'limited',
        authoritative: false,
        message: 'Authoritative verification requires the desktop app.',
      })
    ).toBe<ProviderVerificationStatus>('unverified');
  });
});
