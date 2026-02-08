'use client';

/**
 * ProcessPanel - Full-page process manager for the native tools page
 *
 * Features:
 * - Process list with search, filter, and sort
 * - View modes: all, tracked (agent-started), top memory
 * - Click a process row to open its detail view
 * - Auto-refresh with configurable interval
 * - Process termination with confirmation
 * - Stats overview (total, tracked, memory)
 *
 * Integrates with:
 * - useProcessManager hook (existing)
 * - useProcessDetail hook (new)
 * - processService (existing)
 * - ProcessSettingsPanel (existing)
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Cpu,
  HardDrive,
  StopCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Clock,
  Bot,
  ArrowUpDown,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { useProcessManager } from '@/hooks/agent/use-process-manager';
import type { ProcessInfo } from '@/lib/native/process';
import { ProcessDetailPanel } from './process-detail-panel';

interface ProcessPanelProps {
  className?: string;
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500/10 text-green-600 dark:text-green-400',
  sleeping: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  stopped: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  zombie: 'bg-red-500/10 text-red-600 dark:text-red-400',
  unknown: 'bg-muted text-muted-foreground',
};

type SortKey = 'pid' | 'name' | 'memory' | 'cpu' | 'status';

export function ProcessPanel({ className }: ProcessPanelProps) {
  const t = useTranslations('processManager');
  const [searchQuery, setSearchQuery] = useState('');
  const [terminateTarget, setTerminateTarget] = useState<ProcessInfo | null>(null);
  const [forceTerminate, setForceTerminate] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'tracked' | 'memory'>('all');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('memory');
  const [sortDesc, setSortDesc] = useState(true);

  const {
    processes,
    isLoading,
    error,
    lastRefresh,
    isAvailable,
    trackedPids,
    refresh,
    search,
    getTopMemory,
    terminate,
    autoRefresh,
    setAutoRefresh,
  } = useProcessManager();

  // Sort processes
  const sortedProcesses = useMemo(() => {
    const sorted = [...processes];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'pid':
          cmp = a.pid - b.pid;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'memory':
          cmp = (a.memoryBytes || 0) - (b.memoryBytes || 0);
          break;
        case 'cpu':
          cmp = (a.cpuPercent || 0) - (b.cpuPercent || 0);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [processes, sortKey, sortDesc]);

  // Filter processes based on search and view mode
  const filteredProcesses = useMemo(() => {
    let result = sortedProcesses;

    if (viewMode === 'tracked') {
      result = result.filter((p) => trackedPids.includes(p.pid));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.pid.toString().includes(query) ||
          p.exePath?.toLowerCase().includes(query) ||
          p.user?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [sortedProcesses, searchQuery, viewMode, trackedPids]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMemory = processes.reduce((sum, p) => sum + (p.memoryBytes || 0), 0);
    const trackedMemory = processes
      .filter((p) => trackedPids.includes(p.pid))
      .reduce((sum, p) => sum + (p.memoryBytes || 0), 0);
    const avgCpu =
      processes.length > 0
        ? processes.reduce((sum, p) => sum + (p.cpuPercent || 0), 0) / processes.length
        : 0;
    return {
      total: processes.length,
      tracked: trackedPids.length,
      totalMemory,
      trackedMemory,
      avgCpu,
    };
  }, [processes, trackedPids]);

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: 'all' | 'tracked' | 'memory') => {
      setViewMode(mode);
      if (mode === 'memory') {
        getTopMemory(100);
      } else {
        refresh();
      }
    },
    [refresh, getTopMemory]
  );

  // Handle search
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      search(searchQuery);
    } else {
      refresh();
    }
  }, [searchQuery, search, refresh]);

  // Handle sort toggle
  const handleSortToggle = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDesc((prev) => !prev);
      } else {
        setSortKey(key);
        setSortDesc(true);
      }
    },
    [sortKey]
  );

  // Handle terminate confirmation
  const handleTerminateConfirm = useCallback(async () => {
    if (!terminateTarget) return;
    await terminate(terminateTarget.pid, forceTerminate);
    setTerminateTarget(null);
    setForceTerminate(false);
    if (selectedPid === terminateTarget.pid) {
      setSelectedPid(null);
    }
  }, [terminateTarget, forceTerminate, terminate, selectedPid]);

  // Sort indicator helper
  const renderSortIndicator = (column: SortKey) => {
    if (sortKey !== column) return null;
    return <span className="ml-1 text-[10px]">{sortDesc ? '▼' : '▲'}</span>;
  };

  if (!isAvailable) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center', className)}>
        <EmptyState
          icon={AlertTriangle}
          title={t('notAvailable')}
          description={t('desktopOnly')}
          compact
        />
      </div>
    );
  }

  // Show detail view when a process is selected
  if (selectedPid !== null) {
    return (
      <ProcessDetailPanel
        pid={selectedPid}
        onBack={() => setSelectedPid(null)}
        onTerminate={(pid, force) => {
          const p = processes.find((proc) => proc.pid === pid);
          if (p) {
            setTerminateTarget(p);
            setForceTerminate(force || false);
          }
        }}
        onNavigateToProcess={(pid) => setSelectedPid(pid)}
        className={className}
      />
    );
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">{t('title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('processCount', { count: stats.total })} · {formatBytes(stats.totalMemory)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? (
                  <ToggleRight className="h-4 w-4 text-primary" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {autoRefresh ? t('autoRefreshOn') : t('autoRefreshOff')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => refresh()}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refresh')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b text-xs text-muted-foreground shrink-0 flex-wrap">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {stats.total} {t('total')}
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span className="flex items-center gap-1">
          <Bot className="h-3 w-3 text-primary" />
          {stats.tracked} {t('tracked')}
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {formatBytes(stats.totalMemory)}
        </span>
        {lastRefresh && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleViewModeChange('all')}
          >
            {t('viewAll')}
          </Button>
          <Button
            variant={viewMode === 'tracked' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleViewModeChange('tracked')}
          >
            <Bot className="h-3 w-3 mr-1" />
            {t('viewTracked')}
          </Button>
          <Button
            variant={viewMode === 'memory' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleViewModeChange('memory')}
          >
            <HardDrive className="h-3 w-3 mr-1" />
            {t('viewTopMemory')}
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <ArrowUpDown className="h-3 w-3" />
              {t('sort')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSortToggle('pid')}>
              PID {renderSortIndicator('pid')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortToggle('name')}>
              {t('colName')} {renderSortIndicator('name')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortToggle('memory')}>
              {t('colMemory')} {renderSortIndicator('memory')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortToggle('cpu')}>
              CPU {renderSortIndicator('cpu')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortToggle('status')}>
              {t('colStatus')} {renderSortIndicator('status')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-b text-destructive text-xs shrink-0">
          {error}
        </div>
      )}

      {/* Process Table */}
      <ScrollArea className="flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[80px] cursor-pointer select-none"
                onClick={() => handleSortToggle('pid')}
              >
                PID {renderSortIndicator('pid')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSortToggle('name')}
              >
                {t('colName')} {renderSortIndicator('name')}
              </TableHead>
              <TableHead className="hidden sm:table-cell">{t('colUser')}</TableHead>
              <TableHead
                className="text-right w-[100px] cursor-pointer select-none"
                onClick={() => handleSortToggle('memory')}
              >
                {t('colMemory')} {renderSortIndicator('memory')}
              </TableHead>
              <TableHead
                className="text-right w-[80px] cursor-pointer select-none"
                onClick={() => handleSortToggle('cpu')}
              >
                CPU {renderSortIndicator('cpu')}
              </TableHead>
              <TableHead
                className="w-[90px] cursor-pointer select-none"
                onClick={() => handleSortToggle('status')}
              >
                {t('colStatus')} {renderSortIndicator('status')}
              </TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProcesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{t('loading')}</span>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Cpu}
                      title={t('noProcesses')}
                      description={
                        viewMode === 'tracked' ? t('noTrackedProcesses') : t('noProcessesFound')
                      }
                      compact
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredProcesses.map((proc) => {
                const isTracked = trackedPids.includes(proc.pid);
                return (
                  <TableRow
                    key={proc.pid}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isTracked && 'bg-primary/5',
                      'hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedPid(proc.pid)}
                  >
                    <TableCell className="font-mono text-xs">{proc.pid}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[180px]">
                          {proc.name}
                        </span>
                        {isTracked && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Bot className="h-3 w-3 text-primary shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>{t('startedByAgent')}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground truncate max-w-[100px]">
                      {proc.user || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatBytes(proc.memoryBytes)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {proc.cpuPercent !== undefined ? `${proc.cpuPercent.toFixed(1)}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] capitalize font-normal',
                          statusColors[proc.status] || ''
                        )}
                      >
                        {proc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTerminateTarget(proc);
                              }}
                            >
                              <StopCircle className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('terminate')}</TooltipContent>
                        </Tooltip>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between shrink-0">
        <span>
          {t('showing', { count: filteredProcesses.length, total: stats.total })}
        </span>
        {stats.tracked > 0 && (
          <span>
            {t('agentProcesses')}: {stats.tracked} · {formatBytes(stats.trackedMemory)}
          </span>
        )}
      </div>

      {/* Terminate confirmation dialog */}
      <AlertDialog open={!!terminateTarget} onOpenChange={() => setTerminateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('terminateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('terminateDescription', {
                name: terminateTarget?.name || '',
                pid: terminateTarget?.pid || 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {forceTerminate ? t('forceTerminate') : t('terminate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProcessPanel;
