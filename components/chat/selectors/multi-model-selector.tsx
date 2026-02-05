'use client';

/**
 * MultiModelSelector - Select multiple AI models for arena mode
 * Allows selecting 2-4 models for parallel comparison
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Zap } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettingsStore } from '@/stores';
import { ARENA_MODEL_PRESETS } from '@/types/arena';
import { cn } from '@/lib/utils';
import type { ArenaModelConfig } from '@/types/chat/multi-model';
import type { ProviderName } from '@/types/provider';

interface MultiModelSelectorProps {
  models: ArenaModelConfig[];
  onModelsChange: (models: ArenaModelConfig[]) => void;
  maxModels?: number;
  disabled?: boolean;
  className?: string;
}

interface ModelPreset {
  provider: ProviderName;
  model: string;
  displayName: string;
}

const MODEL_PRESETS: ModelPreset[] = [
  { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
  { provider: 'google', model: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash' },
  { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
  { provider: 'deepseek', model: 'deepseek-chat', displayName: 'DeepSeek Chat' },
  { provider: 'deepseek', model: 'deepseek-reasoner', displayName: 'DeepSeek Reasoner' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B' },
  { provider: 'mistral', model: 'mistral-large-latest', displayName: 'Mistral Large' },
  { provider: 'xai', model: 'grok-3', displayName: 'Grok 3' },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  google: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  deepseek: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  groq: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  mistral: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  xai: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export function MultiModelSelector({
  models,
  onModelsChange,
  maxModels = 4,
  disabled = false,
  className,
}: MultiModelSelectorProps) {
  const t = useTranslations('arena');
  const [open, setOpen] = useState(false);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get available models based on configured API keys
  const availableModels = useMemo(() => {
    return MODEL_PRESETS.filter((preset) => {
      const settings = providerSettings[preset.provider];
      return settings?.apiKey || preset.provider === 'ollama';
    });
  }, [providerSettings]);

  // Add a model to selection
  const addModel = useCallback(
    (provider: ProviderName, model: string, displayName: string) => {
      if (models.length >= maxModels) return;
      if (models.some((m) => m.provider === provider && m.model === model)) return;

      const newModel: ArenaModelConfig = {
        id: nanoid(),
        provider,
        model,
        displayName,
        columnIndex: models.length,
      };
      onModelsChange([...models, newModel]);
    },
    [models, maxModels, onModelsChange]
  );

  // Remove a model from selection
  const removeModel = useCallback(
    (id: string) => {
      // Filter and recalculate column indices immutably
      const updated = models
        .filter((m) => m.id !== id)
        .map((m, i) => ({ ...m, columnIndex: i }));
      onModelsChange(updated);
    },
    [models, onModelsChange]
  );

  // Apply a preset configuration
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = ARENA_MODEL_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      const available = preset.models
        .filter((pm) =>
          availableModels.some(
            (am) => am.provider === pm.provider && am.model === pm.model
          )
        )
        .slice(0, maxModels)
        .map((m, i) => ({
          id: nanoid(),
          provider: m.provider,
          model: m.model,
          displayName:
            availableModels.find(
              (am) => am.provider === m.provider && am.model === m.model
            )?.displayName || m.model,
          columnIndex: i,
        }));

      onModelsChange(available);
      setOpen(false);
    },
    [availableModels, maxModels, onModelsChange]
  );

  // Check if a model is already selected
  const isModelSelected = useCallback(
    (provider: ProviderName, model: string) => {
      return models.some((m) => m.provider === provider && m.model === model);
    },
    [models]
  );

  // Get provider badge color
  const getProviderColor = (provider: string) => {
    return PROVIDER_COLORS[provider] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Selected models */}
      {models.map((m) => (
        <Badge
          key={m.id}
          variant="secondary"
          className={cn('gap-1.5 pr-1', getProviderColor(m.provider))}
        >
          <span className="font-mono text-[10px] opacity-60">
            {String.fromCharCode(65 + m.columnIndex)}
          </span>
          <ModelSelectorLogo provider={m.provider} className="size-3" />
          {m.displayName}
          <button
            onClick={() => removeModel(m.id)}
            className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            disabled={disabled}
            aria-label={`Remove ${m.displayName}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add model button */}
      {models.length < maxModels && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5"
              disabled={disabled}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('addModel')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            {/* Presets section */}
            <div className="p-3 border-b">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {t('presets')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARENA_MODEL_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => applyPreset(preset.id)}
                  >
                    <Zap className="h-3 w-3" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Available models section */}
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {availableModels.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {t('noModelsConfigured')}
                  </div>
                ) : (
                  availableModels.map((m) => {
                    const isSelected = isModelSelected(m.provider, m.model);
                    return (
                      <button
                        key={`${m.provider}-${m.model}`}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary cursor-not-allowed'
                            : 'hover:bg-muted cursor-pointer'
                        )}
                        onClick={() => {
                          if (!isSelected) {
                            addModel(m.provider, m.model, m.displayName);
                            if (models.length + 1 >= maxModels) {
                              setOpen(false);
                            }
                          }
                        }}
                        disabled={isSelected}
                      >
                        <div className="flex items-center gap-1.5">
                          <ModelSelectorLogo provider={m.provider} className="size-4" />
                          <span className="font-medium">{m.displayName}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', getProviderColor(m.provider))}
                        >
                          {m.provider}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Footer hint */}
            <div className="p-2 border-t bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                {t('selectModelsHint', { min: 2, max: maxModels })}
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default MultiModelSelector;
