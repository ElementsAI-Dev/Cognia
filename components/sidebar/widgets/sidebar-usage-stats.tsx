'use client';

/**
 * SidebarUsageStats - Token usage statistics widget for sidebar
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Coins, ChevronDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUsageStore } from '@/stores';
import { cn } from '@/lib/utils';
import { normalizeTokenUsage } from '@/types/system/usage';
import { useCurrencyFormat } from '@/hooks/ui/use-currency-format';

interface SidebarUsageStatsProps {
  className?: string;
  collapsed?: boolean;
}

export function SidebarUsageStats({ className, collapsed }: SidebarUsageStatsProps) {
  const t = useTranslations('sidebar');
  const [isOpen, setIsOpen] = useState(false);

  const getDailyUsage = useUsageStore((state) => state.getDailyUsage);
  const records = useUsageStore((state) => state.records);
  const quotaLimits = useUsageStore((state) => state.quotaLimits);

  const dailyUsage = useMemo(() => getDailyUsage(1), [getDailyUsage]);
  const todayUsage = dailyUsage[dailyUsage.length - 1] || { tokens: 0, cost: 0, requests: 0 };

  // Calculate detailed split for today
  const usageDetails = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter((r) => {
      const date = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
      return date.toISOString().split('T')[0] === todayStr;
    });

    return todayRecords.reduce(
      (acc, r) => {
        const tokens = normalizeTokenUsage(r.tokens);
        return {
          prompt: acc.prompt + tokens.prompt,
          completion: acc.completion + tokens.completion,
        };
      },
      { prompt: 0, completion: 0 }
    );
  }, [records]);

  // Format numbers for display
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const { formatCost } = useCurrencyFormat();

  // Calculate usage percentage using configured limit or default 1M tokens
  const configuredLimit = quotaLimits['default']?.maxTokensPerDay;
  const dailyLimit = configuredLimit || 1000000;
  const usagePercent = Math.min((todayUsage.tokens / dailyLimit) * 100, 100);

  // If sidebar is collapsed (icon only mode)
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
              {t('todayTokens', { count: formatTokens(todayUsage.tokens) }) ||
                `Today: ${formatTokens(todayUsage.tokens)} tokens`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Sidebar Expanded: Collapsible Widget
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'group-stats rounded-lg border border-border/50 bg-card/30',
        'hover:bg-accent/30 transition-colors',
        className
      )}
    >
      {/* Header / Summary View */}
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 cursor-pointer w-full select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Coins className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-xs font-medium text-foreground">
                {t('usageStats') || 'Usage Stats'}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {formatTokens(todayUsage.tokens)} tokens today
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
              isOpen ? 'rotate-180' : ''
            )}
          />
        </div>
      </CollapsibleTrigger>

      {/* Progress Bar (Visible always within the container context, effectively part of the trigger if we wanted, 
          but here putting it in content or just below header?
          Let's put the progress bar inside the collapsible content OR just below the header but always visible?
          User said "Usage should also support folding". 
          Let's put the simple progress bar in the main view if closed, or just keep it simple.
          Actually, let's include the progress bar in the detailed view to keep the closed state minimal as requested.
      */}

      <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{t('dailyLimit') || 'Daily Limit'}</span>
              <span>{Math.round(usagePercent)}%</span>
            </div>
            <Progress value={usagePercent} className="h-1.5" />
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="space-y-0.5 p-2 rounded bg-muted/30">
              <span className="text-muted-foreground block">{t('inputTokens') || 'Input'}</span>
              <span className="font-medium font-mono text-foreground">
                {formatTokens(usageDetails.prompt)}
              </span>
            </div>
            <div className="space-y-0.5 p-2 rounded bg-muted/30">
              <span className="text-muted-foreground block">{t('outputTokens') || 'Output'}</span>
              <span className="font-medium font-mono text-foreground">
                {formatTokens(usageDetails.completion)}
              </span>
            </div>
            <div className="space-y-0.5 p-2 rounded bg-muted/30">
              <span className="text-muted-foreground block">{t('cost') || 'Cost'}</span>
              <span className="font-medium font-mono text-foreground">
                {formatCost(todayUsage.cost)}
              </span>
            </div>
            <div className="space-y-0.5 p-2 rounded bg-muted/30">
              <span className="text-muted-foreground block">{t('requests') || 'Requests'}</span>
              <span className="font-medium font-mono text-foreground">{todayUsage.requests}</span>
            </div>
          </div>

          <Link
            href="/settings?tab=data"
            className="block w-full py-1.5 text-center text-[10px] font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 rounded hover:bg-primary/10"
          >
            {t('viewFullReport') || 'View Full Report'}
          </Link>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default SidebarUsageStats;
