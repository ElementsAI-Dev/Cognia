'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Zap, Hash } from 'lucide-react';
import type { MetricsData, TimeRange } from './observability-dashboard';

interface MetricsPanelProps {
  metrics: MetricsData | null;
  timeRange: TimeRange;
}

export function MetricsPanel({ metrics, timeRange }: MetricsPanelProps) {
  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No metrics data available</p>
        </CardContent>
      </Card>
    );
  }

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case '1h': return 'Last Hour';
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Metrics Overview</h3>
        <span className="text-sm text-muted-foreground">{getTimeRangeLabel(timeRange)}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Total Requests
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
              Total Tokens
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
              Avg Latency
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
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latency Percentiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P50</span>
                <span className="font-medium">{metrics.latencyPercentiles.p50.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P90</span>
                <span className="font-medium">{metrics.latencyPercentiles.p90.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P99</span>
                <span className="font-medium">{metrics.latencyPercentiles.p99.toFixed(0)}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Requests by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.requestsByProvider).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
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
            <CardTitle className="text-sm">Requests by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(metrics.requestsByModel).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tokens by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.tokensByProvider).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
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
