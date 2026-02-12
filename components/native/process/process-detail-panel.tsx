'use client';

/**
 * ProcessDetailPanel - Detailed view for a single process
 *
 * Shows comprehensive process information:
 * - Basic info: PID, name, status, user, working directory
 * - Resource usage: CPU, memory with visual indicators
 * - Executable path and command line arguments
 * - Parent process (clickable to navigate)
 * - Child processes list
 * - Start time / uptime
 * - Actions: terminate, force kill, refresh
 *
 * Integrates with:
 * - useProcessDetail hook (polling single process)
 * - processService (existing)
 * - TrackedProcess from process store
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  StopCircle,
  RefreshCw,
  Clock,
  Bot,
  User,
  FolderOpen,
  FileCode,
  Terminal,
  GitBranch,
  AlertTriangle,
  Zap,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { useProcessDetail } from '@/hooks/native/use-process-detail';
import { useProcessStore } from '@/stores/agent/process-store';

interface ProcessDetailPanelProps {
  pid: number;
  onBack: () => void;
  onTerminate: (pid: number, force?: boolean) => void;
  onNavigateToProcess: (pid: number) => void;
  className?: string;
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(startTimestamp: number | undefined): string {
  if (!startTimestamp) return '-';
  const now = Math.floor(Date.now() / 1000);
  const seconds = now - startTimestamp;
  if (seconds < 0) return '-';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatStartTime(timestamp: number | undefined): string {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString();
}

const statusConfig: Record<string, { color: string; bgColor: string }> = {
  running: { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10' },
  sleeping: { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10' },
  stopped: { color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500/10' },
  zombie: { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10' },
  unknown: { color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

function getMemoryUsageLevel(bytes: number | undefined): { percent: number; color: string } {
  if (!bytes) return { percent: 0, color: 'text-green-500' };
  const mb = bytes / (1024 * 1024);
  if (mb < 100) return { percent: Math.min(mb / 5, 100), color: 'text-green-500' };
  if (mb < 500) return { percent: Math.min(mb / 10, 100), color: 'text-yellow-500' };
  return { percent: Math.min(mb / 20, 100), color: 'text-red-500' };
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  copyable,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | undefined | null;
  mono?: boolean;
  copyable?: boolean;
  onClick?: () => void;
}) {
  const displayValue = value || '-';

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          {onClick ? (
            <button
              onClick={onClick}
              className={cn(
                'text-sm text-primary hover:underline cursor-pointer truncate',
                mono && 'font-mono'
              )}
            >
              {displayValue}
            </button>
          ) : (
            <p className={cn('text-sm truncate', mono && 'font-mono')}>{displayValue}</p>
          )}
          {copyable && value && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 shrink-0"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProcessDetailPanel({
  pid,
  onBack,
  onTerminate,
  onNavigateToProcess,
  className,
}: ProcessDetailPanelProps) {
  const t = useTranslations('processDetail');
  const {
    process,
    isLoading,
    error,
    isFound,
    lastRefresh,
    refresh,
    children,
    childrenLoading,
    refreshChildren,
  } = useProcessDetail({ pid });

  const trackedProcesses = useProcessStore((state) => state.trackedProcesses);

  const trackedInfo = useMemo(() => {
    return trackedProcesses.get(pid);
  }, [trackedProcesses, pid]);

  const isTracked = !!trackedInfo;

  const memoryUsage = useMemo(() => {
    return getMemoryUsageLevel(process?.memoryBytes);
  }, [process?.memoryBytes]);

  const statusStyle = useMemo(() => {
    return statusConfig[process?.status || 'unknown'] || statusConfig.unknown;
  }, [process?.status]);

  if (!isFound && !isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex items-center gap-2 p-3 border-b shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">{t('title')}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={AlertTriangle}
            title={t('notFound')}
            description={t('notFoundDescription', { pid })}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 shrink-0">
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold leading-none truncate">
                {process?.name || `PID ${pid}`}
              </h3>
              {isTracked && (
                <Tooltip>
                  <TooltipTrigger>
                    <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>{t('startedByAgent')}</TooltipContent>
                </Tooltip>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] capitalize font-normal shrink-0',
                  statusStyle.bgColor,
                  statusStyle.color
                )}
              >
                {process?.status || 'unknown'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              PID: {pid}
              {process?.user && ` · ${process.user}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  refresh();
                  refreshChildren();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refresh')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onTerminate(pid, false)}
              >
                <StopCircle className="h-3.5 w-3.5 mr-1" />
                {t('terminate')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('terminateGraceful')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={() => onTerminate(pid, true)}
              >
                <Zap className="h-3.5 w-3.5 mr-1" />
                {t('forceKill')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('forceKillDescription')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-b text-destructive text-xs shrink-0">
          {error}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-4 space-y-4">
          {/* Resource Usage Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Memory Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  {t('memory')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('usage')}</span>
                  <span className={cn('text-lg font-semibold', memoryUsage.color)}>
                    {formatBytes(process?.memoryBytes)}
                  </span>
                </div>
                <Progress value={memoryUsage.percent} className="h-2" />
              </CardContent>
            </Card>

            {/* CPU Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('usage')}</span>
                  <span
                    className={cn(
                      'text-lg font-semibold',
                      (process?.cpuPercent || 0) < 50
                        ? 'text-green-500'
                        : (process?.cpuPercent || 0) < 80
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    )}
                  >
                    {process?.cpuPercent !== undefined
                      ? `${process.cpuPercent.toFixed(1)}%`
                      : '-'}
                  </span>
                </div>
                <Progress value={process?.cpuPercent || 0} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Process Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('processInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              <InfoRow
                icon={Terminal}
                label="PID"
                value={String(pid)}
                mono
                copyable
              />
              <InfoRow
                icon={FileCode}
                label={t('processName')}
                value={process?.name}
                copyable
              />
              <InfoRow
                icon={User}
                label={t('user')}
                value={process?.user}
              />
              <InfoRow
                icon={GitBranch}
                label={t('parentPid')}
                value={process?.parentPid ? String(process.parentPid) : undefined}
                mono
                onClick={
                  process?.parentPid
                    ? () => onNavigateToProcess(process.parentPid!)
                    : undefined
                }
              />
              <InfoRow
                icon={Clock}
                label={t('startTime')}
                value={formatStartTime(process?.startTime)}
              />
              <InfoRow
                icon={Clock}
                label={t('uptime')}
                value={formatUptime(process?.startTime)}
              />
            </CardContent>
          </Card>

          {/* Paths */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('paths')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              <InfoRow
                icon={ExternalLink}
                label={t('executablePath')}
                value={process?.exePath}
                mono
                copyable
              />
              <InfoRow
                icon={FolderOpen}
                label={t('workingDirectory')}
                value={process?.cwd}
                mono
                copyable
              />
            </CardContent>
          </Card>

          {/* Command Line */}
          {process?.cmdLine && process.cmdLine.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  {t('commandLine')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-md p-3 overflow-x-auto">
                  <code className="text-xs font-mono whitespace-pre-wrap break-all">
                    {process.cmdLine.join(' ')}
                  </code>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent Tracking Info */}
          {isTracked && trackedInfo && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  {t('agentInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trackedInfo.agentName && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('agentName')}</span>
                    <span className="font-medium">{trackedInfo.agentName}</span>
                  </div>
                )}
                {trackedInfo.agentId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('agentId')}</span>
                    <span className="font-mono text-xs">{trackedInfo.agentId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('program')}</span>
                  <span className="font-mono text-xs">{trackedInfo.program}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('startedAt')}</span>
                  <span className="text-xs">
                    {new Date(trackedInfo.startedAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Child Processes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  {t('childProcesses')} ({children.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={refreshChildren}
                  disabled={childrenLoading}
                >
                  <RefreshCw
                    className={cn('h-3 w-3', childrenLoading && 'animate-spin')}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t('noChildProcesses')}
                </p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px]">PID</TableHead>
                        <TableHead>{t('name')}</TableHead>
                        <TableHead className="text-right w-[80px]">{t('memoryShort')}</TableHead>
                        <TableHead className="w-[70px]">{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {children.map((child) => (
                        <TableRow
                          key={child.pid}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onNavigateToProcess(child.pid)}
                        >
                          <TableCell className="font-mono text-xs">{child.pid}</TableCell>
                          <TableCell className="text-sm truncate max-w-[150px]">
                            {child.name}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatBytes(child.memoryBytes)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] capitalize font-normal',
                                statusConfig[child.status]?.bgColor || '',
                                statusConfig[child.status]?.color || ''
                              )}
                            >
                              {child.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer info */}
          {lastRefresh && (
            <p className="text-xs text-muted-foreground text-center">
              {t('lastUpdated')}: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
