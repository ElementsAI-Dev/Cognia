'use client';

/**
 * Git Tag Panel - Tag management UI
 *
 * Provides:
 * - Tag list with search/filter
 * - Create dialog (name, message, target)
 * - Delete confirmation + push to remote
 * - Badge for annotated vs lightweight tags
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tag,
  Plus,
  Trash2,
  Upload,
  Search,
  Loader2,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { GitTagInfo } from '@/types/system/git';
import type { GitTagPanelProps } from '@/types/git';

// ==================== Component ====================

export function GitTagPanel({
  tags,
  onCreateTag,
  onDeleteTag,
  onPushTag,
  onRefresh,
  isLoading,
  className,
}: GitTagPanelProps) {
  const t = useTranslations('git');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [tagTarget, setTagTarget] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GitTagInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pushingTag, setPushingTag] = useState<string | null>(null);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(q) ||
        tag.message?.toLowerCase().includes(q)
    );
  }, [tags, searchQuery]);

  const handleCreate = useCallback(async () => {
    if (!tagName.trim()) return;
    setIsCreating(true);
    try {
      const success = await onCreateTag(
        tagName.trim(),
        tagMessage.trim() || undefined,
        tagTarget.trim() || undefined
      );
      if (success) {
        setShowCreateDialog(false);
        setTagName('');
        setTagMessage('');
        setTagTarget('');
      }
    } finally {
      setIsCreating(false);
    }
  }, [tagName, tagMessage, tagTarget, onCreateTag]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteTag(deleteTarget.name);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDeleteTag]);

  const handlePush = useCallback(async (name: string) => {
    setPushingTag(name);
    try {
      await onPushTag(name);
    } finally {
      setPushingTag(null);
    }
  }, [onPushTag]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <span className="text-sm font-medium">{t('tags.title')}</span>
          <Badge variant="secondary" className="text-xs">
            {tags.length}
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
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('tags.new')}
          </Button>
        </div>
      </div>

      {/* Search */}
      {tags.length > 5 && (
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tags.search')}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Tag List */}
      {filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground">
          <Tag className="h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm">
            {tags.length === 0 ? t('tags.empty') : t('tags.noResults')}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredTags.map((tag) => (
              <div
                key={tag.name}
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{tag.name}</span>
                    <Badge
                      variant={tag.isAnnotated ? 'default' : 'outline'}
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      {tag.isAnnotated ? t('tags.annotated') : t('tags.lightweight')}
                    </Badge>
                  </div>
                  {tag.message && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {tag.message}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" />
                      {tag.shortHash}
                    </span>
                    {tag.date && (
                      <span>{formatCommitDate(tag.date)}</span>
                    )}
                    {tag.tagger && (
                      <span>{tag.tagger}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePush(tag.name)}
                    disabled={pushingTag === tag.name}
                    title={t('tags.push')}
                  >
                    {pushingTag === tag.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(tag)}
                    title={t('tags.delete')}
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
            <DialogTitle>{t('tags.createTitle')}</DialogTitle>
            <DialogDescription>{t('tags.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">{t('tags.name')}</Label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="v1.0.0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">{t('tags.message')} ({t('tags.optional')})</Label>
              <Input
                value={tagMessage}
                onChange={(e) => setTagMessage(e.target.value)}
                placeholder={t('tags.messagePlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">{t('tags.target')} ({t('tags.optional')})</Label>
              <Input
                value={tagTarget}
                onChange={(e) => setTagTarget(e.target.value)}
                placeholder="HEAD"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('tags.targetHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('tags.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !tagName.trim()}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Tag className="h-4 w-4 mr-2" />
              )}
              {t('tags.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tags.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tags.deleteConfirm', { name: deleteTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('tags.cancel')}</AlertDialogCancel>
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
              {t('tags.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
