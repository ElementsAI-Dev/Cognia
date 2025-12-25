'use client';

/**
 * VersionHistoryPanel - displays and manages canvas document versions
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  History,
  Clock,
  RotateCcw,
  Trash2,
  ChevronDown,
  Save,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useArtifactStore } from '@/stores';
import { cn } from '@/lib/utils';
import type { CanvasDocumentVersion } from '@/types';

interface VersionHistoryPanelProps {
  documentId: string;
  trigger?: React.ReactNode;
}

export function VersionHistoryPanel({
  documentId,
  trigger,
}: VersionHistoryPanelProps) {
  const t = useTranslations('canvas');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const [previewVersion, setPreviewVersion] = useState<CanvasDocumentVersion | null>(null);
  const [deleteVersion, setDeleteVersion] = useState<CanvasDocumentVersion | null>(null);

  const canvasDocuments = useArtifactStore((state) => state.canvasDocuments);
  const getCanvasVersions = useArtifactStore((state) => state.getCanvasVersions);
  const saveCanvasVersion = useArtifactStore((state) => state.saveCanvasVersion);
  const restoreCanvasVersion = useArtifactStore((state) => state.restoreCanvasVersion);
  const deleteCanvasVersionAction = useArtifactStore((state) => state.deleteCanvasVersion);

  const document = canvasDocuments[documentId];
  const versions = getCanvasVersions(documentId);

  const handleSaveVersion = () => {
    saveCanvasVersion(documentId, saveDescription || undefined, false);
    setSaveDescription('');
    setSaveDialogOpen(false);
  };

  const handleRestoreVersion = (versionId: string) => {
    restoreCanvasVersion(documentId, versionId);
  };

  const handleDeleteVersion = () => {
    if (deleteVersion) {
      deleteCanvasVersionAction(documentId, deleteVersion.id);
      setDeleteVersion(null);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date key for grouping (uses local date for consistency)
  const getDateKey = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group versions by date
  const groupedVersions = versions.reduce((groups, version) => {
    const dateKey = getDateKey(version.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(version);
    return groups;
  }, {} as Record<string, CanvasDocumentVersion[]>);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('history')}</span>
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('versionHistory')}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Save current version */}
            <Button
              onClick={() => setSaveDialogOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Save className="mr-2 h-4 w-4" />
              {t('saveVersion')}
            </Button>

            {/* Version list */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              {versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t('noVersions')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('noVersionsHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {Object.entries(groupedVersions).map(([dateKey, dateVersions]) => (
                    <Collapsible key={dateKey} defaultOpen>
                      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                        <span>{dateKey}</span>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2">
                        {dateVersions.map((version) => (
                          <VersionItem
                            key={version.id}
                            version={version}
                            isCurrent={document?.currentVersionId === version.id}
                            onPreview={() => setPreviewVersion(version)}
                            onRestore={() => handleRestoreVersion(version.id)}
                            onDelete={() => setDeleteVersion(version)}
                            formatDate={formatDate}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Save Version Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('saveVersion')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('descriptionOptional')}
              </label>
              <Input
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="e.g., Added error handling..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleSaveVersion}>
                {t('saveVersion')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('versionPreview')}
              {previewVersion?.description && (
                <Badge variant="secondary" className="ml-2">
                  {previewVersion.description}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="p-4 rounded-lg bg-muted text-sm font-mono whitespace-pre-wrap">
              {previewVersion?.content}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>
              {tCommon('close')}
            </Button>
            <Button onClick={() => {
              if (previewVersion) {
                handleRestoreVersion(previewVersion.id);
                setPreviewVersion(null);
              }
            }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('restoreVersion')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVersion} onOpenChange={() => setDeleteVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteVersion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteVersionConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Individual version item
interface VersionItemProps {
  version: CanvasDocumentVersion;
  isCurrent: boolean;
  onPreview: () => void;
  onRestore: () => void;
  onDelete: () => void;
  formatDate: (date: Date) => string;
}

function VersionItem({
  version,
  isCurrent,
  onPreview,
  onRestore,
  onDelete,
  formatDate,
}: VersionItemProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors hover:bg-muted/50',
        isCurrent && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDate(version.createdAt)}
            </span>
            {isCurrent && (
              <Badge variant="default" className="text-xs">
                Current
              </Badge>
            )}
            {version.isAutoSave && (
              <Badge variant="secondary" className="text-xs">
                Auto
              </Badge>
            )}
          </div>
          {version.description && (
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {version.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {version.content.split('\n').length} lines
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        <Button variant="ghost" size="sm" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          Preview
        </Button>
        {!isCurrent && (
          <Button variant="ghost" size="sm" onClick={onRestore}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restore
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default VersionHistoryPanel;
