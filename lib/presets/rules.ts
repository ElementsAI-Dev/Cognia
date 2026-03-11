/**
 * Shared preset validation and normalization rules.
 *
 * This module centralizes business rules used by form submit, import,
 * AI-generated preset creation, and store write paths.
 */

import {
  PRESET_CATEGORIES,
  type BuiltinPrompt,
  type CreatePresetInput,
  type PresetCategory,
} from '@/types/content/preset';
import { PROVIDERS, type ProviderName } from '@/types/provider';

const VALID_MODES = new Set(['chat', 'agent', 'research', 'learning']);
const DEFAULT_PROVIDER: ProviderName = 'openai';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_ICON = '💬';
const DEFAULT_COLOR = '#6366f1';

export type PresetValidationField = 'name' | 'provider' | 'model' | 'maxTokens';

export type PresetValidationErrorCode =
  | 'nameRequired'
  | 'providerRequired'
  | 'modelRequired'
  | 'maxTokensInvalid';

export interface PresetValidationResult {
  valid: boolean;
  fieldErrors: Partial<Record<PresetValidationField, PresetValidationErrorCode>>;
  firstError?: PresetValidationErrorCode;
}

export interface PresetProviderSettingsEntry {
  enabled?: boolean;
  apiKey?: string;
  defaultModel?: string;
}

export type PresetProviderSettings = Record<
  string,
  PresetProviderSettingsEntry | undefined
>;

export type PresetCompatibilityAdjustmentCode = 'providerFallback' | 'modelFallback';

export interface PresetCompatibilityAdjustment {
  code: PresetCompatibilityAdjustmentCode;
  fromProvider: ProviderName | 'auto';
  toProvider: ProviderName | 'auto';
  fromModel: string;
  toModel: string;
}

export interface PresetDraftInput {
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  provider?: ProviderName | 'auto' | null;
  model?: string | null;
  mode?: string | null;
  systemPrompt?: string | null;
  builtinPrompts?: Array<Partial<BuiltinPrompt>> | null;
  temperature?: number | null;
  maxTokens?: number | null;
  webSearchEnabled?: boolean | null;
  thinkingEnabled?: boolean | null;
  category?: string | null;
  isDefault?: boolean | null;
}

export interface ResolveProviderModelInput {
  provider: ProviderName | 'auto';
  model?: string;
  providerSettings?: PresetProviderSettings;
}

export interface ResolveProviderModelResult {
  provider: ProviderName | 'auto';
  model: string;
  adjustment?: PresetCompatibilityAdjustment;
}

export interface NormalizePresetInputResult {
  normalized: CreatePresetInput;
  adjustment?: PresetCompatibilityAdjustment;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getProviderEntry(provider: ProviderName): (typeof PROVIDERS)[string] | undefined {
  return PROVIDERS[provider];
}

function isProviderConfigured(
  provider: ProviderName,
  providerSettings: PresetProviderSettings = {},
): boolean {
  const entry = getProviderEntry(provider);
  if (!entry) return false;

  const settings = providerSettings[provider];
  if (settings?.enabled === false) return false;

  if (entry.apiKeyRequired) {
    return Boolean(settings?.apiKey);
  }

  return true;
}

function isModelInProvider(provider: ProviderName, model: string): boolean {
  const entry = getProviderEntry(provider);
  if (!entry || !model) return false;
  return entry.models.some((candidate) => candidate.id === model);
}

function resolveProviderDefaultModel(
  provider: ProviderName,
  providerSettings: PresetProviderSettings = {},
): string {
  const entry = getProviderEntry(provider);
  if (!entry) return DEFAULT_MODEL;

  const preferred = providerSettings[provider]?.defaultModel;
  if (preferred && isModelInProvider(provider, preferred)) {
    return preferred;
  }

  return entry.defaultModel || entry.models[0]?.id || DEFAULT_MODEL;
}

function getConfiguredProviders(
  providerSettings: PresetProviderSettings = {},
): ProviderName[] {
  const providers = Object.keys(PROVIDERS) as ProviderName[];
  return providers.filter((provider) => isProviderConfigured(provider, providerSettings));
}

function resolveFallbackModel(
  providerSettings: PresetProviderSettings = {},
): { provider: ProviderName; model: string } {
  if (isProviderConfigured(DEFAULT_PROVIDER, providerSettings)) {
    return {
      provider: DEFAULT_PROVIDER,
      model: resolveProviderDefaultModel(DEFAULT_PROVIDER, providerSettings),
    };
  }

  const configured = getConfiguredProviders(providerSettings);
  if (configured.length > 0) {
    const provider = configured[0];
    return {
      provider,
      model: resolveProviderDefaultModel(provider, providerSettings),
    };
  }

  return {
    provider: DEFAULT_PROVIDER,
    model: resolveProviderDefaultModel(DEFAULT_PROVIDER, {}),
  };
}

function normalizeBuiltinPrompts(
  prompts: Array<Partial<BuiltinPrompt>> | null | undefined,
): BuiltinPrompt[] | undefined {
  if (!Array.isArray(prompts) || prompts.length === 0) return undefined;

  const normalized: BuiltinPrompt[] = [];
  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index];
    const name = (prompt.name || '').trim();
    const content = (prompt.content || '').trim();
    if (!name && !content) continue;

    normalized.push({
      id: (prompt.id || `builtin-prompt-${index + 1}`).trim(),
      name,
      content,
      description: prompt.description?.trim() || undefined,
    });
  }

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCategory(category: string | null | undefined): PresetCategory | undefined {
  if (!category) return undefined;
  return PRESET_CATEGORIES.includes(category as PresetCategory)
    ? (category as PresetCategory)
    : undefined;
}

export function validatePresetDraft(draft: PresetDraftInput): PresetValidationResult {
  const fieldErrors: Partial<Record<PresetValidationField, PresetValidationErrorCode>> = {};

  if (!draft.name?.trim()) {
    fieldErrors.name = 'nameRequired';
  }

  const provider = draft.provider;
  if (!provider || String(provider).trim() === '') {
    fieldErrors.provider = 'providerRequired';
  }

  if (!draft.model?.trim()) {
    fieldErrors.model = 'modelRequired';
  }

  const hasMaxTokens = draft.maxTokens !== null && draft.maxTokens !== undefined;
  if (hasMaxTokens) {
    const asNumber = Number(draft.maxTokens);
    if (!Number.isFinite(asNumber) || asNumber <= 0) {
      fieldErrors.maxTokens = 'maxTokensInvalid';
    }
  }

  const firstError = fieldErrors.name
    || fieldErrors.provider
    || fieldErrors.model
    || fieldErrors.maxTokens;

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    firstError,
  };
}

export function resolveProviderModel({
  provider,
  model,
  providerSettings = {},
}: ResolveProviderModelInput): ResolveProviderModelResult {
  const requestedProvider = provider;
  const requestedModel = model?.trim() || '';

  if (requestedProvider === 'auto') {
    const fallback = resolveFallbackModel(providerSettings);

    if (!requestedModel) {
      return {
        provider: 'auto',
        model: fallback.model,
      };
    }

    const hasRequestedModel = (Object.keys(PROVIDERS) as ProviderName[]).some(
      (providerName) =>
        isProviderConfigured(providerName, providerSettings)
        && isModelInProvider(providerName, requestedModel),
    );

    if (hasRequestedModel) {
      return {
        provider: 'auto',
        model: requestedModel,
      };
    }

    return {
      provider: 'auto',
      model: fallback.model,
      adjustment: {
        code: 'modelFallback',
        fromProvider: 'auto',
        toProvider: 'auto',
        fromModel: requestedModel,
        toModel: fallback.model,
      },
    };
  }

  if (!isProviderConfigured(requestedProvider, providerSettings)) {
    const fallback = resolveFallbackModel(providerSettings);
    return {
      provider: 'auto',
      model: fallback.model,
      adjustment: {
        code: 'providerFallback',
        fromProvider: requestedProvider,
        toProvider: 'auto',
        fromModel: requestedModel || resolveProviderDefaultModel(requestedProvider),
        toModel: fallback.model,
      },
    };
  }

  if (requestedModel && isModelInProvider(requestedProvider, requestedModel)) {
    return {
      provider: requestedProvider,
      model: requestedModel,
    };
  }

  const fallbackModel = resolveProviderDefaultModel(requestedProvider, providerSettings);
  return {
    provider: requestedProvider,
    model: fallbackModel,
    adjustment: requestedModel
      ? {
          code: 'modelFallback',
          fromProvider: requestedProvider,
          toProvider: requestedProvider,
          fromModel: requestedModel,
          toModel: fallbackModel,
        }
      : undefined,
  };
}

export function normalizePresetInput(
  draft: PresetDraftInput,
  providerSettings: PresetProviderSettings = {},
): NormalizePresetInputResult {
  const provider = (draft.provider || 'auto') as ProviderName | 'auto';
  const model = draft.model?.trim();

  const providerModel = resolveProviderModel({
    provider,
    model,
    providerSettings,
  });

  const temperatureInput =
    typeof draft.temperature === 'number' && Number.isFinite(draft.temperature)
      ? draft.temperature
      : 0.7;

  const maxTokensInput =
    draft.maxTokens === null || draft.maxTokens === undefined
      ? undefined
      : Number(draft.maxTokens);

  const normalized: CreatePresetInput = {
    name: draft.name?.trim() || '',
    description: draft.description?.trim() || undefined,
    icon: draft.icon?.trim() || DEFAULT_ICON,
    color: draft.color?.trim() || DEFAULT_COLOR,
    provider: providerModel.provider,
    model: providerModel.model || DEFAULT_MODEL,
    mode: VALID_MODES.has(String(draft.mode))
      ? (draft.mode as CreatePresetInput['mode'])
      : 'chat',
    systemPrompt: draft.systemPrompt?.trim() || undefined,
    builtinPrompts: normalizeBuiltinPrompts(draft.builtinPrompts),
    temperature: clamp(temperatureInput, 0, 2),
    maxTokens:
      typeof maxTokensInput === 'number' && Number.isFinite(maxTokensInput) && maxTokensInput > 0
        ? Math.floor(maxTokensInput)
        : undefined,
    webSearchEnabled: Boolean(draft.webSearchEnabled),
    thinkingEnabled: Boolean(draft.thinkingEnabled),
    category: normalizeCategory(draft.category),
    isDefault: typeof draft.isDefault === 'boolean' ? draft.isDefault : undefined,
  };

  return {
    normalized,
    adjustment: providerModel.adjustment,
  };
}
