import {
  getBuiltInProviderCatalogEntry,
  getBuiltInProviderCodingPackage,
  type BuiltInProviderModelEntry,
  type BuiltInProviderCategory,
  type BuiltInProviderCodingPackage,
} from '@/types/provider/built-in-provider-catalog';
import { getProviderIconPath } from '@/lib/ai/icons';
import {
  PROVIDERS,
  type ApiProtocol,
  type ModelConfig,
  type ProviderMetadata,
  type ProviderVerificationStatus,
  type UserProviderSettings,
} from '@/types/provider';
import type {
  ProviderNextAction,
  ProviderReadinessState,
  ProviderSetupChecklist,
} from '@/lib/ai/providers/completeness';
import {
  evaluateBuiltInProviderCompleteness,
  evaluateCustomProviderCompleteness,
} from '@/lib/ai/providers/completeness';

export type ProviderProjectionKind = 'built-in' | 'local' | 'custom';
export type ProviderProjectionCategory = BuiltInProviderCategory | 'custom' | undefined;

export interface CustomProviderProjectionInput {
  providerId?: string;
  isCustom?: true;
  customName?: string;
  customModels?: string[];
  customModelMetadata?: Record<
    string,
    {
      id?: string;
      name?: string;
      contextLength?: number;
      maxOutputTokens?: number;
      pricing?: {
        promptPer1M?: number;
        completionPer1M?: number;
      };
      capabilities?: {
        vision?: boolean;
        functionCalling?: boolean;
        streaming?: boolean;
      };
    }
  >;
  apiProtocol?: ApiProtocol;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  enabled?: boolean;
  verificationStatus?: ProviderVerificationStatus;
  verificationFingerprint?: string;
}

export interface ProviderStateProjection {
  id: string;
  kind: ProviderProjectionKind;
  category: ProviderProjectionCategory;
  displayName: string;
  description: string;
  icon?: string;
  website?: string;
  metadata: ProviderMetadata;
  models: ModelConfig[];
  modelIds: string[];
  defaultModelId: string;
  defaultModel?: ModelConfig;
  readiness: ProviderReadinessState;
  verificationStatus: ProviderVerificationStatus;
  nextAction?: ProviderNextAction;
  recommendedRemediation?: string;
  selectable: boolean;
  blockedReason?: string;
  codingPackage?: BuiltInProviderCodingPackage;
  enabled: boolean;
  hasCredential: boolean;
  hasBaseUrl: boolean;
  setupChecklist: ProviderSetupChecklist;
  isCustom: boolean;
  settings: Partial<UserProviderSettings> | CustomProviderProjectionInput;
}

export interface BuildProviderStateProjectionInput {
  providerSettings: Record<string, Partial<UserProviderSettings> | undefined>;
  customProviders?: Record<string, CustomProviderProjectionInput | undefined>;
  builtInTestResults?: Record<string, { success?: boolean } | null | undefined>;
  customTestResults?: Record<string, { success?: boolean } | 'success' | 'error' | null | undefined>;
}

function deriveMetadataFromModels(
  id: string,
  displayName: string,
  description: string,
  website: string | undefined,
  requiresApiKey: boolean,
  models: ModelConfig[],
  icon?: string,
  pricingUrl?: string
): ProviderMetadata {
  return {
    id,
    name: displayName,
    description,
    website,
    requiresApiKey,
    supportsStreaming: models.some((model) => model.supportsStreaming) || false,
    supportsVision: models.some((model) => model.supportsVision) || false,
    supportsTools: models.some((model) => model.supportsTools) || false,
    maxTokens: models.reduce((max, model) => Math.max(max, model.contextLength || 0), 0) || undefined,
    pricingUrl,
    icon,
  };
}

function convertCatalogModelToModelConfig(model: BuiltInProviderModelEntry): ModelConfig {
  return {
    id: model.id,
    name: model.name,
    contextLength: model.contextLength,
    maxOutputTokens: model.maxOutputTokens,
    supportsTools: model.supportsTools,
    supportsVision: model.supportsVision,
    supportsAudio: model.supportsAudio,
    supportsVideo: model.supportsVideo,
    supportsStreaming: model.supportsStreaming,
    supportsReasoning: model.supportsReasoning,
    supportsImageGeneration: model.supportsImageGeneration,
    supportsEmbedding: model.supportsEmbedding,
    pricing: model.pricing
      ? {
          promptPer1M: model.pricing.promptPer1M,
          completionPer1M: model.pricing.completionPer1M,
        }
      : undefined,
  };
}

function getBuiltInModels(providerId: string): ModelConfig[] {
  const providerConfig = PROVIDERS[providerId];
  if (providerConfig?.models?.length) {
    return providerConfig.models;
  }
  const catalogEntry = getBuiltInProviderCatalogEntry(providerId);
  if (catalogEntry?.models?.length) {
    return catalogEntry.models.map(convertCatalogModelToModelConfig);
  }
  return [];
}

function getCustomModels(provider: CustomProviderProjectionInput | undefined): ModelConfig[] {
  if (!provider) return [];

  const metadata = provider.customModelMetadata || {};
  const sourceModelIds = provider.customModels?.length
    ? provider.customModels
    : Object.keys(metadata);

  return sourceModelIds.map((modelId) => {
    const modelMetadata = metadata[modelId];
    return {
      id: modelId,
      name: modelMetadata?.name || modelId,
      contextLength: modelMetadata?.contextLength ?? 0,
      maxOutputTokens: modelMetadata?.maxOutputTokens,
      supportsTools: modelMetadata?.capabilities?.functionCalling ?? true,
      supportsVision: modelMetadata?.capabilities?.vision ?? false,
      supportsAudio: false,
      supportsVideo: false,
      supportsStreaming: modelMetadata?.capabilities?.streaming ?? true,
      pricing:
        modelMetadata?.pricing?.promptPer1M !== undefined ||
        modelMetadata?.pricing?.completionPer1M !== undefined
          ? {
              promptPer1M: modelMetadata?.pricing?.promptPer1M ?? 0,
              completionPer1M: modelMetadata?.pricing?.completionPer1M ?? 0,
            }
          : undefined,
    };
  });
}

function toCustomLatestTestResult(
  latestTestResult: { success?: boolean } | 'success' | 'error' | null | undefined
): { success?: boolean } | null {
  if (latestTestResult === 'success') return { success: true };
  if (latestTestResult === 'error') return { success: false };
  if (latestTestResult && typeof latestTestResult === 'object') {
    return latestTestResult;
  }
  return null;
}

function getProjectionRemediation(params: {
  blockedReason?: string;
  checklist: ProviderSetupChecklist;
}): string | undefined {
  if (params.blockedReason) return params.blockedReason;
  return params.checklist.steps.find((step) => !step.done)?.reason;
}

function buildBuiltInProviderProjection(
  providerId: string,
  settings: Partial<UserProviderSettings> | undefined,
  latestTestResult?: { success?: boolean } | null
): ProviderStateProjection {
  const providerConfig = PROVIDERS[providerId];
  const catalogEntry = getBuiltInProviderCatalogEntry(providerId);
  const models = getBuiltInModels(providerId);
  const completeness = evaluateBuiltInProviderCompleteness(providerId, settings, latestTestResult);
  const displayName = catalogEntry?.name || providerConfig?.name || providerId;
  const description = catalogEntry?.description || providerConfig?.description || 'Built-in provider';
  const defaultModelId =
    settings?.defaultModel || providerConfig?.defaultModel || catalogEntry?.defaultModel || models[0]?.id || '';
  const metadata = deriveMetadataFromModels(
    providerId,
    displayName,
    description,
    catalogEntry?.website || providerConfig?.website,
    catalogEntry?.apiKeyRequired ?? providerConfig?.apiKeyRequired ?? true,
    models,
    getProviderIconPath(providerId),
    catalogEntry?.pricingUrl
  );
  const kind: ProviderProjectionKind =
    providerConfig?.type === 'local' || catalogEntry?.type === 'local' ? 'local' : 'built-in';
  const category = (() => {
    const rawCategory = catalogEntry?.category || providerConfig?.category;
    return rawCategory === 'enterprise' ? 'specialized' : rawCategory;
  })();
  const blockedReason = completeness.eligibility.runtime.allowed
    ? undefined
    : completeness.eligibility.runtime.reason;

  return {
    id: providerId,
    kind,
    category,
    displayName,
    description,
    icon: metadata.icon,
    website: metadata.website,
    metadata,
    models,
    modelIds: models.map((model) => model.id),
    defaultModelId,
    defaultModel: models.find((model) => model.id === defaultModelId),
    readiness: completeness.readiness,
    verificationStatus: completeness.verificationStatus,
    nextAction: completeness.eligibility.runtime.nextAction || completeness.setupChecklist.nextAction,
    recommendedRemediation: getProjectionRemediation({
      blockedReason,
      checklist: completeness.setupChecklist,
    }),
    selectable: completeness.eligibility.runtime.allowed,
    blockedReason,
    codingPackage: getBuiltInProviderCodingPackage(providerId),
    enabled: settings?.enabled !== false,
    hasCredential: completeness.hasCredential,
    hasBaseUrl: completeness.hasBaseUrl,
    setupChecklist: completeness.setupChecklist,
    isCustom: false,
    settings: settings || {},
  };
}

function buildCustomProviderProjection(
  providerId: string,
  provider: CustomProviderProjectionInput | undefined,
  latestTestResult?: { success?: boolean } | null
): ProviderStateProjection {
  const models = getCustomModels(provider);
  const completeness = evaluateCustomProviderCompleteness(
    {
      apiKey: provider?.apiKey,
      baseURL: provider?.baseURL,
      defaultModel: provider?.defaultModel,
      enabled: provider?.enabled,
      verificationStatus: provider?.verificationStatus,
      verificationFingerprint: provider?.verificationFingerprint,
    },
    latestTestResult
  );
  const displayName = provider?.customName || providerId;
  const description = provider?.apiProtocol
    ? `Custom ${provider.apiProtocol}-compatible provider`
    : 'Custom provider';
  const metadata = deriveMetadataFromModels(
    providerId,
    displayName,
    description,
    undefined,
    true,
    models,
    undefined
  );
  const defaultModelId = provider?.defaultModel || models[0]?.id || '';
  const blockedReason = completeness.eligibility.runtime.allowed
    ? undefined
    : completeness.eligibility.runtime.reason;

  return {
    id: providerId,
    kind: 'custom',
    category: 'custom',
    displayName,
    description,
    icon: metadata.icon,
    website: metadata.website,
    metadata,
    models,
    modelIds: models.map((model) => model.id),
    defaultModelId,
    defaultModel: models.find((model) => model.id === defaultModelId),
    readiness: completeness.readiness,
    verificationStatus: completeness.verificationStatus,
    nextAction: completeness.eligibility.runtime.nextAction || completeness.setupChecklist.nextAction,
    recommendedRemediation: getProjectionRemediation({
      blockedReason,
      checklist: completeness.setupChecklist,
    }),
    selectable: completeness.eligibility.runtime.allowed,
    blockedReason,
    enabled: provider?.enabled !== false,
    hasCredential: completeness.hasCredential,
    hasBaseUrl: completeness.hasBaseUrl,
    setupChecklist: completeness.setupChecklist,
    isCustom: true,
    settings: provider || {},
  };
}

export function buildProviderStateProjections(
  input: BuildProviderStateProjectionInput
): ProviderStateProjection[] {
  const builtInProjections = Object.entries(input.providerSettings).map(([providerId, settings]) =>
    buildBuiltInProviderProjection(
      providerId,
      settings,
      input.builtInTestResults?.[providerId] || null
    )
  );

  const customProjections = Object.entries(input.customProviders || {}).map(([providerId, provider]) =>
    buildCustomProviderProjection(
      providerId,
      provider,
      toCustomLatestTestResult(input.customTestResults?.[providerId])
    )
  );

  return [...builtInProjections, ...customProjections];
}

export function buildProviderStateProjectionMap(
  input: BuildProviderStateProjectionInput
): Record<string, ProviderStateProjection> {
  return Object.fromEntries(
    buildProviderStateProjections(input).map((projection) => [projection.id, projection])
  );
}

export function getProviderSelectionGuidance(
  projections: ProviderStateProjection[]
): string | undefined {
  return projections.find((projection) => !projection.selectable)?.recommendedRemediation;
}
