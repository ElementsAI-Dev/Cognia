import { PROVIDERS, type CustomProviderSettings, type UserProviderSettings } from '@/types/provider';

export type ProviderReadinessState = 'unconfigured' | 'configured' | 'verified';

export type ProviderGuardCode =
  | 'provider_disabled'
  | 'missing_credential'
  | 'missing_base_url'
  | 'invalid_base_url';

export type ProviderNextAction =
  | 'enable_provider'
  | 'add_api_key'
  | 'configure_base_url'
  | 'select_default_model'
  | 'verify_connection';

export interface ProviderGuardResult {
  allowed: boolean;
  reason?: string;
  code?: ProviderGuardCode;
  nextAction?: ProviderNextAction;
}

export interface ProviderRequirements {
  providerId: string;
  requiresCredential: boolean;
  requiresBaseUrl: boolean;
  isLocal: boolean;
}

export interface BuiltInProviderCompleteness {
  readiness: ProviderReadinessState;
  hasCredential: boolean;
  hasBaseUrl: boolean;
  eligibility: {
    configure: ProviderGuardResult;
    enable: ProviderGuardResult;
    testConnection: ProviderGuardResult;
    defaultModel: ProviderGuardResult;
    runtime: ProviderGuardResult;
  };
}

export interface CustomProviderCompleteness {
  readiness: ProviderReadinessState;
  hasCredential: boolean;
  hasBaseUrl: boolean;
  eligibility: {
    configure: ProviderGuardResult;
    enable: ProviderGuardResult;
    testConnection: ProviderGuardResult;
    runtime: ProviderGuardResult;
  };
}

const LOCAL_PROVIDER_IDS = new Set([
  'ollama',
  'lmstudio',
  'llamacpp',
  'llamafile',
  'vllm',
  'localai',
  'jan',
  'textgenwebui',
  'koboldcpp',
  'tabbyapi',
]);

interface SettingsLike {
  apiKey?: string;
  apiKeys?: string[];
  currentKeyIndex?: number;
  baseURL?: string;
  defaultModel?: string;
  enabled?: boolean;
}

const ALLOWED: ProviderGuardResult = { allowed: true };

const BLOCKED = {
  addApiKey: {
    allowed: false,
    code: 'missing_credential' as const,
    reason: 'Add an API key before continuing.',
    nextAction: 'add_api_key' as const,
  },
  addApiKeyToTest: {
    allowed: false,
    code: 'missing_credential' as const,
    reason: 'Add an API key before testing this provider.',
    nextAction: 'add_api_key' as const,
  },
  addApiKeyToRun: {
    allowed: false,
    code: 'missing_credential' as const,
    reason: 'Add an API key before using this provider at runtime.',
    nextAction: 'add_api_key' as const,
  },
  configureBaseUrl: {
    allowed: false,
    code: 'missing_base_url' as const,
    reason: 'Configure a base URL before continuing.',
    nextAction: 'configure_base_url' as const,
  },
  configureBaseUrlToTest: {
    allowed: false,
    code: 'missing_base_url' as const,
    reason: 'Configure a valid base URL before testing this provider.',
    nextAction: 'configure_base_url' as const,
  },
  configureBaseUrlToRun: {
    allowed: false,
    code: 'missing_base_url' as const,
    reason: 'Configure a valid base URL before using this provider at runtime.',
    nextAction: 'configure_base_url' as const,
  },
  invalidBaseUrlToTest: {
    allowed: false,
    code: 'invalid_base_url' as const,
    reason: 'Configure a valid base URL before testing this provider.',
    nextAction: 'configure_base_url' as const,
  },
  invalidBaseUrlToRun: {
    allowed: false,
    code: 'invalid_base_url' as const,
    reason: 'Configure a valid base URL before using this provider at runtime.',
    nextAction: 'configure_base_url' as const,
  },
  enableProviderFirst: {
    allowed: false,
    code: 'provider_disabled' as const,
    reason: 'Enable this provider before changing the default model.',
    nextAction: 'enable_provider' as const,
  },
  enableProviderToRun: {
    allowed: false,
    code: 'provider_disabled' as const,
    reason: 'Enable this provider before using it at runtime.',
    nextAction: 'enable_provider' as const,
  },
};

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

export function getActiveCredential(settings?: SettingsLike): string {
  if (!settings) return '';
  if (hasText(settings.apiKey)) return settings.apiKey!.trim();
  const keyFromPool = getCredentialAtIndex(settings.apiKeys, settings.currentKeyIndex);
  return keyFromPool?.trim() || '';
}

export function hasAnyCredential(settings?: SettingsLike): boolean {
  if (!settings) return false;
  if (hasText(settings.apiKey)) return true;
  if (!Array.isArray(settings.apiKeys)) return false;
  return settings.apiKeys.some((key) => hasText(key));
}

export function isValidHttpUrl(value?: string): boolean {
  if (!hasText(value)) return false;
  try {
    const parsed = new URL(value!);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getProviderRequirements(providerId: string): ProviderRequirements {
  const provider = PROVIDERS[providerId];
  const inferredLocal = LOCAL_PROVIDER_IDS.has(providerId);
  if (!provider) {
    return {
      providerId,
      requiresCredential: !inferredLocal,
      requiresBaseUrl: true,
      isLocal: inferredLocal,
    };
  }
  const isLocal = provider?.type === 'local' || inferredLocal;
  return {
    providerId,
    requiresCredential: provider?.apiKeyRequired ?? !isLocal,
    requiresBaseUrl: provider?.baseURLRequired ?? false,
    isLocal,
  };
}

function hasRequiredConfiguration(
  requirements: ProviderRequirements,
  settings?: SettingsLike
): { hasCredential: boolean; hasBaseUrl: boolean; complete: boolean } {
  const hasCredential = hasAnyCredential(settings);
  const hasBaseUrl = hasText(settings?.baseURL);
  const complete =
    (!requirements.requiresCredential || hasCredential) &&
    (!requirements.requiresBaseUrl || hasBaseUrl);
  return { hasCredential, hasBaseUrl, complete };
}

function getEnableGuard(
  requirements: ProviderRequirements,
  settings: SettingsLike | undefined,
  nextEnabled: boolean
): ProviderGuardResult {
  if (!nextEnabled) return ALLOWED;
  if (requirements.requiresCredential && !hasAnyCredential(settings)) return BLOCKED.addApiKey;
  if (requirements.requiresBaseUrl && !hasText(settings?.baseURL)) return BLOCKED.configureBaseUrl;
  if (requirements.requiresBaseUrl && !isValidHttpUrl(settings?.baseURL)) {
    return BLOCKED.invalidBaseUrlToRun;
  }
  return ALLOWED;
}

function getTestGuard(
  requirements: ProviderRequirements,
  settings: SettingsLike | undefined
): ProviderGuardResult {
  if (requirements.requiresCredential && !hasText(getActiveCredential(settings))) return BLOCKED.addApiKeyToTest;
  if (requirements.requiresBaseUrl && !hasText(settings?.baseURL)) return BLOCKED.configureBaseUrlToTest;
  if (requirements.requiresBaseUrl && !isValidHttpUrl(settings?.baseURL)) return BLOCKED.invalidBaseUrlToTest;
  return ALLOWED;
}

function getRuntimeGuard(
  requirements: ProviderRequirements,
  settings: SettingsLike | undefined
): ProviderGuardResult {
  if (settings?.enabled === false) return BLOCKED.enableProviderToRun;
  if (requirements.requiresCredential && !hasText(getActiveCredential(settings))) return BLOCKED.addApiKeyToRun;
  if (requirements.requiresBaseUrl && !hasText(settings?.baseURL)) return BLOCKED.configureBaseUrlToRun;
  if (requirements.requiresBaseUrl && !isValidHttpUrl(settings?.baseURL)) return BLOCKED.invalidBaseUrlToRun;
  return ALLOWED;
}

function getDefaultModelGuard(
  settings: SettingsLike | undefined
): ProviderGuardResult {
  if (settings?.enabled === false) return BLOCKED.enableProviderFirst;
  return ALLOWED;
}

export function evaluateBuiltInProviderCompleteness(
  providerId: string,
  settings?: Partial<UserProviderSettings>,
  latestTestResult?: { success?: boolean } | null
): BuiltInProviderCompleteness {
  const requirements = getProviderRequirements(providerId);
  const configState = hasRequiredConfiguration(requirements, settings);

  const readiness: ProviderReadinessState = !configState.complete
    ? 'unconfigured'
    : latestTestResult?.success
      ? 'verified'
      : 'configured';

  return {
    readiness,
    hasCredential: configState.hasCredential,
    hasBaseUrl: configState.hasBaseUrl,
    eligibility: {
      configure: ALLOWED,
      enable: getEnableGuard(requirements, settings, true),
      testConnection: getTestGuard(requirements, settings),
      defaultModel: getDefaultModelGuard(settings),
      runtime: getRuntimeGuard(requirements, settings),
    },
  };
}

export function evaluateCustomProviderCompleteness(
  provider: Partial<CustomProviderSettings> | undefined,
  latestTestResult?: { success?: boolean } | null
): CustomProviderCompleteness {
  const hasCredential = hasText(provider?.apiKey);
  const hasBaseUrl = hasText(provider?.baseURL);
  const readiness: ProviderReadinessState = !hasCredential || !hasBaseUrl
    ? 'unconfigured'
    : latestTestResult?.success
      ? 'verified'
      : 'configured';

  const enable = !hasCredential
    ? BLOCKED.addApiKey
    : !hasBaseUrl
      ? BLOCKED.configureBaseUrl
      : !isValidHttpUrl(provider?.baseURL)
        ? BLOCKED.invalidBaseUrlToRun
        : ALLOWED;

  const testConnection = !hasCredential
    ? BLOCKED.addApiKeyToTest
    : !hasBaseUrl
      ? BLOCKED.configureBaseUrlToTest
      : !isValidHttpUrl(provider?.baseURL)
        ? BLOCKED.invalidBaseUrlToTest
        : ALLOWED;

  const runtime = provider?.enabled === false
    ? BLOCKED.enableProviderToRun
    : !hasCredential
      ? BLOCKED.addApiKeyToRun
      : !hasBaseUrl
        ? BLOCKED.configureBaseUrlToRun
        : !isValidHttpUrl(provider?.baseURL)
          ? BLOCKED.invalidBaseUrlToRun
          : ALLOWED;

  return {
    readiness,
    hasCredential,
    hasBaseUrl,
    eligibility: {
      configure: ALLOWED,
      enable,
      testConnection,
      runtime,
    },
  };
}

export function evaluateRuntimeEligibility(
  providerId: string,
  settings?: SettingsLike
): ProviderGuardResult {
  return evaluateBuiltInProviderCompleteness(
    providerId,
    settings as Partial<UserProviderSettings> | undefined,
    null
  ).eligibility.runtime;
}
