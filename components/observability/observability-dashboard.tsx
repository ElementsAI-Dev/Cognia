'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Observability Disabled</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Enable observability in settings to track AI operations, view traces, and analyze costs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Observability Dashboard</h2>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalRequests ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.averageLatency ? `${metrics.averageLatency.toFixed(0)}ms` : '0ms'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.totalCost?.toFixed(4) ?? '0.00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.errorRate ? `${(metrics.errorRate * 100).toFixed(1)}%` : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 p-4">
        <TabsList>
          <TabsTrigger value="traces">Traces</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="traces" className="flex-1 mt-4">
          <div className="grid grid-cols-3 gap-4 h-full">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Recent Traces</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-96 overflow-y-auto">
                  {traces.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No traces yet. Start using AI features to see traces here.
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
                          <span>{trace.duration ? `${trace.duration}ms` : 'Running...'}</span>
                          {trace.tokenUsage && <span>• {trace.tokenUsage.total} tokens</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="col-span-2">
              {selectedTrace ? (
                <TraceViewer trace={selectedTrace} />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center text-muted-foreground">
                    Select a trace to view details
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
