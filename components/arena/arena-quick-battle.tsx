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
import { useArena } from '@/hooks/arena';
import { useArenaStore } from '@/stores/arena';

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

  const { isExecuting, error, startBattle, getAvailableModels } = useArena({
    onBattleStart: () => {
      onBattleStart?.();
    },
    onBattleComplete: () => {
      onBattleComplete?.();
    },
  });

  const modelRatings = useArenaStore((state) => state.modelRatings);
  const getRecommendedMatchup = useArenaStore((state) => state.getRecommendedMatchup);
  const availableModels = useMemo(() => getAvailableModels(), [getAvailableModels]);

  // Get smart model selection based on ratings and recommendations
  const getSmartModelPair = useCallback(() => {
    // First try recommended matchup from BT model
    const recommendation = getRecommendedMatchup();
    if (recommendation) {
      const modelA = availableModels.find(
        (m) => `${m.provider}:${m.model}` === recommendation.modelA
      );
      const modelB = availableModels.find(
        (m) => `${m.provider}:${m.model}` === recommendation.modelB
      );
      if (modelA && modelB) {
        return [modelA, modelB];
      }
    }

    // Fallback: select top 2 rated models from different providers
    if (availableModels.length >= 2) {
      const sortedByRating = [...availableModels].sort((a, b) => {
        const ratingA =
          modelRatings.find((r) => r.modelId === `${a.provider}:${a.model}`)?.rating || 1500;
        const ratingB =
          modelRatings.find((r) => r.modelId === `${b.provider}:${b.model}`)?.rating || 1500;
        return ratingB - ratingA;
      });

      // Try to pick from different providers
      const first = sortedByRating[0];
      const second = sortedByRating.find((m) => m.provider !== first.provider) || sortedByRating[1];
      return [first, second];
    }

    return availableModels.slice(0, 2);
  }, [availableModels, modelRatings, getRecommendedMatchup]);

  const handleQuickBattle = useCallback(async () => {
    if (!prompt.trim() || isExecuting || disabled) return;

    const models = getSmartModelPair();
    if (models.length < 2) {
      console.error('Not enough models available for quick battle');
      return;
    }

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
    getSmartModelPair,
    startBattle,
    sessionId,
    systemPrompt,
    blindMode,
    multiTurn,
  ]);

  const selectedModels = useMemo(() => getSmartModelPair(), [getSmartModelPair]);

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
            disabled={disabled || isExecuting || !prompt.trim()}
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
        disabled={disabled || isExecuting || !prompt.trim()}
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 w-full"
                onClick={() => {
                  // Force re-render to get new recommendations
                  getSmartModelPair();
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

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const ArenaQuickBattle = memo(ArenaQuickBattleComponent);
export default ArenaQuickBattle;
