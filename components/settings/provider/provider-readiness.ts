import type { ApiTestResult } from '@/lib/ai/infrastructure/api-test';
import { PROVIDER_CATEGORIES } from '@/lib/ai/providers/provider-helpers';
import { PROVIDERS } from '@/types/provider';
import type { UserProviderSettings } from '@/types/provider';

export type ProviderReadinessState = 'unconfigured' | 'configured' | 'verified';

export interface ProviderActionEligibility {
  allowed: boolean;
  reason?: string;
}

export interface BuiltInProviderReadiness {
  readiness: ProviderReadinessState;
  hasCredential: boolean;
  hasBaseUrl: boolean;
  eligibility: {
    configure: ProviderActionEligibility;
    testConnection: ProviderActionEligibility;
    enable: ProviderActionEligibility;
    defaultModel: ProviderActionEligibility;
  };
}

export interface CustomProviderLike {
  apiKey?: string;
  baseURL?: string;
  enabled?: boolean;
}

export interface CustomProviderReadiness {
  readiness: ProviderReadinessState;
  hasCredential: boolean;
  hasBaseUrl: boolean;
  eligibility: {
    configure: ProviderActionEligibility;
    testConnection: ProviderActionEligibility;
    enable: ProviderActionEligibility;
  };
}

const ALLOWED: ProviderActionEligibility = { allowed: true };

const BLOCKED_MESSAGES = {
  addApiKey: 'Add an API key before continuing.',
  addApiKeyToTest: 'Add an API key before testing this provider.',
  configureBaseUrl: 'Configure a base URL before continuing.',
  configureBaseUrlToTest: 'Configure a valid base URL before testing this provider.',
  enableProviderFirst: 'Enable this provider before changing the default model.',
} as const;

function hasText(value?: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function getCredentialAtIndex(
  apiKeys: string[] | undefined,
  index: number | undefined
): string | undefined {
  if (!Array.isArray(apiKeys) || apiKeys.length === 0) return undefined;
  if (typeof index === 'number' && index >= 0 && index < apiKeys.length && hasText(apiKeys[index])) {
    return apiKeys[index];
  }
  return apiKeys.find((key) => hasText(key));
}

export function getActiveCredential(settings?: Partial<UserProviderSettings>): string {
  if (!settings) return '';
  if (hasText(settings.apiKey)) return settings.apiKey!.trim();
  const keyFromPool = getCredentialAtIndex(settings.apiKeys, settings.currentKeyIndex);
  return keyFromPool?.trim() || '';
}

export function hasAnyCredential(settings?: Partial<UserProviderSettings>): boolean {
  if (!settings) return false;
  if (hasText(settings.apiKey)) return true;
  if (!Array.isArray(settings.apiKeys)) return false;
  return settings.apiKeys.some((key) => hasText(key));
}

function getCredentialsRequired(providerId: string): boolean {
  const provider = PROVIDERS[providerId];
  if (provider && typeof provider.apiKeyRequired === 'boolean') return provider.apiKeyRequired;
  return PROVIDER_CATEGORIES[providerId] !== 'local';
}

function getBaseUrlRequired(providerId: string): boolean {
  const provider = PROVIDERS[providerId];
  if (provider && typeof provider.baseURLRequired === 'boolean') return provider.baseURLRequired;
  return false;
}

export function getProviderEnableEligibility(
  providerId: string,
  settings: Partial<UserProviderSettings> | undefined,
  nextEnabled: boolean
): ProviderActionEligibility {
  if (!nextEnabled) return ALLOWED;

  const credentialsRequired = getCredentialsRequired(providerId);
  const baseUrlRequired = getBaseUrlRequired(providerId);
  const hasCredential = hasAnyCredential(settings);
  const hasBaseUrl = hasText(settings?.baseURL);

  if (credentialsRequired && !hasCredential) {
    return { allowed: false, reason: BLOCKED_MESSAGES.addApiKey };
  }
  if (baseUrlRequired && !hasBaseUrl) {
    return { allowed: false, reason: BLOCKED_MESSAGES.configureBaseUrl };
  }
  return ALLOWED;
}

export function getBuiltInProviderReadiness(
  providerId: string,
  settings: Partial<UserProviderSettings> | undefined,
  latestTestResult?: ApiTestResult | null
): BuiltInProviderReadiness {
  const credentialsRequired = getCredentialsRequired(providerId);
  const baseUrlRequired = getBaseUrlRequired(providerId);
  const hasCredential = hasAnyCredential(settings);
  const hasBaseUrl = hasText(settings?.baseURL);
  const activeCredential = getActiveCredential(settings);
  const enableEligibility = getProviderEnableEligibility(providerId, settings, true);

  let testConnection: ProviderActionEligibility = ALLOWED;
  if (baseUrlRequired && !hasBaseUrl) {
    testConnection = { allowed: false, reason: BLOCKED_MESSAGES.configureBaseUrlToTest };
  } else if (credentialsRequired && !hasText(activeCredential)) {
    testConnection = { allowed: false, reason: BLOCKED_MESSAGES.addApiKeyToTest };
  }

  const defaultModel: ProviderActionEligibility =
    settings?.enabled === false
      ? { allowed: false, reason: BLOCKED_MESSAGES.enableProviderFirst }
      : ALLOWED;

  const hasRequiredConfiguration =
    (!credentialsRequired || hasCredential) && (!baseUrlRequired || hasBaseUrl);
  const readiness: ProviderReadinessState = !hasRequiredConfiguration
    ? 'unconfigured'
    : latestTestResult?.success
      ? 'verified'
      : 'configured';

  return {
    readiness,
    hasCredential,
    hasBaseUrl,
    eligibility: {
      configure: ALLOWED,
      testConnection,
      enable: enableEligibility,
      defaultModel,
    },
  };
}

export function getCustomProviderReadiness(
  provider: CustomProviderLike | undefined,
  latestTestResult?: { success?: boolean } | null
): CustomProviderReadiness {
  const hasCredential = hasText(provider?.apiKey);
  const hasBaseUrl = hasText(provider?.baseURL);

  const enableEligibility =
    hasCredential && hasBaseUrl
      ? ALLOWED
      : !hasCredential
        ? { allowed: false, reason: BLOCKED_MESSAGES.addApiKey }
        : { allowed: false, reason: BLOCKED_MESSAGES.configureBaseUrl };

  const testConnection =
    hasCredential && hasBaseUrl
      ? ALLOWED
      : !hasCredential
        ? { allowed: false, reason: BLOCKED_MESSAGES.addApiKeyToTest }
        : { allowed: false, reason: BLOCKED_MESSAGES.configureBaseUrlToTest };

  const readiness: ProviderReadinessState = !hasCredential || !hasBaseUrl
    ? 'unconfigured'
    : latestTestResult?.success
      ? 'verified'
      : 'configured';

  return {
    readiness,
    hasCredential,
    hasBaseUrl,
    eligibility: {
      configure: ALLOWED,
      testConnection,
      enable: enableEligibility,
    },
  };
}

export function getVisibleSelectedProviderIds(
  visibleProviderIds: string[],
  selectedProviderIds: Set<string>
): string[] {
  return visibleProviderIds.filter((providerId) => selectedProviderIds.has(providerId));
}
