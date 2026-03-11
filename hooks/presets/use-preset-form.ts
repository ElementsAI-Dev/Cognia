/**
 * usePresetForm - manages form state for creating and editing presets.
 *
 * Extracted from components/presets/create-preset-dialog.tsx to separate
 * form logic from UI rendering.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePresetStore, usePromptTemplateStore, useSettingsStore } from '@/stores';
import { nanoid } from 'nanoid';
import type { Preset, BuiltinPrompt, PresetCategory } from '@/types/content/preset';
import type { ProviderName } from '@/types/provider';
import type { PromptTemplate } from '@/types/content/prompt-template';
import {
  normalizePresetInput,
  validatePresetDraft,
  type PresetCompatibilityAdjustment,
  type PresetValidationErrorCode,
  type PresetValidationField,
} from '@/lib/presets';

export interface PresetFormState {
  name: string;
  description: string;
  icon: string;
  color: string;
  provider: ProviderName | 'auto';
  model: string;
  mode: 'chat' | 'agent' | 'research' | 'learning';
  systemPrompt: string;
  temperature: number;
  maxTokens: number | undefined;
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  category: PresetCategory | undefined;
  builtinPrompts: BuiltinPrompt[];
}

interface UsePresetFormOptions {
  editPreset?: Preset | null;
  open: boolean;
  onSuccess?: (preset: Preset) => void;
  onClose: () => void;
}

export type PresetFieldErrors = Partial<
  Record<PresetValidationField, PresetValidationErrorCode>
>;

export interface PresetFormSubmitResult {
  valid: boolean;
  error?: PresetValidationErrorCode;
  fieldErrors?: PresetFieldErrors;
  adjustment?: PresetCompatibilityAdjustment;
}

const DEFAULT_FORM_STATE: PresetFormState = {
  name: '',
  description: '',
  icon: '💬',
  color: '#6366f1',
  provider: 'auto',
  model: 'gpt-4o',
  mode: 'chat',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: undefined,
  webSearchEnabled: false,
  thinkingEnabled: false,
  category: undefined,
  builtinPrompts: [],
};

const VALIDATION_FIELDS = new Set<PresetValidationField>([
  'name',
  'provider',
  'model',
  'maxTokens',
]);

function cloneFormState(state: PresetFormState): PresetFormState {
  return {
    ...state,
    builtinPrompts: state.builtinPrompts.map((prompt) => ({ ...prompt })),
  };
}

function serializeFormState(state: PresetFormState): string {
  return JSON.stringify({
    ...state,
    builtinPrompts: state.builtinPrompts.map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      content: prompt.content,
      description: prompt.description || '',
    })),
  });
}

export function usePresetForm({
  editPreset,
  open,
  onSuccess,
  onClose,
}: UsePresetFormOptions) {
  const createPreset = usePresetStore((state) => state.createPreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const initializePromptTemplates = usePromptTemplateStore((state) => state.initializeDefaults);
  const recordTemplateUsage = usePromptTemplateStore((state) => state.recordUsage);

  // Form state
  const [form, setForm] = useState<PresetFormState>(DEFAULT_FORM_STATE);
  const [initialFormSnapshot, setInitialFormSnapshot] =
    useState<PresetFormState>(DEFAULT_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<PresetFieldErrors>({});
  const [lastCompatibilityAdjustment, setLastCompatibilityAdjustment] = useState<
    PresetCompatibilityAdjustment | undefined
  >(undefined);

  // AI description input (only for new presets)
  const [aiDescription, setAiDescription] = useState('');

  // Template selector
  const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Populate form when editing, reset when creating new
  useEffect(() => {
    queueMicrotask(() => {
      if (editPreset) {
        const nextState = {
          name: editPreset.name,
          description: editPreset.description || '',
          icon: editPreset.icon || '💬',
          color: editPreset.color || '#6366f1',
          provider: editPreset.provider,
          model: editPreset.model,
          mode: editPreset.mode,
          systemPrompt: editPreset.systemPrompt || '',
          temperature: editPreset.temperature ?? 0.7,
          maxTokens: editPreset.maxTokens,
          webSearchEnabled: editPreset.webSearchEnabled || false,
          thinkingEnabled: editPreset.thinkingEnabled || false,
          builtinPrompts: editPreset.builtinPrompts || [],
          category: editPreset.category,
        } satisfies PresetFormState;
        setForm(nextState);
        setInitialFormSnapshot(cloneFormState(nextState));
      } else {
        const nextState = cloneFormState(DEFAULT_FORM_STATE);
        setForm(nextState);
        setInitialFormSnapshot(cloneFormState(nextState));
        setAiDescription('');
      }
      setFieldErrors({});
      setLastCompatibilityAdjustment(undefined);
    });
  }, [editPreset, open]);

  useEffect(() => {
    initializePromptTemplates();
  }, [initializePromptTemplates]);

  // Field updaters
  const updateField = useCallback(
    <K extends keyof PresetFormState>(key: K, value: PresetFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (VALIDATION_FIELDS.has(key as PresetValidationField)) {
        setFieldErrors((prev) => {
          if (!prev[key as PresetValidationField]) return prev;
          const next = { ...prev };
          delete next[key as PresetValidationField];
          return next;
        });
      }
    },
    [],
  );

  // Apply AI-generated preset data to form
  const applyGeneratedPreset = useCallback(
    (preset: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      mode?: string;
      systemPrompt?: string;
      temperature?: number;
      webSearchEnabled?: boolean;
      thinkingEnabled?: boolean;
      category?: string;
      builtinPrompts?: Array<{ name: string; content: string; description?: string }>;
    }) => {
      setForm((prev) => ({
        ...prev,
        name: preset.name || prev.name,
        description: preset.description || prev.description,
        icon: preset.icon || prev.icon,
        color: preset.color || prev.color,
        mode: (preset.mode as PresetFormState['mode']) || prev.mode,
        systemPrompt: preset.systemPrompt || prev.systemPrompt,
        temperature: preset.temperature ?? prev.temperature,
        webSearchEnabled: preset.webSearchEnabled ?? prev.webSearchEnabled,
        thinkingEnabled: preset.thinkingEnabled ?? prev.thinkingEnabled,
        category: (preset.category as PresetCategory) || prev.category,
        builtinPrompts: preset.builtinPrompts?.length
          ? preset.builtinPrompts.map((p) => ({
              id: nanoid(),
              name: p.name,
              content: p.content,
              description: p.description || '',
            }))
          : prev.builtinPrompts,
      }));
      setAiDescription('');
    },
    [],
  );

  // Apply optimized prompt
  const applyOptimizedPrompt = useCallback((optimizedPrompt: string) => {
    setForm((prev) => ({ ...prev, systemPrompt: optimizedPrompt }));
  }, []);

  // Apply generated builtin prompts (append)
  const applyGeneratedBuiltinPrompts = useCallback(
    (prompts: Array<{ name: string; content: string; description?: string }>) => {
      const newPrompts = prompts.map((p) => ({
        id: nanoid(),
        name: p.name,
        content: p.content,
        description: p.description || '',
      }));
      setForm((prev) => ({
        ...prev,
        builtinPrompts: [...prev.builtinPrompts, ...newPrompts],
      }));
    },
    [],
  );

  // Apply prompt template
  const handleApplyTemplate = useCallback(
    (template: PromptTemplate) => {
      setForm((prev) => ({ ...prev, systemPrompt: template.content }));
      recordTemplateUsage(template.id);
      setTemplateSelectorOpen(false);
    },
    [recordTemplateUsage],
  );

  // Builtin prompt CRUD
  const addBuiltinPrompt = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      builtinPrompts: [
        ...prev.builtinPrompts,
        { id: nanoid(), name: '', content: '', description: '' },
      ],
    }));
  }, []);

  const updateBuiltinPrompt = useCallback(
    (id: string, updates: Partial<BuiltinPrompt>) => {
      setForm((prev) => ({
        ...prev,
        builtinPrompts: prev.builtinPrompts.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      }));
    },
    [],
  );

  const removeBuiltinPrompt = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      builtinPrompts: prev.builtinPrompts.filter((p) => p.id !== id),
    }));
  }, []);

  // Submit
  const handleSubmit = useCallback((): PresetFormSubmitResult => {
    const validation = validatePresetDraft(form);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setLastCompatibilityAdjustment(undefined);
      return {
        valid: false,
        error: validation.firstError,
        fieldErrors: validation.fieldErrors,
      } satisfies PresetFormSubmitResult;
    }

    const { normalized, adjustment } = normalizePresetInput(form, providerSettings);
    setFieldErrors({});
    setLastCompatibilityAdjustment(adjustment);

    if (editPreset) {
      updatePreset(editPreset.id, {
        ...normalized,
      });
      onSuccess?.({
        ...editPreset,
        ...normalized,
      } as Preset);
    } else {
      const newPreset = createPreset(normalized);
      onSuccess?.(newPreset);
    }

    onClose();
    return {
      valid: true,
      adjustment,
    } satisfies PresetFormSubmitResult;
  }, [form, providerSettings, editPreset, createPreset, updatePreset, onSuccess, onClose]);

  const clearValidationState = useCallback(() => {
    setFieldErrors({});
    setLastCompatibilityAdjustment(undefined);
  }, []);

  const isDirty = useMemo(
    () => serializeFormState(form) !== serializeFormState(initialFormSnapshot),
    [form, initialFormSnapshot],
  );

  return {
    form,
    updateField,
    aiDescription,
    setAiDescription,
    isTemplateSelectorOpen,
    setTemplateSelectorOpen,
    applyGeneratedPreset,
    applyOptimizedPrompt,
    applyGeneratedBuiltinPrompts,
    handleApplyTemplate,
    addBuiltinPrompt,
    updateBuiltinPrompt,
    removeBuiltinPrompt,
    fieldErrors,
    lastCompatibilityAdjustment,
    clearValidationState,
    isDirty,
    handleSubmit,
  };
}
