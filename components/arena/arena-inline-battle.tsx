'use client';

/**
 * ArenaInlineBattle - Inline battle view embedded directly in ArenaChatView
 * Shows side-by-side streaming responses without opening a dialog
 * Inspired by Windsurf Arena Mode's clean, chat-first layout
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  Clock,
  Hash,
  Coins,
  Copy,
  Check,
  Loader2,
  Ban,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCopy } from '@/hooks/ui';
import { useArena } from '@/hooks/arena';
import { useArenaStore, selectBattleById } from '@/stores/arena';
import { MarkdownRenderer } from '@/components/chat/utils';
import { QuickVoteBar } from '@/components/chat/ui/quick-vote-bar';
import type { ArenaContestant, ArenaWinReason } from '@/types/arena';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

interface ArenaInlineBattleProps {
  battleId: string;
  onClose?: () => void;
  className?: string;
}

function InlineContestantCard({
  contestant,
  index,
  isWinner,
  blindMode,
  isRevealed,
  onCopy,
  onCancel,
  isCopying,
}: {
  contestant: ArenaContestant;
  index: number;
  isWinner: boolean;
  blindMode: boolean;
  isRevealed: boolean;
  onCopy: () => void;
  onCancel?: () => void;
  isCopying: boolean;
}) {
  const t = useTranslations('arena');

  const isStreaming = contestant.status === 'streaming';
  const isCompleted = contestant.status === 'completed';
  const isError = contestant.status === 'error';

  const getStatusBadge = () => {
    if (isStreaming) {
      return (
        <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 text-[10px]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('streaming')}
        </Badge>
      );
    }
    if (isError) {
      return (
        <Badge variant="destructive" className="gap-1 text-[10px]">
          {t('error')}
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-300 text-[10px]">
          <Check className="h-3 w-3" />
          {t('completed')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground text-[10px]">
        {t('pending')}
      </Badge>
    );
  };

  return (
    <Card
      className={cn(
        'flex flex-col h-full overflow-hidden transition-all py-0 gap-0',
        isWinner && 'ring-2 ring-primary border-primary',
        isError && 'border-destructive/50'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between px-3 py-2 bg-muted/50 border-b gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {String.fromCharCode(65 + index)}
          </Badge>
          {blindMode && !isRevealed ? (
            <span className="text-xs text-muted-foreground italic truncate">
              {t('model')} {String.fromCharCode(65 + index)}
            </span>
          ) : (
            <span
              className={cn(
                'text-xs text-muted-foreground truncate',
                isRevealed && 'animate-in fade-in slide-in-from-left-2 duration-500'
              )}
            >
              {contestant.displayName}
            </span>
          )}
          {isWinner && (
            <Badge className="text-[10px] gap-1 bg-primary animate-in zoom-in duration-300 shrink-0">
              <Trophy className="h-2.5 w-2.5" />
              {t('winner')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {getStatusBadge()}
          {isStreaming && onCancel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={onCancel}
                >
                  <Ban className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cancel')}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCopy}
                disabled={!contestant.response}
              >
                {isCopying ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copy')}</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full p-3">
          {isError ? (
            <p className="text-sm text-destructive">{contestant.error}</p>
          ) : contestant.response ? (
            <MarkdownRenderer content={contestant.response} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('waiting')}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {contestant.latencyMs && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(contestant.latencyMs / 1000).toFixed(1)}s
            </div>
          )}
          {contestant.tokenCount && (
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {contestant.tokenCount.total}
            </div>
          )}
          {contestant.estimatedCost && (
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3" />${contestant.estimatedCost.toFixed(4)}
            </div>
          )}
        </div>
        {isWinner && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Trophy className="h-2.5 w-2.5" />
            {t('selected')}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

function ArenaInlineBattleComponent({
  battleId,
  onClose,
  className,
}: ArenaInlineBattleProps) {
  const t = useTranslations('arena');
  const tToasts = useTranslations('toasts');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('messageCopied') });
  const { cancelBattle } = useArena();

  const [isRevealing, setIsRevealing] = useState(false);

  const battle = useArenaStore(selectBattleById(battleId));
  const selectWinner = useArenaStore((state) => state.selectWinner);
  const declareTie = useArenaStore((state) => state.declareTie);
  const declareBothBad = useArenaStore((state) => state.declareBothBad);
  const canVote = useArenaStore((state) => state.canVote);
  const markBattleViewed = useArenaStore((state) => state.markBattleViewed);

  useEffect(() => {
    markBattleViewed(battleId);
  }, [battleId, markBattleViewed]);

  const allDone = battle?.contestants.every(
    (c) => c.status === 'completed' || c.status === 'error' || c.status === 'cancelled'
  );

  const ensureVoteAllowed = useCallback(() => {
    const result = canVote(battleId);
    if (!result.allowed) {
      const message =
        result.reason === 'min-viewing-time'
          ? tToasts('arenaMinViewingTime')
          : tToasts('arenaRateLimit');
      toast.error(message);
      return false;
    }
    return true;
  }, [battleId, canVote, tToasts]);

  const handleDeclareTie = useCallback(() => {
    if (!ensureVoteAllowed()) return;
    setIsRevealing(true);
    declareTie(battleId);
  }, [battleId, declareTie, ensureVoteAllowed]);

  const handleDeclareBothBad = useCallback(() => {
    if (!ensureVoteAllowed()) return;
    setIsRevealing(true);
    declareBothBad(battleId);
  }, [battleId, declareBothBad, ensureVoteAllowed]);

  const handleVote = useCallback(
    (contestantId: string) => {
      if (!ensureVoteAllowed()) return;
      setIsRevealing(true);
      selectWinner(battleId, contestantId, { reason: 'quality' as ArenaWinReason });
    },
    [battleId, ensureVoteAllowed, selectWinner]
  );

  const handleCopy = useCallback(
    async (content: string) => {
      await copy(content);
    },
    [copy]
  );

  const handleCancel = useCallback(() => {
    cancelBattle(battleId);
  }, [battleId, cancelBattle]);

  if (!battle) {
    return null;
  }

  const isBlindMode =
    battle.mode === 'blind' && !battle.winnerId && !battle.isTie && !battle.isBothBad;
  const isBattleComplete = !!battle.winnerId || !!battle.isTie || !!battle.isBothBad;

  const modelsForVoteBar: ArenaModelConfig[] = battle.contestants.map((c, index) => ({
    id: c.id,
    provider: c.provider,
    model: c.model,
    displayName: isBlindMode ? `${t('model')} ${String.fromCharCode(65 + index)}` : c.displayName,
    columnIndex: index,
  }));

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Prompt preview */}
      <div className="px-3 py-2 rounded-lg bg-muted/40 border">
        <p className="text-xs text-muted-foreground mb-0.5">{t('prompt')}:</p>
        <p className="text-sm line-clamp-2">{battle.prompt}</p>
      </div>

      {/* Side-by-side responses */}
      <div
        className="grid gap-3 flex-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${Math.min(battle.contestants.length, 4)}, 1fr)`,
          minHeight: '300px',
        }}
      >
        {battle.contestants.map((contestant, index) => (
          <InlineContestantCard
            key={contestant.id}
            contestant={contestant}
            index={index}
            isWinner={battle.winnerId === contestant.id}
            blindMode={battle.mode === 'blind'}
            isRevealed={isBattleComplete && isRevealing}
            onCopy={() => handleCopy(contestant.response)}
            onCancel={contestant.status === 'streaming' ? handleCancel : undefined}
            isCopying={isCopying}
          />
        ))}
      </div>

      {/* Vote bar */}
      {allDone && !isBattleComplete && (
        <QuickVoteBar
          models={modelsForVoteBar}
          onVote={handleVote}
          onTie={handleDeclareTie}
          onBothBad={handleDeclareBothBad}
          className="rounded-lg border"
        />
      )}

      {/* Result banner */}
      {isBattleComplete && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-lg bg-muted/30 border">
          {battle.winnerId && (
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('winnerSelected')}</span>
              {isRevealing && battle.mode === 'blind' && (
                <span className="text-xs text-muted-foreground animate-in fade-in duration-500">
                  — {t('modelsRevealed')}
                </span>
              )}
            </div>
          )}
          {battle.isTie && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {t('tie')}
            </div>
          )}
          {battle.isBothBad && (
            <Badge variant="destructive" className="text-xs">
              {t('bothBad')}
            </Badge>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto text-xs">
              {t('done')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export const ArenaInlineBattle = memo(ArenaInlineBattleComponent);
export default ArenaInlineBattle;
