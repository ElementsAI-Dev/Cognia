'use client';

/**
 * Efficiency Metrics Card
 *
 * Displays cost efficiency metrics with visual indicators.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gauge, TrendingDown, Sparkles, AlertTriangle, CheckCircle2, Coins } from 'lucide-react';
import { formatTokens, formatCost } from '@/lib/observability';
import { cn } from '@/lib/utils';
import type { CostEfficiencyMetrics } from '@/lib/ai/usage-analytics';

interface EfficiencyMetricsCardProps {
  metrics: CostEfficiencyMetrics;
  className?: string;
  showRecommendation?: boolean;
}

export function EfficiencyMetricsCard({
  metrics,
  className,
  showRecommendation = true,
}: EfficiencyMetricsCardProps) {
  const t = useTranslations('observability.efficiency');

  const efficiencyScore = useMemo(() => {
    // Calculate overall efficiency score (0-100)
    // Lower cost per K token = higher score
    const costScore = Math.max(0, 100 - metrics.costPerKToken * 1000);
    return Math.min(100, costScore);
  }, [metrics]);

  const getEfficiencyLabel = (score: number) => {
    if (score >= 80)
      return {
        label: t('excellent') || 'Excellent',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      };
    if (score >= 60)
      return { label: t('good') || 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 40)
      return {
        label: t('moderate') || 'Moderate',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
      };
    return {
      label: t('needsImprovement') || 'Needs Improvement',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  };

  const efficiencyInfo = getEfficiencyLabel(efficiencyScore);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            {t('title') || 'Cost Efficiency'}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn('text-xs', efficiencyInfo.color, efficiencyInfo.bgColor)}
          >
            {efficiencyInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Efficiency Score Gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('efficiencyScore') || 'Efficiency Score'}
            </span>
            <span className={cn('font-bold', efficiencyInfo.color)}>
              {efficiencyScore.toFixed(0)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={efficiencyScore} className="h-2" />
            <div
              className="absolute top-0 h-2 w-0.5 bg-foreground/50"
              style={{ left: '80%' }}
              title="Target: 80%"
            />
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" />
              {t('costPerKToken') || 'Cost / 1K Tokens'}
            </div>
            <div className="font-semibold">{formatCost(metrics.costPerKToken)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              {t('tokensPerDollar') || 'Tokens / $1'}
            </div>
            <div className="font-semibold">{formatTokens(metrics.tokensPerDollar)}</div>
          </div>
        </div>

        {/* Model Comparison */}
        <div className="space-y-2">
          {metrics.mostEfficientModel && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-green-700 dark:text-green-400">
                  {t('mostEfficient') || 'Most Efficient'}
                </div>
                <div className="text-sm font-medium truncate">{metrics.mostEfficientModel}</div>
              </div>
            </div>
          )}
          {metrics.leastEfficientModel &&
            metrics.leastEfficientModel !== metrics.mostEfficientModel && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
                <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-orange-700 dark:text-orange-400">
                    {t('leastEfficient') || 'Least Efficient'}
                  </div>
                  <div className="text-sm font-medium truncate">{metrics.leastEfficientModel}</div>
                </div>
              </div>
            )}
        </div>

        {/* Potential Savings */}
        {showRecommendation && metrics.potentialSavings > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium">
                  {t('potentialSavings') || 'Potential Savings'}
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCost(metrics.potentialSavings)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('savingsHint') || 'By using more cost-effective models for applicable tasks'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
