import type { ApiTestResult } from '@/lib/ai/infrastructure/api-test';
import {
  evaluateBuiltInProviderCompleteness,
  evaluateCustomProviderCompleteness,
  getActiveCredential as getActiveCredentialFromContract,
  hasAnyCredential as hasAnyCredentialFromContract,
  type ProviderReadinessState,
} from '@/lib/ai/providers/completeness';
import type { UserProviderSettings } from '@/types/provider';

export type { ProviderReadinessState } from '@/lib/ai/providers/completeness';

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

export function getActiveCredential(settings?: Partial<UserProviderSettings>): string {
  return getActiveCredentialFromContract(settings);
}

export function hasAnyCredential(settings?: Partial<UserProviderSettings>): boolean {
  return hasAnyCredentialFromContract(settings);
}

export function getProviderEnableEligibility(
  providerId: string,
  settings: Partial<UserProviderSettings> | undefined,
  nextEnabled: boolean
): ProviderActionEligibility {
  if (!nextEnabled) return { allowed: true };
  return evaluateBuiltInProviderCompleteness(providerId, settings, null).eligibility.enable;
}

export function getBuiltInProviderReadiness(
  providerId: string,
  settings: Partial<UserProviderSettings> | undefined,
  latestTestResult?: ApiTestResult | null
): BuiltInProviderReadiness {
  const evaluated = evaluateBuiltInProviderCompleteness(providerId, settings, latestTestResult);

  return {
    readiness: evaluated.readiness,
    hasCredential: evaluated.hasCredential,
    hasBaseUrl: evaluated.hasBaseUrl,
    eligibility: {
      configure: evaluated.eligibility.configure,
      testConnection: evaluated.eligibility.testConnection,
      enable: evaluated.eligibility.enable,
      defaultModel: evaluated.eligibility.defaultModel,
    },
  };
}

export function getCustomProviderReadiness(
  provider: CustomProviderLike | undefined,
  latestTestResult?: { success?: boolean } | null
): CustomProviderReadiness {
  const evaluated = evaluateCustomProviderCompleteness(provider, latestTestResult);

  return {
    readiness: evaluated.readiness,
    hasCredential: evaluated.hasCredential,
    hasBaseUrl: evaluated.hasBaseUrl,
    eligibility: {
      configure: evaluated.eligibility.configure,
      testConnection: evaluated.eligibility.testConnection,
      enable: evaluated.eligibility.enable,
    },
  };
}

export function getVisibleSelectedProviderIds(
  visibleProviderIds: string[],
  selectedProviderIds: Set<string>
): string[] {
  return visibleProviderIds.filter((providerId) => selectedProviderIds.has(providerId));
}
