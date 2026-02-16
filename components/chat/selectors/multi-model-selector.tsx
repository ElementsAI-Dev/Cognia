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
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettingsStore } from '@/stores';
import { ARENA_KNOWN_MODELS } from '@/lib/arena/constants';
import { getProviderColor } from '@/lib/arena/color';
import { cn } from '@/lib/utils';
import type { ArenaModelConfig } from '@/types/chat/multi-model';
import { ARENA_MODEL_PRESETS } from '@/types/arena';
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

// Use centralized model list
const MODEL_PRESETS: ModelPreset[] = ARENA_KNOWN_MODELS;

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
          <ProviderIcon providerId={m.provider} size={12} className="shrink-0" />
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
                          <ProviderIcon providerId={m.provider} size={16} className="shrink-0" />
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
