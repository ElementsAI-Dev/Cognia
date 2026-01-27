'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { TraceViewer } from './trace-viewer';
import { MetricsPanel } from './metrics-panel';
import { CostAnalysis } from './cost-analysis';
import { useSettingsStore } from '@/stores';

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
  const [selectedTrace, setSelectedTrace] = useState<TraceData | null>(null);
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('traces');

  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);

  const fetchData = useCallback(async () => {
    if (!observabilitySettings?.enabled) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from Langfuse API
      // For now, we'll use mock data or local storage
      const mockTraces: TraceData[] = [];
      const mockMetrics: MetricsData = {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        errorRate: 0,
        requestsByProvider: {},
        requestsByModel: {},
        tokensByProvider: {},
        costByProvider: {},
        latencyPercentiles: { p50: 0, p90: 0, p99: 0 },
      };

      setTraces(mockTraces);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to fetch observability data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [observabilitySettings?.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  if (!observabilitySettings?.enabled) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Alert variant="default" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('disabledTitle')}</AlertTitle>
            <AlertDescription>{t('disabledDescription')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

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
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {tCommon('close')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('totalRequests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.totalRequests ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('avgLatency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.averageLatency ? `${metrics.averageLatency.toFixed(0)}ms` : '0ms'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('totalCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                ${metrics?.totalCost?.toFixed(4) ?? '0.00'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('errorRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.errorRate ? `${(metrics.errorRate * 100).toFixed(1)}%` : '0%'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 p-4">
        <TabsList>
          <TabsTrigger value="traces">{t('tabs.traces')}</TabsTrigger>
          <TabsTrigger value="metrics">{t('tabs.metrics')}</TabsTrigger>
          <TabsTrigger value="costs">{t('tabs.costs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="traces" className="flex-1 mt-4">
          <div className="grid grid-cols-3 gap-4 h-full">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">{t('recentTraces')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="divide-y">
                    {traces.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {t('noTraces')}
                      </div>
                    ) : (
                      traces.map((trace) => (
                        <button
                          key={trace.id}
                          className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                            selectedTrace?.id === trace.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedTrace(trace)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{trace.name}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                trace.status === 'success'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : trace.status === 'error'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}
                            >
                              {trace.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{trace.duration ? `${trace.duration}ms` : t('traceRunning')}</span>
                            {trace.tokenUsage && <span>• {trace.tokenUsage.total} tokens</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="col-span-2">
              {selectedTrace ? (
                <TraceViewer trace={selectedTrace} />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center text-muted-foreground">
                    {t('selectTrace')}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <MetricsPanel metrics={metrics} timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <CostAnalysis metrics={metrics} timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
