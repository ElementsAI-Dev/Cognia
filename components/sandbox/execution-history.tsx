'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Clock,
  Code2,
  Filter,
  MoreVertical,
  Play,
  RefreshCw,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useExecutionHistory, useTagsCategories } from '@/hooks/use-sandbox-db';
import type {
  ExecutionFilter,
  ExecutionRecord,
  ExecutionStatus,
  RuntimeType,
} from '@/types/sandbox';
import { getLanguageInfo } from '@/types/sandbox';

interface ExecutionHistoryProps {
  className?: string;
  onSelectExecution?: (execution: ExecutionRecord) => void;
  onRerunCode?: (execution: ExecutionRecord) => void;
}

const STATUS_CONFIG: Record<
  ExecutionStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: '等待中', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  running: { label: '运行中', color: 'text-blue-500', bgColor: 'bg-blue-100' },
  completed: { label: '成功', color: 'text-green-500', bgColor: 'bg-green-100' },
  failed: { label: '失败', color: 'text-red-500', bgColor: 'bg-red-100' },
  timeout: { label: '超时', color: 'text-orange-500', bgColor: 'bg-orange-100' },
  cancelled: { label: '已取消', color: 'text-gray-400', bgColor: 'bg-gray-100' },
};

const RUNTIME_LABELS: Record<RuntimeType, string> = {
  docker: 'Docker',
  podman: 'Podman',
  native: '本地',
};

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ExecutionItem({
  execution,
  onSelect,
  onRerun,
  onToggleFavorite,
  onDelete,
  onAddTag,
  onRemoveTag,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  availableTags,
}: {
  execution: ExecutionRecord;
  onSelect?: () => void;
  onRerun?: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  availableTags: string[];
}) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const langInfo = getLanguageInfo(execution.language);
  const statusConfig = STATUS_CONFIG[execution.status];

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
      setShowTagInput(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer',
        execution.is_favorite && 'border-yellow-300 bg-yellow-50/30'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" title={langInfo.name}>
            {langInfo.icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {langInfo.name}
              </span>
              <Badge
                variant="outline"
                className={cn('text-xs', statusConfig.color, statusConfig.bgColor)}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(execution.execution_time_ms)}
              </span>
              <span>•</span>
              <span>{RUNTIME_LABELS[execution.runtime]}</span>
              <span>•</span>
              <span>{formatDate(execution.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      execution.is_favorite && 'fill-yellow-400 text-yellow-400'
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {execution.is_favorite ? '取消收藏' : '收藏'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onRerun && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRerun();
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>重新运行</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTagInput(true)}>
                <Tag className="h-4 w-4 mr-2" />
                添加标签
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2">
        <pre className="text-xs bg-muted/50 rounded p-2 overflow-hidden max-h-16 text-muted-foreground">
          {execution.code.slice(0, 200)}
          {execution.code.length > 200 && '...'}
        </pre>
      </div>

      {execution.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {execution.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/20"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag(tag);
              }}
            >
              {tag}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {showTagInput && (
        <div
          className="flex items-center gap-2 mt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="输入标签..."
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
              if (e.key === 'Escape') setShowTagInput(false);
            }}
            autoFocus
          />
          <Button size="sm" className="h-7" onClick={handleAddTag}>
            添加
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setShowTagInput(false)}
          >
            取消
          </Button>
        </div>
      )}

      {execution.error && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2 truncate">
          {execution.error}
        </div>
      )}
    </div>
  );
}

export function ExecutionHistory({
  className,
  onSelectExecution,
  onRerunCode,
}: ExecutionHistoryProps) {
  const [filter, setFilter] = useState<ExecutionFilter>({
    limit: 50,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { tags: availableTags } = useTagsCategories();

  const appliedFilter = useMemo(
    () => ({
      ...filter,
      search_query: searchQuery || undefined,
    }),
    [filter, searchQuery]
  );

  const {
    executions,
    loading,
    error,
    refresh,
    deleteExecution,
    toggleFavorite,
    addTags,
    removeTags,
    clearHistory,
  } = useExecutionHistory({ filter: appliedFilter });

  const handleDelete = useCallback(async () => {
    if (deleteConfirmId) {
      await deleteExecution(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteExecution]);

  const handleClearHistory = useCallback(async () => {
    const count = await clearHistory();
    if (count > 0) {
      refresh();
    }
  }, [clearHistory, refresh]);

  const updateFilter = useCallback(
    (updates: Partial<ExecutionFilter>) => {
      setFilter((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const clearFilter = useCallback(() => {
    setFilter({ limit: 50 });
    setSearchQuery('');
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      filter.language ||
      filter.status ||
      filter.runtime ||
      filter.is_favorite !== undefined ||
      filter.tags?.length ||
      searchQuery,
    [filter, searchQuery]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          执行历史
        </h3>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => refresh()}
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFilters ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>过滤器</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索代码..."
            className="pl-8 h-9"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filter.language || 'all'}
              onValueChange={(v) =>
                updateFilter({ language: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有语言</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
                <SelectItem value="java">Java</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.status || 'all'}
              onValueChange={(v) =>
                updateFilter({
                  status: v === 'all' ? undefined : (v as ExecutionStatus),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="completed">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="timeout">超时</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.runtime || 'all'}
              onValueChange={(v) =>
                updateFilter({
                  runtime: v === 'all' ? undefined : (v as RuntimeType),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="运行时" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有运行时</SelectItem>
                <SelectItem value="docker">Docker</SelectItem>
                <SelectItem value="podman">Podman</SelectItem>
                <SelectItem value="native">本地</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                filter.is_favorite === undefined
                  ? 'all'
                  : filter.is_favorite
                  ? 'favorite'
                  : 'normal'
              }
              onValueChange={(v) =>
                updateFilter({
                  is_favorite:
                    v === 'all' ? undefined : v === 'favorite',
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="收藏" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="favorite">仅收藏</SelectItem>
                <SelectItem value="normal">未收藏</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {executions.length} 条记录
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={clearFilter}
            >
              清除过滤
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading && executions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refresh()}
              >
                重试
              </Button>
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无执行历史</p>
              {hasActiveFilters && (
                <p className="text-xs mt-1">尝试调整过滤条件</p>
              )}
            </div>
          ) : (
            executions.map((execution) => (
              <ExecutionItem
                key={execution.id}
                execution={execution}
                onSelect={() => onSelectExecution?.(execution)}
                onRerun={onRerunCode ? () => onRerunCode(execution) : undefined}
                onToggleFavorite={() => toggleFavorite(execution.id)}
                onDelete={() => setDeleteConfirmId(execution.id)}
                onAddTag={(tag) => addTags(execution.id, [tag])}
                onRemoveTag={(tag) => removeTags(execution.id, [tag])}
                availableTags={availableTags}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {executions.length > 0 && (
        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-destructive hover:text-destructive"
            onClick={handleClearHistory}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            清除历史记录
          </Button>
        </div>
      )}

      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条执行记录吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExecutionHistory;
