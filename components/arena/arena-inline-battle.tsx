'use client';

/**
 * ArenaInlineBattle - Inline battle view embedded directly in ArenaChatView
 * Shows side-by-side streaming responses without opening a dialog
 * Inspired by Windsurf Arena Mode's clean, chat-first layout
 */

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useArenaVoting } from '@/hooks/arena';
import { QuickVoteBar } from '@/components/chat/ui/quick-vote-bar';
import { ArenaContestantCard } from '@/components/arena/arena-contestant-card';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

interface ArenaInlineBattleProps {
  battleId: string;
  onClose?: () => void;
  className?: string;
}

function ArenaInlineBattleComponent({
  battleId,
  onClose,
  className,
}: ArenaInlineBattleProps) {
  const t = useTranslations('arena');

  const {
    battle,
    allDone,
    isRevealing,
    isCopying,
    handleVote,
    handleDeclareTie,
    handleDeclareBothBad,
    handleCopy,
    handleCancel,
  } = useArenaVoting(battleId);

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
          <ArenaContestantCard
            key={contestant.id}
            contestant={contestant}
            index={index}
            isWinner={battle.winnerId === contestant.id}
            blindMode={battle.mode === 'blind'}
            isRevealed={isBattleComplete && isRevealing}
            onCopy={() => handleCopy(contestant.response)}
            onCancel={contestant.status === 'streaming' ? handleCancel : undefined}
            isCopying={isCopying}
            variant="inline"
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
