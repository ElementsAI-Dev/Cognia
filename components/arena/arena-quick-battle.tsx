'use client';

/**
 * ArenaQuickBattle - One-click quick battle with smart model selection
 * Streamlined battle experience with auto-selected models
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Shuffle, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { useArena, useSmartModelPair } from '@/hooks/arena';

interface ArenaQuickBattleProps {
  prompt: string;
  sessionId?: string;
  systemPrompt?: string;
  onBattleStart?: () => void;
  onBattleComplete?: () => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

function ArenaQuickBattleComponent({
  prompt,
  sessionId,
  systemPrompt,
  onBattleStart,
  onBattleComplete,
  className,
  disabled = false,
  compact = false,
}: ArenaQuickBattleProps) {
  const t = useTranslations('arena');

  const [blindMode, setBlindMode] = useState(true);
  const [multiTurn, setMultiTurn] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const { isExecuting, error, startBattle, getLaunchReadiness } = useArena({
    onBattleStart: () => {
      onBattleStart?.();
    },
    onBattleComplete: () => {
      onBattleComplete?.();
    },
  });

  const {
    getSmartModelPair,
    selectedModels,
    availableModels,
    recommendationReason,
    hasExhaustedCycle,
    rotateMatchup,
  } = useSmartModelPair();
  const candidateModels = useMemo(
    () => (selectedModels.length >= 2 ? selectedModels : getSmartModelPair()),
    [selectedModels, getSmartModelPair]
  );
  const launchReadiness = useMemo(
    () => getLaunchReadiness(prompt, candidateModels),
    [getLaunchReadiness, prompt, candidateModels]
  );

  const getReadinessMessage = useCallback(
    (reason: NonNullable<ReturnType<typeof getLaunchReadiness>['reasons'][number]>) => {
      switch (reason.code) {
        case 'invalidPrompt':
          return t('launchReadiness.invalidPrompt');
        case 'insufficientModels':
          return t('launchReadiness.insufficientModels');
        case 'providerNotConfigured':
          return t('launchReadiness.providerNotConfigured', { provider: reason.provider || '' });
        case 'modelUnavailable':
          return t('launchReadiness.modelUnavailable', { model: reason.model || '' });
        case 'alreadyExecuting':
          return t('launchReadiness.alreadyExecuting');
        default:
          return t('launchReadiness.generic');
      }
    },
    [t]
  );
  const readinessMessage = useMemo(() => {
    if (launchReadiness.canStart) return null;
    const firstReason = launchReadiness.reasons[0];
    return firstReason ? getReadinessMessage(firstReason) : null;
  }, [getReadinessMessage, launchReadiness]);
  const visibleLaunchError = launchReadiness.canStart ? null : launchError;

  const handleQuickBattle = useCallback(async () => {
    if (isExecuting || disabled) return;

    const models = candidateModels.length >= 2 ? candidateModels : getSmartModelPair();
    const readiness = getLaunchReadiness(prompt, models);

    if (!readiness.canStart) {
      const firstReason = readiness.reasons[0];
      if (firstReason) {
        setLaunchError(getReadinessMessage(firstReason));
      }
      loggers.ui.warn('arena_launch_blocked', {
        event: 'launch_blocked',
        source: 'quick_battle',
        reasonCodes: readiness.reasons.map((reason) => reason.code),
      });
      if (models.length < 2) {
        loggers.ui.error('Not enough models available for quick battle');
      }
      return;
    }

    setLaunchError(null);

    await startBattle(
      prompt,
      models.map((m) => ({
        provider: m.provider,
        model: m.model,
        displayName: m.displayName,
      })),
      {
        sessionId,
        systemPrompt,
        blindMode,
        conversationMode: multiTurn ? 'multi' : 'single',
        maxTurns: 5,
      }
    );
  }, [
    prompt,
    isExecuting,
    disabled,
    candidateModels,
    getLaunchReadiness,
    getSmartModelPair,
    getReadinessMessage,
    startBattle,
    sessionId,
    systemPrompt,
    blindMode,
    multiTurn,
  ]);

  if (availableModels.length < 2) {
    return null;
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', className)}
            onClick={handleQuickBattle}
            disabled={disabled || isExecuting || !launchReadiness.canStart}
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('quickBattle.title')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleQuickBattle}
        disabled={disabled || isExecuting || !launchReadiness.canStart}
        className="gap-2"
      >
        {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {t('quickBattle.title')}
      </Button>

      {/* Settings popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t('quickBattle.settings')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('quickBattle.settingsDescription')}
              </p>
            </div>

            {/* Model preview */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t('quickBattle.selectedModels')}
              </Label>
              <div className="flex flex-wrap gap-1">
                {selectedModels.map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {m.displayName}
                  </Badge>
                ))}
              </div>
              {recommendationReason && (
                <p className="text-[11px] text-muted-foreground">
                  {recommendationReason}
                </p>
              )}
              {hasExhaustedCycle && (
                <p className="text-[10px] text-muted-foreground">
                  {t('quickBattle.cyclingNotice')}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 w-full"
                onClick={() => {
                  loggers.ui.info('arena_matchup_rotate_requested', {
                    event: 'matchup_rotate_requested',
                    source: 'quick_battle',
                    currentModels: selectedModels.map((model) => `${model.provider}:${model.model}`),
                    reason: recommendationReason,
                  });
                  rotateMatchup();
                }}
              >
                <Shuffle className="h-3 w-3" />
                {t('quickBattle.shuffle')}
              </Button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="blind-mode" className="text-sm">
                  {t('quickBattle.blindMode')}
                </Label>
                <Switch id="blind-mode" checked={blindMode} onCheckedChange={setBlindMode} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="multi-turn" className="text-sm">
                  {t('quickBattle.multiTurn')}
                </Label>
                <Switch id="multi-turn" checked={multiTurn} onCheckedChange={setMultiTurn} />
              </div>
            </div>

            {(visibleLaunchError || error || readinessMessage) && (
              <p className="text-xs text-destructive">
                {visibleLaunchError || error || readinessMessage}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const ArenaQuickBattle = memo(ArenaQuickBattleComponent);
export default ArenaQuickBattle;
