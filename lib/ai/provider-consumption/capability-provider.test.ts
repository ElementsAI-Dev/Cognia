import {
  resolveCapabilityProviderAccess,
  resolveImageGenerationAccess,
  resolveImageEditingAccess,
  resolveImageStudioGenerationAccess,
  resolveImageVariationAccess,
  resolveImageInpaintingAccess,
  resolveSubtitleTranscriptionAccess,
} from './capability-provider';

describe('capability-provider', () => {
  const snapshot = {
    defaultProvider: 'openai',
    providerSettings: {
      openai: {
        providerId: 'openai',
        apiKey: 'sk-openai',
        defaultModel: 'gpt-4o',
        enabled: true,
      },
      google: {
        providerId: 'google',
        apiKey: 'sk-google',
        defaultModel: 'gemini-2.0-flash-exp',
        enabled: true,
      },
      togetherai: {
        providerId: 'togetherai',
        apiKey: 'sk-together',
        defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        enabled: true,
      },
    },
    customProviders: {},
  } as const;

  it('resolves capability providers through mapped settings providers', () => {
    const resolved = resolveCapabilityProviderAccess(
      {
        featureId: 'video-generation',
        capabilityProvider: 'google-veo',
        settingsProviderId: 'google',
      },
      snapshot
    );

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved capability provider');
    }
    expect(resolved.capabilityProvider).toBe('google-veo');
    expect(resolved.settingsProviderId).toBe('google');
    expect(resolved.routeProfile).toBe('capability-bound');
    expect(resolved.apiKey).toBe('sk-google');
  });

  it('returns shared blocked guidance when mapped provider is ineligible', () => {
    const blocked = resolveCapabilityProviderAccess(
      {
        featureId: 'video-generation',
        capabilityProvider: 'openai-sora',
        settingsProviderId: 'openai',
      },
      {
        ...snapshot,
        providerSettings: {
          ...snapshot.providerSettings,
          openai: {
            providerId: 'openai',
            enabled: true,
            defaultModel: 'gpt-4o',
          },
        },
      }
    );

    expect(blocked.kind).toBe('blocked');
    if (blocked.kind !== 'blocked') {
      throw new Error('Expected blocked capability provider');
    }
    expect(blocked.code).toBe('missing_credential');
    expect(blocked.nextAction).toBe('add_api_key');
  });

  it('uses explicit subtitle transcription policy', () => {
    const resolved = resolveSubtitleTranscriptionAccess(snapshot);

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved subtitle provider');
    }
    expect(resolved.capabilityProvider).toBe('subtitle-transcription');
    expect(resolved.settingsProviderId).toBe('openai');
    expect(resolved.apiKey).toBe('sk-openai');
  });

  it('uses explicit image generation policy', () => {
    const resolved = resolveImageGenerationAccess(snapshot);

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved image generation provider');
    }
    expect(resolved.capabilityProvider).toBe('image-generation');
    expect(resolved.settingsProviderId).toBe('openai');
    expect(resolved.routeProfile).toBe('capability-bound');
    expect(resolved.apiKey).toBe('sk-openai');
  });

  it('uses explicit image editing policy', () => {
    const resolved = resolveImageEditingAccess(snapshot);

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved image editing provider');
    }
    expect(resolved.capabilityProvider).toBe('image-edit');
    expect(resolved.settingsProviderId).toBe('openai');
  });

  it('uses explicit image variation policy', () => {
    const resolved = resolveImageVariationAccess(snapshot);

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved image variation provider');
    }
    expect(resolved.capabilityProvider).toBe('image-variation');
    expect(resolved.settingsProviderId).toBe('openai');
  });

  it('uses explicit image inpainting policy', () => {
    const resolved = resolveImageInpaintingAccess(snapshot);

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved image inpainting provider');
    }
    expect(resolved.capabilityProvider).toBe('image-inpainting');
    expect(resolved.settingsProviderId).toBe('openai');
  });

  it('maps image studio generation providers to the correct settings provider', () => {
    const resolved = resolveImageStudioGenerationAccess('together', snapshot);

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved image studio generation provider');
    }
    expect(resolved.capabilityProvider).toBe('together');
    expect(resolved.settingsProviderId).toBe('togetherai');
    expect(resolved.apiKey).toBe('sk-together');
  });

  it('returns deterministic blocked guidance for unsupported capability providers', () => {
    const blocked = resolveImageStudioGenerationAccess('unsupported-provider', snapshot);

    expect(blocked.kind).toBe('blocked');
    if (blocked.kind !== 'blocked') {
      throw new Error('Expected blocked image studio generation provider');
    }
    expect(blocked.code).toBe('provider_not_supported');
    expect(blocked.supportedProviderIds).toEqual([
      'openai',
      'xai',
      'together',
      'fireworks',
      'deepinfra',
    ]);
  });
});
