'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Activity, DollarSign, AlertTriangle, Zap } from 'lucide-react';
import { TraceViewer } from './trace-viewer';
import { MetricsPanel } from './metrics-panel';
import { CostAnalysis } from './cost-analysis';
import { StatCard } from './stat-card';
import { EmptyState } from './empty-state';
import { RecommendationsPanel } from './recommendations-panel';
import { UsageTrendChart } from './charts';
import { useSettingsStore } from '@/stores';
import { useObservabilityData } from '@/hooks/observability';

export interface TraceData {
  id: string;
  name: string;
  sessionId?: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'error';
  model?: string;
  provider?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  spans: SpanData[];
  metadata?: Record<string, unknown>;
}

export interface SpanData {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'error';
  type: 'generation' | 'tool' | 'agent' | 'span';
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  children?: SpanData[];
}

export interface MetricsData {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  requestsByProvider: Record<string, number>;
  requestsByModel: Record<string, number>;
  tokensByProvider: Record<string, number>;
  costByProvider: Record<string, number>;
  latencyPercentiles: {
    p50: number;
    p90: number;
    p99: number;
  };
}

export type TimeRange = '1h' | '24h' | '7d' | '30d';

interface ObservabilityDashboardProps {
  onClose?: () => void;
}

export function ObservabilityDashboard({ onClose }: ObservabilityDashboardProps) {
  const t = useTranslations('observability.dashboard');
  const tTime = useTranslations('observability.timeRange');
  const tCommon = useTranslations('observability');

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedTrace, _setSelectedTrace] = useState<TraceData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);

  // Use real data from usage store
  const {
    statistics,
    metricsData,
    timeSeries,
    trend,
    recommendations,
    hasData,
  } = useObservabilityData(timeRange);

  // Show empty state if observability is disabled
  if (!observabilitySettings?.enabled) {
    return <EmptyState type="disabled" />;
  }

  // Show empty state if no data
  if (!hasData) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">{tTime('1h')}</SelectItem>
                <SelectItem value="24h">{tTime('24h')}</SelectItem>
                <SelectItem value="7d">{tTime('7d')}</SelectItem>
                <SelectItem value="30d">{tTime('30d')}</SelectItem>
              </SelectContent>
            </Select>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                {tCommon('close')}
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 p-4">
          <EmptyState type="no-data" />
        </div>
      </div>
    );
  }

  // Calculate trend percentage for stat cards
  const trendPercent = trend.percentChange;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">{tTime('1h')}</SelectItem>
              <SelectItem value="24h">{tTime('24h')}</SelectItem>
              <SelectItem value="7d">{tTime('7d')}</SelectItem>
              <SelectItem value="30d">{tTime('30d')}</SelectItem>
            </SelectContent>
          </Select>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {tCommon('close')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        <StatCard
          title={t('totalRequests')}
          value={statistics.totalRequests.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
          trend={{ value: trendPercent, label: tTime(timeRange) }}
        />
        <StatCard
          title={t('totalTokens')}
          value={statistics.totalTokens >= 1000 ? `${(statistics.totalTokens / 1000).toFixed(1)}K` : statistics.totalTokens.toString()}
          icon={<Zap className="h-4 w-4" />}
          subtitle={`${t('avgPerRequest')}: ${Math.round(statistics.averageTokensPerRequest)}`}
        />
        <StatCard
          title={t('totalCost')}
          value={`$${statistics.totalCost.toFixed(4)}`}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle={`${t('avgPerRequest')}: $${statistics.averageCostPerRequest.toFixed(6)}`}
        />
        <StatCard
          title={t('errorRate')}
          value={`${(metricsData.errorRate * 100).toFixed(1)}%`}
          icon={<AlertTriangle className="h-4 w-4" />}
          valueClassName={metricsData.errorRate > 0.05 ? 'text-red-600' : undefined}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 px-4 pb-4">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="metrics">{t('tabs.metrics')}</TabsTrigger>
          <TabsTrigger value="costs">{t('tabs.costs')}</TabsTrigger>
          <TabsTrigger value="traces">{t('tabs.traces')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <UsageTrendChart data={timeSeries} height={280} />
            </div>
            <div>
              <RecommendationsPanel recommendations={recommendations} />
            </div>
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <MetricsPanel metrics={metricsData} timeRange={timeRange} timeSeries={timeSeries} />
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="mt-4">
          <CostAnalysis metrics={metricsData} timeRange={timeRange} timeSeries={timeSeries} />
        </TabsContent>

        {/* Traces Tab */}
        <TabsContent value="traces" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">{t('recentTraces')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="divide-y">
                    <div className="p-4 text-center text-muted-foreground">
                      {t('noTraces')}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedTrace ? (
                <TraceViewer trace={selectedTrace} />
              ) : (
                <Card className="h-full flex items-center justify-center min-h-64">
                  <CardContent className="text-center text-muted-foreground">
                    {t('selectTrace')}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
