'use client';

/**
 * SidebarUsageStats - Token usage statistics widget for sidebar
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Coins, TrendingUp, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUsageStore } from '@/stores';
import { cn } from '@/lib/utils';

interface SidebarUsageStatsProps {
  className?: string;
  collapsed?: boolean;
}

export function SidebarUsageStats({ className, collapsed }: SidebarUsageStatsProps) {
  const t = useTranslations('sidebar');
  const getTotalUsage = useUsageStore((state) => state.getTotalUsage);
  const getDailyUsage = useUsageStore((state) => state.getDailyUsage);

  const _totalUsage = useMemo(() => getTotalUsage(), [getTotalUsage]);
  const dailyUsage = useMemo(() => getDailyUsage(1), [getDailyUsage]);

  const todayUsage = dailyUsage[dailyUsage.length - 1] || { tokens: 0, cost: 0, requests: 0 };

  // Format numbers for display
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '< $0.01';
    return `$${cost.toFixed(2)}`;
  };

  // Calculate usage percentage (assume daily limit of 1M tokens)
  const dailyLimit = 1000000;
  const usagePercent = Math.min((todayUsage.tokens / dailyLimit) * 100, 100);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/settings?tab=data"
            className={cn(
              'flex items-center justify-center w-full p-2 rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              'transition-colors',
              className
            )}
          >
            <div className="relative">
              <Coins className="h-4 w-4" />
              {todayUsage.requests > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
              )}
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-sm">
            <p className="font-medium">{t('usageStats') || 'Usage Stats'}</p>
            <p className="text-muted-foreground">
              {t('todayTokens', { count: formatTokens(todayUsage.tokens) }) || `Today: ${formatTokens(todayUsage.tokens)} tokens`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href="/settings?tab=data"
      className={cn(
        'block px-3 py-2 rounded-lg border border-border/50 bg-muted/30',
        'hover:bg-accent/50 hover:border-accent transition-colors group',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium">{t('usageStats') || 'Usage Stats'}</span>
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>

      <div className="space-y-2">
        {/* Today's usage */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('today') || 'Today'}</span>
          <span className="font-medium">{formatTokens(todayUsage.tokens)} tokens</span>
        </div>

        {/* Progress bar */}
        <Progress value={usagePercent} className="h-1.5" />

        {/* Cost and requests */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {todayUsage.requests} {t('requests') || 'requests'}
          </span>
          <span>{formatCost(todayUsage.cost)}</span>
        </div>
      </div>
    </Link>
  );
}

export default SidebarUsageStats;
