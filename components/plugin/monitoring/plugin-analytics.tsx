/**
 * Plugin Analytics Dashboard
 * Displays usage statistics, insights, and health monitoring
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import {
  pluginAnalyticsStore,
  getPluginInsights,
  getPluginHealth,
  type LearningInsight,
  type PluginHealthStatus,
} from '@/lib/plugin';
import { usePluginStore } from '@/stores/plugin';
import { toast } from '@/components/ui/sonner';
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="text-lg sm:text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
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
    healthy: { color: 'bg-green-500', icon: CheckCircle2, labelKey: 'health.healthy' },
    degraded: { color: 'bg-yellow-500', icon: AlertCircle, labelKey: 'health.degraded' },
    unhealthy: { color: 'bg-red-500', icon: XCircle, labelKey: 'health.unhealthy' },
  };

  const { color, icon: Icon } = config[status];
  const tHealth = useTranslations('pluginAnalytics');

  return (
    <Badge variant="outline" className="gap-1">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <Icon className="h-3 w-3" />
      {tHealth(config[status].labelKey)}
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
  const t = useTranslations('pluginAnalytics');
  const tools = Object.values(toolUsage).sort((a, b) => b.callCount - a.callCount);

  if (tools.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('usage.noToolUsage')}</p>;
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
  const t = useTranslations('pluginAnalytics');
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

  const { enablePlugin, disablePlugin } = usePluginStore();

  const handleInsightAction = useCallback(async (insight: LearningInsight) => {
    if (!insight.action) return;
    
    switch (insight.action.type) {
      case 'configure':
        if (insight.pluginId) {
          setSelectedPlugin(insight.pluginId);
        }
        break;
      case 'disable_plugin':
        if (insight.pluginId) {
          try {
            await disablePlugin(insight.pluginId);
            toast.success(`Plugin disabled: ${insight.pluginId}`);
          } catch (error) {
            toast.error(`Failed to disable plugin: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        break;
      case 'enable_plugin':
        if (insight.pluginId) {
          try {
            await enablePlugin(insight.pluginId);
            toast.success(`Plugin enabled: ${insight.pluginId}`);
          } catch (error) {
            toast.error(`Failed to enable plugin: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        break;
    }
  }, [enablePlugin, disablePlugin]);

  return (
    <div className={cn('flex flex-col gap-4 sm:gap-6 h-full', className)}>
      {/* Overview Stats - Responsive grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 md:gap-4">
        <StatCard
          title={t('stats.totalCalls')}
          value={aggregateStats.totalCalls.toLocaleString()}
          description={t('stats.acrossAll')}
          icon={Activity}
        />
        <StatCard
          title={t('stats.successRate')}
          value={`${overallSuccessRate}%`}
          description={t('stats.successful', { count: aggregateStats.successfulCalls })}
          icon={CheckCircle2}
          trend={parseFloat(overallSuccessRate) >= 90 ? 'up' : 'down'}
        />
        <StatCard
          title={t('stats.activePlugins')}
          value={Object.values(plugins).filter(p => p.status === 'enabled').length}
          description={t('stats.ofInstalled', { count: Object.keys(plugins).length })}
          icon={Zap}
        />
        <StatCard
          title={t('stats.avgResponse')}
          value={`${(aggregateStats.avgDuration / Math.max(stats.length, 1) / 1000).toFixed(1)}s`}
          description={t('stats.avgDuration')}
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="insights" className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-9 sm:h-10">
          <TabsTrigger value="insights" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
            <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('tabs.insights')}</span>
            <span className="xs:hidden">洞察</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('tabs.health')}</span>
            <span className="xs:hidden">健康</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('tabs.usage')}</span>
            <span className="xs:hidden">使用</span>
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 shrink-0">
              <CardTitle className="text-sm sm:text-base">{t('insights.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('insights.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0">
              <ScrollArea className="h-full pr-2 sm:pr-4">
                {insights.length === 0 ? (
                  <Empty className="h-full border-0">
                    <EmptyMedia>
                      <Lightbulb className="h-6 w-6 sm:h-8 sm:w-8" />
                    </EmptyMedia>
                    <EmptyDescription>{t('insights.noInsights')}</EmptyDescription>
                  </Empty>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
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
        <TabsContent value="health" className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 shrink-0">
              <CardTitle className="text-sm sm:text-base">{t('health.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('health.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0">
              <ScrollArea className="h-full pr-2 sm:pr-4">
                <div className="space-y-2 sm:space-y-4">
                  {Object.entries(plugins).map(([id, plugin]) => {
                    const health = healthStatuses.get(id);
                    return (
                      <div
                        key={id}
                        className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-lg border sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{plugin.manifest.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{id}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:gap-3">
                          {health && (
                            <>
                              <div className="text-left sm:text-right">
                                <p className="text-xs sm:text-sm font-medium">{health.score}/100</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {t('health.issues', { count: health.issues.length })}
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
        <TabsContent value="usage" className="flex-1 min-h-0 mt-3 sm:mt-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 h-full">
            {/* Plugin Selector */}
            <Card className="flex flex-col min-h-0">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 shrink-0">
                <CardTitle className="text-sm sm:text-base">{t('usage.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('usage.description')}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1.5 sm:space-y-2">
                    {stats.map(s => (
                      <button
                        key={s.pluginId}
                        onClick={() => setSelectedPlugin(s.pluginId)}
                        className={cn(
                          'w-full text-left p-2.5 sm:p-3 rounded-lg border transition-colors',
                          selectedPlugin === s.pluginId
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-sm truncate">{s.pluginId}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('usage.calls', { count: s.totalCalls })}</span>
                        </div>
                      </button>
                    ))}
                    {stats.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-6 sm:py-8">
                        {t('usage.noUsageData')}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Plugin Stats */}
            <Card className="flex flex-col min-h-0">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 shrink-0">
                <CardTitle className="text-sm sm:text-base truncate">
                  {selectedStats ? plugins[selectedStats.pluginId]?.manifest.name || selectedStats.pluginId : t('usage.selectPlugin')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedStats ? t('usage.description') : t('usage.clickToView')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0 overflow-auto">
                {selectedStats ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('usage.totalCalls')}</p>
                        <p className="text-base sm:text-lg font-bold">{selectedStats.totalCalls}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('usage.successRate')}</p>
                        <p className="text-base sm:text-lg font-bold">
                          {((selectedStats.successfulCalls / Math.max(selectedStats.totalCalls, 1)) * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('usage.avgDuration')}</p>
                        <p className="text-base sm:text-lg font-bold">
                          {(selectedStats.averageDuration / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('usage.lastUsed')}</p>
                        <p className="text-base sm:text-lg font-bold">
                          {new Date(selectedStats.lastUsed).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-2">{t('usage.dailyUsage')}</p>
                      <UsageChart dailyUsage={selectedStats.dailyUsage} />
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-2">{t('usage.topTools')}</p>
                      <ToolUsageList toolUsage={selectedStats.toolUsage} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground">
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
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
