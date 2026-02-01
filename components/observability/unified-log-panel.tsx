'use client';

/**
 * UnifiedLogPanel
 * 
 * A comprehensive log viewing component that aggregates logs from multiple sources
 * (frontend, Tauri, MCP, plugins) with filtering, grouping, and export capabilities.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  XCircle,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLogStream, useLogModules } from '@/hooks/logging';
import type { StructuredLogEntry, LogLevel } from '@/lib/logger';

interface UnifiedLogPanelProps {
  /** CSS class name */
  className?: string;
  /** Maximum height of the panel */
  maxHeight?: string;
  /** Enable auto-refresh by default */
  defaultAutoRefresh?: boolean;
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Group logs by trace ID */
  groupByTraceId?: boolean;
  /** Show statistics panel */
  showStats?: boolean;
  /** Filter by specific sources */
  sources?: ('frontend' | 'tauri' | 'mcp' | 'plugin')[];
}

const LEVEL_CONFIG: Record<LogLevel, { icon: React.ElementType; color: string; bgColor: string }> = {
  trace: { icon: Bug, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  debug: { icon: Bug, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  info: { icon: Info, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  error: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  fatal: { icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-200 dark:bg-red-900/50' },
};

const ALL_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function LogEntry({ 
  log, 
  isExpanded, 
  onToggle 
}: { 
  log: StructuredLogEntry; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const config = LEVEL_CONFIG[log.level];
  const Icon = config.icon;

  const handleCopy = useCallback(() => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [log]);

  const timestamp = new Date(log.timestamp);
  const timeStr = timestamp.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  const hasDetails = log.data || log.stack || log.source;

  return (
    <div className={cn('border-b border-border/50 hover:bg-muted/30 transition-colors', config.bgColor)}>
      <div 
        className="flex items-start gap-2 px-3 py-2 cursor-pointer"
        onClick={onToggle}
      >
        {hasDetails ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)} />
        
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {timeStr}
        </span>
        
        <Badge variant="outline" className="text-xs shrink-0 font-mono">
          {log.module}
        </Badge>
        
        {log.traceId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                {log.traceId.slice(0, 8)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Trace ID: {log.traceId}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <span className="text-sm flex-1 break-words">
          {log.message}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy log entry</TooltipContent>
        </Tooltip>
      </div>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pl-12 space-y-2">
          {log.data && (
            <div className="rounded bg-muted p-2">
              <div className="text-xs text-muted-foreground mb-1">Data:</div>
              <pre className="text-xs font-mono overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          )}
          
          {log.stack && (
            <div className="rounded bg-red-50 dark:bg-red-900/20 p-2">
              <div className="text-xs text-muted-foreground mb-1">Stack Trace:</div>
              <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap text-red-600 dark:text-red-400">
                {log.stack}
              </pre>
            </div>
          )}
          
          {log.source && (
            <div className="text-xs text-muted-foreground">
              Source: {log.source.file}:{log.source.line}
              {log.source.function && ` (${log.source.function})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraceGroup({
  traceId,
  logs,
  expandedIds,
  toggleExpanded,
}: {
  traceId: string;
  logs: StructuredLogEntry[];
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasErrors = logs.some(l => l.level === 'error' || l.level === 'fatal');
  const hasWarnings = logs.some(l => l.level === 'warn');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg mb-2">
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50">
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">
          {traceId === 'no-trace' ? 'No Trace ID' : traceId}
        </span>
        <Badge variant="outline" className="ml-auto">
          {logs.length} logs
        </Badge>
        {hasErrors && <Badge variant="destructive">Error</Badge>}
        {hasWarnings && !hasErrors && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {logs.map((log) => (
          <LogEntry
            key={log.id}
            log={log}
            isExpanded={expandedIds.has(log.id)}
            onToggle={() => toggleExpanded(log.id)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function UnifiedLogPanel({
  className,
  maxHeight = '600px',
  defaultAutoRefresh = false,
  refreshInterval = 2000,
  groupByTraceId = false,
  showStats = true,
}: UnifiedLogPanelProps) {
  const t = useTranslations('tools');
  
  const [autoRefresh, setAutoRefresh] = useState(defaultAutoRefresh);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const modules = useLogModules();

  const {
    logs,
    groupedLogs,
    isLoading,
    error,
    refresh,
    clearLogs,
    exportLogs,
    stats,
  } = useLogStream({
    autoRefresh,
    refreshInterval,
    level: levelFilter,
    module: moduleFilter === 'all' ? undefined : moduleFilter,
    searchQuery: searchQuery || undefined,
    groupByTraceId,
    maxLogs: 1000,
  });

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

  const handleExport = useCallback(() => {
    const content = exportLogs('json');
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportLogs]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && autoRefresh) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, autoRefresh]);

  return (
    <div className={cn('flex flex-col border rounded-lg bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 p-2 sm:p-3 border-b bg-muted/30">
        {/* Search - full width on mobile */}
        <div className="relative w-full sm:flex-1 sm:min-w-[160px] sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchLogs') || 'Search logs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        {/* Filters row - scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | 'all')}>
            <SelectTrigger className="w-[100px] sm:w-[120px] h-8 shrink-0">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {ALL_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 shrink-0">
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
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh logs</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export logs</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => clearLogs()}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear logs</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats bar */}
      {showStats && (
        <div className="flex items-center gap-4 px-3 py-2 border-b bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Total: <span className="font-medium text-foreground">{stats.total}</span>
          </span>
          {Object.entries(stats.byLevel).map(([level, count]) => {
            if (count === 0) return null;
            const config = LEVEL_CONFIG[level as LogLevel];
            return (
              <span key={level} className={cn('flex items-center gap-1', config.color)}>
                {level}: <span className="font-medium">{count}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Log content */}
      <ScrollArea 
        ref={scrollRef}
        className="flex-1"
        style={{ maxHeight }}
      >
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading logs...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error.message}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('noLogs') || 'No logs yet'}
          </div>
        ) : groupByTraceId ? (
          <div className="p-2">
            {Array.from(groupedLogs.entries()).map(([traceId, traceLogs]) => (
              <TraceGroup
                key={traceId}
                traceId={traceId}
                logs={traceLogs}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </div>
        ) : (
          <div>
            {logs.map((log) => (
              <LogEntry
                key={log.id}
                log={log}
                isExpanded={expandedIds.has(log.id)}
                onToggle={() => toggleExpanded(log.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default UnifiedLogPanel;
