'use client';

/**
 * Log Viewer Component
 * Enhanced UI for viewing, filtering, and exporting application logs
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  Play,
  Pause,
  ArrowDown,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Terminal,
  Skull,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { StructuredLogEntry, LogLevel, LogFilter, LogStats } from '@/lib/logger';
import { IndexedDBTransport } from '@/lib/logger';

/**
 * Level configuration with colors and icons
 */
const LEVEL_CONFIG: Record<LogLevel, { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  trace: {
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    icon: Terminal,
  },
  debug: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    icon: Bug,
  },
  info: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    icon: Info,
  },
  warn: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    icon: AlertTriangle,
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    icon: AlertCircle,
  },
  fatal: {
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    icon: Skull,
  },
};

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Log entry row component
 */
function LogEntryRow({
  entry,
  expanded,
  onToggle,
  onCopy,
}: {
  entry: StructuredLogEntry;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
}) {
  const date = new Date(entry.timestamp);
  const hasDetails = entry.data || entry.stack || entry.source;
  const config = LEVEL_CONFIG[entry.level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'group border-l-2 transition-all duration-150',
        config.color.replace('text-', 'border-'),
        expanded ? 'bg-muted/40' : 'hover:bg-muted/20'
      )}
    >
      <div
        className="flex items-start gap-2 px-3 py-2.5 cursor-pointer"
        onClick={onToggle}
      >
        <div className={cn('shrink-0 mt-0.5', config.color)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-[10px] px-1.5 py-0 h-5 uppercase tracking-wider',
                config.color,
                config.bgColor
              )}
            >
              {entry.level}
            </Badge>

            <span className="text-xs text-muted-foreground font-medium">
              {entry.module}
            </span>

            {entry.traceId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <code className="text-[10px] text-muted-foreground/70 bg-muted px-1 py-0.5 rounded font-mono">
                      {entry.traceId.slice(0, 8)}
                    </code>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-mono text-xs">Trace: {entry.traceId}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">
                    {formatRelativeTime(date)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{date.toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className={cn('text-sm leading-relaxed', !expanded && 'line-clamp-2')}>
            {entry.message}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(entry.message);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          {hasDetails && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 ml-6 space-y-2">
          {entry.data && Object.keys(entry.data).length > 0 && (
            <div className="rounded-md bg-muted/50 p-2 overflow-x-auto">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            </div>
          )}
          {entry.stack && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-2 overflow-x-auto">
              <pre className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {entry.stack}
              </pre>
            </div>
          )}
          {entry.source && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="font-mono">
                {entry.source.file}:{entry.source.line}
              </span>
              {entry.source.function && (
                <span className="text-muted-foreground/60">in {entry.source.function}()</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Log Viewer Props
 */
interface LogViewerProps {
  className?: string;
  maxHeight?: string;
  defaultAutoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Log Viewer Component
 */
export function LogViewer({
  className,
  maxHeight = '600px',
  defaultAutoRefresh = false,
  refreshInterval = 3000,
}: LogViewerProps) {
  const [logs, setLogs] = useState<StructuredLogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(defaultAutoRefresh);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filter, setFilter] = useState<LogFilter>({
    limit: 100,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Transport reference
  const [transport] = useState(() => new IndexedDBTransport());

  /**
   * Load logs from IndexedDB
   */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const logFilter: LogFilter = {
        ...filter,
        search: searchQuery || undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
      };

      const [fetchedLogs, fetchedStats] = await Promise.all([
        transport.getLogs(logFilter),
        transport.getStats(),
      ]);

      setLogs(fetchedLogs);
      setStats(fetchedStats);

      // Auto-scroll to bottom
      if (autoScroll && scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }, [transport, filter, searchQuery, levelFilter, moduleFilter, autoScroll]);

  /**
   * Initial load and refresh on filter change
   */
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs, refreshInterval]);

  /**
   * Copy to clipboard
   */
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  /**
   * Get unique modules for filter dropdown
   */
  const modules = useMemo(() => {
    return Object.keys(stats?.byModule || {});
  }, [stats]);

  /**
   * Toggle log entry expansion
   */
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Clear all logs
   */
  const handleClear = useCallback(async () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      await transport.clear();
      await loadLogs();
    }
  }, [transport, loadLogs]);

  /**
   * Export logs as JSON
   */
  const handleExport = useCallback(async () => {
    const json = await transport.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transport]);

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setLevelFilter('all');
    setModuleFilter('all');
  }, []);

  const hasActiveFilters = searchQuery || levelFilter !== 'all' || moduleFilter !== 'all';

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Application Logs</CardTitle>
            {stats && (
              <Badge variant="secondary" className="font-mono">
                {stats.total.toLocaleString()} entries
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 mr-2">
                    <Switch
                      id="auto-refresh"
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                    />
                    <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
                      {autoRefresh ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Auto-refresh ({refreshInterval / 1000}s)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadLogs} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={scrollToBottom}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Scroll to bottom</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export logs</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleClear}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear all logs</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | 'all')}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {Object.entries(LEVEL_CONFIG).map(([level, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-3 w-3', config.color)} />
                      <span className="capitalize">{level}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map((mod) => (
                <SelectItem key={mod} value={mod}>
                  {mod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(filter.limit)}
            onValueChange={(v) => setFilter((f) => ({ ...f, limit: parseInt(v) }))}
          >
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
            <Label htmlFor="auto-scroll" className="text-xs text-muted-foreground">
              Auto-scroll
            </Label>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.byLevel)
              .filter(([, count]) => count > 0)
              .map(([level, count]) => {
                const config = LEVEL_CONFIG[level as LogLevel];
                const Icon = config.icon;
                const isActive = levelFilter === level;
                return (
                  <Badge
                    key={level}
                    variant={isActive ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-all gap-1 font-mono text-xs',
                      !isActive && config.color,
                      !isActive && 'hover:bg-muted'
                    )}
                    onClick={() => setLevelFilter(isActive ? 'all' : (level as LogLevel))}
                  >
                    <Icon className="h-3 w-3" />
                    {count.toLocaleString()}
                  </Badge>
                );
              })}
          </div>
        )}

        {/* Log List */}
        <div
          ref={scrollRef}
          className="border rounded-lg overflow-auto bg-card"
          style={{ maxHeight }}
        >
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Terminal className="h-8 w-8 mb-3 opacity-50" />
              <p className="text-sm">No logs found</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((entry) => (
                <LogEntryRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedIds.has(entry.id)}
                  onToggle={() => toggleExpanded(entry.id)}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          )}
        </div>

        {/* Copy notification */}
        {copiedId && (
          <div className="fixed bottom-4 right-4 bg-foreground text-background px-3 py-2 rounded-md text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Check className="h-4 w-4" />
            Copied to clipboard
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LogViewer;
