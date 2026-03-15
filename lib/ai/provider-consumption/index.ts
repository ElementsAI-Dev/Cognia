import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { getNextApiKey } from '@/lib/ai/infrastructure/api-key-rotation';
import {
  evaluateBuiltInProviderCompleteness,
  evaluateCustomProviderCompleteness,
  getActiveCredential,
  type ProviderGuardCode,
  type ProviderNextAction,
} from '@/lib/ai/providers/completeness';
import {
  getCurrentProxyUrl,
  isProxyEnabled,
  proxyFetch,
} from '@/lib/network/proxy-fetch';
import {
  getBuiltInProviderCatalog,
  getBuiltInProviderDefaultBaseURL,
  getBuiltInProviderPlaceholderApiKey,
  getBuiltInProviderProtocol,
  isBuiltInProviderId,
} from '@/types/provider/built-in-provider-catalog';
import {
  getProviderConfig,
  type ApiKeyRotationStrategy,
  type ApiKeyUsageStats,
  type ApiProtocol,
  type ProviderName,
  type UserProviderSettings,
} from '@/types/provider';

type BuiltInProviderId = Exclude<ProviderName, 'auto'>;

type CustomProviderSnapshot = {
  id?: string;
  name?: string;
  baseURL?: string;
  apiKey?: string;
  apiProtocol?: ApiProtocol;
  models?: string[];
  customModels?: string[];
  defaultModel?: string;
  enabled?: boolean;
  verificationStatus?: 'unverified' | 'verified' | 'stale';
  verificationFingerprint?: string;
};

export interface ProviderSettingsSnapshot {
  defaultProvider?: string;
  providerSettings: Record<string, Partial<UserProviderSettings> | undefined>;
  customProviders?: Record<string, CustomProviderSnapshot | undefined>;
}

export function createProviderSettingsSnapshot(input: {
  defaultProvider?: string | null;
  providerSettings: Record<string, Partial<UserProviderSettings> | undefined>;
  customProviders?: Record<string, CustomProviderSnapshot | undefined>;
}): ProviderSettingsSnapshot {
  return {
    defaultProvider: input.defaultProvider || '',
    providerSettings: input.providerSettings,
    customProviders: input.customProviders || {},
  };
}

export type FeatureRouteProfile =
  | 'general-text'
  | 'capability-bound'
  | 'legacy-compat';

export type FeatureProviderSelectionMode =
  | 'default-provider'
  | 'explicit-provider'
  | 'supported-providers';

export type FeatureProviderFallbackMode = 'none' | 'ordered' | 'first-eligible';
export type FeatureProviderExecutionMode = 'direct-model' | 'managed-execution';
export type FeatureProviderProxyMode = 'disabled' | 'preferred' | 'required';

export interface FeatureProviderPolicy {
  featureId: string;
  routeProfile?: FeatureRouteProfile;
  selectionMode: FeatureProviderSelectionMode;
  providerId?: string;
  supportedProviders?: string[];
  fallbackMode?: FeatureProviderFallbackMode;
  fallbackProviderOrder?: string[];
  executionMode?: FeatureProviderExecutionMode;
  proxyMode?: FeatureProviderProxyMode;
  model?: string;
  rotateApiKey?: boolean;
}

export type FeatureProviderBlockedCode =
  | ProviderGuardCode
  | 'provider_not_found'
  | 'provider_not_supported'
  | 'no_eligible_provider';

export type FeatureProviderNextAction =
  | ProviderNextAction
  | 'open_provider_settings';

export interface FeatureProviderResolved {
  kind: 'resolved';
  featureId: string;
  routeProfile: FeatureRouteProfile;
  providerId: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  protocol: ApiProtocol;
  isCustomProvider: boolean;
  executionMode: FeatureProviderExecutionMode;
  useProxy: boolean;
  attemptedProviderIds: string[];
  fallbackProviderIds: string[];
  nextKeyIndex?: number;
}

export interface FeatureProviderBlocked {
  kind: 'blocked';
  featureId: string;
  routeProfile: FeatureRouteProfile;
  providerId?: string;
  code: FeatureProviderBlockedCode;
  reason: string;
  nextAction?: FeatureProviderNextAction;
  attemptedProviderIds: string[];
  fallbackProviderIds: string[];
  supportedProviderIds: string[];
}

export type FeatureProviderResolution =
  | FeatureProviderResolved
  | FeatureProviderBlocked;

export interface FeatureProviderBlockedGuidance {
  featureId: string;
  routeProfile: FeatureRouteProfile;
  providerId?: string;
  code: FeatureProviderBlockedCode;
  reason: string;
  nextAction?: FeatureProviderNextAction;
  supportedProviderIds: string[];
  attemptedProviderIds: string[];
  fallbackProviderIds: string[];
}

export interface FeatureProviderFallbackTrace {
  featureId: string;
  routeProfile: FeatureRouteProfile;
  fallbackMode: FeatureProviderFallbackMode;
  attemptedProviderIds: string[];
  remainingProviderIds: string[];
  selectedProviderId?: string;
}

export interface LegacyProviderFacadeDiagnostic {
  facadeId: string;
  helperName: string;
  providerId: string;
  routeProfile: 'legacy-compat';
  count: number;
  lastModelId?: string;
  lastBaseURL?: string;
  useProxy?: boolean;
}

export interface FeatureProviderClientConfig {
  providerId: string;
  apiKey: string;
  baseURL?: string;
  protocol?: ApiProtocol;
  isCustomProvider?: boolean;
  useProxy?: boolean;
}

export interface FeatureProviderRuntimeConfig {
  providerId: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  protocol?: ApiProtocol;
  isCustomProvider?: boolean;
  useProxy?: boolean;
  enabled?: boolean;
}

type ProviderFactory = ReturnType<typeof createOpenAI>;
const legacyProviderFacadeDiagnostics = new Map<string, LegacyProviderFacadeDiagnostic>();

const PLACEHOLDER_API_KEYS: Record<string, string> = Object.fromEntries(
  getBuiltInProviderCatalog()
    .filter((entry) => Boolean(entry.placeholderApiKey))
    .map((entry) => [entry.id, entry.placeholderApiKey as string])
);

const DEFAULT_BASE_URLS: Record<string, string> = Object.fromEntries(
  getBuiltInProviderCatalog()
    .filter((entry) => Boolean(entry.defaultBaseURL))
    .map((entry) => [entry.id, entry.defaultBaseURL as string])
);

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function getLegacyDiagnosticKey(
  facadeId: string,
  helperName: string,
  providerId: string
): string {
  return `${facadeId}:${helperName}:${providerId}`;
}

export function recordLegacyProviderFacadeUsage(input: {
  facadeId: string;
  helperName: string;
  providerId: string;
  lastModelId?: string;
  lastBaseURL?: string;
  useProxy?: boolean;
}): void {
  const key = getLegacyDiagnosticKey(
    input.facadeId,
    input.helperName,
    input.providerId
  );
  const existing = legacyProviderFacadeDiagnostics.get(key);

  legacyProviderFacadeDiagnostics.set(key, {
    facadeId: input.facadeId,
    helperName: input.helperName,
    providerId: input.providerId,
    routeProfile: 'legacy-compat',
    count: (existing?.count || 0) + 1,
    lastModelId: input.lastModelId,
    lastBaseURL: input.lastBaseURL,
    useProxy: input.useProxy,
  });
}

export function getLegacyProviderFacadeDiagnostics(): LegacyProviderFacadeDiagnostic[] {
  return Array.from(legacyProviderFacadeDiagnostics.values());
}

export function resetLegacyProviderFacadeDiagnostics(): void {
  legacyProviderFacadeDiagnostics.clear();
}

function getProxyAwareFetch(useProxy: boolean) {
  if (useProxy && isProxyEnabled()) {
    return proxyFetch;
  }
  return undefined;
}

function getOpenRouterHeaders() {
  return {
    'HTTP-Referer':
      typeof window !== 'undefined' ? window.location.origin : 'https://cognia.app',
    'X-Title': 'Cognia',
  };
}

function resolveBuiltInProtocol(providerId: string): ApiProtocol {
  return getBuiltInProviderProtocol(providerId) || 'openai';
}

function resolveProviderApiKey(
  providerId: string,
  settings: Partial<UserProviderSettings> | undefined,
  rotateApiKey: boolean
): { apiKey: string; nextKeyIndex?: number } {
  if (
    rotateApiKey &&
    settings?.apiKeyRotationEnabled &&
    settings.apiKeys &&
    settings.apiKeys.length > 0
  ) {
    const result = getNextApiKey(
      settings.apiKeys,
      (settings.apiKeyRotationStrategy || 'round-robin') as ApiKeyRotationStrategy,
      settings.currentKeyIndex || 0,
      (settings.apiKeyUsageStats || {}) as Record<string, ApiKeyUsageStats>
    );

    return {
      apiKey: result.apiKey || settings.apiKey || PLACEHOLDER_API_KEYS[providerId] || '',
      nextKeyIndex: result.index,
    };
  }

  const activeCredential = getActiveCredential(settings);
  return {
    apiKey: activeCredential || PLACEHOLDER_API_KEYS[providerId] || '',
  };
}

function resolveBuiltInProvider(
  providerId: BuiltInProviderId,
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot,
  attemptedProviderIds: string[],
  fallbackProviderIds: string[]
): FeatureProviderResolution {
  const routeProfile = inferFeatureRouteProfile(policy);
  const settings = snapshot.providerSettings[providerId];
  const completeness = evaluateBuiltInProviderCompleteness(providerId, settings, null);

  if (!completeness.eligibility.runtime.allowed) {
    return {
      kind: 'blocked',
      featureId: policy.featureId,
      routeProfile,
      providerId,
      code: completeness.eligibility.runtime.code || 'no_eligible_provider',
      reason:
        completeness.eligibility.runtime.reason ||
        `Provider ${providerId} is not eligible for runtime execution`,
      nextAction: completeness.eligibility.runtime.nextAction,
      attemptedProviderIds,
      fallbackProviderIds,
      supportedProviderIds: policy.supportedProviders || [],
    };
  }

  const apiKeyResolution = resolveProviderApiKey(
    providerId,
    settings,
    Boolean(policy.rotateApiKey)
  );
  const providerConfig = getProviderConfig(providerId);

  return {
    kind: 'resolved',
    featureId: policy.featureId,
    routeProfile,
    providerId,
    model:
      policy.model ||
      settings?.defaultModel ||
      providerConfig?.defaultModel ||
      'gpt-4o',
    apiKey: apiKeyResolution.apiKey,
    baseURL: settings?.baseURL || DEFAULT_BASE_URLS[providerId],
    protocol: resolveBuiltInProtocol(providerId),
    isCustomProvider: false,
    executionMode: policy.executionMode || 'direct-model',
    useProxy: policy.proxyMode !== 'disabled',
    attemptedProviderIds,
    fallbackProviderIds,
    nextKeyIndex: apiKeyResolution.nextKeyIndex,
  };
}

function resolveCustomProvider(
  providerId: string,
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot,
  attemptedProviderIds: string[],
  fallbackProviderIds: string[]
): FeatureProviderResolution {
  const routeProfile = inferFeatureRouteProfile(policy);
  const provider = snapshot.customProviders?.[providerId];
  if (!provider) {
    return {
      kind: 'blocked',
      featureId: policy.featureId,
      routeProfile,
      providerId,
      code: 'provider_not_found',
      reason: `Custom provider ${providerId} was not found`,
      nextAction: 'open_provider_settings',
      attemptedProviderIds,
      fallbackProviderIds,
      supportedProviderIds: policy.supportedProviders || [],
    };
  }

  const completeness = evaluateCustomProviderCompleteness(
    {
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      defaultModel: provider.defaultModel,
      enabled: provider.enabled,
      apiProtocol: provider.apiProtocol,
      verificationStatus: provider.verificationStatus,
      verificationFingerprint: provider.verificationFingerprint,
    },
    null
  );

  if (!completeness.eligibility.runtime.allowed) {
    return {
      kind: 'blocked',
      featureId: policy.featureId,
      routeProfile,
      providerId,
      code: completeness.eligibility.runtime.code || 'no_eligible_provider',
      reason:
        completeness.eligibility.runtime.reason ||
        `Custom provider ${providerId} is not eligible for runtime execution`,
      nextAction: completeness.eligibility.runtime.nextAction,
      attemptedProviderIds,
      fallbackProviderIds,
      supportedProviderIds: policy.supportedProviders || [],
    };
  }

  return {
    kind: 'resolved',
    featureId: policy.featureId,
    routeProfile,
    providerId,
    model:
      policy.model ||
      provider.defaultModel ||
      provider.customModels?.[0] ||
      provider.models?.[0] ||
      'custom-model',
    apiKey: provider.apiKey || '',
    baseURL: provider.baseURL,
    protocol: provider.apiProtocol || 'openai',
    isCustomProvider: true,
    executionMode: policy.executionMode || 'direct-model',
    useProxy: policy.proxyMode !== 'disabled',
    attemptedProviderIds,
    fallbackProviderIds,
  };
}

function buildDefaultProviderCandidates(
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot
): string[] {
  const configuredProviders = unique([
    ...Object.keys(snapshot.providerSettings || {}),
    ...Object.keys(snapshot.customProviders || {}),
  ]);
  const filteredProviders = policy.supportedProviders?.length
    ? configuredProviders.filter((providerId) =>
        policy.supportedProviders?.includes(providerId)
      )
    : configuredProviders;

  const preferredProvider =
    snapshot.defaultProvider && snapshot.defaultProvider !== 'auto'
      ? snapshot.defaultProvider
      : undefined;

  return unique([
    preferredProvider || '',
    ...filteredProviders,
  ]);
}

function buildSupportedProviderCandidates(
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot
): string[] {
  const supportedProviders = policy.supportedProviders || [];
  const configuredProviders = new Set([
    ...Object.keys(snapshot.providerSettings || {}),
    ...Object.keys(snapshot.customProviders || {}),
  ]);
  const preferredProvider =
    policy.providerId ||
    (snapshot.defaultProvider &&
    snapshot.defaultProvider !== 'auto' &&
    supportedProviders.includes(snapshot.defaultProvider)
      ? snapshot.defaultProvider
      : undefined);

  return unique([
    preferredProvider || '',
    ...supportedProviders.filter((providerId) => configuredProviders.has(providerId)),
  ]);
}

function buildExplicitProviderCandidates(
  policy: FeatureProviderPolicy
): string[] {
  if (!policy.providerId) {
    return [];
  }

  if (policy.fallbackMode === 'ordered') {
    return unique([policy.providerId, ...(policy.fallbackProviderOrder || [])]);
  }

  return [policy.providerId];
}

function buildCandidateProviderIds(
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot
): string[] {
  switch (policy.selectionMode) {
    case 'explicit-provider':
      return buildExplicitProviderCandidates(policy);
    case 'supported-providers':
      return buildSupportedProviderCandidates(policy, snapshot);
    case 'default-provider':
    default:
      return buildDefaultProviderCandidates(policy, snapshot);
  }
}

export function inferFeatureRouteProfile(
  policy: Pick<FeatureProviderPolicy, 'routeProfile' | 'selectionMode'>
): FeatureRouteProfile {
  if (policy.routeProfile) {
    return policy.routeProfile;
  }

  switch (policy.selectionMode) {
    case 'default-provider':
      return 'general-text';
    case 'supported-providers':
      return 'capability-bound';
    case 'explicit-provider':
    default:
      return 'legacy-compat';
  }
}

export function createFeatureRoutePolicy(
  routeProfile: FeatureRouteProfile,
  overrides: Omit<FeatureProviderPolicy, 'routeProfile' | 'selectionMode'> &
    Partial<Pick<FeatureProviderPolicy, 'selectionMode'>>
): FeatureProviderPolicy {
  const sharedDefaults: Pick<
    FeatureProviderPolicy,
    'executionMode' | 'proxyMode' | 'rotateApiKey'
  > = {
    executionMode: 'direct-model',
    proxyMode: 'preferred',
    rotateApiKey: false,
  };

  switch (routeProfile) {
    case 'general-text':
      return {
        ...sharedDefaults,
        routeProfile,
        selectionMode: 'default-provider',
        fallbackMode: 'first-eligible',
        ...overrides,
      };
    case 'capability-bound':
      return {
        ...sharedDefaults,
        routeProfile,
        selectionMode:
          overrides.selectionMode ||
          (overrides.supportedProviders?.length ? 'supported-providers' : 'explicit-provider'),
        fallbackMode: overrides.fallbackMode || 'none',
        ...overrides,
      };
    case 'legacy-compat':
    default:
      return {
        ...sharedDefaults,
        routeProfile,
        selectionMode:
          overrides.selectionMode ||
          (overrides.providerId ? 'explicit-provider' : 'default-provider'),
        fallbackMode: overrides.fallbackMode || 'none',
        ...overrides,
      };
  }
}

export function getFeatureProviderBlockedGuidance(
  resolution: FeatureProviderBlocked
): FeatureProviderBlockedGuidance {
  return {
    featureId: resolution.featureId,
    routeProfile: resolution.routeProfile,
    providerId: resolution.providerId,
    code: resolution.code,
    reason: resolution.reason,
    nextAction: resolution.nextAction,
    supportedProviderIds: resolution.supportedProviderIds,
    attemptedProviderIds: resolution.attemptedProviderIds,
    fallbackProviderIds: resolution.fallbackProviderIds,
  };
}

export function getFeatureProviderFallbackTrace(
  policy: FeatureProviderPolicy,
  resolution: FeatureProviderResolution
): FeatureProviderFallbackTrace {
  return {
    featureId: resolution.featureId,
    routeProfile: resolution.routeProfile,
    fallbackMode: policy.fallbackMode || 'none',
    attemptedProviderIds: resolution.attemptedProviderIds,
    remainingProviderIds: resolution.fallbackProviderIds,
    selectedProviderId:
      resolution.kind === 'resolved' ? resolution.providerId : undefined,
  };
}

export function resolveFeatureProvider(
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot
): FeatureProviderResolution {
  const routeProfile = inferFeatureRouteProfile(policy);
  const candidateProviderIds = buildCandidateProviderIds(policy, snapshot);
  const attemptedProviderIds: string[] = [];
  const blockedResults: FeatureProviderBlocked[] = [];

  if (candidateProviderIds.length === 0) {
    return {
      kind: 'blocked',
      featureId: policy.featureId,
      routeProfile,
      code: 'no_eligible_provider',
      reason: `No provider candidates are available for feature ${policy.featureId}`,
      nextAction: 'open_provider_settings',
      attemptedProviderIds,
      fallbackProviderIds: [],
      supportedProviderIds: policy.supportedProviders || [],
    };
  }

  for (const [index, providerId] of candidateProviderIds.entries()) {
    attemptedProviderIds.push(providerId);
    const remainingProviderIds = candidateProviderIds.slice(index + 1);

    const resolution = isBuiltInProviderId(providerId)
      ? resolveBuiltInProvider(
          providerId,
          policy,
          snapshot,
          [...attemptedProviderIds],
          remainingProviderIds
        )
      : resolveCustomProvider(
          providerId,
          policy,
          snapshot,
          [...attemptedProviderIds],
          remainingProviderIds
        );

    if (resolution.kind === 'resolved') {
      return resolution;
    }

    blockedResults.push(resolution);
    if (policy.fallbackMode === 'none' || !policy.fallbackMode) {
      return resolution;
    }
  }

  return (
    blockedResults[0] || {
      kind: 'blocked',
      featureId: policy.featureId,
      routeProfile,
      code: 'no_eligible_provider',
      reason: `No eligible provider could be resolved for feature ${policy.featureId}`,
      nextAction: 'open_provider_settings',
      attemptedProviderIds,
      fallbackProviderIds: [],
      supportedProviderIds: policy.supportedProviders || [],
    }
  );
}

export function resolveFeatureProviderCandidates(
  policy: FeatureProviderPolicy,
  snapshot: ProviderSettingsSnapshot
): FeatureProviderResolved[] {
  const candidateProviderIds = buildCandidateProviderIds(policy, snapshot);
  const resolvedCandidates: FeatureProviderResolved[] = [];
  const attemptedProviderIds: string[] = [];

  for (const [index, providerId] of candidateProviderIds.entries()) {
    attemptedProviderIds.push(providerId);
    const remainingProviderIds = candidateProviderIds.slice(index + 1);

    const resolution = isBuiltInProviderId(providerId)
      ? resolveBuiltInProvider(
          providerId,
          policy,
          snapshot,
          [...attemptedProviderIds],
          remainingProviderIds
        )
      : resolveCustomProvider(
          providerId,
          policy,
          snapshot,
          [...attemptedProviderIds],
          remainingProviderIds
        );

    if (resolution.kind === 'resolved') {
      resolvedCandidates.push(resolution);
    }
  }

  return resolvedCandidates;
}

function createOpenAICompatibleFactory(
  providerId: string,
  apiKey: string,
  baseURL: string | undefined,
  useProxy: boolean
): ProviderFactory {
  const headers =
    providerId === 'openrouter' ? getOpenRouterHeaders() : undefined;
  return createOpenAI({
    apiKey,
    baseURL: baseURL || getBuiltInProviderDefaultBaseURL(providerId),
    headers,
    fetch: getProxyAwareFetch(useProxy),
  });
}

export function createFeatureProviderClient(
  config: FeatureProviderClientConfig
) {
  const {
    providerId,
    apiKey,
    baseURL,
    protocol = 'openai',
    isCustomProvider = false,
    useProxy = false,
  } = config;

  if (isCustomProvider) {
    switch (protocol) {
      case 'anthropic':
        return createAnthropic({
          apiKey,
          baseURL,
          fetch: getProxyAwareFetch(useProxy),
        });
      case 'gemini':
        return createGoogleGenerativeAI({
          apiKey,
          baseURL,
          fetch: getProxyAwareFetch(useProxy),
        });
      case 'openai':
      default:
        return createOpenAI({
          apiKey,
          baseURL,
          fetch: getProxyAwareFetch(useProxy),
        });
    }
  }

  switch (providerId as BuiltInProviderId) {
    case 'openai':
      return createOpenAI({
        apiKey,
        baseURL,
        fetch: getProxyAwareFetch(useProxy),
      });
    case 'anthropic':
      return createAnthropic({
        apiKey,
        baseURL,
        fetch: getProxyAwareFetch(useProxy),
      });
    case 'google':
      return createGoogleGenerativeAI({
        apiKey,
        baseURL,
        fetch: getProxyAwareFetch(useProxy),
      });
    case 'mistral':
      return createMistral({
        apiKey,
        baseURL,
        fetch: getProxyAwareFetch(useProxy),
      });
    case 'cohere':
      return createOpenAICompatibleFactory(
        providerId,
        apiKey,
        baseURL,
        useProxy
      );
    default:
      if (!isBuiltInProviderId(providerId)) {
        throw new Error(`Unknown provider: ${providerId}`);
      }
      return createOpenAICompatibleFactory(
        providerId,
        apiKey || getBuiltInProviderPlaceholderApiKey(providerId) || '',
        baseURL,
        useProxy
      );
  }
}

export function createFeatureProviderModel(
  resolution: FeatureProviderResolved
): LanguageModel {
  const providerFactory = createFeatureProviderClient({
    providerId: resolution.providerId,
    apiKey: resolution.apiKey,
    baseURL: resolution.baseURL,
    protocol: resolution.protocol,
    isCustomProvider: resolution.isCustomProvider,
    useProxy: resolution.useProxy,
  });

  return providerFactory(resolution.model) as LanguageModel;
}

export function createFeatureProviderSnapshotFromRuntimeConfig(
  config: FeatureProviderRuntimeConfig
): ProviderSettingsSnapshot {
  if (config.isCustomProvider) {
    return {
      defaultProvider: config.providerId,
      providerSettings: {},
      customProviders: {
        [config.providerId]: {
          id: config.providerId,
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          apiProtocol: config.protocol,
          defaultModel: config.model,
          enabled: config.enabled ?? true,
        },
      },
    };
  }

  return {
    defaultProvider: config.providerId,
    providerSettings: {
      [config.providerId]: {
        providerId: config.providerId,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        defaultModel: config.model,
        enabled: config.enabled ?? true,
      },
    },
    customProviders: {},
  };
}

export function resolveFeatureProviderFromRuntimeConfig(
  policy: FeatureProviderPolicy,
  config: FeatureProviderRuntimeConfig
): FeatureProviderResolution {
  const proxyMode =
    config.useProxy === undefined
      ? policy.proxyMode
      : config.useProxy
        ? 'required'
        : 'disabled';
  const resolvedPolicy: FeatureProviderPolicy = {
    ...policy,
    providerId: policy.providerId || config.providerId,
    model: policy.model || config.model,
    proxyMode,
  };

  return resolveFeatureProvider(
    resolvedPolicy,
    createFeatureProviderSnapshotFromRuntimeConfig(config)
  );
}

export function createFeatureProviderModelFromRuntimeConfig(
  policy: FeatureProviderPolicy,
  config: FeatureProviderRuntimeConfig
): LanguageModel {
  const resolution = resolveFeatureProviderFromRuntimeConfig(policy, config);
  if (resolution.kind !== 'resolved') {
    throw new Error(resolution.reason);
  }

  return createFeatureProviderModel(resolution);
}

export function getProviderConsumptionDebugInfo() {
  return {
    proxyEnabled: isProxyEnabled(),
    proxyUrl: getCurrentProxyUrl(),
  };
}
