'use client';

/**
 * ArenaBattleView - Live battle comparison view
 * Displays streaming responses from multiple models side-by-side
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Trophy,
  Clock,
  Coins,
  Hash,
  Copy,
  Check,
  Scale,
  Maximize2,
  Minimize2,
  Loader2,
  Ban,
  MessageSquare,
  Send,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCopy } from '@/hooks/ui';
import { useArena } from '@/hooks/arena';
import { useArenaStore } from '@/stores/arena';
import { MarkdownRenderer } from '@/components/chat/utils';
import { QuickVoteBar } from '@/components/chat/ui/quick-vote-bar';
import type { ArenaContestant, ArenaWinReason } from '@/types/arena';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

interface ArenaBattleViewProps {
  battleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  onContinueTurn?: (battleId: string, message: string) => Promise<void>;
  canContinue?: boolean;
}

const WIN_REASONS: ArenaWinReason[] = [
  'quality',
  'accuracy',
  'clarity',
  'speed',
  'completeness',
  'creativity',
  'conciseness',
  'other',
];

function ContestantCard({
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

  // Get status badge
  const getStatusBadge = () => {
    if (isStreaming) {
      return (
        <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('streaming')}
        </Badge>
      );
    }
    if (isError) {
      return (
        <Badge variant="destructive" className="gap-1">
          {t('error')}
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
          <Check className="h-3 w-3" />
          {t('completed')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t('pending')}
      </Badge>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-lg overflow-hidden transition-all',
        isWinner && 'ring-2 ring-primary border-primary',
        isError && 'border-destructive/50'
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {String.fromCharCode(65 + index)}
          </Badge>
          {/* Model name with reveal animation */}
          {blindMode && !isRevealed ? (
            <span className="text-xs text-muted-foreground italic">
              {t('model')} {String.fromCharCode(65 + index)}
            </span>
          ) : (
            <span
              className={cn(
                'text-xs text-muted-foreground',
                isRevealed && 'animate-in fade-in slide-in-from-left-2 duration-500'
              )}
            >
              {contestant.displayName}
            </span>
          )}
          {isWinner && (
            <Badge className="text-[10px] gap-1 bg-primary animate-in zoom-in duration-300">
              <Trophy className="h-2.5 w-2.5" />
              {t('winner')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
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
                {isCopying ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copy')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-3">
        {isError ? (
          <p className="text-sm text-destructive">{contestant.error}</p>
        ) : contestant.response ? (
          <MarkdownRenderer content={contestant.response} />
        ) : (
          <p className="text-sm text-muted-foreground italic">{t('waiting')}</p>
        )}
      </ScrollArea>

      {/* Stats footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
        {/* Stats */}
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
              <Coins className="h-3 w-3" />
              ${contestant.estimatedCost.toFixed(4)}
            </div>
          )}
        </div>

        {/* Winner indicator (voting moved to unified bar) */}
        {isWinner && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Trophy className="h-2.5 w-2.5" />
            {t('selected')}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ArenaBattleViewComponent({
  battleId,
  open,
  onOpenChange,
  onClose,
  onContinueTurn,
  canContinue = false,
}: ArenaBattleViewProps) {
  const t = useTranslations('arena');
  const tToasts = useTranslations('toasts');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('messageCopied') });
  const { cancelBattle } = useArena();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ArenaWinReason>('quality');
  const [continueMessage, setContinueMessage] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);

  const battle = useArenaStore((state) => state.battles.find((b) => b.id === battleId));
  const selectWinner = useArenaStore((state) => state.selectWinner);
  const declareTie = useArenaStore((state) => state.declareTie);
  const declareBothBad = useArenaStore((state) => state.declareBothBad);
  const canVote = useArenaStore((state) => state.canVote);
  const markBattleViewed = useArenaStore((state) => state.markBattleViewed);

  // Track if reveal animation should be shown
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (open) {
      markBattleViewed(battleId);
    }
  }, [battleId, markBattleViewed, open]);

  // Check if all contestants are done
  const allDone = battle?.contestants.every(
    (c) => c.status === 'completed' || c.status === 'error' || c.status === 'cancelled'
  );

  const ensureVoteAllowed = useCallback(() => {
    const result = canVote(battleId);
    if (!result.allowed) {
      const message = result.reason === 'min-viewing-time'
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
      selectWinner(battleId, contestantId, { reason: selectedReason });
    },
    [battleId, ensureVoteAllowed, selectWinner, selectedReason]
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

  if (!battle) {
    return null;
  }

  const isMultiTurn = battle.conversationMode === 'multi';
  const canContinueBattle = canContinue && isMultiTurn && allDone && !battle.winnerId && !battle.isTie;

  const isBlindMode = battle.mode === 'blind' && !battle.winnerId && !battle.isTie && !battle.isBothBad;
  const isBattleComplete = !!battle.winnerId || !!battle.isTie || !!battle.isBothBad;

  // Convert contestants to ArenaModelConfig for QuickVoteBar (must be after isBlindMode)
  const modelsForVoteBar: ArenaModelConfig[] = battle.contestants.map((c, index) => ({
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
              gridTemplateColumns: `repeat(${Math.min(battle.contestants.length, 4)}, 1fr)`,
            }}
          >
            {battle.contestants.map((contestant, index) => (
              <ContestantCard
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
