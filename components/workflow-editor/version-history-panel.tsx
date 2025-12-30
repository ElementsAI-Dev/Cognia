'use client';

/**
 * VersionHistoryPanel - UI for managing workflow versions
 */

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';
import type { WorkflowVersion } from '@/types/workflow-editor';
import {
  History,
  Save,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Clock,
  Download,
  Upload,
  FileJson,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveVersionDialog({ open, onOpenChange }: SaveVersionDialogProps) {
  const t = useTranslations('versionHistory');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { saveVersion, currentVersionNumber } = useWorkflowEditorStore();

  const handleSave = () => {
    saveVersion(name.trim() || undefined, description.trim() || undefined);
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {t('saveVersion')}
          </DialogTitle>
          <DialogDescription>
            {t('saveDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">{t('versionName')}</Label>
            <Input
              id="version-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Version ${currentVersionNumber + 1}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version-description">{t('descriptionOptional')}</Label>
            <Input
              id="version-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            {t('saveVersion')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportExportDialog({ open, onOpenChange }: ImportExportDialogProps) {
  const t = useTranslations('versionHistory');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { exportToFile, importFromFile, currentWorkflow } = useWorkflowEditorStore();

  const handleExport = () => {
    exportToFile();
    onOpenChange(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await importFromFile(file);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to import workflow:', error);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            {t('importExport')}
          </DialogTitle>
          <DialogDescription>
            {t('importExportDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={handleExport}
            disabled={!currentWorkflow}
          >
            <Download className="h-8 w-8" />
            <div>
              <div className="font-medium">{t('exportWorkflow')}</div>
              <div className="text-xs text-muted-foreground">
                {t('saveAsJson')}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={handleImportClick}
            disabled={importing}
          >
            <Upload className="h-8 w-8" />
            <div>
              <div className="font-medium">
                {importing ? t('importing') : t('importWorkflow')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('loadFromJson')}
              </div>
            </div>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VersionHistoryPanel() {
  const t = useTranslations('versionHistory');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const {
    getVersions,
    restoreVersion,
    deleteVersion,
    currentWorkflow,
  } = useWorkflowEditorStore();

  const versions = getVersions();

  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return t('unknown');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title={t('title')}>
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[350px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>
            {t('manageVersions')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Button
            className="w-full"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!currentWorkflow}
          >
            <Save className="h-4 w-4 mr-2" />
            {t('saveNewVersion')}
          </Button>

          <ScrollArea className="h-[calc(100vh-280px)]">
            {versions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('noVersions')}</p>
                <p className="text-xs mt-1">
                  {t('saveToCreateRestorePoint')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {versions
                  .slice()
                  .reverse()
                  .map((version: WorkflowVersion) => (
                    <div
                      key={version.id}
                      className="group flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          v{version.version}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {version.name}
                        </div>
                        {version.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {version.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => restoreVersion(version.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t('restore')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteVersion(version.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <SaveVersionDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
        />
      </SheetContent>
    </Sheet>
  );
}

export default VersionHistoryPanel;
