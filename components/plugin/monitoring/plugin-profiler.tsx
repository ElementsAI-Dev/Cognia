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
import {
  getPluginProfiler,
  type ProfileEntry,
  type ProfileSummary,
  type Hotspot,
} from '@/lib/plugin/profiler';
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
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleProfiling}
          >
            {isEnabled ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={clearData}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
        <Badge variant={isEnabled ? 'default' : 'secondary'}>
          {isEnabled ? 'Recording' : 'Paused'}
        </Badge>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Operations"
            value={summary.totalOperations}
            icon={<Activity className="h-4 w-4" />}
          />
          <SummaryCard
            title="Total Duration"
            value={`${summary.totalDuration.toFixed(1)}ms`}
            icon={<Clock className="h-4 w-4" />}
          />
          <SummaryCard
            title="Avg Duration"
            value={`${summary.averageDuration.toFixed(2)}ms`}
            icon={<Zap className="h-4 w-4" />}
          />
          <SummaryCard
            title="Errors"
            value={errorOperations.length}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={errorOperations.length > 0 ? 'destructive' : 'default'}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
          <TabsTrigger value="slow">Slow Operations</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <TimelineView entries={entries} />
        </TabsContent>

        <TabsContent value="hotspots">
          <HotspotsView hotspots={summary?.hotspots || []} />
        </TabsContent>

        <TabsContent value="slow">
          <OperationsTable entries={slowOperations} title="Slow Operations (>100ms)" />
        </TabsContent>

        <TabsContent value="errors">
          <OperationsTable entries={errorOperations} title="Error Operations" showError />
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn(variant === 'destructive' && 'text-destructive')}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', variant === 'destructive' && 'text-destructive')}>
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
        <CardContent className="py-8 text-center text-muted-foreground">
          No profiling data yet. Start profiling to see the timeline.
        </CardContent>
      </Card>
    );
  }

  const maxDuration = Math.max(...entries.map((e) => e.duration || 0), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operation Timeline</CardTitle>
        <CardDescription>Recent operations with duration bars</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
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
    <div className="flex items-center gap-2 text-sm">
      <div className="w-32 truncate font-mono">{entry.operation}</div>
      <div className="flex-1">
        <Progress
          value={percentage}
          className={cn(
            'h-4',
            entry.status === 'error' && '[&>div]:bg-destructive'
          )}
        />
      </div>
      <div className="w-20 text-right text-muted-foreground">
        {duration.toFixed(2)}ms
      </div>
      <Badge
        variant={entry.status === 'error' ? 'destructive' : 'secondary'}
        className="w-16 justify-center"
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
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hotspot data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Hotspots</CardTitle>
        <CardDescription>Operations consuming the most time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hotspots.map((hotspot, index) => (
            <div key={hotspot.operation} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {index + 1}. {hotspot.operation}
                </span>
                <span className="text-muted-foreground">
                  {hotspot.percentage.toFixed(1)}% ({hotspot.count} calls)
                </span>
              </div>
              <Progress value={hotspot.percentage} className="h-2" />
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
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No operations found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
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
