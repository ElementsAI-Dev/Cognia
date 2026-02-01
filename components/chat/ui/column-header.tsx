'use client';

/**
 * ColumnHeader - Header for a model column in multi-model chat
 * Shows model name, status, and performance metrics
 */

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Hash, Coins, Loader2, Check, AlertCircle, X, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ArenaModelConfig, ColumnMessageState } from '@/types/chat/multi-model';

interface ColumnHeaderProps {
  model: ArenaModelConfig;
  state?: ColumnMessageState;
  isWinner?: boolean;
  onRemove?: () => void;
  showMetrics?: boolean;
  compact?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'border-green-500/50',
  anthropic: 'border-orange-500/50',
  google: 'border-blue-500/50',
  deepseek: 'border-purple-500/50',
  groq: 'border-yellow-500/50',
  mistral: 'border-red-500/50',
  xai: 'border-cyan-500/50',
};

export const ColumnHeader = memo(function ColumnHeader({
  model,
  state,
  isWinner = false,
  onRemove,
  showMetrics = true,
  compact = false,
}: ColumnHeaderProps) {
  const t = useTranslations('arena');
  const status = state?.status || 'pending';
  const borderColor = PROVIDER_COLORS[model.provider] || 'border-gray-500/50';

  const renderStatusIndicator = () => {
    switch (status) {
      case 'streaming':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span><Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /></span>
            </TooltipTrigger>
            <TooltipContent>{t('statusStreaming')}</TooltipContent>
          </Tooltip>
        );
      case 'completed':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span><Check className="h-3.5 w-3.5 text-green-500" /></span>
            </TooltipTrigger>
            <TooltipContent>{t('statusCompleted')}</TooltipContent>
          </Tooltip>
        );
      case 'error':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span><AlertCircle className="h-3.5 w-3.5 text-destructive" /></span>
            </TooltipTrigger>
            <TooltipContent>{state?.error || t('statusError')}</TooltipContent>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 border-b bg-muted/50',
        isWinner && 'bg-primary/10 border-primary',
        !isWinner && `border-l-2 ${borderColor}`
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Column letter badge */}
        <Badge variant="outline" className="text-xs font-mono shrink-0">
          {String.fromCharCode(65 + model.columnIndex)}
        </Badge>

        {/* Model name */}
        <span className={cn('font-medium truncate', compact ? 'text-xs' : 'text-sm')}>
          {model.displayName}
        </span>

        {/* Winner badge */}
        {isWinner && (
          <Badge className="text-[10px] bg-primary gap-1 shrink-0">
            <Trophy className="h-2.5 w-2.5" />
            Winner
          </Badge>
        )}

        {/* Status indicator */}
        {renderStatusIndicator()}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Performance metrics */}
        {showMetrics && state?.metrics && status === 'completed' && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {state.metrics.latencyMs > 0 && (
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {(state.metrics.latencyMs / 1000).toFixed(1)}s
                </TooltipTrigger>
                <TooltipContent>Response time</TooltipContent>
              </Tooltip>
            )}
            {state.metrics.tokenCount.total > 0 && (
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-0.5">
                  <Hash className="h-3 w-3" />
                  {state.metrics.tokenCount.total}
                </TooltipTrigger>
                <TooltipContent>
                  {state.metrics.tokenCount.input} in / {state.metrics.tokenCount.output} out
                </TooltipContent>
              </Tooltip>
            )}
            {state.metrics.estimatedCost !== undefined && state.metrics.estimatedCost > 0 && (
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-0.5">
                  <Coins className="h-3 w-3" />
                  ${state.metrics.estimatedCost.toFixed(4)}
                </TooltipTrigger>
                <TooltipContent>Estimated cost</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Remove button */}
        {onRemove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove model</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

export default ColumnHeader;
