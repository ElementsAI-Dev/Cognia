'use client';

/**
 * QuickVoteBar - Quick voting bar for multi-model comparison
 * Displayed after all models complete their responses
 */

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

interface QuickVoteBarProps {
  models: ArenaModelConfig[];
  onVote: (modelId: string) => void;
  onTie: () => void;
  disabled?: boolean;
  className?: string;
}

const MODEL_COLORS: Record<number, string> = {
  0: 'hover:bg-blue-500/10 hover:border-blue-500/50',
  1: 'hover:bg-orange-500/10 hover:border-orange-500/50',
  2: 'hover:bg-green-500/10 hover:border-green-500/50',
  3: 'hover:bg-purple-500/10 hover:border-purple-500/50',
};

export const QuickVoteBar = memo(function QuickVoteBar({
  models,
  onVote,
  onTie,
  disabled = false,
  className,
}: QuickVoteBarProps) {
  const t = useTranslations('arena');

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 px-4 py-3 border-t bg-muted/30',
        className
      )}
    >
      <span className="text-sm text-muted-foreground mr-2">
        {t('selectWinner')}:
      </span>

      {models.map((model, index) => (
        <Button
          key={model.id}
          variant="outline"
          size="sm"
          className={cn('gap-1.5 transition-colors', MODEL_COLORS[index])}
          onClick={() => onVote(model.id)}
          disabled={disabled}
        >
          <span className="font-mono text-xs opacity-60">
            {String.fromCharCode(65 + model.columnIndex)}
          </span>
          <Trophy className="h-3.5 w-3.5" />
          {model.displayName}
        </Button>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={onTie}
        disabled={disabled}
      >
        <Scale className="h-3.5 w-3.5" />
        {t('tie')}
      </Button>
    </div>
  );
});

export default QuickVoteBar;
