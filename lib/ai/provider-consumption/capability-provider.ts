import {
  resolveFeatureProvider,
  type FeatureProviderBlocked,
  type FeatureProviderResolved,
  type ProviderSettingsSnapshot,
} from './index';
import type { VideoProvider } from '@/types/media/video';

export interface CapabilityProviderPolicy {
  featureId: string;
  capabilityProvider: string;
  settingsProviderId: string;
  supportedCapabilityProviders?: string[];
}

export interface CapabilityProviderResolved
  extends Omit<FeatureProviderResolved, 'providerId'> {
  capabilityProvider: string;
  settingsProviderId: string;
}

export interface CapabilityProviderBlocked
  extends Omit<FeatureProviderBlocked, 'providerId'> {
  capabilityProvider: string;
  settingsProviderId: string;
}

export type CapabilityProviderAccess =
  | CapabilityProviderResolved
  | CapabilityProviderBlocked;

export function resolveCapabilityProviderAccess(
  policy: CapabilityProviderPolicy,
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  if (
    policy.supportedCapabilityProviders?.length
    && !policy.supportedCapabilityProviders.includes(policy.capabilityProvider)
  ) {
    return {
      kind: 'blocked',
      featureId: policy.featureId,
      routeProfile: 'capability-bound',
      code: 'provider_not_supported',
      reason: `Capability provider ${policy.capabilityProvider} is not supported for ${policy.featureId}.`,
      nextAction: 'open_provider_settings',
      attemptedProviderIds: [policy.settingsProviderId],
      fallbackProviderIds: [],
      supportedProviderIds: policy.supportedCapabilityProviders,
      capabilityProvider: policy.capabilityProvider,
      settingsProviderId: policy.settingsProviderId,
    };
  }

  const resolution = resolveFeatureProvider(
    {
      featureId: policy.featureId,
      routeProfile: 'capability-bound',
      selectionMode: 'explicit-provider',
      providerId: policy.settingsProviderId,
      fallbackMode: 'none',
    },
    snapshot
  );

  if (resolution.kind === 'resolved') {
    return {
      ...resolution,
      capabilityProvider: policy.capabilityProvider,
      settingsProviderId: policy.settingsProviderId,
    };
  }

  return {
    ...resolution,
    capabilityProvider: policy.capabilityProvider,
    settingsProviderId: policy.settingsProviderId,
  };
}

export function resolveVideoGenerationAccess(
  provider: VideoProvider,
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  const settingsProviderId = provider === 'google-veo' ? 'google' : 'openai';
  return resolveCapabilityProviderAccess(
    {
      featureId: 'video-generation',
      capabilityProvider: provider,
      settingsProviderId,
      supportedCapabilityProviders: ['google-veo', 'openai-sora'],
    },
    snapshot
  );
}

export function resolveSubtitleTranscriptionAccess(
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  return resolveCapabilityProviderAccess(
    {
      featureId: 'subtitle-transcription',
      capabilityProvider: 'subtitle-transcription',
      settingsProviderId: 'openai',
      supportedCapabilityProviders: ['subtitle-transcription'],
    },
    snapshot
  );
}

export function resolveImageGenerationAccess(
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  return resolveCapabilityProviderAccess(
    {
      featureId: 'image-generation',
      capabilityProvider: 'image-generation',
      settingsProviderId: 'openai',
      supportedCapabilityProviders: ['image-generation'],
    },
    snapshot
  );
}

export function resolveImageEditingAccess(
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  return resolveCapabilityProviderAccess(
    {
      featureId: 'image-edit',
      capabilityProvider: 'image-edit',
      settingsProviderId: 'openai',
      supportedCapabilityProviders: ['image-edit'],
    },
    snapshot
  );
}

export function resolveImageVariationAccess(
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  return resolveCapabilityProviderAccess(
    {
      featureId: 'image-variation',
      capabilityProvider: 'image-variation',
      settingsProviderId: 'openai',
      supportedCapabilityProviders: ['image-variation'],
    },
    snapshot
  );
}

export function resolveImageInpaintingAccess(
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  return resolveCapabilityProviderAccess(
    {
      featureId: 'image-inpainting',
      capabilityProvider: 'image-inpainting',
      settingsProviderId: 'openai',
      supportedCapabilityProviders: ['image-inpainting'],
    },
    snapshot
  );
}

const IMAGE_STUDIO_PROVIDER_MAP: Record<string, string> = {
  openai: 'openai',
  xai: 'xai',
  together: 'togetherai',
  fireworks: 'fireworks',
  deepinfra: 'deepinfra',
};

export function resolveImageStudioGenerationAccess(
  provider: string,
  snapshot: ProviderSettingsSnapshot
): CapabilityProviderAccess {
  const settingsProviderId = IMAGE_STUDIO_PROVIDER_MAP[provider] || provider;
  return resolveCapabilityProviderAccess(
    {
      featureId: 'image-studio-generation',
      capabilityProvider: provider,
      settingsProviderId,
      supportedCapabilityProviders: ['openai', 'xai', 'together', 'fireworks', 'deepinfra'],
    },
    snapshot
  );
}
