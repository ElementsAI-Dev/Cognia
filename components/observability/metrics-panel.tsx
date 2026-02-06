'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Zap, Hash, Clock } from 'lucide-react';
import {
  ProviderChart,
  ModelChart,
  UsageTrendChart,
  LatencyDistributionChart,
  RequestsTimelineChart,
} from './charts';
import type { MetricsData, TimeRange } from './observability-dashboard';
import type { TimeSeriesDataPoint } from '@/lib/ai/usage-analytics';

interface MetricsPanelProps {
  metrics: MetricsData | null;
  timeRange: TimeRange;
  timeSeries?: TimeSeriesDataPoint[];
}

export function MetricsPanel({ metrics, timeRange, timeSeries = [] }: MetricsPanelProps) {
  const t = useTranslations('observability.metrics');
  const tTime = useTranslations('observability.timeRange');
  const tCommon = useTranslations('observability');

  // Convert metrics data to chart-compatible format
  const providerData = Object.entries(metrics?.requestsByProvider || {}).map(
    ([provider, requests]) => ({
      provider,
      requests,
      tokens: metrics?.tokensByProvider?.[provider] || 0,
      cost: metrics?.costByProvider?.[provider] || 0,
      percentage: metrics?.totalRequests ? (requests / metrics.totalRequests) * 100 : 0,
    })
  );

  const modelData = Object.entries(metrics?.requestsByModel || {}).map(([model, requests]) => ({
    model,
    requests,
    tokens: 0, // Would need model-level token tracking
    cost: 0,
    percentage: metrics?.totalRequests ? (requests / metrics.totalRequests) * 100 : 0,
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
              <Hash className="h-4 w-4" />
              {t('totalRequests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t('totalTokens')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('avgLatency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageLatency.toFixed(0)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('errorRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Primary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {timeSeries.length > 0 && <RequestsTimelineChart data={timeSeries} showCost height={260} />}
        <LatencyDistributionChart
          data={metrics.latencyPercentiles}
          averageLatency={metrics.averageLatency}
          height={220}
        />
      </div>

      {/* Charts Section - Secondary */}
      {timeSeries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UsageTrendChart data={timeSeries} showCost={false} height={220} />
          <ProviderChart data={providerData} dataKey="tokens" height={220} />
        </div>
      )}

      {/* Model Usage Chart */}
      {modelData.length > 0 && <ModelChart data={modelData} dataKey="requests" height={200} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Stats Card with visual progress bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('latencyPercentiles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                      P50
                    </Badge>
                    {t('median') || 'Median'}
                  </span>
                  <span className="font-medium">{metrics.latencyPercentiles.p50.toFixed(0)}ms</span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (metrics.latencyPercentiles.p50 / metrics.latencyPercentiles.p99) * 100
                  )}
                  className="h-1.5"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs">
                      P90
                    </Badge>
                    {t('90thPercentile') || '90th Percentile'}
                  </span>
                  <span className="font-medium">{metrics.latencyPercentiles.p90.toFixed(0)}ms</span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (metrics.latencyPercentiles.p90 / metrics.latencyPercentiles.p99) * 100
                  )}
                  className="h-1.5"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-100 text-red-700 text-xs">
                      P99
                    </Badge>
                    {t('99thPercentile') || '99th Percentile'}
                  </span>
                  <span className="font-medium">{metrics.latencyPercentiles.p99.toFixed(0)}ms</span>
                </div>
                <Progress value={100} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('requestsByProvider')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.requestsByProvider).length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
              ) : (
                Object.entries(metrics.requestsByProvider).map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{provider}</span>
                    <span className="font-medium">{count.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('requestsByModel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {Object.entries(metrics.requestsByModel).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
                ) : (
                  Object.entries(metrics.requestsByModel)
                    .sort((a, b) => b[1] - a[1])
                    .map(([model, count]) => (
                      <div key={model} className="flex items-center justify-between">
                        <span className="text-sm truncate max-w-[200px]">{model}</span>
                        <span className="font-medium">{count.toLocaleString()}</span>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('tokensByProvider')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.tokensByProvider).length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
              ) : (
                Object.entries(metrics.tokensByProvider).map(([provider, tokens]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{provider}</span>
                    <span className="font-medium">{tokens.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
