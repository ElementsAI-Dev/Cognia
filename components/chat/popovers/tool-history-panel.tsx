'use client';

/**
 * ToolHistoryPanel - Display tool call history and enable quick reuse
 * 
 * Shows recent tool calls, allows filtering, and enables quick re-invocation
 * with previous prompts. Integrates with the tool history store.
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  History,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  FileText,
  ChevronRight,
  Trash2,
  Star,
  Pin,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToolHistoryStore } from '@/stores';
import type { ToolCallRecord, ToolCallResultStatus, ToolType } from '@/types/agent/tool-history';

interface ToolHistoryPanelProps {
  /** Callback when a tool is selected for reuse */
  onSelectTool?: (toolId: string, prompt: string) => void;
  /** Callback when prompts should be inserted */
  onInsertPrompt?: (prompt: string) => void;
  /** Maximum height of the panel */
  maxHeight?: number;
  /** Show as popover trigger */
  asPopover?: boolean;
  /** Custom trigger element for popover mode */
  trigger?: React.ReactNode;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getResultIcon(result: ToolCallResultStatus) {
  switch (result) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <X className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
  }
}

function getToolTypeIcon(type: ToolType) {
  switch (type) {
    case 'mcp':
      return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'skill':
      return <FileText className="h-4 w-4 text-purple-500" />;
  }
}

interface HistoryItemProps {
  record: ToolCallRecord;
  onSelect?: () => void;
  onDelete?: () => void;
  onInsertPrompt?: () => void;
}

function HistoryItem({ record, onSelect, onDelete, onInsertPrompt }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div 
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
          {getToolTypeIcon(record.toolType)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{record.toolName}</span>
            {record.serverName && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {record.serverName}
              </Badge>
            )}
            {getResultIcon(record.result)}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {record.promptSummary || record.prompt}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{formatTimeAgo(record.calledAt)}</span>
            {record.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(record.duration)}</span>
              </>
            )}
          </div>
        </div>

        <ChevronRight 
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            expanded && 'rotate-90'
          )} 
        />
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs font-medium mb-1">Prompt:</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {record.prompt}
            </p>
          </div>
          
          {record.output && (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs font-medium mb-1">Output:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {record.output}
              </p>
            </div>
          )}

          {record.errorMessage && (
            <div className="bg-red-500/10 rounded-md p-2">
              <p className="text-xs font-medium text-red-500 mb-1">Error:</p>
              <p className="text-xs text-red-500/80">{record.errorMessage}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {onInsertPrompt && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsertPrompt();
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Use Prompt
              </Button>
            )}
            {onSelect && (
              <Button 
                size="sm" 
                variant="default" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                Reuse Tool
              </Button>
            )}
            {onDelete && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs text-muted-foreground hover:text-destructive ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolHistoryContent({
  onSelectTool,
  onInsertPrompt,
  maxHeight = 400,
}: Omit<ToolHistoryPanelProps, 'asPopover' | 'trigger'>) {
  const _t = useTranslations('toolHistory');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<ToolCallResultStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<ToolType | 'all'>('all');

  const history = useToolHistoryStore((state) => state.history);
  const deleteRecord = useToolHistoryStore((state) => state.deleteRecord);
  const clearHistory = useToolHistoryStore((state) => state.clearHistory);
  const getRecentTools = useToolHistoryStore((state) => state.getRecentTools);
  const getFrequentTools = useToolHistoryStore((state) => state.getFrequentTools);

  const recentTools = useMemo(() => getRecentTools(5), [getRecentTools]);
  const frequentTools = useMemo(() => getFrequentTools(5), [getFrequentTools]);

  const filteredHistory = useMemo(() => {
    let records = [...history];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter(r =>
        r.toolName.toLowerCase().includes(query) ||
        r.prompt.toLowerCase().includes(query) ||
        r.serverName?.toLowerCase().includes(query)
      );
    }

    if (filterResult !== 'all') {
      records = records.filter(r => r.result === filterResult);
    }

    if (filterType !== 'all') {
      records = records.filter(r => r.toolType === filterType);
    }

    return records.slice(0, 50);
  }, [history, searchQuery, filterResult, filterType]);

  const handleSelectTool = useCallback((record: ToolCallRecord) => {
    onSelectTool?.(record.toolId, record.prompt);
  }, [onSelectTool]);

  const handleInsertPrompt = useCallback((prompt: string) => {
    onInsertPrompt?.(prompt);
  }, [onInsertPrompt]);

  const hasFilters = filterResult !== 'all' || filterType !== 'all' || searchQuery;

  return (
    <div className="flex flex-col" style={{ maxHeight }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Tool History</span>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </div>
        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearHistory}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Quick Access */}
      {(recentTools.length > 0 || frequentTools.length > 0) && !hasFilters && (
        <div className="p-3 border-b space-y-3">
          {recentTools.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent
              </p>
              <div className="flex flex-wrap gap-1">
                {recentTools.map((stats) => (
                  <Badge
                    key={stats.toolId}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent text-xs"
                    onClick={() => {
                      const lastCall = history.find(h => h.toolId === stats.toolId);
                      if (lastCall) handleSelectTool(lastCall);
                    }}
                  >
                    {stats.toolName}
                    {stats.totalCalls > 1 && (
                      <span className="ml-1 text-muted-foreground">
                        {stats.totalCalls}×
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {frequentTools.length > 0 && frequentTools.some(t => t.totalCalls >= 3) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Star className="h-3 w-3" /> Frequent
              </p>
              <div className="flex flex-wrap gap-1">
                {frequentTools
                  .filter(t => t.totalCalls >= 3)
                  .map((stats) => (
                    <Badge
                      key={stats.toolId}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent text-xs"
                      onClick={() => {
                        const lastCall = history.find(h => h.toolId === stats.toolId);
                        if (lastCall) handleSelectTool(lastCall);
                      }}
                    >
                      {stats.isFavorite && <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />}
                      {stats.isPinned && <Pin className="h-3 w-3 mr-1" />}
                      {stats.toolName}
                      <span className="ml-1 text-muted-foreground">
                        {stats.totalCalls}×
                      </span>
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterResult} onValueChange={(v) => setFilterResult(v as typeof filterResult)}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mcp">MCP Tools</SelectItem>
              <SelectItem value="skill">Skills</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => {
                setSearchQuery('');
                setFilterResult('all');
                setFilterType('all');
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        {filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {hasFilters ? 'No matching history' : 'No tool history yet'}
            </p>
            <p className="text-xs mt-1">
              {hasFilters ? 'Try different filters' : 'Use @mentions to call tools'}
            </p>
          </div>
        ) : (
          filteredHistory.map((record) => (
            <HistoryItem
              key={record.id}
              record={record}
              onSelect={() => handleSelectTool(record)}
              onDelete={() => deleteRecord(record.id)}
              onInsertPrompt={() => handleInsertPrompt(record.prompt)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}

export function ToolHistoryPanel({
  onSelectTool,
  onInsertPrompt,
  maxHeight = 400,
  asPopover = false,
  trigger,
}: ToolHistoryPanelProps) {
  const historyCount = useToolHistoryStore((state) => state.history.length);

  if (asPopover) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <History className="h-4 w-4" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {historyCount > 99 ? '99+' : historyCount}
                </span>
              )}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <ToolHistoryContent
            onSelectTool={onSelectTool}
            onInsertPrompt={onInsertPrompt}
            maxHeight={maxHeight}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ToolHistoryContent
        onSelectTool={onSelectTool}
        onInsertPrompt={onInsertPrompt}
        maxHeight={maxHeight}
      />
    </Card>
  );
}

export default ToolHistoryPanel;
