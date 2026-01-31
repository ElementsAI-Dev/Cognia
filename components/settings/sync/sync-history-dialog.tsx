'use client';

/**
 * SyncHistoryDialog - Shows sync history and allows backup management
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/sonner';
import { useSyncStore } from '@/stores/sync';
import type { BackupInfo } from '@/types/sync';

export function SyncHistoryDialog() {
  const t = useTranslations('syncSettings');

  const { syncHistory, listBackups, deleteBackup } = useSyncStore();

  const [isOpen, setIsOpen] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load backups when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listBackups();
      setBackups(list);
    } catch (_error) {
      // Silently ignore backup loading errors
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    setDeletingId(backupId);
    try {
      const success = await deleteBackup(backupId);
      if (success) {
        setBackups((prev) => prev.filter((b) => b.id !== backupId));
        toast.success(t('backupDeleted') || 'Backup deleted');
      } else {
        toast.error(t('deleteFailed') || 'Failed to delete backup');
      }
    } catch (_error) {
      toast.error(t('deleteFailed') || 'Failed to delete backup');
    } finally {
      setDeletingId(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <History className="mr-1.5 h-3.5 w-3.5" />
          {t('history') || 'History'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('syncHistory') || 'Sync History'}
          </DialogTitle>
          <DialogDescription>
            {t('syncHistoryDesc') || 'View sync history and manage remote backups'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recent Syncs */}
          <div>
            <h4 className="mb-2 text-sm font-medium">
              {t('recentSyncs') || 'Recent Syncs'}
            </h4>
            <ScrollArea className="h-[150px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t('status') || 'Status'}</TableHead>
                    <TableHead>{t('direction') || 'Direction'}</TableHead>
                    <TableHead>{t('items') || 'Items'}</TableHead>
                    <TableHead>{t('time') || 'Time'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t('noSyncHistory') || 'No sync history'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncHistory.slice(0, 10).map((sync, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {sync.success ? (
                            <Badge variant="default" className="gap-1 bg-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('success') || 'Success'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              {t('failed') || 'Failed'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{sync.direction}</TableCell>
                        <TableCell>{sync.itemsSynced}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(sync.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Remote Backups */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium">
                {t('remoteBackups') || 'Remote Backups'}
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadBackups}
                disabled={isLoadingBackups}
              >
                {isLoadingBackups ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('refresh') || 'Refresh'
                )}
              </Button>
            </div>
            <ScrollArea className="h-[200px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('filename') || 'Filename'}</TableHead>
                    <TableHead>{t('size') || 'Size'}</TableHead>
                    <TableHead>{t('created') || 'Created'}</TableHead>
                    <TableHead className="w-[100px]">{t('actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBackups ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : backups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t('noBackups') || 'No backups found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-mono text-xs">
                          {backup.filename}
                        </TableCell>
                        <TableCell>{formatBytes(backup.size)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {backup.createdAt ? new Date(backup.createdAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(backup.id)}
                            disabled={deletingId === backup.id}
                          >
                            {deletingId === backup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
