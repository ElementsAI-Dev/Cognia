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
  GitCompare,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { VersionDiffView } from './version-diff-view';

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
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

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

  const handleToggleCompareMode = () => {
    if (compareMode) {
      setCompareMode(false);
      setSelectedVersions([]);
      setShowDiff(false);
    } else {
      setCompareMode(true);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    if (!compareMode) return;
    
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setShowDiff(true);
    }
  };

  const getCompareVersions = () => {
    if (selectedVersions.length !== 2) return null;
    const v1 = versions.find((v) => v.id === selectedVersions[0]);
    const v2 = versions.find((v) => v.id === selectedVersions[1]);
    if (!v1 || !v2) return null;
    return { v1, v2 };
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
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
        <SheetContent side="right" className="w-full sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('versionHistory')}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setSaveDialogOpen(true)}
                className="flex-1"
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                {t('saveVersion')}
              </Button>
              {versions.length >= 2 && (
                <Button
                  onClick={handleToggleCompareMode}
                  variant={compareMode ? 'default' : 'outline'}
                  className="shrink-0"
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  {compareMode ? t('cancelCompare') : t('compare')}
                </Button>
              )}
            </div>

            {/* Compare mode instructions */}
            {compareMode && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
                {t('compareInstructions')}
                {selectedVersions.length === 2 && (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={handleCompare}
                  >
                    {t('viewDiff')}
                  </Button>
                )}
              </div>
            )}

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
                            t={t}
                            compareMode={compareMode}
                            isSelected={selectedVersions.includes(version.id)}
                            onSelect={() => handleSelectVersion(version.id)}
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
                placeholder={t('descriptionPlaceholder')}
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
        <DialogContent className="w-[95vw] sm:max-w-3xl">
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
            <pre className="p-4 rounded-lg bg-muted text-sm sm:text-base font-mono whitespace-pre-wrap">
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

      {/* Diff View Dialog */}
      <Dialog open={showDiff} onOpenChange={() => setShowDiff(false)}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              {t('versionComparison')}
            </DialogTitle>
          </DialogHeader>
          {getCompareVersions() && (
            <VersionDiffView
              oldContent={getCompareVersions()!.v1.content}
              newContent={getCompareVersions()!.v2.content}
              oldLabel={getCompareVersions()!.v1.description || formatDate(getCompareVersions()!.v1.createdAt)}
              newLabel={getCompareVersions()!.v2.description || formatDate(getCompareVersions()!.v2.createdAt)}
              className="flex-1 min-h-[400px] border rounded-md overflow-hidden"
            />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDiff(false)}>
              {tCommon('close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
  t: ReturnType<typeof useTranslations>;
  compareMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

function VersionItem({
  version,
  isCurrent,
  onPreview,
  onRestore,
  onDelete,
  formatDate,
  t,
  compareMode,
  isSelected,
  onSelect,
}: VersionItemProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        isCurrent && 'border-primary bg-primary/5',
        compareMode && 'cursor-pointer',
        compareMode && !isSelected && 'hover:bg-muted/50',
        isSelected && 'ring-2 ring-primary bg-primary/10'
      )}
      onClick={compareMode ? onSelect : undefined}
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
                {t('current')}
              </Badge>
            )}
            {version.isAutoSave && (
              <Badge variant="secondary" className="text-xs">
                {t('autoSave')}
              </Badge>
            )}
          </div>
          {version.description && (
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {version.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {version.content.split('\n').length} {t('lines')}
          </p>
        </div>
      </div>
      {compareMode ? (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`version-${version.id}`}
              checked={isSelected}
              onCheckedChange={() => onSelect?.()}
            />
            <label
              htmlFor={`version-${version.id}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {t('selected')}
            </label>
          </div>
          {isSelected && (
            <Badge variant="default" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              {t('selected')}
            </Badge>
          )}
        </div>
      ) : (
        <div className="mt-2 flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9" onClick={onPreview}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                {t('previewAction')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('previewAction')}</TooltipContent>
          </Tooltip>
          {!isCurrent && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9" onClick={onRestore}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  {t('restore')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('restoreVersion')}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('deleteVersion')}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default VersionHistoryPanel;
