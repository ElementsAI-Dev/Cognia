'use client';

/**
 * ContextDebugDialog - Debug dialog for monitoring context file usage
 * 
 * Displays real-time statistics about context files, allows garbage collection,
 * and provides insights into context-aware execution.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw,
  Trash2,
  FileText,
  Database,
  Clock,
  Zap,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import { useContextStats, useAutoSync } from '@/hooks/context';
import { cn } from '@/lib/utils';

interface ContextDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContextDebugDialog({ open, onOpenChange }: ContextDebugDialogProps) {
  const t = useTranslations('contextDebug');

  const {
    stats,
    isLoading,
    error,
    refresh,
    runGC,
    clearAll,
    formatSize,
    formatTokens,
  } = useContextStats({ refreshOnMount: true, refreshIntervalMs: 5000 });

  const {
    isSyncing,
    lastResult: syncResult,
    isRunning: isAutoSyncRunning,
    sync: triggerSync,
  } = useAutoSync({ syncOnMount: false });

  const [gcResult, setGcResult] = useState<{ deleted: number; timestamp: Date } | null>(null);

  // Category display info - labels use i18n
  const categoryInfo: Record<string, { labelKey: string; icon: React.ReactNode; color: string }> = {
    'tool-output': { labelKey: 'categories.toolOutputs', icon: <Zap className="h-4 w-4" />, color: 'bg-blue-500' },
    'history': { labelKey: 'categories.chatHistory', icon: <Clock className="h-4 w-4" />, color: 'bg-green-500' },
    'mcp': { labelKey: 'categories.mcpTools', icon: <Database className="h-4 w-4" />, color: 'bg-purple-500' },
    'skills': { labelKey: 'categories.skills', icon: <FileText className="h-4 w-4" />, color: 'bg-orange-500' },
    'terminal': { labelKey: 'categories.terminal', icon: <FolderOpen className="h-4 w-4" />, color: 'bg-gray-500' },
    'temp': { labelKey: 'categories.temporary', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-red-500' },
  };

  // Calculate total files
  const totalFiles = stats
    ? Object.values(stats.filesByCategory).reduce((sum, count) => sum + count, 0)
    : 0;

  // Handle GC
  const handleGC = async () => {
    const deleted = await runGC(24 * 60 * 60 * 1000); // 24 hours
    setGcResult({ deleted, timestamp: new Date() });
  };

  // Handle clear all
  const handleClearAll = async () => {
    if (confirm(t('confirmClearAll'))) {
      await clearAll();
      setGcResult({ deleted: totalFiles, timestamp: new Date() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">{totalFiles}</div>
              <div className="text-xs text-muted-foreground">{t('stats.totalFiles')}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">
                {stats ? formatSize(stats.totalSizeBytes) : '--'}
              </div>
              <div className="text-xs text-muted-foreground">{t('stats.storage')}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">
                {stats ? formatTokens(stats.estimatedTotalTokens) : '--'}
              </div>
              <div className="text-xs text-muted-foreground">{t('stats.estTokens')}</div>
            </div>
          </div>

          <Separator />

          {/* Category Breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('filesByCategory')}</h4>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {stats && Object.entries(stats.filesByCategory).map(([category, count]) => {
                  const info = categoryInfo[category] || {
                    labelKey: 'categories.other',
                    icon: <FileText className="h-4 w-4" />,
                    color: 'bg-gray-400',
                  };
                  const percentage = totalFiles > 0 ? (count / totalFiles) * 100 : 0;

                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className={cn('rounded p-1.5', info.color, 'text-white')}>
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{t(info.labelKey)}</span>
                          <span className="text-muted-foreground">{t('filesCount', { count })}</span>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
                {(!stats || Object.keys(stats.filesByCategory).length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    {t('noContextFiles')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Auto-Sync Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('autoSync')}</h4>
              <p className="text-xs text-muted-foreground">
                {isAutoSyncRunning ? t('running') : t('stopped')} 
                {syncResult && ` • ${t('lastDuration', { ms: syncResult.durationMs })}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t('syncNow')}
                </>
              )}
            </Button>
          </div>

          {/* Timestamps */}
          {stats && (stats.oldestFile || stats.lastAccessed) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {stats.oldestFile && (
                <div>{t('oldestFile')}: {stats.oldestFile.toLocaleString()}</div>
              )}
              {stats.lastAccessed && (
                <div>{t('lastAccessed')}: {stats.lastAccessed.toLocaleString()}</div>
              )}
            </div>
          )}

          {/* GC Result */}
          {gcResult && (
            <div className="rounded-lg bg-muted p-2 text-sm">
              {t('cleanedFiles', { count: gcResult.deleted, time: gcResult.timestamp.toLocaleTimeString() })}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isLoading}
              className="flex-1"
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
              {t('refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGC}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-1" />
              {t('cleanOld')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
