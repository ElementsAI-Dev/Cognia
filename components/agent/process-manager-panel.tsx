'use client';

/**
 * ProcessManagerPanel - Panel for monitoring and managing system processes
 * Desktop-only feature that shows processes started by agents
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  RefreshCw,
  Search,
  Cpu,
  HardDrive,
  StopCircle,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Clock,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { useProcessManager } from '@/hooks/agent/use-process-manager';
import type { ProcessInfo } from '@/lib/native/process';

interface ProcessManagerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Format bytes to human readable
function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Process row component
function ProcessRow({
  process,
  isTracked,
  onTerminate,
}: {
  process: ProcessInfo;
  isTracked: boolean;
  onTerminate: (pid: number) => void;
}) {
  const statusColors: Record<string, string> = {
    running: 'text-green-500',
    sleeping: 'text-blue-500',
    stopped: 'text-yellow-500',
    zombie: 'text-red-500',
    unknown: 'text-muted-foreground',
  };

  return (
    <TableRow className={cn(isTracked && 'bg-primary/5')}>
      <TableCell className="font-mono text-xs">{process.pid}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate max-w-[150px]">{process.name}</span>
          {isTracked && (
            <Tooltip>
              <TooltipTrigger>
                <Bot className="h-3 w-3 text-primary" />
              </TooltipTrigger>
              <TooltipContent>Started by Agent</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {formatBytes(process.memoryBytes)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {process.cpuPercent !== undefined ? `${process.cpuPercent.toFixed(1)}%` : '-'}
      </TableCell>
      <TableCell>
        <span className={cn('text-xs capitalize', statusColors[process.status] || '')}>
          {process.status}
        </span>
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onTerminate(process.pid)}
            >
              <StopCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Terminate Process</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export function ProcessManagerPanel({ open, onOpenChange }: ProcessManagerPanelProps) {
  const t = useTranslations('agent');
  const [searchQuery, setSearchQuery] = useState('');
  const [terminateTarget, setTerminateTarget] = useState<ProcessInfo | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'tracked' | 'memory'>('all');

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

  // Filter processes based on search and view mode
  const filteredProcesses = useMemo(() => {
    let result = processes;

    // Apply view mode filter
    if (viewMode === 'tracked') {
      result = result.filter((p) => trackedPids.includes(p.pid));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.pid.toString().includes(query) ||
          p.exePath?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [processes, searchQuery, viewMode, trackedPids]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMemory = processes.reduce((sum, p) => sum + (p.memoryBytes || 0), 0);
    const trackedMemory = processes
      .filter((p) => trackedPids.includes(p.pid))
      .reduce((sum, p) => sum + (p.memoryBytes || 0), 0);
    return {
      total: processes.length,
      tracked: trackedPids.length,
      totalMemory,
      trackedMemory,
    };
  }, [processes, trackedPids]);

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: 'all' | 'tracked' | 'memory') => {
      setViewMode(mode);
      if (mode === 'memory') {
        getTopMemory(50);
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

  // Handle terminate confirmation
  const handleTerminateConfirm = useCallback(async () => {
    if (!terminateTarget) return;
    await terminate(terminateTarget.pid);
    setTerminateTarget(null);
  }, [terminateTarget, terminate]);

  if (!isAvailable) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              {t('processManager') || 'Process Manager'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Process management is only available in desktop mode</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0" showCloseButton={false}>
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                {t('processManager') || 'Process Manager'}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
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
                    {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                  </TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                {stats.total} processes
              </span>
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3 text-primary" />
                {stats.tracked} tracked
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatBytes(stats.totalMemory)} total
              </span>
              {lastRefresh && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Toolbar */}
          <div className="p-2 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or PID..."
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
                All
              </Button>
              <Button
                variant={viewMode === 'tracked' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleViewModeChange('tracked')}
              >
                <Bot className="h-3 w-3 mr-1" />
                Tracked
              </Button>
              <Button
                variant={viewMode === 'memory' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleViewModeChange('memory')}
              >
                <HardDrive className="h-3 w-3 mr-1" />
                Top Memory
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => refresh()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-2 bg-destructive/10 border-b text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Process table */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">PID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right w-[100px]">Memory</TableHead>
                  <TableHead className="text-right w-[80px]">CPU</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No processes found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.map((process) => (
                    <ProcessRow
                      key={process.pid}
                      process={process}
                      isTracked={trackedPids.includes(process.pid)}
                      onTerminate={(pid) => {
                        const p = processes.find((proc) => proc.pid === pid);
                        if (p) setTerminateTarget(p);
                      }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Footer */}
          {stats.tracked > 0 && (
            <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground">
              Agent processes: {stats.tracked} | Memory: {formatBytes(stats.trackedMemory)}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Terminate confirmation dialog */}
      <AlertDialog open={!!terminateTarget} onOpenChange={() => setTerminateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Process?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate{' '}
              <strong>{terminateTarget?.name}</strong> (PID: {terminateTarget?.pid})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProcessManagerPanel;
