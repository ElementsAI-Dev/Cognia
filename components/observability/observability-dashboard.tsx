'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import { MetricsPanel } from './metrics-panel';
import { CostAnalysis } from './cost-analysis';
import { StatCard } from './stat-card';
import { EmptyState } from './empty-state';
import { DashboardHeader } from './dashboard-header';
import { OverviewTab } from './overview-tab';
import { TracesTab } from './traces-tab';
import { useSettingsStore, useUsageStore } from '@/stores';
import { useObservabilityData, useObservabilityActions, usePerformanceMetrics } from '@/hooks/observability';
import { useAgentTrace } from '@/hooks/agent-trace';
import { getTopSessionsByUsage } from '@/lib/ai/usage-analytics';
import { dbTraceToTraceData } from '@/lib/ai/observability/trace-converter';
import { cn } from '@/lib/utils';
import type { TimeRange, TraceData } from '@/types/observability';

// Re-export types for backward compatibility
export type { TraceData, SpanData, MetricsData, TimeRange } from '@/types/observability';

interface ObservabilityDashboardProps {
  onClose?: () => void;
}

export function ObservabilityDashboard({ onClose }: ObservabilityDashboardProps) {
  const t = useTranslations('observability.dashboard');
  const tTime = useTranslations('observability.timeRange');
  const tCommon = useTranslations('observability');

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
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

  // Agent trace data for Traces tab
  const { traces: agentTraces, totalCount: traceTotalCount, isLoading: tracesLoading } = useAgentTrace({ limit: 50 });

  // Convert agent traces to TraceData format
  const traceDataList = useMemo(() => {
    return agentTraces
      .map(dbTraceToTraceData)
      .filter((tr): tr is TraceData => tr !== null);
  }, [agentTraces]);

  // Performance metrics from agent executor
  const {
    summary: perfSummary,
    history: perfHistory,
    activeExecutions: perfActiveExecutions,
    hasData: hasPerfData,
  } = usePerformanceMetrics();

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

  const triggerRefresh = useUsageStore((state) => state.triggerRefresh);
  const { clearAllData, clearOldData } = useObservabilityActions();

  // Auto-refresh effect - triggers real data refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      triggerRefresh();
      setTimeout(() => setIsRefreshing(false), 300);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, triggerRefresh]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    triggerRefresh();
    setTimeout(() => setIsRefreshing(false), 300);
  }, [triggerRefresh]);

  // Calculate trend percentage for stat cards
  const trendPercent = trend.percentChange;

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
      <DashboardHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onClearAllData={clearAllData}
        onClearOldData={clearOldData}
        records={records}
        timeSeries={timeSeries}
        langfuseEnabled={observabilitySettings?.langfuseEnabled}
        openTelemetryEnabled={observabilitySettings?.openTelemetryEnabled}
        onClose={onClose}
      />

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

        <TabsContent value="overview" className="mt-4 space-y-4 overflow-auto">
          <OverviewTab
            statistics={statistics}
            metricsData={metricsData}
            timeSeries={timeSeries}
            recommendations={recommendations}
            efficiency={efficiency}
            providerBreakdown={providerBreakdown}
            perfSummary={perfSummary}
            perfHistory={perfHistory}
            perfActiveExecutions={perfActiveExecutions}
            hasPerfData={hasPerfData}
            topSessions={topSessions}
          />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <MetricsPanel metrics={metricsData} timeRange={timeRange} timeSeries={timeSeries} />
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="mt-4">
          <CostAnalysis metrics={metricsData} timeRange={timeRange} timeSeries={timeSeries} />
        </TabsContent>

        <TabsContent value="traces" className="mt-4">
          <TracesTab
            traces={traceDataList}
            totalCount={traceTotalCount}
            isLoading={tracesLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
