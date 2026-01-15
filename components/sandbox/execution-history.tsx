'use client';

/**
 * ExecutionHistory - Component for displaying sandbox execution history
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useExecutionHistory } from '@/hooks/sandbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Star,
  StarOff,
  RefreshCw,
  Search,
  Filter,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_INFO, type ExecutionStatus } from '@/types/system/sandbox';

export interface ExecutionHistoryProps {
  className?: string;
  onSelectExecution?: (code: string, language: string) => void;
  limit?: number;
}

export function ExecutionHistory({
  className,
  onSelectExecution,
  limit = 20,
}: ExecutionHistoryProps) {
  const t = useTranslations('sandbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    executions,
    loading,
    refresh,
    deleteExecution,
    toggleFavorite,
    clearHistory,
  } = useExecutionHistory({
    filter: {
      limit,
      language: languageFilter !== 'all' ? languageFilter : undefined,
      status: statusFilter !== 'all' ? (statusFilter as ExecutionStatus) : undefined,
      search_query: searchQuery || undefined,
    },
  });

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    await refresh();
  }, [clearHistory, refresh]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteExecution(id);
  }, [deleteExecution]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    await toggleFavorite(id);
  }, [toggleFavorite]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getLanguageInfo = (lang: string) => {
    return LANGUAGE_INFO[lang] || { name: lang, icon: '📄', color: '#666' };
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle className="text-lg">{t('history.title')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={executions.length === 0}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('history.clearConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('history.clearConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>
                    {t('common.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <CardDescription>{t('history.description')}</CardDescription>
      </CardHeader>

      <div className="px-6 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('history.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('history.language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.allLanguages')}</SelectItem>
              {Object.entries(LANGUAGE_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <span className="mr-2">{info.icon}</span>
                  {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('history.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.allStatus')}</SelectItem>
              <SelectItem value="completed">
                <CheckCircle className="h-4 w-4 mr-2 inline text-green-500" />
                {t('history.completed')}
              </SelectItem>
              <SelectItem value="error">
                <XCircle className="h-4 w-4 mr-2 inline text-red-500" />
                {t('history.error')}
              </SelectItem>
              <SelectItem value="timeout">
                <Clock className="h-4 w-4 mr-2 inline text-yellow-500" />
                {t('history.timeout')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-6 pb-6 space-y-2">
            {executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('history.empty')}</p>
              </div>
            ) : (
              executions.map((execution) => {
                const langInfo = getLanguageInfo(execution.language);
                const isSuccess = execution.status === 'completed' && execution.exit_code === 0;
                
                return (
                  <div
                    key={execution.id}
                    className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onSelectExecution?.(execution.code, execution.language)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{langInfo.icon}</span>
                          <Badge variant="outline" style={{ borderColor: langInfo.color }}>
                            {langInfo.name}
                          </Badge>
                          {isSuccess ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(execution.execution_time_ms)}
                          </span>
                        </div>
                        <pre className="text-xs text-muted-foreground truncate font-mono">
                          {execution.code.slice(0, 100)}
                          {execution.code.length > 100 && '...'}
                        </pre>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(execution.created_at)}
                          </span>
                          {execution.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(execution.id);
                          }}
                        >
                          {execution.is_favorite ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectExecution?.(execution.code, execution.language);
                          }}
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(execution.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ExecutionHistory;
