'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, TrendingUp, PieChart, AlertCircle } from 'lucide-react';
import { ProviderChart, UsageTrendChart } from './charts';
import type { MetricsData, TimeRange } from './observability-dashboard';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';

interface CostAnalysisProps {
  metrics: MetricsData | null;
  timeRange: TimeRange;
  timeSeries?: TimeSeriesDataPoint[];
}

export function CostAnalysis({ metrics, timeRange, timeSeries = [] }: CostAnalysisProps) {
  const t = useTranslations('observability.costAnalysis');
  const tTime = useTranslations('observability.timeRange');

  // Convert metrics data to chart-compatible format
  const providerCostData = Object.entries(metrics?.costByProvider || {}).map(([provider, cost]) => ({
    provider,
    requests: metrics?.requestsByProvider?.[provider] || 0,
    tokens: metrics?.tokensByProvider?.[provider] || 0,
    cost,
    percentage: metrics?.totalCost ? (cost / metrics.totalCost) * 100 : 0,
  }));

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
      case '1h': return tTime('lastHour');
      case '24h': return tTime('last24Hours');
      case '7d': return tTime('last7Days');
      case '30d': return tTime('last30Days');
    }
  };

  const costPerRequest = metrics.totalRequests > 0 
    ? metrics.totalCost / metrics.totalRequests 
    : 0;

  const costPerToken = metrics.totalTokens > 0 
    ? metrics.totalCost / metrics.totalTokens 
    : 0;

  const totalProviderCost = Object.values(metrics.costByProvider).reduce((a, b) => a + b, 0);

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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('costByProvider')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {Object.entries(metrics.costByProvider).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noData')}</p>
                ) : (
                  Object.entries(metrics.costByProvider)
                    .sort((a, b) => b[1] - a[1])
                    .map(([provider, cost]) => {
                      const percentage = totalProviderCost > 0 ? (cost / totalProviderCost) * 100 : 0;
                      return (
                        <div key={provider}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize">{provider}</span>
                            <span className="font-medium">${cost.toFixed(4)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('costBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('apiCosts')}</span>
                  <span className="font-bold">${metrics.totalCost.toFixed(4)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('costBreakdownDesc', {
                    requests: metrics.totalRequests.toLocaleString(),
                    tokens: metrics.totalTokens.toLocaleString(),
                  })}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('totalRequests')}</span>
                  <span>{metrics.totalRequests.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('totalTokens')}</span>
                  <span>{metrics.totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('avgTokensPerRequest')}</span>
                  <span>
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
    case '1h': return 24 * 30; // 1 hour to 1 month
    case '24h': return 30; // 1 day to 1 month
    case '7d': return 4.3; // 1 week to 1 month
    case '30d': return 1; // Already 1 month
    default: return 1;
  }
}
