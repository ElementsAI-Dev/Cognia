import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PresetQuickPrompts } from '@/components/presets/preset-quick-prompts';
import { PresetQuickSwitcher } from '@/components/presets/preset-quick-switcher';
import { TokenIndicatorInline } from '@/components/chat/utils/token-budget-indicator';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Brain, Globe, Radio, Settings2, Presentation, Workflow, Wand2, Swords, X, Plus } from 'lucide-react';
import type { ArenaModelConfig } from '@/types/chat/multi-model';
import type { ProviderName } from '@/types/provider';
import { usePresetStore, useSessionStore, useSettingsStore } from '@/stores';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import { supportsReasoning } from '@/lib/ai/core/client';

interface BottomToolbarProps {
  modelName: string;
  providerId?: string;
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  streamingEnabled?: boolean;
  contextUsagePercent: number;
  usedTokens?: number;
  maxTokens?: number;
  onModelClick?: () => void;
  onWebSearchChange?: (enabled: boolean) => void;
  onThinkingChange?: (enabled: boolean) => void;
  onStreamingChange?: (enabled: boolean) => void;
  onOpenAISettings?: () => void;
  onOpenContextSettings?: () => void;
  onPresetChange?: (preset: import('@/types/content/preset').Preset) => void;
  onCreatePreset?: () => void;
  onManagePresets?: () => void;
  onSelectPrompt: (content: string) => void;
  onOpenWorkflowPicker?: () => void;
  onOpenPromptOptimization?: () => void;
  onOpenArena?: () => void;
  hasActivePreset?: boolean;
  // Multi-model support
  multiModelEnabled?: boolean;
  multiModelModels?: ArenaModelConfig[];
  onMultiModelModelsChange?: (models: ArenaModelConfig[]) => void;
  disabled?: boolean;
  isProcessing: boolean;
  hideTokenCount?: boolean;
  hideWebSearchToggle?: boolean;
  hideThinkingToggle?: boolean;
}

function PresetQuickPromptsWrapper({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (content: string) => void;
  disabled?: boolean;
}) {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const presets = usePresetStore((state) => state.presets);

  const currentSession = activeSessionId ? sessions.find((s) => s.id === activeSessionId) : null;
  const presetId = currentSession?.presetId;
  const currentPreset = presetId ? presets.find((p) => p.id === presetId) : null;
  const prompts = currentPreset?.builtinPrompts || [];

  if (prompts.length === 0) return null;

  return (
    <PresetQuickPrompts prompts={prompts} onSelectPrompt={onSelectPrompt} disabled={disabled} />
  );
}

const MULTI_MODEL_PRESETS: { provider: ProviderName; model: string; displayName: string }[] = [
  { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
  { provider: 'google', model: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash' },
  { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
  { provider: 'deepseek', model: 'deepseek-chat', displayName: 'DeepSeek Chat' },
  { provider: 'deepseek', model: 'deepseek-reasoner', displayName: 'DeepSeek R1' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B' },
  { provider: 'mistral', model: 'mistral-large-latest', displayName: 'Mistral Large' },
  { provider: 'xai', model: 'grok-3', displayName: 'Grok 3' },
];

const PROVIDER_BADGE_COLORS: Record<string, string> = {
  openai: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  anthropic: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  google: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  deepseek: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  groq: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  mistral: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  xai: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

function MultiModelBadges({
  models,
  onModelsChange,
  onModelClick,
  disabled,
}: {
  models: ArenaModelConfig[];
  onModelsChange?: (models: ArenaModelConfig[]) => void;
  onModelClick?: () => void;
  disabled?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const availableModels = useMemo(() => {
    return MULTI_MODEL_PRESETS.filter((preset) => {
      const settings = providerSettings[preset.provider];
      return settings?.apiKey || preset.provider === 'ollama';
    });
  }, [providerSettings]);

  const isModelSelected = useCallback(
    (provider: ProviderName, model: string) => {
      return models.some((m) => m.provider === provider && m.model === model);
    },
    [models]
  );

  const addModel = useCallback(
    (provider: ProviderName, model: string, displayName: string) => {
      if (models.length >= 4) return;
      if (isModelSelected(provider, model)) return;
      const newModel: ArenaModelConfig = {
        id: nanoid(),
        provider,
        model,
        displayName,
        columnIndex: models.length,
      };
      onModelsChange?.([...models, newModel]);
    },
    [models, onModelsChange, isModelSelected]
  );

  const removeModel = useCallback(
    (id: string) => {
      const updated = models
        .filter((m) => m.id !== id)
        .map((m, i) => ({ ...m, columnIndex: i }));
      onModelsChange?.(updated);
    },
    [models, onModelsChange]
  );

  const getBadgeColor = (provider: string) =>
    PROVIDER_BADGE_COLORS[provider] || 'bg-muted text-muted-foreground border-border/50';

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {models.map((m) => (
        <Badge
          key={m.id}
          variant="outline"
          className={cn(
            'h-5 sm:h-6 gap-1 px-1 sm:px-1.5 text-[10px] sm:text-xs font-normal cursor-pointer border',
            getBadgeColor(m.provider)
          )}
          onClick={onModelClick}
        >
          <ProviderIcon providerId={m.provider} size={12} className="shrink-0" />
          <span className="max-w-12 sm:max-w-20 truncate">{m.displayName}</span>
          {onModelsChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeModel(m.id);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              disabled={disabled}
              aria-label={`Remove ${m.displayName}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {models.length < 4 && onModelsChange && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start" side="top">
            <ScrollArea className="h-52">
              <div className="p-1.5 space-y-0.5">
                {availableModels.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-3">
                    No API keys configured
                  </div>
                ) : (
                  availableModels.map((m) => {
                    const selected = isModelSelected(m.provider, m.model);
                    return (
                      <button
                        key={`${m.provider}-${m.model}`}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                          selected
                            ? 'bg-primary/10 text-primary cursor-not-allowed opacity-60'
                            : 'hover:bg-muted cursor-pointer'
                        )}
                        onClick={() => {
                          if (!selected) {
                            addModel(m.provider, m.model, m.displayName);
                            if (models.length + 1 >= 4) setAddOpen(false);
                          }
                        }}
                        disabled={selected}
                      >
                        <ProviderIcon providerId={m.provider} size={14} className="shrink-0" />
                        <span className="font-medium truncate">{m.displayName}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function BottomToolbar({
  modelName,
  providerId,
  webSearchEnabled,
  thinkingEnabled,
  streamingEnabled,
  contextUsagePercent,
  usedTokens,
  maxTokens,
  onModelClick,
  onWebSearchChange,
  onThinkingChange,
  onStreamingChange,
  onOpenAISettings,
  onOpenContextSettings,
  onPresetChange,
  onCreatePreset,
  onManagePresets,
  onSelectPrompt,
  onOpenWorkflowPicker,
  onOpenPromptOptimization,
  onOpenArena,
  hasActivePreset,
  multiModelEnabled,
  multiModelModels,
  onMultiModelModelsChange,
  disabled,
  isProcessing,
  hideTokenCount = false,
  hideWebSearchToggle = false,
  hideThinkingToggle = false,
}: BottomToolbarProps) {
  const t = useTranslations('chatInput');

  const boundedPercent = Math.min(100, Math.max(0, Math.round(contextUsagePercent)));
  const severityClass = boundedPercent < 50 ? 'low' : boundedPercent < 80 ? 'medium' : 'high';

  return (
    <div className="mt-1 sm:mt-2 flex items-center justify-between px-1 gap-2">
      <div
        className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollBy({
              left: e.deltaY,
              behavior: 'auto',
            });
          }
        }}
      >
        {multiModelEnabled && multiModelModels && multiModelModels.length > 0 ? (
          <MultiModelBadges
            models={multiModelModels}
            onModelsChange={onMultiModelModelsChange}
            onModelClick={onModelClick}
            disabled={disabled}
          />
        ) : onModelClick ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={onModelClick}
              >
                <ProviderIcon providerId={providerId} size={14} className="shrink-0" />
                <span className="max-w-15 sm:max-w-25 truncate">{modelName}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('changeModel')}</TooltipContent>
          </Tooltip>
        ) : null}

        <Separator orientation="vertical" className="mx-0.5 sm:mx-1 h-3 sm:h-4" />

        {!hideWebSearchToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                  webSearchEnabled
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onWebSearchChange?.(!webSearchEnabled)}
              >
                <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{t('search')}</span>
                {webSearchEnabled && (
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleWebSearch')}</TooltipContent>
          </Tooltip>
        )}

        {!hideThinkingToggle && supportsReasoning(modelName) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                  thinkingEnabled
                    ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onThinkingChange?.(!thinkingEnabled)}
              >
                <Brain className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{t('think')}</span>
                {thinkingEnabled && (
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-purple-500 animate-pulse" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('extendedThinking')}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                streamingEnabled !== false
                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onStreamingChange?.(streamingEnabled === false)}
            >
              <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t('stream') || 'Stream'}</span>
              {streamingEnabled !== false && (
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toggleStreaming') || 'Toggle streaming responses'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/ppt">
                <Presentation className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-500" />
                <span className="hidden sm:inline">{t('ppt') || 'PPT'}</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('createPresentation') || 'Create AI Presentation'}</TooltipContent>
        </Tooltip>

        {onOpenWorkflowPicker && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={onOpenWorkflowPicker}
              >
                <Workflow className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />
                <span className="hidden sm:inline">{t('workflow') || 'Workflow'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('runWorkflow') || 'Run a workflow'}</TooltipContent>
          </Tooltip>
        )}

        {onOpenArena && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={onOpenArena}
              >
                <Swords className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
                <span className="hidden sm:inline">{t('arena') || 'Arena'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('openArena') || 'Compare multiple AI models'}</TooltipContent>
          </Tooltip>
        )}

        {onOpenPromptOptimization && hasActivePreset && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={onOpenPromptOptimization}
              >
                <Wand2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-violet-500" />
                <span className="hidden sm:inline">{t('optimize') || 'Optimize'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('optimizePrompt') || 'Optimize preset prompt'}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7"
              onClick={onOpenAISettings}
            >
              <Settings2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('aiSettings')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="hidden min-[400px]:block mx-0.5 sm:mx-1 h-3 sm:h-4" />

        <div className="hidden min-[400px]:block">
          <PresetQuickSwitcher
            onPresetChange={onPresetChange}
            onCreateNew={onCreatePreset}
            onManage={onManagePresets}
            disabled={isProcessing || disabled}
          />
        </div>

        <div className="hidden sm:block">
          <PresetQuickPromptsWrapper
            onSelectPrompt={onSelectPrompt}
            disabled={isProcessing || disabled}
          />
        </div>
      </div>

      {!hideTokenCount && (
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            onClick={onOpenContextSettings}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs h-auto p-0 hover:bg-transparent"
            title={t('contextWindowUsage')}
          >
            {usedTokens !== undefined && maxTokens !== undefined ? (
              <TokenIndicatorInline 
                usedTokens={usedTokens} 
                maxTokens={maxTokens} 
                className="text-[10px] sm:text-xs"
              />
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Progress
                  value={boundedPercent}
                  className="w-10 sm:w-16 h-1 sm:h-1.5"
                  indicatorClassName={cn(
                    severityClass === 'low' && 'bg-emerald-500',
                    severityClass === 'medium' && 'bg-amber-500',
                    severityClass === 'high' && 'bg-red-500'
                  )}
                  aria-label={t('contextWindowUsage')}
                />
                <span
                  className={cn(
                    'tabular-nums',
                    contextUsagePercent >= 80 && 'text-red-500 font-medium'
                  )}
                >
                  {contextUsagePercent}%
                </span>
              </div>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
