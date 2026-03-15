import {
  getBuiltInProviderCatalog,
  getBuiltInProviderCatalogEntry,
  getBuiltInProviderSettingsBaseURL,
  type BuiltInProviderId,
} from '@/types/provider/built-in-provider-catalog';
import { getProviderConfig } from '@/types/provider';

export interface EquivalentCustomProviderLike {
  providerId?: string;
  customName?: string;
  baseURL?: string;
  apiKey?: string;
  apiProtocol?: 'openai' | 'anthropic' | 'gemini';
  customModels?: string[];
  models?: string[];
  defaultModel?: string;
  enabled?: boolean;
}

export interface EquivalentBuiltInProviderCandidate {
  builtInProviderId: BuiltInProviderId;
  customProviderId: string;
  provider: EquivalentCustomProviderLike;
}

function normalizeBaseURL(baseURL?: string): string | null {
  if (!baseURL) return null;

  try {
    const url = new URL(baseURL);
    const normalizedPath = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

export function resolveEquivalentBuiltInProviderId(
  provider: EquivalentCustomProviderLike
): BuiltInProviderId | undefined {
  const haystacks = [
    provider.customName,
    provider.defaultModel,
    ...(provider.customModels || []),
    ...(provider.models || []),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  const normalizedBaseURL = normalizeBaseURL(provider.baseURL);
  if (!normalizedBaseURL) return undefined;

  return getBuiltInProviderCatalog()
    .filter((entry) => Boolean(entry.compatibility))
    .find((entry) => {
      const rule = entry.compatibility;
      if (!rule) return false;
      if ((provider.apiProtocol || 'openai') !== rule.protocol) return false;

      const matchesBaseURL = rule.baseURLs
        .map((url) => normalizeBaseURL(url))
        .filter((url): url is string => Boolean(url))
        .includes(normalizedBaseURL);

      if (!matchesBaseURL) return false;

      const matchesName = (rule.nameIncludes || []).some((fragment) =>
        haystacks.some((value) => value.includes(fragment.toLowerCase()))
      );
      const matchesModelPrefix = (rule.modelPrefixes || []).some((prefix) =>
        haystacks.some((value) => value.startsWith(prefix.toLowerCase()))
      );

      return matchesName || matchesModelPrefix;
    })?.id as BuiltInProviderId | undefined;
}

export function findEquivalentBuiltInProviderCandidates(
  customProviders: Record<string, EquivalentCustomProviderLike | undefined>
): Partial<Record<BuiltInProviderId, EquivalentBuiltInProviderCandidate>> {
  const candidates: Partial<Record<BuiltInProviderId, EquivalentBuiltInProviderCandidate>> = {};

  for (const [customProviderId, provider] of Object.entries(customProviders)) {
    if (!provider) continue;
    const builtInProviderId = resolveEquivalentBuiltInProviderId(provider);
    if (!builtInProviderId || candidates[builtInProviderId]) continue;

    candidates[builtInProviderId] = {
      builtInProviderId,
      customProviderId,
      provider,
    };
  }

  return candidates;
}

export function buildBuiltInSettingsFromCustomProvider(
  providerId: BuiltInProviderId,
  provider: EquivalentCustomProviderLike
) {
  const entry = getBuiltInProviderCatalogEntry(providerId);
  const providerConfig = getProviderConfig(providerId);
  const allowedModelIds = new Set(
    providerConfig?.models.map((model) => model.id) ||
      entry?.models?.map((model) => model.id) ||
      []
  );

  const nextDefaultModel =
    provider.defaultModel && allowedModelIds.has(provider.defaultModel)
      ? provider.defaultModel
      : entry?.defaultModel || provider.defaultModel || 'gpt-4o';

  return {
    providerId,
    apiKey: provider.apiKey?.trim() || '',
    defaultModel: nextDefaultModel,
    enabled: provider.enabled ?? false,
    baseURL: entry?.baseURLRequired
      ? getBuiltInProviderSettingsBaseURL(providerId)
      : undefined,
    verificationStatus: 'unverified' as const,
    verificationMessage: undefined,
  };
}
