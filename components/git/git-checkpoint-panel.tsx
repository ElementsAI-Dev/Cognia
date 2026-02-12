'use client';

/**
 * Git Checkpoint Panel - Snapshot management UI
 *
 * Inspired by Claude Code Rewind:
 * - Create snapshots of current working state
 * - View checkpoint timeline
 * - Restore to any checkpoint (non-destructive)
 * - Delete checkpoints
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Camera,
  RotateCcw,
  Trash2,
  Plus,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { formatCommitDate } from '@/types/system/git';
import type { GitCheckpoint } from '@/types/system/git';
import type { GitCheckpointPanelProps } from '@/types/git';

// ==================== Component ====================

export function GitCheckpointPanel({
  checkpoints,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
  onRefresh,
  isLoading,
  className,
}: GitCheckpointPanelProps) {
  const t = useTranslations('git');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<GitCheckpoint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GitCheckpoint | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      const success = await onCreateCheckpoint(createMessage || undefined);
      if (success) {
        setShowCreateDialog(false);
        setCreateMessage('');
      }
    } finally {
      setIsCreating(false);
    }
  }, [createMessage, onCreateCheckpoint]);

  const handleRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      await onRestoreCheckpoint(restoreTarget.id);
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
    }
  }, [restoreTarget, onRestoreCheckpoint]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteCheckpoint(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDeleteCheckpoint]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">{t('checkpoint.title')}</span>
          <Badge variant="secondary" className="text-xs">
            {checkpoints.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('checkpoint.create')}
          </Button>
        </div>
      </div>

      {/* Checkpoint List */}
      {checkpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium mb-1">{t('checkpoint.empty')}</h3>
          <p className="text-xs text-muted-foreground max-w-[250px] mb-4">
            {t('checkpoint.emptyDescription')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('checkpoint.createFirst')}
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {checkpoints.map((cp, idx) => (
              <div
                key={cp.id}
                className="group relative flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2',
                    idx === 0
                      ? 'bg-primary border-primary'
                      : 'bg-background border-muted-foreground/40'
                  )} />
                  {idx < checkpoints.length - 1 && (
                    <div className="w-px h-full bg-muted-foreground/20 mt-1 min-h-[24px]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {cp.message}
                    </span>
                    {idx === 0 && (
                      <Badge variant="default" className="text-[10px] px-1 py-0 h-4 shrink-0">
                        {t('checkpoint.latest')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatCommitDate(cp.timestamp)}
                    </span>
                    {cp.filesChanged > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {cp.filesChanged} {t('checkpoint.files')}
                      </span>
                    )}
                    {(cp.additions > 0 || cp.deletions > 0) && (
                      <span>
                        <span className="text-green-600 dark:text-green-400">+{cp.additions}</span>
                        {' / '}
                        <span className="text-red-600 dark:text-red-400">-{cp.deletions}</span>
                      </span>
                    )}
                  </div>

                  <code className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                    {cp.hash.slice(0, 7)}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setRestoreTarget(cp)}
                    title={t('checkpoint.restore')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(cp)}
                    title={t('checkpoint.delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('checkpoint.createTitle')}</DialogTitle>
            <DialogDescription>{t('checkpoint.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={createMessage}
              onChange={(e) => setCreateMessage(e.target.value)}
              placeholder={t('checkpoint.messagePlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('checkpoint.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {t('checkpoint.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('checkpoint.restoreTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('checkpoint.restoreDescription', { message: restoreTarget?.message || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('checkpoint.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {t('checkpoint.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('checkpoint.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('checkpoint.deleteDescription', { message: deleteTarget?.message || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('checkpoint.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('checkpoint.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
