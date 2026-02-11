'use client';

/**
 * ArenaContestantCard - Shared contestant card for arena battle views
 * Used by both ArenaBattleView (dialog) and ArenaInlineBattle (inline)
 */

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/chat/utils';
import type { ArenaContestant } from '@/types/arena';

interface ArenaContestantCardProps {
  contestant: ArenaContestant;
  index: number;
  isWinner: boolean;
  blindMode: boolean;
  isRevealed: boolean;
  onCopy: () => void;
  onCancel?: () => void;
  isCopying: boolean;
  /** 'dialog' for full battle view, 'inline' for embedded chat view */
  variant?: 'dialog' | 'inline';
}

export function ArenaContestantCard({
  contestant,
  index,
  isWinner,
  blindMode,
  isRevealed,
  onCopy,
  onCancel,
  isCopying,
  variant = 'dialog',
}: ArenaContestantCardProps) {
  const t = useTranslations('arena');

  const isInline = variant === 'inline';
  const isStreaming = contestant.status === 'streaming';
  const isCompleted = contestant.status === 'completed';
  const isError = contestant.status === 'error';

  const badgeSizeClass = isInline ? 'text-[10px]' : '';

  const getStatusBadge = () => {
    if (isStreaming) {
      return (
        <Badge variant="outline" className={cn('gap-1 text-blue-600 border-blue-300', badgeSizeClass)}>
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('streaming')}
        </Badge>
      );
    }
    if (isError) {
      return (
        <Badge variant="destructive" className={cn('gap-1', badgeSizeClass)}>
          {t('error')}
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge variant="outline" className={cn('gap-1 text-green-600 border-green-300', badgeSizeClass)}>
          <Check className="h-3 w-3" />
          {t('completed')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', badgeSizeClass)}>
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
        <div className={cn('flex items-center gap-2', isInline && 'min-w-0')}>
          <Badge variant="outline" className={cn('text-xs font-mono', isInline && 'shrink-0')}>
            {String.fromCharCode(65 + index)}
          </Badge>
          {blindMode && !isRevealed ? (
            <span className={cn('text-xs text-muted-foreground italic', isInline && 'truncate')}>
              {t('model')} {String.fromCharCode(65 + index)}
            </span>
          ) : (
            <span
              className={cn(
                'text-xs text-muted-foreground',
                isInline && 'truncate',
                isRevealed && 'animate-in fade-in slide-in-from-left-2 duration-500'
              )}
            >
              {contestant.displayName}
            </span>
          )}
          {isWinner && (
            <Badge className={cn('text-[10px] gap-1 bg-primary animate-in zoom-in duration-300', isInline && 'shrink-0')}>
              <Trophy className="h-2.5 w-2.5" />
              {t('winner')}
            </Badge>
          )}
        </div>
        <div className={cn('flex items-center gap-1', isInline && 'shrink-0')}>
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

      <CardContent className={cn('flex-1 p-0', isInline && 'min-h-0')}>
        <ScrollArea className="h-full p-3">
          {isError ? (
            <p className="text-sm text-destructive">{contestant.error}</p>
          ) : contestant.response ? (
            <MarkdownRenderer content={contestant.response} />
          ) : isInline ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('waiting')}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t('waiting')}</p>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className={cn(
        'flex items-center justify-between px-3 border-t bg-muted/30',
        isInline ? 'py-1.5' : 'py-2'
      )}>
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
