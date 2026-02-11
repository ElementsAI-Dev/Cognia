'use client';

/**
 * TracesTab - Traces tab content for the observability dashboard
 *
 * Displays a list of recent traces with status filtering,
 * export capability, and a trace viewer for selected traces.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { TraceViewer } from './trace-viewer';
import { cn } from '@/lib/utils';
import type { TraceData } from '@/types/observability';

interface TracesTabProps {
  traces: TraceData[];
  totalCount: number;
  isLoading: boolean;
}

export function TracesTab({ traces, totalCount, isLoading }: TracesTabProps) {
  const t = useTranslations('observability.dashboard');
  const [selectedTrace, setSelectedTrace] = useState<TraceData | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredTraces = useMemo(() => {
    if (statusFilter === 'all') return traces;
    return traces.filter((tr) => tr.status === statusFilter);
  }, [traces, statusFilter]);

  const handleExportTraces = useCallback(() => {
    const data = JSON.stringify(filteredTraces, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traces-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTraces]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t('recentTraces')}</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'success' | 'error')}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filterAll') || 'All'}</SelectItem>
                  <SelectItem value="success">{t('filterSuccess') || 'Success'}</SelectItem>
                  <SelectItem value="error">{t('filterError') || 'Error'}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleExportTraces}
                disabled={filteredTraces.length === 0}
                title={t('exportTraces') || 'Export traces'}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">{filteredTraces.length}/{totalCount}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <div className="divide-y">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                  {t('traceRunning')}
                </div>
              ) : filteredTraces.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">{t('noTraces')}</div>
              ) : (
                filteredTraces.map((trace) => (
                  <div
                    key={trace.id}
                    className={cn(
                      'p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                      selectedTrace?.id === trace.id && 'bg-muted'
                    )}
                    onClick={() => setSelectedTrace(trace)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{trace.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs shrink-0',
                          trace.status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : trace.status === 'error'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        )}
                      >
                        {trace.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(trace.startTime).toLocaleTimeString()}</span>
                      {trace.duration != null && <span>{trace.duration}ms</span>}
                      {trace.model && (
                        <span className="truncate max-w-[120px]">{trace.model}</span>
                      )}
                      {trace.tokenUsage && (
                        <span>{trace.tokenUsage.total} tok</span>
                      )}
                    </div>
                  </div>
                ))
              )}
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
  );
}
