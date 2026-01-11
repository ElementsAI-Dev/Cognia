/**
 * Plugin Analytics Dashboard
 * Displays usage statistics, insights, and health monitoring
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Lightbulb,
  TrendingUp,
  XCircle,
  Zap,
  Heart,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  pluginAnalyticsStore,
  getPluginInsights,
  getPluginHealth,
  type LearningInsight,
  type PluginHealthStatus,
} from '@/lib/plugin/analytics';
import { usePluginStore } from '@/stores/plugin';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface PluginAnalyticsProps {
  pluginId?: string;
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HealthBadge({ status }: { status: PluginHealthStatus['status'] }) {
  const config = {
    healthy: { color: 'bg-green-500', icon: CheckCircle2, label: 'Healthy' },
    degraded: { color: 'bg-yellow-500', icon: AlertCircle, label: 'Degraded' },
    unhealthy: { color: 'bg-red-500', icon: XCircle, label: 'Unhealthy' },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <Badge variant="outline" className="gap-1">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function InsightCard({
  insight,
  onAction,
}: {
  insight: LearningInsight;
  onAction?: (insight: LearningInsight) => void;
}) {
  const typeConfig = {
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    optimization: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    suggestion: { icon: Lightbulb, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    achievement: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  };

  const { icon: Icon, color, bg } = typeConfig[insight.type];

  return (
    <div className={cn('rounded-lg p-3 space-y-2', bg)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-5 w-5 mt-0.5', color)} />
        <div className="flex-1 space-y-1">
          <p className="font-medium text-sm">{insight.title}</p>
          <p className="text-xs text-muted-foreground">{insight.description}</p>
        </div>
      </div>
      {insight.actionable && insight.action && (
        <Button
          size="sm"
          variant="outline"
          className="ml-7"
          onClick={() => onAction?.(insight)}
        >
          {insight.action.label}
        </Button>
      )}
    </div>
  );
}

function UsageChart({ dailyUsage }: { dailyUsage: { date: string; calls: number }[] }) {
  const maxCalls = Math.max(...dailyUsage.map(d => d.calls), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {dailyUsage.slice(-14).map((day, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors"
          style={{ height: `${(day.calls / maxCalls) * 100}%`, minHeight: '4px' }}
          title={`${day.date}: ${day.calls} calls`}
        />
      ))}
    </div>
  );
}

function ToolUsageList({ toolUsage }: { toolUsage: Record<string, { name: string; callCount: number; successCount: number }> }) {
  const tools = Object.values(toolUsage).sort((a, b) => b.callCount - a.callCount);

  if (tools.length === 0) {
    return <p className="text-sm text-muted-foreground">No tool usage recorded</p>;
  }

  return (
    <div className="space-y-2">
      {tools.slice(0, 5).map(tool => {
        const successRate = tool.callCount > 0 ? (tool.successCount / tool.callCount) * 100 : 0;
        return (
          <div key={tool.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-mono text-xs">{tool.name}</span>
              <span className="text-muted-foreground">{tool.callCount} calls</span>
            </div>
            <Progress value={successRate} className="h-1" />
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginAnalytics({ pluginId, className }: PluginAnalyticsProps) {
  const { plugins } = usePluginStore();
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(pluginId || null);

  // Compute data using useMemo - no useState needed for derived data
  const stats = useMemo(() => pluginAnalyticsStore.getAllStats(), []);
  const insights = useMemo(() => getPluginInsights(), []);
  const healthStatuses = useMemo(() => {
    const healthMap = new Map<string, PluginHealthStatus>();
    Object.keys(plugins).forEach(id => {
      healthMap.set(id, getPluginHealth(id));
    });
    return healthMap;
  }, [plugins]);

  const selectedStats = useMemo(() => {
    if (!selectedPlugin) return null;
    return stats.find(s => s.pluginId === selectedPlugin);
  }, [selectedPlugin, stats]);

  const aggregateStats = useMemo(() => {
    return stats.reduce(
      (acc, s) => ({
        totalCalls: acc.totalCalls + s.totalCalls,
        successfulCalls: acc.successfulCalls + s.successfulCalls,
        failedCalls: acc.failedCalls + s.failedCalls,
        avgDuration: acc.avgDuration + s.averageDuration,
      }),
      { totalCalls: 0, successfulCalls: 0, failedCalls: 0, avgDuration: 0 }
    );
  }, [stats]);

  const overallSuccessRate = aggregateStats.totalCalls > 0
    ? ((aggregateStats.successfulCalls / aggregateStats.totalCalls) * 100).toFixed(1)
    : '100';

  const handleInsightAction = (insight: LearningInsight) => {
    if (!insight.action) return;
    
    switch (insight.action.type) {
      case 'configure':
        // Open config dialog
        if (insight.pluginId) {
          setSelectedPlugin(insight.pluginId);
        }
        break;
      case 'disable_plugin':
        // Trigger disable
        break;
      case 'enable_plugin':
        // Trigger enable
        break;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={aggregateStats.totalCalls.toLocaleString()}
          description="Across all plugins"
          icon={Activity}
        />
        <StatCard
          title="Success Rate"
          value={`${overallSuccessRate}%`}
          description={`${aggregateStats.successfulCalls} successful`}
          icon={CheckCircle2}
          trend={parseFloat(overallSuccessRate) >= 90 ? 'up' : 'down'}
        />
        <StatCard
          title="Active Plugins"
          value={Object.values(plugins).filter(p => p.status === 'enabled').length}
          description={`of ${Object.keys(plugins).length} installed`}
          icon={Zap}
        />
        <StatCard
          title="Avg Response"
          value={`${(aggregateStats.avgDuration / Math.max(stats.length, 1) / 1000).toFixed(1)}s`}
          description="Average duration"
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Heart className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Insights</CardTitle>
              <CardDescription>
                AI-powered recommendations based on your plugin usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {insights.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mb-2" />
                    <p>No insights yet. Keep using plugins to generate recommendations!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight, i) => (
                      <InsightCard
                        key={i}
                        insight={insight}
                        onAction={handleInsightAction}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plugin Health Status</CardTitle>
              <CardDescription>
                Real-time health monitoring for all installed plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {Object.entries(plugins).map(([id, plugin]) => {
                    const health = healthStatuses.get(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{plugin.manifest.name}</p>
                          <p className="text-xs text-muted-foreground">{id}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {health && (
                            <>
                              <div className="text-right">
                                <p className="text-sm font-medium">{health.score}/100</p>
                                <p className="text-xs text-muted-foreground">
                                  {health.issues.length} issues
                                </p>
                              </div>
                              <HealthBadge status={health.status} />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plugin Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Plugin Usage</CardTitle>
                <CardDescription>Select a plugin to view detailed stats</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {stats.map(s => (
                      <button
                        key={s.pluginId}
                        onClick={() => setSelectedPlugin(s.pluginId)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          selectedPlugin === s.pluginId
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{s.pluginId}</span>
                          <span className="text-muted-foreground">{s.totalCalls} calls</span>
                        </div>
                      </button>
                    ))}
                    {stats.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No usage data yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Plugin Stats */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedStats ? plugins[selectedStats.pluginId]?.manifest.name || selectedStats.pluginId : 'Select a Plugin'}
                </CardTitle>
                <CardDescription>
                  {selectedStats ? 'Detailed usage statistics' : 'Click a plugin to view stats'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Calls</p>
                        <p className="text-lg font-bold">{selectedStats.totalCalls}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-bold">
                          {((selectedStats.successfulCalls / Math.max(selectedStats.totalCalls, 1)) * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Duration</p>
                        <p className="text-lg font-bold">
                          {(selectedStats.averageDuration / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Used</p>
                        <p className="text-lg font-bold">
                          {new Date(selectedStats.lastUsed).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Daily Usage (14 days)</p>
                      <UsageChart dailyUsage={selectedStats.dailyUsage} />
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Top Tools</p>
                      <ToolUsageList toolUsage={selectedStats.toolUsage} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PluginAnalytics;
