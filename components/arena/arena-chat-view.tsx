'use client';

/**
 * ArenaChatView - Chat-first arena view for model comparison
 * Inspired by Windsurf Arena Mode: streamlined prompt → side-by-side responses → vote
 * Analytics (leaderboard/heatmap/history) are on the dedicated /arena page
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Scale,
  Send,
  BarChart3,
  EyeOff,
  Eye,
  Loader2,
  Swords,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ArenaInlineBattle } from './arena-inline-battle';
import { ArenaDialog } from './arena-dialog';
import { useArenaStore } from '@/stores/arena';
import { useArena } from '@/hooks/arena';
import { cn } from '@/lib/utils';

interface ArenaChatViewProps {
  sessionId?: string;
  systemPrompt?: string;
  initialPrompt?: string;
  className?: string;
}

export function ArenaChatView({
  sessionId,
  systemPrompt,
  initialPrompt = '',
  className,
}: ArenaChatViewProps) {
  const t = useTranslations('arena');

  const [prompt, setPrompt] = useState(initialPrompt);
  const [blindMode, setBlindMode] = useState(true);
  const [showArenaDialog, setShowArenaDialog] = useState(false);

  const battles = useArenaStore((state) => state.battles);
  const activeBattleId = useArenaStore((state) => state.activeBattleId);
  const setActiveBattle = useArenaStore((state) => state.setActiveBattle);

  const { isExecuting, startBattle, getAvailableModels } = useArena();

  const availableModels = useMemo(() => getAvailableModels(), [getAvailableModels]);

  // Get the most recent battles to display inline (active first, then recent completed)
  const activeBattles = battles.filter(
    (b) =>
      !b.winnerId &&
      !b.isTie &&
      !b.isBothBad &&
      b.contestants.some((c) => c.status === 'streaming' || c.status === 'pending')
  );

  const recentCompletedBattles = battles
    .filter((b) => b.winnerId || b.isTie || b.isBothBad)
    .slice(0, 2);

  // Show the current active battle or most recent one
  const displayBattleId = activeBattleId || (activeBattles.length > 0 ? activeBattles[0].id : null);

  // Smart model pair selection (reuse logic from ArenaQuickBattle)
  const modelRatings = useArenaStore((state) => state.modelRatings);
  const getRecommendedMatchup = useArenaStore((state) => state.getRecommendedMatchup);

  const getSmartModelPair = useCallback(() => {
    const recommendation = getRecommendedMatchup();
    if (recommendation) {
      const modelA = availableModels.find(
        (m) => `${m.provider}:${m.model}` === recommendation.modelA
      );
      const modelB = availableModels.find(
        (m) => `${m.provider}:${m.model}` === recommendation.modelB
      );
      if (modelA && modelB) return [modelA, modelB];
    }

    if (availableModels.length >= 2) {
      const sortedByRating = [...availableModels].sort((a, b) => {
        const ratingA =
          modelRatings.find((r) => r.modelId === `${a.provider}:${a.model}`)?.rating || 1500;
        const ratingB =
          modelRatings.find((r) => r.modelId === `${b.provider}:${b.model}`)?.rating || 1500;
        return ratingB - ratingA;
      });
      const first = sortedByRating[0];
      const second = sortedByRating.find((m) => m.provider !== first.provider) || sortedByRating[1];
      return [first, second];
    }

    return availableModels.slice(0, 2);
  }, [availableModels, modelRatings, getRecommendedMatchup]);

  const selectedModels = useMemo(() => getSmartModelPair(), [getSmartModelPair]);

  // Quick send: start battle with smart model pair
  const handleQuickSend = useCallback(async () => {
    if (!prompt.trim() || isExecuting || selectedModels.length < 2) return;

    const currentPrompt = prompt.trim();
    setPrompt('');

    await startBattle(
      currentPrompt,
      selectedModels.map((m) => ({
        provider: m.provider,
        model: m.model,
        displayName: m.displayName,
      })),
      {
        sessionId,
        systemPrompt,
        blindMode,
        conversationMode: 'single',
      }
    );
  }, [prompt, isExecuting, selectedModels, startBattle, sessionId, systemPrompt, blindMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleQuickSend();
      }
    },
    [handleQuickSend]
  );

  const handleCloseBattle = useCallback(() => {
    if (activeBattleId) {
      setActiveBattle(null);
    }
  }, [activeBattleId, setActiveBattle]);

  const canSend = availableModels.length >= 2 && !isExecuting && prompt.trim().length > 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Scale className="h-4.5 w-4.5 text-primary shrink-0" />
          <h2 className="font-semibold text-sm">{t('title')}</h2>
          {activeBattles.length > 0 && (
            <Badge variant="default" className="text-[10px] gap-1 animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
              {activeBattles.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/arena">
                  <BarChart3 className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('leaderboard.title')}</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setShowArenaDialog(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('advancedOptions')}</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-4 space-y-4">
          {/* Active battle inline */}
          {displayBattleId && (
            <ArenaInlineBattle
              battleId={displayBattleId}
              onClose={handleCloseBattle}
            />
          )}

          {/* Recent completed battles (collapsible summaries) */}
          {!displayBattleId && recentCompletedBattles.length > 0 && (
            <div className="space-y-3">
              {recentCompletedBattles.map((battle) => (
                <ArenaInlineBattle
                  key={battle.id}
                  battleId={battle.id}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!displayBattleId && recentCompletedBattles.length === 0 && (
            <Empty className="py-12 border-0">
              <EmptyMedia variant="icon">
                <Swords className="h-8 w-8" />
              </EmptyMedia>
              <EmptyTitle>{t('title')}</EmptyTitle>
              <EmptyDescription>{t('description')}</EmptyDescription>
            </Empty>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Input Area */}
      <div className="border-t bg-background p-3 sm:p-4 space-y-2">
        {/* Model info + blind mode toggle */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {selectedModels.length >= 2 ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-medium">
                  {blindMode ? (
                    <span className="flex items-center gap-1">
                      <EyeOff className="h-3 w-3" />
                      {t('blindMode')}
                    </span>
                  ) : (
                    selectedModels.map((m) => m.displayName).join(' vs ')
                  )}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{t('selectAtLeast2Models')}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Switch
                id="arena-blind"
                checked={blindMode}
                onCheckedChange={setBlindMode}
                className="scale-75"
              />
              <Label htmlFor="arena-blind" className="text-xs text-muted-foreground cursor-pointer">
                {blindMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Label>
            </div>
          </div>
        </div>

        {/* Text input + send */}
        <div className="flex gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('promptPlaceholder')}
            disabled={availableModels.length < 2 || isExecuting}
            className="min-h-[44px] max-h-32 resize-none flex-1"
            rows={1}
          />
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleQuickSend}
              disabled={!canSend}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Arena Dialog for advanced configuration */}
      <ArenaDialog
        open={showArenaDialog}
        onOpenChange={setShowArenaDialog}
        initialPrompt={prompt}
        sessionId={sessionId}
        systemPrompt={systemPrompt}
      />
    </div>
  );
}

export default ArenaChatView;
