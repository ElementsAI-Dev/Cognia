'use client';

/**
 * Plugin Profiler UI Component
 * 
 * Displays performance profiling data for plugins including:
 * - Operation timeline
 * - Performance summary
 * - Hotspot analysis
 * - Resource usage
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import {
  getPluginProfiler,
  type ProfileEntry,
  type ProfileSummary,
  type Hotspot,
} from '@/lib/plugin';
import { Play, Pause, Trash2, RefreshCw, Activity, Clock, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface PluginProfilerProps {
  pluginId: string;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// =============================================================================
// Plugin Profiler Component
// =============================================================================

export function PluginProfiler({
  pluginId,
  className,
  autoRefresh = true,
  refreshInterval = 2000,
}: PluginProfilerProps) {
  const t = useTranslations('pluginProfiler');
  const profiler = useMemo(() => getPluginProfiler(), []);
  const [isEnabled, setIsEnabled] = useState(() => profiler.isEnabled());
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [slowOperations, setSlowOperations] = useState<ProfileEntry[]>([]);
  const [errorOperations, setErrorOperations] = useState<ProfileEntry[]>([]);

  const refresh = useCallback(() => {
    setSummary(profiler.getSummary(pluginId));
    setEntries(profiler.getEntries(pluginId).slice(-50));
    setSlowOperations(profiler.getSlowOperations(pluginId, 100));
    setErrorOperations(profiler.getErrorOperations(pluginId));
  }, [profiler, pluginId]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refresh, refreshInterval]);

  const toggleProfiling = useCallback(() => {
    profiler.setEnabled(!isEnabled);
    setIsEnabled(!isEnabled);
  }, [profiler, isEnabled]);

  const clearData = useCallback(() => {
    profiler.clearEntries(pluginId);
    refresh();
  }, [profiler, pluginId, refresh]);

  return (
    <div className={cn('flex flex-col gap-3 sm:gap-4 h-full', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleProfiling}
          >
            {isEnabled ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                {t('controls.pause')}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {t('controls.start')}
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('controls.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={clearData}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('controls.clear')}
          </Button>
        </div>
        <Badge variant={isEnabled ? 'default' : 'secondary'}>
          {isEnabled ? t('controls.recording') : t('controls.paused')}
        </Badge>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 shrink-0">
          <SummaryCard
            title={t('stats.totalOperations')}
            value={summary.totalOperations}
            icon={<Activity className="h-4 w-4" />}
          />
          <SummaryCard
            title={t('stats.totalDuration')}
            value={`${summary.totalDuration.toFixed(1)}ms`}
            icon={<Clock className="h-4 w-4" />}
          />
          <SummaryCard
            title={t('stats.avgDuration')}
            value={`${summary.averageDuration.toFixed(2)}ms`}
            icon={<Zap className="h-4 w-4" />}
          />
          <SummaryCard
            title={t('stats.errors')}
            value={errorOperations.length}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={errorOperations.length > 0 ? 'destructive' : 'default'}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-9 sm:h-10 shrink-0">
          <TabsTrigger value="timeline">{t('tabs.timeline')}</TabsTrigger>
          <TabsTrigger value="hotspots">{t('tabs.hotspots')}</TabsTrigger>
          <TabsTrigger value="slow">{t('tabs.slowOperations')}</TabsTrigger>
          <TabsTrigger value="errors">{t('tabs.errorsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 min-h-0 mt-3">
          <TimelineView entries={entries} />
        </TabsContent>

        <TabsContent value="hotspots" className="flex-1 min-h-0 mt-3">
          <HotspotsView hotspots={summary?.hotspots || []} />
        </TabsContent>

        <TabsContent value="slow" className="flex-1 min-h-0 mt-3">
          <OperationsTable entries={slowOperations} title={t('operations.slowTitle')} />
        </TabsContent>

        <TabsContent value="errors" className="flex-1 min-h-0 mt-3">
          <OperationsTable entries={errorOperations} title={t('operations.errorTitle')} showError />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
}

function SummaryCard({ title, value, icon, variant = 'default' }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <div className={cn(variant === 'destructive' && 'text-destructive')}>{icon}</div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className={cn('text-lg sm:text-2xl font-bold', variant === 'destructive' && 'text-destructive')}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineViewProps {
  entries: ProfileEntry[];
}

function TimelineView({ entries }: TimelineViewProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty className="border-0">
            <EmptyDescription>No profiling data yet. Start profiling to see the timeline.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const maxDuration = Math.max(...entries.map((e) => e.duration || 0), 1);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-3 sm:p-4 pb-2 shrink-0">
        <CardTitle className="text-sm sm:text-base">Operation Timeline</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Recent operations with duration bars</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {entries.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} maxDuration={maxDuration} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface TimelineEntryProps {
  entry: ProfileEntry;
  maxDuration: number;
}

function TimelineEntry({ entry, maxDuration }: TimelineEntryProps) {
  const duration = entry.duration || 0;
  const percentage = (duration / maxDuration) * 100;

  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      <div className="w-20 sm:w-32 truncate font-mono">{entry.operation}</div>
      <div className="flex-1">
        <Progress
          value={percentage}
          className={cn(
            'h-3 sm:h-4',
            entry.status === 'error' && '[&>div]:bg-destructive'
          )}
        />
      </div>
      <div className="w-14 sm:w-20 text-right text-muted-foreground">
        {duration.toFixed(1)}ms
      </div>
      <Badge
        variant={entry.status === 'error' ? 'destructive' : 'secondary'}
        className="w-12 sm:w-16 justify-center text-[10px] sm:text-xs"
      >
        {entry.status}
      </Badge>
    </div>
  );
}

interface HotspotsViewProps {
  hotspots: Hotspot[];
}

function HotspotsView({ hotspots }: HotspotsViewProps) {
  if (hotspots.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="py-8">
          <Empty className="border-0">
            <EmptyDescription>No hotspot data available.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-3 sm:p-4 pb-2 shrink-0">
        <CardTitle className="text-sm sm:text-base">Performance Hotspots</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Operations consuming the most time</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 flex-1 overflow-auto">
        <div className="space-y-3 sm:space-y-4">
          {hotspots.map((hotspot, index) => (
            <div key={hotspot.operation} className="space-y-1">
              <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                <span className="font-medium truncate">
                  {index + 1}. {hotspot.operation}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {hotspot.percentage.toFixed(1)}% ({hotspot.count})
                </span>
              </div>
              <Progress value={hotspot.percentage} className="h-1.5 sm:h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface OperationsTableProps {
  entries: ProfileEntry[];
  title: string;
  showError?: boolean;
}

function OperationsTable({ entries, title, showError }: OperationsTableProps) {
  if (entries.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="py-8">
          <Empty className="border-0">
            <EmptyDescription>No operations found.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-3 sm:p-4 pb-2 shrink-0">
        <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              {showError && <TableHead>Error</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono">{entry.operation}</TableCell>
                <TableCell>{(entry.duration || 0).toFixed(2)}ms</TableCell>
                <TableCell>
                  <Badge variant={entry.status === 'error' ? 'destructive' : 'secondary'}>
                    {entry.status}
                  </Badge>
                </TableCell>
                {showError && (
                  <TableCell className="text-destructive">{entry.error}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default PluginProfiler;
