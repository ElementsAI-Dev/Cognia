'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  Zap,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Clock,
  Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TraceViewer } from './trace-viewer';
import { MetricsPanel } from './metrics-panel';
import { CostAnalysis } from './cost-analysis';
import { StatCard } from './stat-card';
import { EmptyState } from './empty-state';
import { RecommendationsPanel } from './recommendations-panel';
import { SessionAnalyticsPanel } from './session-analytics-panel';
import { EfficiencyMetricsCard } from './efficiency-metrics-card';
import {
  UsageTrendChart,
  ProviderChart,
  TokenBreakdownChart,
  LatencyDistributionChart,
  EfficiencyRadarChart,
  calculateEfficiencyScores,
} from './charts';
import { useSettingsStore, useUsageStore } from '@/stores';
import { useObservabilityData } from '@/hooks/observability';
import { getTopSessionsByUsage } from '@/lib/ai/usage-analytics';
import {
  downloadRecordsAsCSV,
  downloadRecordsAsJSON,
  downloadTimeSeriesAsCSV,
} from '@/lib/ai/usage-export';
import { cn } from '@/lib/utils';

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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const usageRecords = useUsageStore((state) => state.records);
  const records = useMemo(() => usageRecords || [], [usageRecords]);

  // Use real data from usage store
  const {
    statistics,
    metricsData,
    timeSeries,
    trend,
    recommendations,
    hasData,
    efficiency,
    providerBreakdown,
  } = useObservabilityData(timeRange);

  // Get top sessions
  const topSessions = useMemo(() => {
    return getTopSessionsByUsage(records, 10);
  }, [records]);

  // Sparkline data from time series
  const sparklineData = useMemo(() => {
    return timeSeries.map((point) => ({
      value: point.tokens,
      label: point.date,
    }));
  }, [timeSeries]);

  // Refresh counter to force data recalculation (used implicitly to trigger re-renders)
  const [_refreshCounter, setRefreshCounter] = useState(0);

  // Auto-refresh effect - triggers real data refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      // Increment counter to trigger useMemo recalculations
      setRefreshCounter((prev) => prev + 1);
      // Force store to emit update by touching records
      const currentRecords = useUsageStore.getState().records;
      useUsageStore.setState({ records: [...currentRecords] });
      setTimeout(() => setIsRefreshing(false), 300);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshCounter((prev) => prev + 1);
    // Force store to emit update
    const currentRecords = useUsageStore.getState().records;
    useUsageStore.setState({ records: [...currentRecords] });
    setTimeout(() => setIsRefreshing(false), 300);
  }, []);

  // Calculate trend percentage for stat cards
  const trendPercent = trend.percentChange;

  // Convert provider breakdown to chart format
  const providerChartData = useMemo(() => {
    return providerBreakdown.map((p) => ({
      provider: p.provider,
      tokens: p.tokens,
      cost: p.cost,
      requests: p.requests,
      percentage: p.percentage,
    }));
  }, [providerBreakdown]);

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

  return (
    <div className={cn('flex flex-col h-full', isRefreshing && 'opacity-75 transition-opacity')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t('title')}</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t('subtitle') || 'Monitor AI usage and performance'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="scale-90"
            />
            <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
              <Clock className="h-3 w-3 inline mr-1" />
              {t('autoRefresh') || 'Auto'}
            </Label>
          </div>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('refresh') || 'Refresh'}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t('export') || 'Export'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadRecordsAsCSV(records)}>
                {t('exportCSV') || 'Export Records (CSV)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadRecordsAsJSON(records)}>
                {t('exportJSON') || 'Export Records (JSON)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTimeSeriesAsCSV(timeSeries)}>
                {t('exportTimeSeries') || 'Export Time Series (CSV)'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-28 sm:w-32">
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

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <StatCard
          title={t('totalRequests')}
          value={statistics.totalRequests.toLocaleString()}
          icon={<Activity className="h-4 w-4 text-blue-500" />}
          trend={{ value: trendPercent, label: tTime(timeRange) }}
          sparklineData={sparklineData.length > 1 ? sparklineData : undefined}
          sparklineColor="#3b82f6"
          animated
        />
        <StatCard
          title={t('totalTokens')}
          value={
            statistics.totalTokens >= 1000
              ? `${(statistics.totalTokens / 1000).toFixed(1)}K`
              : statistics.totalTokens.toString()
          }
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          subtitle={`${t('avgPerRequest')}: ${Math.round(statistics.averageTokensPerRequest)}`}
          animated
        />
        <StatCard
          title={t('totalCost')}
          value={`$${statistics.totalCost.toFixed(4)}`}
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          subtitle={`${t('avgPerRequest')}: $${statistics.averageCostPerRequest.toFixed(6)}`}
          animated
        />
        <StatCard
          title={t('errorRate')}
          value={`${(metricsData.errorRate * 100).toFixed(1)}%`}
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          valueClassName={metricsData.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}
          animated
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 px-4 pb-4 overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-1">
            <LineChart className="h-3.5 w-3.5 hidden sm:inline" />
            {t('tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5 hidden sm:inline" />
            {t('tabs.metrics')}
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-1">
            <PieChart className="h-3.5 w-3.5 hidden sm:inline" />
            {t('tabs.costs')}
          </TabsTrigger>
          <TabsTrigger value="traces" className="gap-1">
            <Activity className="h-3.5 w-3.5 hidden sm:inline" />
            {t('tabs.traces')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Enhanced layout */}
        <TabsContent value="overview" className="mt-4 space-y-4 overflow-auto">
          {/* Main charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <UsageTrendChart data={timeSeries} height={260} />
              {/* Secondary charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TokenBreakdownChart
                  data={{
                    inputTokens: statistics.inputTokens,
                    outputTokens: statistics.outputTokens,
                  }}
                  height={200}
                />
                <LatencyDistributionChart
                  data={metricsData.latencyPercentiles}
                  averageLatency={metricsData.averageLatency}
                  height={180}
                />
              </div>
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              <RecommendationsPanel recommendations={recommendations} />
              <EfficiencyRadarChart
                data={calculateEfficiencyScores({
                  costPerKToken: efficiency.costPerKToken,
                  averageLatency: metricsData.averageLatency,
                  errorRate: metricsData.errorRate / 100,
                  tokensPerDollar: efficiency.tokensPerDollar,
                  totalRequests: statistics.totalRequests,
                })}
                height={220}
              />
              <EfficiencyMetricsCard metrics={efficiency} />
              {topSessions.length > 0 && (
                <SessionAnalyticsPanel sessions={topSessions} maxSessions={5} />
              )}
            </div>
          </div>
          {/* Provider distribution */}
          {providerChartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProviderChart data={providerChartData} dataKey="tokens" height={220} />
              <ProviderChart data={providerChartData} dataKey="cost" height={220} />
            </div>
          )}
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
                    <div className="p-4 text-center text-muted-foreground">{t('noTraces')}</div>
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
