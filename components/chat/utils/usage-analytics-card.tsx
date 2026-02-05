'use client';

/**
 * Usage Analytics Card Component
 * 
 * A card component for displaying usage analytics summary
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  DollarSign,
  BarChart3,
  Clock,
  Lightbulb,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUsageAnalytics, useUsageSummary } from '@/hooks/chat/use-usage-analytics';
import { formatCost, formatTokens } from '@/lib/ai/usage-analytics';
import type { AnalyticsPeriod } from '@/lib/ai/usage-analytics';

export interface UsageAnalyticsCardProps {
  period?: AnalyticsPeriod;
  showRecommendations?: boolean;
  showBreakdown?: boolean;
  compact?: boolean;
  className?: string;
}

const TrendIcon = ({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) => {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    case 'decreasing':
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

/**
 * Compact usage summary badge
 */
export function UsageSummaryBadge({ className }: { className?: string }) {
  const { totalTokens, totalCost, trend } = useUsageSummary();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="outline" className="gap-1">
        <Zap className="h-3 w-3" />
        {formatTokens(totalTokens)}
      </Badge>
      <Badge variant="outline" className="gap-1">
        <DollarSign className="h-3 w-3" />
        {formatCost(totalCost)}
      </Badge>
      <TrendIcon trend={trend} />
    </div>
  );
}

/**
 * Model usage breakdown item
 */
function ModelUsageItem({
  model,
  tokens,
  cost,
  percentage,
}: {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate max-w-[120px]">{model}</span>
        <span className="text-muted-foreground">{formatTokens(tokens)}</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percentage.toFixed(1)}%</span>
        <span>{formatCost(cost)}</span>
      </div>
    </div>
  );
}

/**
 * Model breakdown section with expandable list
 */
function ModelBreakdownSection({
  modelBreakdown,
  t,
}: {
  modelBreakdown: Array<{ model: string; tokens: number; cost: number; percentage: number }>;
  t: (key: string) => string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = modelBreakdown.length > 3;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="pt-2 border-t space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {t('modelUsage') || 'Model Usage'}
      </h4>
      <div className="space-y-3">
        {modelBreakdown.slice(0, 3).map((model) => (
          <ModelUsageItem key={model.model} {...model} />
        ))}
        {hasMore && (
          <>
            <CollapsibleContent className="space-y-3">
              {modelBreakdown.slice(3).map((model) => (
                <ModelUsageItem key={model.model} {...model} />
              ))}
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{expanded ? (t('showLess') || 'Show less') : (t('viewMore') || 'View more')}</span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    expanded && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </>
        )}
      </div>
    </Collapsible>
  );
}

/**
 * Daily usage comparison
 */
function DailyComparison({
  today,
  yesterday,
}: {
  today: { totalTokens: number; totalCost: number };
  yesterday: { totalTokens: number; totalCost: number };
}) {
  const t = useTranslations('usage');
  
  const tokenChange = yesterday.totalTokens > 0
    ? ((today.totalTokens - yesterday.totalTokens) / yesterday.totalTokens) * 100
    : 0;

  const costChange = yesterday.totalCost > 0
    ? ((today.totalCost - yesterday.totalCost) / yesterday.totalCost) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t('today') || 'Today'}</p>
        <p className="text-lg font-semibold">{formatTokens(today.totalTokens)}</p>
        {tokenChange !== 0 && (
          <p className={cn(
            'text-xs',
            tokenChange > 0 ? 'text-red-500' : 'text-green-500'
          )}>
            {tokenChange > 0 ? '+' : ''}{tokenChange.toFixed(1)}% vs yesterday
          </p>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t('todayCost') || "Today's Cost"}</p>
        <p className="text-lg font-semibold">{formatCost(today.totalCost)}</p>
        {costChange !== 0 && (
          <p className={cn(
            'text-xs',
            costChange > 0 ? 'text-red-500' : 'text-green-500'
          )}>
            {costChange > 0 ? '+' : ''}{costChange.toFixed(1)}% vs yesterday
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Recommendation item
 */
function RecommendationItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * Full usage analytics card
 */
export function UsageAnalyticsCard({
  period = 'week',
  showRecommendations = true,
  showBreakdown = true,
  compact = false,
  className,
}: UsageAnalyticsCardProps) {
  const t = useTranslations('usage');
  
  const {
    statistics,
    modelBreakdown,
    trend,
    efficiency,
    dailySummary,
    recommendations,
  } = useUsageAnalytics({ period });

  const periodLabel = useMemo(() => {
    const labels: Record<AnalyticsPeriod, string> = {
      hour: t('lastHour') || 'Last Hour',
      day: t('last24Hours') || 'Last 24 Hours',
      week: t('last7Days') || 'Last 7 Days',
      month: t('last30Days') || 'Last 30 Days',
      all: t('allTime') || 'All Time',
    };
    return labels[period];
  }, [period, t]);

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{periodLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{formatTokens(statistics.totalTokens)}</p>
                <p className="text-xs text-muted-foreground">{formatCost(statistics.totalCost)}</p>
              </div>
              <TrendIcon trend={trend.trend} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('usageAnalytics') || 'Usage Analytics'}
            </CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon trend={trend.trend} />
            <span className={cn(
              'text-sm font-medium',
              trend.percentChange > 0 ? 'text-red-500' : trend.percentChange < 0 ? 'text-green-500' : 'text-muted-foreground'
            )}>
              {trend.percentChange > 0 ? '+' : ''}{trend.percentChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatTokens(statistics.totalTokens)}</p>
            <p className="text-xs text-muted-foreground">{t('totalTokens') || 'Total Tokens'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatCost(statistics.totalCost)}</p>
            <p className="text-xs text-muted-foreground">{t('totalCost') || 'Total Cost'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{statistics.totalRequests}</p>
            <p className="text-xs text-muted-foreground">{t('requests') || 'Requests'}</p>
          </div>
        </div>

        {/* Daily comparison */}
        <div className="pt-2 border-t">
          <DailyComparison today={dailySummary.today} yesterday={dailySummary.yesterday} />
        </div>

        {/* Model breakdown */}
        {showBreakdown && modelBreakdown.length > 0 && (
          <ModelBreakdownSection
            modelBreakdown={modelBreakdown}
            t={t}
          />
        )}

        {/* Efficiency metrics */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('costPerKToken') || 'Cost per 1K tokens'}</p>
              <p className="font-medium">{formatCost(efficiency.costPerKToken)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('tokensPerDollar') || 'Tokens per $1'}</p>
              <p className="font-medium">{formatTokens(efficiency.tokensPerDollar)}</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              {t('recommendations') || 'Recommendations'}
            </h4>
            <div className="space-y-2">
              {recommendations.slice(0, 2).map((rec, i) => (
                <RecommendationItem key={i} text={rec} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Mini usage stats for sidebar
 */
export function UsageStatsMini({ className }: { className?: string }) {
  const { todayTokens, todayCost, trend, percentChange } = useUsageSummary();

  return (
    <div className={cn('flex items-center justify-between text-sm', className)}>
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span>{formatTokens(todayTokens)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{formatCost(todayCost)}</span>
        <div className="flex items-center gap-0.5">
          <TrendIcon trend={trend} />
          {percentChange !== 0 && (
            <span className={cn(
              'text-xs',
              percentChange > 0 ? 'text-red-500' : 'text-green-500'
            )}>
              {Math.abs(percentChange).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsageAnalyticsCard;
