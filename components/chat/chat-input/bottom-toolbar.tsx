import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PresetQuickPrompts } from '@/components/presets/preset-quick-prompts';
import { PresetQuickSwitcher } from '@/components/presets/preset-quick-switcher';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Brain, Globe, Radio, Settings2, Presentation } from 'lucide-react';
import { usePresetStore, useSessionStore } from '@/stores';
import styles from './bottom-toolbar.module.css';

interface BottomToolbarProps {
  modelName: string;
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  streamingEnabled?: boolean;
  contextUsagePercent: number;
  onModelClick?: () => void;
  onWebSearchChange?: (enabled: boolean) => void;
  onThinkingChange?: (enabled: boolean) => void;
  onStreamingChange?: (enabled: boolean) => void;
  onOpenAISettings?: () => void;
  onOpenContextSettings?: () => void;
  onPresetChange?: (preset: import('@/types/preset').Preset) => void;
  onCreatePreset?: () => void;
  onManagePresets?: () => void;
  onSelectPrompt: (content: string) => void;
  disabled?: boolean;
  isProcessing: boolean;
}

function PresetQuickPromptsWrapper({ onSelectPrompt, disabled }: { onSelectPrompt: (content: string) => void; disabled?: boolean }) {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const presets = usePresetStore((state) => state.presets);

  const currentSession = activeSessionId ? sessions.find((s) => s.id === activeSessionId) : null;
  const presetId = currentSession?.presetId;
  const currentPreset = presetId ? presets.find((p) => p.id === presetId) : null;
  const prompts = currentPreset?.builtinPrompts || [];

  if (prompts.length === 0) return null;

  return <PresetQuickPrompts prompts={prompts} onSelectPrompt={onSelectPrompt} disabled={disabled} />;
}

export function BottomToolbar({
  modelName,
  webSearchEnabled,
  thinkingEnabled,
  streamingEnabled,
  contextUsagePercent,
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
  disabled,
  isProcessing,
}: BottomToolbarProps) {
  const t = useTranslations('chatInput');

  const boundedPercent = Math.min(100, Math.max(0, Math.round(contextUsagePercent)));
  const severityClass =
    boundedPercent < 50 ? 'low' : boundedPercent < 80 ? 'medium' : 'high';

  return (
    <div className="mt-1 sm:mt-2 flex items-center justify-between px-1">
      <div className="flex items-center gap-1">
        {onModelClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={onModelClick}
              >
                <span className="font-medium">⚡</span>
                <span className="max-w-[60px] sm:max-w-[100px] truncate">{modelName}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('changeModel')}</TooltipContent>
          </Tooltip>
        )}

        <div className="mx-0.5 sm:mx-1 h-3 sm:h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                webSearchEnabled ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onWebSearchChange?.(!webSearchEnabled)}
            >
              <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t('search')}</span>
              {webSearchEnabled && <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary animate-pulse" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toggleWebSearch')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                thinkingEnabled ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onThinkingChange?.(!thinkingEnabled)}
            >
              <Brain className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t('think')}</span>
              {thinkingEnabled && <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-purple-500 animate-pulse" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('extendedThinking')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-normal',
                streamingEnabled !== false ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onStreamingChange?.(streamingEnabled === false)}
            >
              <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t('stream') || 'Stream'}</span>
              {streamingEnabled !== false && <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
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

        <div className="hidden min-[400px]:block mx-0.5 sm:mx-1 h-3 sm:h-4 w-px bg-border" />

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

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          onClick={onOpenContextSettings}
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs h-auto p-0 hover:bg-transparent"
          title={t('contextWindowUsage')}
        >
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-10 sm:w-16 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
              <progress
                max={100}
                value={boundedPercent}
                className={cn(styles.usageProgress, styles[severityClass])}
                aria-label={t('contextWindowUsage')}
              />
            </div>
            <span
              className={cn('tabular-nums', contextUsagePercent >= 80 && 'text-red-500 font-medium')}
            >
              {contextUsagePercent}%
            </span>
          </div>
        </Button>
      </div>
    </div>
  );
}
