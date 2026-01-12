'use client';

/**
 * Token Budget Indicator Component
 * 
 * A visual indicator for displaying token budget status and warnings
 * Integrates with useTokenBudget hook for real-time monitoring
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Zap, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useTokenBudget,
  useTokenCost,
  formatTokenCount,
  type TokenBudgetStatus,
} from '@/hooks/chat/use-token-count';
import type { UIMessage } from '@/types';

export interface TokenBudgetIndicatorProps {
  messages: UIMessage[];
  model: string;
  systemPrompt?: string;
  additionalContext?: string;
  customLimit?: number;
  showCost?: boolean;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-500',
    progressColor: '[&>div]:bg-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    progressColor: '[&>div]:bg-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  danger: {
    icon: AlertCircle,
    color: 'text-orange-500',
    progressColor: '[&>div]:bg-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  exceeded: {
    icon: XCircle,
    color: 'text-red-500',
    progressColor: '[&>div]:bg-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
};

/**
 * Compact token budget badge for inline display
 */
export function TokenBudgetBadge({
  messages,
  model,
  systemPrompt,
  className,
}: {
  messages: UIMessage[];
  model: string;
  systemPrompt?: string;
  className?: string;
}) {
  const budget = useTokenBudget(messages, model, { systemPrompt });
  const config = STATUS_CONFIG[budget.status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 cursor-default',
              config.bgColor,
              config.borderColor,
              className
            )}
          >
            <Icon className={cn('h-3 w-3', config.color)} />
            <span className="text-xs">
              {formatTokenCount(budget.usedTokens)} / {formatTokenCount(budget.maxTokens)}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">{budget.percentUsed.toFixed(1)}% used</p>
            <p className="text-muted-foreground">
              {formatTokenCount(budget.remainingTokens)} tokens remaining
            </p>
            {budget.warningMessage && (
              <p className={cn('mt-1', config.color)}>{budget.warningMessage}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Full token budget indicator with progress bar
 */
export function TokenBudgetIndicator({
  messages,
  model,
  systemPrompt,
  additionalContext,
  customLimit,
  showCost = false,
  compact = false,
  className,
}: TokenBudgetIndicatorProps) {
  const t = useTranslations('chat');
  
  const budget = useTokenBudget(messages, model, {
    systemPrompt,
    additionalContext,
    customLimit,
  });
  
  const cost = useTokenCost(model, budget.usedTokens, 0);
  const config = STATUS_CONFIG[budget.status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Icon className={cn('h-4 w-4', config.color)} />
        <Progress
          value={budget.percentUsed}
          className={cn('h-1.5 w-20', config.progressColor)}
        />
        <span className="text-xs text-muted-foreground">
          {budget.percentUsed.toFixed(0)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('tokenBudget') || 'Token Budget'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className={cn('text-xs font-medium', config.color)}>
            {budget.percentUsed.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <Progress
        value={budget.percentUsed}
        className={cn('h-2', config.progressColor)}
      />

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatTokenCount(budget.usedTokens)} / {formatTokenCount(budget.maxTokens)}
        </span>
        <span className="text-muted-foreground">
          {formatTokenCount(budget.remainingTokens)} {t('remaining') || 'remaining'}
        </span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <p className="text-muted-foreground">{t('system') || 'System'}</p>
          <p className="font-medium">{formatTokenCount(budget.breakdown.systemTokens)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">{t('user') || 'User'}</p>
          <p className="font-medium">{formatTokenCount(budget.breakdown.userTokens)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">{t('assistant') || 'Assistant'}</p>
          <p className="font-medium">{formatTokenCount(budget.breakdown.assistantTokens)}</p>
        </div>
      </div>

      {/* Cost (optional) */}
      {showCost && (
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t('estimatedCost') || 'Est. Cost'}
          </span>
          <span className="text-xs font-medium">{cost.formattedCost}</span>
        </div>
      )}

      {/* Warning message */}
      {budget.warningMessage && (
        <p className={cn('text-xs', config.color)}>{budget.warningMessage}</p>
      )}
    </div>
  );
}

/**
 * Minimal inline token indicator
 */
export function TokenIndicatorInline({
  usedTokens,
  maxTokens,
  className,
}: {
  usedTokens: number;
  maxTokens: number;
  className?: string;
}) {
  const percentUsed = Math.min(100, (usedTokens / maxTokens) * 100);
  
  const status = useMemo((): TokenBudgetStatus['status'] => {
    if (percentUsed >= 100) return 'exceeded';
    if (percentUsed >= 90) return 'danger';
    if (percentUsed >= 75) return 'warning';
    return 'healthy';
  }, [percentUsed]);

  const config = STATUS_CONFIG[status];

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <span className={cn('font-medium', config.color)}>
        {formatTokenCount(usedTokens)}
      </span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground">
        {formatTokenCount(maxTokens)}
      </span>
    </span>
  );
}

export default TokenBudgetIndicator;
