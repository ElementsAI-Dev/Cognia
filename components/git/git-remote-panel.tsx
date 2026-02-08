'use client';

/**
 * Git Remote Panel - Remote repository management UI
 *
 * Provides:
 * - Remote list showing name, fetch URL, push URL
 * - Add remote dialog (name + URL)
 * - Delete remote confirmation
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Link2,
  Copy,
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
import type { GitRemoteInfo } from '@/types/system/git';

// ==================== Props ====================

interface GitRemotePanelProps {
  remotes: GitRemoteInfo[];
  onAddRemote: (name: string, url: string) => Promise<boolean>;
  onRemoveRemote: (name: string) => Promise<boolean>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== Component ====================

export function GitRemotePanel({
  remotes,
  onAddRemote,
  onRemoveRemote,
  onRefresh,
  isLoading,
  className,
}: GitRemotePanelProps) {
  const t = useTranslations('git');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GitRemoteInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!remoteName.trim() || !remoteUrl.trim()) return;
    setIsAdding(true);
    try {
      const success = await onAddRemote(remoteName.trim(), remoteUrl.trim());
      if (success) {
        setShowAddDialog(false);
        setRemoteName('');
        setRemoteUrl('');
      }
    } finally {
      setIsAdding(false);
    }
  }, [remoteName, remoteUrl, onAddRemote]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onRemoveRemote(deleteTarget.name);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onRemoveRemote]);

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">{t('remotes.title')}</span>
          <Badge variant="secondary" className="text-xs">
            {remotes.length}
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
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('remotes.add')}
          </Button>
        </div>
      </div>

      {/* Remote List */}
      {remotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground">
          <Globe className="h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm">{t('remotes.empty')}</p>
          <p className="text-xs mt-1">{t('remotes.emptyHint')}</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {remotes.map((remote) => (
              <div
                key={remote.name}
                className="group p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{remote.name}</span>
                    {remote.name === 'origin' && (
                      <Badge variant="default" className="text-[10px] px-1 py-0 h-4">
                        {t('remotes.default')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(remote)}
                    title={t('remotes.remove')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* URLs */}
                <div className="space-y-1 ml-6">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-10 shrink-0">fetch</span>
                    <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <code className="font-mono truncate flex-1 text-muted-foreground">
                      {remote.fetchUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleCopyUrl(remote.fetchUrl)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {copiedUrl === remote.fetchUrl && (
                      <span className="text-[10px] text-green-600">{t('remotes.copied')}</span>
                    )}
                  </div>
                  {remote.pushUrl !== remote.fetchUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-10 shrink-0">push</span>
                      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <code className="font-mono truncate flex-1 text-muted-foreground">
                        {remote.pushUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleCopyUrl(remote.pushUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Add Remote Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('remotes.addTitle')}</DialogTitle>
            <DialogDescription>{t('remotes.addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">{t('remotes.name')}</Label>
              <Input
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                placeholder="origin"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">{t('remotes.url')}</Label>
              <Input
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('remotes.cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isAdding || !remoteName.trim() || !remoteUrl.trim()}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('remotes.addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('remotes.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('remotes.removeConfirm', { name: deleteTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('remotes.cancel')}</AlertDialogCancel>
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
              {t('remotes.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
