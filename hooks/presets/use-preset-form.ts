/**
 * usePresetForm - manages form state for creating and editing presets.
 *
 * Extracted from components/presets/create-preset-dialog.tsx to separate
 * form logic from UI rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePresetStore, usePromptTemplateStore } from '@/stores';
import { nanoid } from 'nanoid';
import type { Preset, BuiltinPrompt, PresetCategory } from '@/types/content/preset';
import type { ProviderName } from '@/types/provider';
import type { PromptTemplate } from '@/types/content/prompt-template';

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

export function usePresetForm({
  editPreset,
  open,
  onSuccess,
  onClose,
}: UsePresetFormOptions) {
  const createPreset = usePresetStore((state) => state.createPreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const initializePromptTemplates = usePromptTemplateStore((state) => state.initializeDefaults);
  const recordTemplateUsage = usePromptTemplateStore((state) => state.recordUsage);

  // Form state
  const [form, setForm] = useState<PresetFormState>(DEFAULT_FORM_STATE);

  // AI description input (only for new presets)
  const [aiDescription, setAiDescription] = useState('');

  // Template selector
  const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Populate form when editing, reset when creating new
  useEffect(() => {
    queueMicrotask(() => {
      if (editPreset) {
        setForm({
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
        });
      } else {
        setForm(DEFAULT_FORM_STATE);
        setAiDescription('');
      }
    });
  }, [editPreset, open]);

  useEffect(() => {
    initializePromptTemplates();
  }, [initializePromptTemplates]);

  // Field updaters
  const updateField = useCallback(
    <K extends keyof PresetFormState>(key: K, value: PresetFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
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
  const handleSubmit = useCallback((): { valid: boolean; error?: string } => {
    if (!form.name.trim()) return { valid: false, error: 'nameRequired' };
    if (!form.model.trim()) return { valid: false, error: 'modelRequired' };

    if (editPreset) {
      updatePreset(editPreset.id, {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon,
        color: form.color,
        provider: form.provider,
        model: form.model,
        mode: form.mode,
        systemPrompt: form.systemPrompt || undefined,
        builtinPrompts: form.builtinPrompts.length > 0 ? form.builtinPrompts : undefined,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        webSearchEnabled: form.webSearchEnabled,
        thinkingEnabled: form.thinkingEnabled,
        category: form.category,
      });
      onSuccess?.({
        ...editPreset,
        ...form,
      } as Preset);
    } else {
      const newPreset = createPreset({
        name: form.name,
        description: form.description || undefined,
        icon: form.icon,
        color: form.color,
        provider: form.provider,
        model: form.model,
        mode: form.mode,
        systemPrompt: form.systemPrompt || undefined,
        builtinPrompts: form.builtinPrompts.length > 0 ? form.builtinPrompts : undefined,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        webSearchEnabled: form.webSearchEnabled,
        thinkingEnabled: form.thinkingEnabled,
        category: form.category,
      });
      onSuccess?.(newPreset);
    }

    onClose();
    return { valid: true };
  }, [form, editPreset, createPreset, updatePreset, onSuccess, onClose]);

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
    handleSubmit,
  };
}
