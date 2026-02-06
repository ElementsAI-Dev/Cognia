'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  AlertCircle,
  Calendar,
  Target,
} from 'lucide-react';
import { ProviderChart, UsageTrendChart } from './charts';
import type { MetricsData, TimeRange } from './observability-dashboard';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';
import { cn } from '@/lib/utils';

interface CostAnalysisProps {
  metrics: MetricsData | null;
  timeRange: TimeRange;
  timeSeries?: TimeSeriesDataPoint[];
}

export function CostAnalysis({ metrics, timeRange, timeSeries = [] }: CostAnalysisProps) {
  const t = useTranslations('observability.costAnalysis');
  const tTime = useTranslations('observability.timeRange');

  // Convert metrics data to chart-compatible format
  const providerCostData = Object.entries(metrics?.costByProvider || {}).map(
    ([provider, cost]) => ({
      provider,
      requests: metrics?.requestsByProvider?.[provider] || 0,
      tokens: metrics?.tokensByProvider?.[provider] || 0,
      cost,
      percentage: metrics?.totalCost ? (cost / metrics.totalCost) * 100 : 0,
    })
  );

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case '1h':
        return tTime('lastHour');
      case '24h':
        return tTime('last24Hours');
      case '7d':
        return tTime('last7Days');
      case '30d':
        return tTime('last30Days');
    }
  };

  const costPerRequest = metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0;

  const costPerToken = metrics.totalTokens > 0 ? metrics.totalCost / metrics.totalTokens : 0;

  const totalProviderCost = Object.values(metrics.costByProvider).reduce((a, b) => a + b, 0);

  // Calculate cost trend from time series
  const costTrend = (() => {
    if (timeSeries.length < 2) return 0;
    const mid = Math.floor(timeSeries.length / 2);
    const firstHalf = timeSeries.slice(0, mid);
    const secondHalf = timeSeries.slice(mid);
    const firstAvg = firstHalf.reduce((sum, p) => sum + p.cost, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.cost, 0) / secondHalf.length;
    return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('title')}</h3>
        <span className="text-sm text-muted-foreground">{getTimeRangeLabel(timeRange)}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('totalCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('costPerRequest')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costPerRequest.toFixed(6)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t('costPer1kTokens')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(costPerToken * 1000).toFixed(4)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t('projectedMonthly')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(metrics.totalCost * getMultiplier(timeRange)).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {timeSeries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UsageTrendChart data={timeSeries} showTokens={false} height={220} />
          {providerCostData.length > 0 && (
            <ProviderChart data={providerCostData} dataKey="cost" height={220} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost by Provider with Progress Bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('costByProvider')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-4">
                {Object.entries(metrics.costByProvider).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noData')}</p>
                ) : (
                  Object.entries(metrics.costByProvider)
                    .sort((a, b) => b[1] - a[1])
                    .map(([provider, cost]) => {
                      const percentage =
                        totalProviderCost > 0 ? (cost / totalProviderCost) * 100 : 0;
                      return (
                        <div key={provider} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize text-xs">
                                {provider}
                              </Badge>
                            </div>
                            <span className="font-medium text-sm">${cost.toFixed(4)}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {t('percentOfTotal', { percent: percentage.toFixed(1) })}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Cost Breakdown Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('costBreakdown')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('costSummaryDesc') || 'Summary of costs for the selected period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main cost display */}
              <div
                className={cn(
                  'p-4 rounded-lg border-2 text-center',
                  metrics.totalCost > 1
                    ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'
                    : 'border-green-200 bg-green-50 dark:bg-green-950/20'
                )}
              >
                <div className="text-3xl font-bold">${metrics.totalCost.toFixed(4)}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  {costTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : costTrend < 0 ? (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  ) : null}
                  {t('apiCosts')}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">
                    {metrics.totalRequests.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('totalRequests')}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">
                    {metrics.totalTokens >= 1000
                      ? `${(metrics.totalTokens / 1000).toFixed(1)}K`
                      : metrics.totalTokens}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('totalTokens')}</div>
                </div>
              </div>

              {/* Efficiency metric */}
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('avgTokensPerRequest')}</span>
                  <span className="font-medium">
                    {metrics.totalRequests > 0
                      ? Math.round(metrics.totalTokens / metrics.totalRequests).toLocaleString()
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getMultiplier(timeRange: TimeRange): number {
  switch (timeRange) {
    case '1h':
      return 24 * 30; // 1 hour to 1 month
    case '24h':
      return 30; // 1 day to 1 month
    case '7d':
      return 4.3; // 1 week to 1 month
    case '30d':
      return 1; // Already 1 month
    default:
      return 1;
  }
}
