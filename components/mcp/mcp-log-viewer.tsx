'use client';

/**
 * MCPLogViewer - Displays MCP server log messages
 * Supports filtering by level and searching
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Download,
  Trash2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/mcp/format-utils';
import { MCP_ALL_LOG_LEVELS } from '@/lib/mcp/constants';
import type { LogLevel, MCPLogEntry } from '@/types/mcp';

export { type MCPLogEntry } from '@/types/mcp';

export interface MCPLogViewerProps {
  logs: MCPLogEntry[];
  title?: string;
  maxHeight?: number;
  autoScroll?: boolean;
  showServerColumn?: boolean;
  onClear?: () => void;
  className?: string;
}

const levelConfig: Record<
  LogLevel,
  { icon: React.ElementType; color: string; bgColor: string; priority: number }
> = {
  debug: {
    icon: Bug,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    priority: 0,
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    priority: 1,
  },
  notice: {
    icon: Info,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    priority: 2,
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    priority: 3,
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    priority: 4,
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-200 dark:bg-red-900/50',
    priority: 5,
  },
  alert: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-200 dark:bg-orange-900/50',
    priority: 6,
  },
  emergency: {
    icon: AlertCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-300 dark:bg-red-900/70',
    priority: 7,
  },
};


export function MCPLogViewer({
  logs,
  title,
  maxHeight = 300,
  autoScroll = true,
  showServerColumn = true,
  onClear,
  className,
}: MCPLogViewerProps) {
  const t = useTranslations('mcp');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set(MCP_ALL_LOG_LEVELS));
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll, isCollapsed]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!selectedLevels.has(log.level)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.serverId?.toLowerCase().includes(query) ||
          log.serverName?.toLowerCase().includes(query) ||
          log.logger?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [logs, selectedLevels, searchQuery]);

  // Count by level
  const levelCounts = useMemo(() => {
    const counts: Partial<Record<LogLevel, number>> = {};
    for (const log of logs) {
      counts[log.level] = (counts[log.level] || 0) + 1;
    }
    return counts;
  }, [logs]);

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const toggleLogExpanded = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.serverName || log.serverId || ''}: ${log.message}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasErrors =
    (levelCounts.error || 0) +
      (levelCounts.critical || 0) +
      (levelCounts.alert || 0) +
      (levelCounts.emergency || 0) >
    0;

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden',
        hasErrors && 'border-red-300 dark:border-red-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <button
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {hasErrors ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{title || t('logs')}</span>
          <Badge variant="secondary" className="text-[10px]">
            {filteredLogs.length}
            {filteredLogs.length !== logs.length && ` / ${logs.length}`}
          </Badge>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {!isCollapsed && (
          <div className="flex items-center gap-1">
            {/* Level filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {MCP_ALL_LOG_LEVELS.map((level) => {
                  const config = levelConfig[level];
                  const count = levelCounts[level] || 0;
                  return (
                    <DropdownMenuCheckboxItem
                      key={level}
                      checked={selectedLevels.has(level)}
                      onCheckedChange={() => toggleLevel(level)}
                      className="gap-2"
                    >
                      <config.icon className={cn('h-3 w-3', config.color)} />
                      <span className="flex-1 capitalize">{level}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">
                          {count}
                        </Badge>
                      )}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
            </Button>

            {/* Clear */}
            {onClear && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Search bar */}
          <div className="p-2 border-b bg-background/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('searchLogs')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Log entries */}
          <ScrollArea style={{ maxHeight }} ref={scrollRef}>
            {filteredLogs.length === 0 ? (
              <Empty className="py-8">
                <EmptyMedia variant="icon">
                  <Info className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>{logs.length === 0 ? t('noLogs') : t('noMatchingLogs')}</EmptyTitle>
                <EmptyDescription>
                  {logs.length === 0 ? t('noLogsDescription') : t('noMatchingLogsDescription')}
                </EmptyDescription>
              </Empty>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredLogs.map((log) => {
                  const config = levelConfig[log.level];
                  const Icon = config.icon;
                  const isExpanded = expandedLogs.has(log.id);
                  const hasData = log.data !== undefined;

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'px-3 py-2 text-xs hover:bg-accent/30 transition-colors',
                        config.bgColor
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {/* Timestamp */}
                        <span className="text-muted-foreground font-mono shrink-0 w-[90px]">
                          {formatTimestamp(log.timestamp)}
                        </span>

                        {/* Level badge */}
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] px-1 h-4 shrink-0 uppercase', config.color)}
                        >
                          <Icon className="h-2.5 w-2.5 mr-0.5" />
                          {log.level}
                        </Badge>

                        {/* Server */}
                        {showServerColumn && (log.serverName || log.serverId) && (
                          <span className="text-muted-foreground font-mono shrink-0 max-w-[80px] truncate">
                            {log.serverName || log.serverId}
                          </span>
                        )}

                        {/* Logger */}
                        {log.logger && (
                          <span className="text-muted-foreground shrink-0">[{log.logger}]</span>
                        )}

                        {/* Message */}
                        <span className="flex-1 break-all">{log.message}</span>

                        {/* Expand data button */}
                        {hasData && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 shrink-0"
                            onClick={() => toggleLogExpanded(log.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Expanded data */}
                      {isExpanded && hasData && (
                        <div className="mt-2 ml-[90px] p-2 rounded bg-muted/50 font-mono text-[10px] overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
