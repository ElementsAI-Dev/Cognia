'use client';

/**
 * LogPanel
 *
 * A comprehensive log viewing component that aggregates logs from multiple sources
 * (frontend, Tauri, MCP, plugins) with filtering, grouping, and export capabilities.
 * Enhanced with dashboard view, timeline visualization, detail panel, search highlighting,
 * regex search, and bookmark support.
 */

import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  ChevronsUp,
  ChevronsDown,
  Pause,
  Play,
  Calendar,
  FileJson,
  FileText,
  FileSpreadsheet,
  BarChart3,
  List,
  Regex,
  Bookmark,
  BookmarkCheck,
  Activity,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { InlineLoading } from '@/components/ui/loading-states';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useLogStream, useLogModules, useAgentTraceAsLogs } from '@/hooks/logging';
import { useAgentTrace } from '@/hooks/agent-trace/use-agent-trace';
import { LogStatsDashboard } from './log-stats-dashboard';
import { LogTimeline } from './log-timeline';
import { LogDetailPanel } from './log-detail-panel';
import { AgentTraceTimeline } from '@/components/settings/data/agent-trace-timeline';
import { AGENT_TRACE_MODULE } from '@/lib/agent-trace/log-adapter';
import { LIVE_TRACE_EVENT_ICONS, LIVE_TRACE_EVENT_COLORS } from '@/lib/agent';
import type { StructuredLogEntry, LogLevel } from '@/lib/logger';
import type { AgentTraceEventType } from '@/types/agent-trace';

// Time range options in milliseconds
const TIME_RANGES = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  all: 0,
} as const;

type TimeRange = keyof typeof TIME_RANGES;
type ExportFormat = 'json' | 'csv' | 'text';
type ViewMode = 'list' | 'dashboard' | 'trace';

const BOOKMARKS_STORAGE_KEY = 'cognia-log-bookmarks';

export interface LogPanelProps {
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
  /** Show timeline visualization */
  showTimeline?: boolean;
  /** Filter by specific sources */
  sources?: ('frontend' | 'tauri' | 'mcp' | 'plugin')[];
  /** Enable agent trace integration in the log panel */
  includeAgentTrace?: boolean;
}

const LEVEL_CONFIG: Record<LogLevel, { icon: React.ElementType; color: string; bgColor: string }> =
  {
    trace: { icon: Bug, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    debug: { icon: Bug, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    info: { icon: Info, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    warn: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    error: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    fatal: { icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-200 dark:bg-red-900/50' },
  };

const ALL_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Split text by search query into parts for highlighting.
 * Returns null if query is invalid or empty.
 */
function splitByQuery(
  text: string,
  query: string,
  isRegex: boolean
): { parts: string[]; regex: RegExp } | null {
  if (!query) return null;
  try {
    const regex = isRegex
      ? new RegExp(`(${query})`, 'gi')
      : new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return { parts: text.split(regex), regex };
  } catch {
    return null;
  }
}

/**
 * Highlight search matches within text.
 */
function HighlightedText({
  text,
  query,
  useRegex,
}: {
  text: string;
  query: string;
  useRegex: boolean;
}) {
  const result = splitByQuery(text, query, useRegex);
  if (!result) return <>{text}</>;

  const { parts, regex } = result;
  return (
    <>
      {parts.map((part, i) => {
        regex.lastIndex = 0;
        return regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function LogEntry({
  log,
  isExpanded,
  onToggle,
  onSelect,
  searchQuery,
  useRegex,
  isBookmarked,
  onToggleBookmark,
  t,
}: {
  log: StructuredLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  searchQuery: string;
  useRegex: boolean;
  isBookmarked: boolean;
  onToggleBookmark?: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [copied, setCopied] = useState(false);
  const config = LEVEL_CONFIG[log.level];
  const isTraceEntry = log.module === AGENT_TRACE_MODULE;
  const TraceIcon = isTraceEntry && log.eventId
    ? LIVE_TRACE_EVENT_ICONS[log.eventId as AgentTraceEventType]
    : undefined;
  const traceColor = isTraceEntry && log.eventId
    ? LIVE_TRACE_EVENT_COLORS[log.eventId as AgentTraceEventType]
    : undefined;
  const Icon = TraceIcon ?? config.icon;
  const iconColor = traceColor ?? config.color;

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
    <div
      className={cn(
        'border-b border-border/50 hover:bg-muted/30 transition-colors',
        config.bgColor
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2 cursor-pointer" onClick={onToggle}>
        {hasDetails ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}

        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />

        <span className="text-xs text-muted-foreground font-mono shrink-0">{timeStr}</span>

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
              <p>
                {t('panel.traceId')}: {log.traceId}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <span className="text-sm flex-1 break-words">
          <HighlightedText text={log.message} query={searchQuery} useRegex={useRegex} />
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          {onToggleBookmark && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(log.id);
                  }}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-3 w-3 text-yellow-500" />
                  ) : (
                    <Bookmark className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isBookmarked ? t('panel.removeBookmark') : t('panel.addBookmark')}
              </TooltipContent>
            </Tooltip>
          )}

          {onSelect && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                >
                  <PanelRightOpen className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('panel.viewDetails')}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('panel.copyEntry')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pl-12 space-y-2">
          {log.data && (
            <div className="rounded bg-muted p-2">
              <div className="text-xs text-muted-foreground mb-1">{t('panel.data')}:</div>
              <pre className="text-xs font-mono overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          )}

          {log.stack && (
            <div className="rounded bg-red-50 dark:bg-red-900/20 p-2">
              <div className="text-xs text-muted-foreground mb-1">{t('panel.stackTrace')}:</div>
              <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap text-red-600 dark:text-red-400">
                {log.stack}
              </pre>
            </div>
          )}

          {log.source && (
            <div className="text-xs text-muted-foreground">
              {t('panel.source')}: {log.source.file}:{log.source.line}
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
  searchQuery,
  useRegex,
  bookmarkedIds,
  onToggleBookmark,
  t,
}: {
  traceId: string;
  logs: StructuredLogEntry[];
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  searchQuery: string;
  useRegex: boolean;
  bookmarkedIds: Set<string>;
  onToggleBookmark?: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasErrors = logs.some((l) => l.level === 'error' || l.level === 'fatal');
  const hasWarnings = logs.some((l) => l.level === 'warn');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg mb-2">
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">
          {traceId === 'no-trace' ? t('panel.noTraceId') : traceId}
        </span>
        <Badge variant="outline" className="ml-auto">
          {logs.length} {t('panel.logs')}
        </Badge>
        {hasErrors && <Badge variant="destructive">{t('panel.error')}</Badge>}
        {hasWarnings && !hasErrors && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {t('panel.warning')}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {logs.map((log) => (
          <LogEntry
            key={log.id}
            log={log}
            isExpanded={expandedIds.has(log.id)}
            onToggle={() => toggleExpanded(log.id)}
            searchQuery={searchQuery}
            useRegex={useRegex}
            isBookmarked={bookmarkedIds.has(log.id)}
            onToggleBookmark={onToggleBookmark}
            t={t}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

const ESTIMATED_LOG_HEIGHT = 44;

const MemoizedLogEntry = memo(LogEntry);

function VirtualizedLogList({
  scrollRef,
  containerRef,
  maxHeight,
  isLoading,
  error,
  filteredLogs,
  groupByTraceId,
  groupedLogs,
  expandedIds,
  toggleExpanded,
  searchQuery,
  useRegex,
  bookmarkedIds,
  toggleBookmark,
  handleSelectLog,
  t,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  maxHeight: string;
  isLoading: boolean;
  error: Error | null;
  filteredLogs: StructuredLogEntry[];
  groupByTraceId: boolean;
  groupedLogs: Map<string, StructuredLogEntry[]>;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  searchQuery: string;
  useRegex: boolean;
  bookmarkedIds: Set<string>;
  toggleBookmark: (id: string) => void;
  handleSelectLog: (log: StructuredLogEntry) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_LOG_HEIGHT,
    overscan: 10,
  });

  if (isLoading && filteredLogs.length === 0) {
    return (
      <div className="flex-1 overflow-auto" style={{ maxHeight }} ref={scrollRef}>
        <div className="flex items-center justify-center py-8">
          <InlineLoading text={t('panel.loadingLogs')} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto" style={{ maxHeight }} ref={scrollRef}>
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('panel.errorLoading')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (filteredLogs.length === 0) {
    return (
      <div className="flex-1 overflow-auto" style={{ maxHeight }} ref={scrollRef}>
        <Empty className="py-8 border-0">
          <EmptyTitle className="text-sm font-normal text-muted-foreground">
            {t('panel.noLogs')}
          </EmptyTitle>
        </Empty>
      </div>
    );
  }

  if (groupByTraceId) {
    return (
      <div className="flex-1 overflow-auto" style={{ maxHeight }} ref={scrollRef}>
        <div className="p-2">
          {Array.from(groupedLogs.entries()).map(([traceId, traceLogs]) => (
            <TraceGroup
              key={traceId}
              traceId={traceId}
              logs={traceLogs}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              searchQuery={searchQuery}
              useRegex={useRegex}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              t={t}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto"
      style={{ maxHeight }}
    >
      <div
        ref={containerRef}
        tabIndex={0}
        className="outline-none relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const log = filteredLogs[virtualRow.index];
          return (
            <div
              key={log.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MemoizedLogEntry
                log={log}
                isExpanded={expandedIds.has(log.id)}
                onToggle={() => toggleExpanded(log.id)}
                onSelect={() => handleSelectLog(log)}
                searchQuery={searchQuery}
                useRegex={useRegex}
                isBookmarked={bookmarkedIds.has(log.id)}
                onToggleBookmark={toggleBookmark}
                t={t}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LogPanel({
  className,
  maxHeight = '600px',
  defaultAutoRefresh = false,
  refreshInterval = 2000,
  groupByTraceId = false,
  showStats = true,
  showTimeline = true,
  includeAgentTrace = true,
}: LogPanelProps) {
  const t = useTranslations('logging');

  const [autoRefresh, setAutoRefresh] = useState(defaultAutoRefresh);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [useRegex, setUseRegex] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLog, setSelectedLog] = useState<StructuredLogEntry | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modules = useLogModules();

  // Persist bookmarks to localStorage
  const toggleBookmark = useCallback((id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Get time range cutoff (calculated during filter, not in useMemo to avoid impure function issue)
  const getTimeRangeCutoff = useCallback(() => {
    if (timeRange === 'all') return 0;
    return Date.now() - TIME_RANGES[timeRange];
  }, [timeRange]);

  const { logs, groupedLogs, isLoading, error, refresh, clearLogs, exportLogs, stats, logRate } =
    useLogStream({
      autoRefresh,
      refreshInterval,
      level: levelFilter,
      module: moduleFilter === 'all' || moduleFilter === AGENT_TRACE_MODULE ? undefined : moduleFilter,
      searchQuery: deferredSearchQuery || undefined,
      useRegex,
      groupByTraceId,
      maxLogs: 1000,
    });

  // Agent trace integration
  const agentTraceLogs = useAgentTraceAsLogs({
    enabled: includeAgentTrace,
    maxLogs: 200,
  });

  // Agent trace DB rows for the Trace timeline view
  const { traces: agentTraceDbRows } = useAgentTrace({
    limit: includeAgentTrace && viewMode === 'trace' ? 100 : 0,
  });

  // Merge regular logs with agent trace logs
  const mergedLogs = useMemo(() => {
    if (!includeAgentTrace || agentTraceLogs.logs.length === 0) return logs;
    return [...logs, ...agentTraceLogs.logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 1000);
  }, [logs, agentTraceLogs.logs, includeAgentTrace]);

  // Augmented module list with agent-trace
  const augmentedModules = useMemo(() => {
    if (!includeAgentTrace) return modules;
    const hasAgentTrace = modules.includes(AGENT_TRACE_MODULE);
    return hasAgentTrace ? modules : [...modules, AGENT_TRACE_MODULE];
  }, [modules, includeAgentTrace]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Download helper
  const downloadBlob = useCallback((blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-logs-${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Export logs in different formats
  const handleExport = useCallback(
    (format: ExportFormat = 'json') => {
      const content = exportLogs(format === 'csv' ? 'text' : format);
      let mimeType = 'application/json';
      let extension = 'json';

      if (format === 'csv') {
        // Convert to CSV format
        const csvContent = logs
          .map((log) => {
            const timestamp = new Date(log.timestamp).toISOString();
            const message = log.message.replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
            return `"${timestamp}","${log.level}","${log.module}","${message}"`;
          })
          .join('\n');
        const csvHeader = '"Timestamp","Level","Module","Message"\n';
        mimeType = 'text/csv';
        extension = 'csv';
        const blob = new Blob([csvHeader + csvContent], { type: mimeType });
        downloadBlob(blob, extension);
        return;
      } else if (format === 'text') {
        mimeType = 'text/plain';
        extension = 'txt';
      }

      const blob = new Blob([content], { type: mimeType });
      downloadBlob(blob, extension);
    },
    [exportLogs, logs, downloadBlob]
  );

  // Scroll controls
  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Filter logs by time range and module (using merged logs)
  const filteredLogs = useMemo(() => {
    let result = mergedLogs;

    // Filter by module selection
    if (moduleFilter === AGENT_TRACE_MODULE) {
      // Show only agent-trace entries
      result = result.filter((log) => log.module === AGENT_TRACE_MODULE);
    } else if (moduleFilter !== 'all') {
      // When a specific regular module is selected, exclude agent-trace entries
      result = result.filter((log) => log.module !== AGENT_TRACE_MODULE);
    }

    if (timeRange !== 'all') {
      const cutoff = getTimeRangeCutoff();
      result = result.filter((log) => new Date(log.timestamp).getTime() >= cutoff);
    }
    return result;
  }, [mergedLogs, timeRange, getTimeRangeCutoff, moduleFilter]);

  // Related logs for the detail panel (same traceId)
  const relatedLogs = useMemo(() => {
    if (!selectedLog?.traceId) return [];
    return logs.filter((l) => l.traceId === selectedLog.traceId);
  }, [logs, selectedLog]);

  // Handle selecting a log for detail view
  const handleSelectLog = useCallback((log: StructuredLogEntry) => {
    setSelectedLog(log);
    setShowDetailPanel(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        refresh();
      } else if (e.key === 'Escape') {
        if (showDetailPanel) {
          setShowDetailPanel(false);
        } else {
          setSearchQuery('');
        }
      } else if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setViewMode((prev) => (prev === 'list' ? 'dashboard' : 'list'));
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredLogs.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredLogs.length) {
        e.preventDefault();
        const log = filteredLogs[focusedIndex];
        toggleExpanded(log.id);
      } else if (e.key === 'o' && focusedIndex >= 0 && focusedIndex < filteredLogs.length) {
        e.preventDefault();
        handleSelectLog(filteredLogs[focusedIndex]);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [refresh, showDetailPanel, filteredLogs, focusedIndex, toggleExpanded, handleSelectLog]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && autoScroll && autoRefresh) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll, autoRefresh]);

  return (
    <div className={cn('flex flex-col border rounded-lg bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 p-2 sm:p-3 border-b bg-muted/30">
        {/* View mode toggle + Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-0">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-md shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('panel.listView')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setViewMode('dashboard')}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('panel.dashboardView')}</TooltipContent>
            </Tooltip>
            {includeAgentTrace && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'trace' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setViewMode('trace')}
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('panel.traceView')}</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Search with regex toggle */}
          <InputGroup className="flex-1 sm:max-w-xs h-8">
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={useRegex ? t('panel.regexPlaceholder') : t('panel.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={useRegex && searchQuery ? 'font-mono text-xs' : ''}
            />
          </InputGroup>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={useRegex ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2 shrink-0"
                onClick={() => setUseRegex(!useRegex)}
              >
                <Regex className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('panel.toggleRegex')}</TooltipContent>
          </Tooltip>
        </div>

        {/* Filters row - scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | 'all')}>
            <SelectTrigger className="w-[100px] sm:w-[120px] h-8 shrink-0">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('panel.allLevels')} ({stats.total})</SelectItem>
              {ALL_LEVELS.map((level) => {
                const count = stats.byLevel[level] || 0;
                return (
                  <SelectItem key={level} value={level}>
                    {t(`levels.${level}`)} {count > 0 && `(${count})`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 shrink-0">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('panel.allModules')}</SelectItem>
              {augmentedModules.map((mod) => (
                <SelectItem key={mod} value={mod}>
                  {mod === AGENT_TRACE_MODULE ? t('panel.agentTraceModule') : mod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[90px] sm:w-[100px] h-8 shrink-0">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('panel.timeRangeAll')}</SelectItem>
              <SelectItem value="15m">{t('panel.timeRange15m')}</SelectItem>
              <SelectItem value="1h">{t('panel.timeRange1h')}</SelectItem>
              <SelectItem value="6h">{t('panel.timeRange6h')}</SelectItem>
              <SelectItem value="24h">{t('panel.timeRange24h')}</SelectItem>
              <SelectItem value="7d">{t('panel.timeRange7d')}</SelectItem>
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
                onClick={(e) => {
                  if (e.shiftKey) {
                    setAutoRefresh(!autoRefresh);
                  } else {
                    refresh();
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setAutoRefresh(!autoRefresh);
                }}
              >
                <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {autoRefresh ? t('panel.disableAutoRefresh') : t('panel.refresh')}
              <span className="block text-muted-foreground text-[10px]">
                Shift+Click: {autoRefresh ? t('panel.disableAutoRefresh') : t('panel.enableAutoRefresh')}
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('panel.exportAs')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('text')}>
                <FileText className="h-4 w-4 mr-2" />
                {t('panel.exportText')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => clearLogs()}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('panel.clear')}</TooltipContent>
          </Tooltip>

          {/* Detail panel toggle */}
          {showDetailPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailPanel(false)}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('panel.closeDetails')}</TooltipContent>
            </Tooltip>
          )}

          {/* Scroll controls */}
          <div className="flex items-center border-l pl-1 ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={scrollToTop}>
                  <ChevronsUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('panel.scrollToTop')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={autoScroll ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                >
                  {autoScroll ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {autoScroll ? t('panel.pauseAutoScroll') : t('panel.resumeAutoScroll')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={scrollToBottom}>
                  <ChevronsDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('panel.scrollToBottom')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {showStats && (
        <div className="flex items-center gap-4 px-3 py-2 border-b bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            {t('panel.total')}:{' '}
            <span className="font-medium text-foreground">{filteredLogs.length}</span>
            {filteredLogs.length !== stats.total && (
              <span className="text-muted-foreground/70"> / {stats.total}</span>
            )}
          </span>
          {Object.entries(stats.byLevel).map(([level, count]) => {
            if (count === 0) return null;
            const config = LEVEL_CONFIG[level as LogLevel];
            return (
              <span key={level} className={cn('flex items-center gap-1', config.color)}>
                {t(`levels.${level}`)}: <span className="font-medium">{count}</span>
              </span>
            );
          })}
          {logRate > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground ml-auto">
              <Activity className="h-3 w-3" />
              ~{logRate} {t('panel.logsPerMin')}
            </span>
          )}
        </div>
      )}

      {/* Main content area with optional detail panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Log list or Dashboard */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline visualization */}
          {showTimeline && viewMode === 'list' && filteredLogs.length > 0 && (
            <LogTimeline logs={filteredLogs} />
          )}

          {/* Content based on view mode */}
          {viewMode === 'dashboard' ? (
            <ScrollArea className="flex-1" style={{ maxHeight }}>
              <LogStatsDashboard logs={filteredLogs} />
            </ScrollArea>
          ) : viewMode === 'trace' ? (
            <ScrollArea className="flex-1" style={{ maxHeight }}>
              {agentTraceDbRows.length === 0 ? (
                <Empty className="py-12">
                  <EmptyTitle>{t('panel.noTraceEvents')}</EmptyTitle>
                </Empty>
              ) : (
                <AgentTraceTimeline traces={agentTraceDbRows} />
              )}
            </ScrollArea>
          ) : (
            <VirtualizedLogList
              scrollRef={scrollRef}
              containerRef={containerRef}
              maxHeight={maxHeight}
              isLoading={isLoading}
              error={error}
              filteredLogs={filteredLogs}
              groupByTraceId={groupByTraceId}
              groupedLogs={groupedLogs}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              searchQuery={searchQuery}
              useRegex={useRegex}
              bookmarkedIds={bookmarkedIds}
              toggleBookmark={toggleBookmark}
              handleSelectLog={handleSelectLog}
              t={t}
            />
          )}
        </div>

        {/* Right: Detail Panel */}
        {showDetailPanel && selectedLog && (
          <LogDetailPanel
            log={selectedLog}
            relatedLogs={relatedLogs}
            isBookmarked={bookmarkedIds.has(selectedLog.id)}
            onClose={() => setShowDetailPanel(false)}
            onToggleBookmark={toggleBookmark}
            onSelectRelated={(log) => setSelectedLog(log)}
            className="w-[350px] lg:w-[400px] shrink-0"
          />
        )}
      </div>
    </div>
  );
}

export default LogPanel;
