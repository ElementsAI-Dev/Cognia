'use client';

/**
 * ArenaBattleView - Live battle comparison view
 * Displays streaming responses from multiple models side-by-side
 */

import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Trophy,
  Scale,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
  RotateCcw,
  Diff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { WIN_REASONS } from '@/lib/arena';
import { useArenaVoting } from '@/hooks/arena';
import { QuickVoteBar } from '@/components/chat/ui/quick-vote-bar';
import { ArenaDiffView } from '@/components/arena/arena-diff-view';
import { ArenaContestantCard } from '@/components/arena/arena-contestant-card';
import type { ArenaWinReason } from '@/types/arena';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

interface ArenaBattleViewProps {
  battleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  onContinueTurn?: (battleId: string, message: string) => Promise<void>;
  canContinue?: boolean;
}

// ContestantCard is now imported from ./arena-contestant-card

function ArenaBattleViewComponent({
  battleId,
  open,
  onOpenChange,
  onClose,
  onContinueTurn,
  canContinue = false,
}: ArenaBattleViewProps) {
  const t = useTranslations('arena');

  const {
    battle,
    allDone,
    isRevealing,
    selectedReason,
    setSelectedReason,
    isCopying,
    handleVote,
    handleDeclareTie,
    handleDeclareBothBad,
    handleCopy,
    handleCancel,
  } = useArenaVoting(battleId, { autoMarkViewed: open });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [continueMessage, setContinueMessage] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    onClose?.();
  }, [onOpenChange, onClose]);

  const handleContinueTurn = useCallback(async () => {
    if (!onContinueTurn || !continueMessage.trim()) return;
    setIsContinuing(true);
    try {
      await onContinueTurn(battleId, continueMessage);
      setContinueMessage('');
    } finally {
      setIsContinuing(false);
    }
  }, [battleId, continueMessage, onContinueTurn]);

  // UX-4: Randomize contestant display order in blind mode to eliminate positional bias
  // Uses a simple hash of battleId for deterministic per-battle shuffle
  const displayContestants = useMemo(() => {
    if (!battle || battle.mode !== 'blind' || battle.contestants.length < 2) {
      return battle?.contestants ?? [];
    }
    // Simple hash: sum of char codes modulo 2
    const hash = battleId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const shouldSwap = hash % 2 === 1;
    if (shouldSwap) {
      return [...battle.contestants].reverse();
    }
    return battle.contestants;
  }, [battle, battleId]);

  // UX-1: Keyboard shortcuts for voting
  useEffect(() => {
    if (!open || !battle) return;

    const isBattleReady = battle.contestants.every(
      (c) => c.status === 'completed' || c.status === 'error' || c.status === 'cancelled'
    );
    const hasResult = !!battle.winnerId || !!battle.isTie || !!battle.isBothBad;

    if (!isBattleReady || hasResult) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '1':
        case 'a':
          if (displayContestants[0]) {
            handleVote(displayContestants[0].id);
          }
          break;
        case '2':
        case 'b':
          if (displayContestants[1]) {
            handleVote(displayContestants[1].id);
          }
          break;
        case 't':
          handleDeclareTie();
          break;
        case 'escape':
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, battle, displayContestants, handleVote, handleDeclareTie, handleClose]);

  if (!battle) {
    return null;
  }

  const isMultiTurn = battle.conversationMode === 'multi';
  const canContinueBattle =
    canContinue && isMultiTurn && allDone && !battle.winnerId && !battle.isTie;

  const isBlindMode =
    battle.mode === 'blind' && !battle.winnerId && !battle.isTie && !battle.isBothBad;
  const isBattleComplete = !!battle.winnerId || !!battle.isTie || !!battle.isBothBad;

  // Convert contestants to ArenaModelConfig for QuickVoteBar (must be after isBlindMode)
  const modelsForVoteBar: ArenaModelConfig[] = displayContestants.map((c, index) => ({
    id: c.id,
    provider: c.provider,
    model: c.model,
    displayName: isBlindMode ? `${t('model')} ${String.fromCharCode(65 + index)}` : c.displayName,
    columnIndex: index,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 overflow-hidden',
          isFullscreen
            ? 'max-w-[100vw] max-h-[100vh] w-screen h-screen rounded-none'
            : 'max-w-[90vw] max-h-[85vh] w-[1200px]'
        )}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            <DialogTitle>{t('battleInProgress')}</DialogTitle>
            <DialogDescription className="sr-only">
              Compare AI model responses side by side
            </DialogDescription>
            <Badge variant="secondary" className="text-xs">
              {battle.contestants.length} {t('models')}
            </Badge>
            {isMultiTurn && (
              <Badge variant="outline" className="text-xs gap-1">
                <MessageSquare className="h-3 w-3" />
                {t('turn')} {battle.currentTurn || 1}/{battle.maxTurns || 5}
              </Badge>
            )}
            {battle.winnerId && (
              <Badge className="text-xs bg-primary">
                <Trophy className="h-3 w-3 mr-1" />
                {t('winnerSelected')}
              </Badge>
            )}
            {battle.isTie && (
              <Badge variant="outline" className="text-xs">
                {t('tie')}
              </Badge>
            )}
            {battle.isBothBad && (
              <Badge variant="destructive" className="text-xs">
                {t('bothBad')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              </TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Prompt preview */}
        <div className="px-4 py-2 bg-muted/30 border-b">
          <p className="text-xs text-muted-foreground mb-1">{t('prompt')}:</p>
          <p className="text-sm line-clamp-2">{battle.prompt}</p>
        </div>

        {/* Comparison grid */}
        <div
          className={cn(
            'flex-1 p-4 overflow-hidden',
            isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[calc(85vh-240px)]'
          )}
        >
          <div
            className="grid gap-4 h-full"
            style={{
              gridTemplateColumns: `repeat(${Math.min(displayContestants.length, 4)}, minmax(0, 1fr))`,
            }}
          >
            {displayContestants.map((contestant, index) => (
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
              />
            ))}
          </div>
        </div>

        {/* Diff view - shown after battle completion when toggled */}
        {isBattleComplete && showDiffView && battle.contestants.length >= 2 && (
          <div className="px-4 py-3 border-t">
            <ArenaDiffView
              responseA={battle.contestants[0].response}
              responseB={battle.contestants[1].response}
              labelA={isBlindMode && !isRevealing
                ? `${t('model')} A`
                : battle.contestants[0].displayName}
              labelB={isBlindMode && !isRevealing
                ? `${t('model')} B`
                : battle.contestants[1].displayName}
            />
          </div>
        )}

        {/* Unified Vote Bar - shown when all models are done and no winner yet */}
        {allDone && !isBattleComplete && (
          <QuickVoteBar
            models={modelsForVoteBar}
            onVote={handleVote}
            onTie={handleDeclareTie}
            onBothBad={handleDeclareBothBad}
            className="border-t"
          />
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30 space-y-3">
          {/* Multi-turn continuation UI */}
          {canContinueBattle && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={t('continueConversation')}
                value={continueMessage}
                onChange={(e) => setContinueMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinueTurn()}
                disabled={isContinuing}
                className="flex-1 h-8"
              />
              <Button
                size="sm"
                onClick={handleContinueTurn}
                disabled={isContinuing || !continueMessage.trim()}
              >
                {isContinuing ? (
                  <RotateCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {t('turn')} {battle.currentTurn || 1}/{battle.maxTurns || 5}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('winReason')}:</span>
                <Select
                  value={selectedReason}
                  onValueChange={(v) => setSelectedReason(v as ArenaWinReason)}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WIN_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {t(`reasons.${reason}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isMultiTurn && (
                <Badge variant="secondary" className="text-[10px]">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {t('multiTurn')}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Diff toggle button after voting */}
              {isBattleComplete && battle.contestants.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiffView(!showDiffView)}
                  className="gap-1.5"
                >
                  <Diff className="h-3 w-3" />
                  {showDiffView ? t('hideDiff', { fallback: 'Hide Diff' }) : t('showDiff', { fallback: 'Compare' })}
                </Button>
              )}
              {/* Model reveal info after voting */}
              {isBattleComplete && isRevealing && battle.mode === 'blind' && (
                <span className="text-xs text-muted-foreground animate-in fade-in duration-500">
                  {t('modelsRevealed')}
                </span>
              )}
              <Button size="sm" onClick={handleClose}>
                {isBattleComplete ? t('done') : t('close')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const ArenaBattleView = memo(ArenaBattleViewComponent);
export default ArenaBattleView;
