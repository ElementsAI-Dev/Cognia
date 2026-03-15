import {
  getBuiltInProviderCatalogEntry,
  getBuiltInProviderSettingsBaseURL,
  type BuiltInProviderProtocol,
} from '@/types/provider/built-in-provider-catalog';
import type {
  ApiProtocol,
  ProviderVerificationStatus,
  UserProviderSettings,
} from '@/types/provider';

import { getActiveCredential } from './completeness';

export type ProviderConnectivityProtocol = ApiProtocol | BuiltInProviderProtocol;
export type ProviderConnectivityOutcome = 'verified' | 'failed' | 'limited';

export interface ProviderConnectivityTarget {
  providerId: string;
  protocol: ProviderConnectivityProtocol;
  apiKey: string;
  baseURL?: string;
  requiresCredential: boolean;
  requiresBaseURL: boolean;
  isLocal: boolean;
}

export interface ProviderConnectivityResultLike {
  success?: boolean;
  outcome?: ProviderConnectivityOutcome;
  authoritative?: boolean;
  message?: string;
}

export interface CustomProviderConnectivityInput {
  apiKey?: string;
  baseURL?: string;
  apiProtocol?: ApiProtocol;
  enabled?: boolean;
}

function normalizeOptionalBaseURL(baseURL?: string): string | undefined {
  const trimmed = baseURL?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveBuiltInProviderConnectivityTarget(
  providerId: string,
  settings?: Partial<UserProviderSettings>
): ProviderConnectivityTarget {
  const entry = getBuiltInProviderCatalogEntry(providerId);

  return {
    providerId,
    protocol: entry?.protocol || 'openai',
    apiKey: getActiveCredential(settings),
    baseURL: normalizeOptionalBaseURL(settings?.baseURL) || getBuiltInProviderSettingsBaseURL(providerId),
    requiresCredential: entry?.apiKeyRequired ?? true,
    requiresBaseURL: entry?.baseURLRequired ?? false,
    isLocal: entry?.type === 'local',
  };
}

export function resolveCustomProviderConnectivityTarget(
  providerId: string,
  provider?: CustomProviderConnectivityInput
): ProviderConnectivityTarget {
  return {
    providerId,
    protocol: provider?.apiProtocol || 'openai',
    apiKey: provider?.apiKey?.trim() || '',
    baseURL: normalizeOptionalBaseURL(provider?.baseURL),
    requiresCredential: true,
    requiresBaseURL: true,
    isLocal: false,
  };
}

export function deriveVerificationStatusFromConnectivityResult(
  previousStatus: ProviderVerificationStatus | undefined,
  result?: ProviderConnectivityResultLike | null
): ProviderVerificationStatus {
  if (result?.success && result.authoritative !== false && result.outcome !== 'limited') {
    return 'verified';
  }

  return previousStatus === 'verified' ? 'stale' : 'unverified';
}
