import type { CreatePresetInput, Preset } from '@/types/content/preset';
import type { Session, UpdateSessionInput } from '@/types/core/session';

type PresetSessionFields = Pick<
  Preset,
  | 'id'
  | 'provider'
  | 'model'
  | 'mode'
  | 'systemPrompt'
  | 'builtinPrompts'
  | 'temperature'
  | 'maxTokens'
  | 'webSearchEnabled'
  | 'thinkingEnabled'
>;

type SessionPresetFields = Pick<
  Session,
  | 'provider'
  | 'model'
  | 'mode'
  | 'systemPrompt'
  | 'builtinPrompts'
  | 'temperature'
  | 'maxTokens'
  | 'webSearchEnabled'
  | 'thinkingEnabled'
>;

type CreatePresetInputOverrides = Pick<
  CreatePresetInput,
  'name' | 'description' | 'icon' | 'color' | 'category'
>;

export type SessionDerivedPresetInput = Omit<CreatePresetInput, 'mode'> & {
  mode: NonNullable<CreatePresetInput['mode']>;
};

function cloneBuiltinPrompts(
  builtinPrompts: SessionPresetFields['builtinPrompts'] | PresetSessionFields['builtinPrompts'],
) {
  return builtinPrompts?.map((prompt) => ({ ...prompt }));
}

export function createSessionUpdateFromPreset(
  preset: PresetSessionFields,
): UpdateSessionInput {
  return {
    provider: preset.provider,
    model: preset.model,
    mode: preset.mode,
    systemPrompt: preset.systemPrompt,
    builtinPrompts: cloneBuiltinPrompts(preset.builtinPrompts),
    temperature: preset.temperature,
    maxTokens: preset.maxTokens,
    webSearchEnabled: preset.webSearchEnabled,
    thinkingEnabled: preset.thinkingEnabled,
    presetId: preset.id,
  };
}

export function createPresetInputFromSession(
  session: SessionPresetFields,
  overrides: CreatePresetInputOverrides,
): SessionDerivedPresetInput {
  return {
    name: overrides.name,
    description: overrides.description,
    icon: overrides.icon,
    color: overrides.color,
    provider: session.provider,
    model: session.model,
    mode: session.mode,
    systemPrompt: session.systemPrompt,
    builtinPrompts: cloneBuiltinPrompts(session.builtinPrompts),
    temperature: session.temperature,
    maxTokens: session.maxTokens,
    webSearchEnabled: session.webSearchEnabled,
    thinkingEnabled: session.thinkingEnabled,
    category: overrides.category,
  };
}
