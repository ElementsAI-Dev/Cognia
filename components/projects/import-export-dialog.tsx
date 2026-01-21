'use client';

/**
 * Project Import/Export Dialog - import and export projects
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  Upload,
  FileJson,
  FolderArchive,
  Loader2,
  CheckCircle,
  AlertCircle,
  File,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useProjectStore } from '@/stores';
import {
  exportProjectToJSON,
  exportProjectsToZip,
  importProjectFromJSON,
  importProjectsFromZip,
  downloadFile,
} from '@/lib/project/import-export';
import type { Project } from '@/types';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'import' | 'export';
}

export function ImportExportDialog({
  open,
  onOpenChange,
  initialTab = 'export',
}: ImportExportDialogProps) {
  const t = useTranslations('importExport');
  const tToasts = useTranslations('toasts');
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projects = useProjectStore((state) => state.projects);
  const createProject = useProjectStore((state) => state.createProject);
  const importProjects = useProjectStore((state) => state.importProjects);

  const handleSelectAll = useCallback(() => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((p) => p.id));
    }
  }, [projects, selectedProjects.length]);

  const handleToggleProject = useCallback((projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  const handleExportJSON = useCallback(async () => {
    if (selectedProjects.length === 0) {
      toast.error(tToasts('selectProjectsToExport'));
      return;
    }

    setIsProcessing(true);
    try {
      const projectsToExport = projects.filter((p) => selectedProjects.includes(p.id));

      if (projectsToExport.length === 1) {
        // Single project - export as JSON
        const content = exportProjectToJSON(projectsToExport[0]);
        const filename = `${projectsToExport[0].name.replace(/[^a-z0-9]/gi, '-')}.json`;
        downloadFile(content, filename);
        toast.success(tToasts('projectExported'));
      } else {
        // Multiple projects - export as ZIP
        const result = await exportProjectsToZip(projectsToExport);
        if (result.success && result.blob) {
          downloadFile(result.blob, result.filename);
          toast.success(tToasts('projectsExported', { count: projectsToExport.length }));
        } else {
          toast.error(result.error || 'Export failed');
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedProjects, projects, onOpenChange, tToasts]);

  const handleExportZip = useCallback(async () => {
    if (selectedProjects.length === 0) {
      toast.error(tToasts('selectProjectsToExport'));
      return;
    }

    setIsProcessing(true);
    try {
      const projectsToExport = projects.filter((p) => selectedProjects.includes(p.id));
      const result = await exportProjectsToZip(projectsToExport);

      if (result.success && result.blob) {
        downloadFile(result.blob, result.filename);
        toast.success(tToasts('projectsExportedZip', { count: projectsToExport.length }));
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Export failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedProjects, projects, onOpenChange, tToasts]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResults(null);

    try {
      if (file.name.endsWith('.json')) {
        // Single JSON file
        const content = await file.text();
        const result = importProjectFromJSON(content, { generateNewId: true });

        if (result.success && result.project) {
          // Create the project using the store
          createProject({
            name: result.project.name,
            description: result.project.description,
            icon: result.project.icon,
            color: result.project.color,
            customInstructions: result.project.customInstructions,
            defaultProvider: result.project.defaultProvider,
            defaultModel: result.project.defaultModel,
            defaultMode: result.project.defaultMode,
          });
          
          setImportResults({ success: 1, failed: 0, errors: [] });
          toast.success(tToasts('projectImported'));
        } else {
          setImportResults({ success: 0, failed: 1, errors: [result.error || 'Unknown error'] });
          toast.error(result.error || 'Import failed');
        }
      } else if (file.name.endsWith('.zip')) {
        // ZIP file with multiple projects
        const result = await importProjectsFromZip(file, { generateNewIds: true });

        if (result.success && result.projects.length > 0) {
          importProjects(result.projects);
          setImportResults({
            success: result.projects.length,
            failed: result.errors.length,
            errors: result.errors,
          });
          toast.success(tToasts('projectsImported', { count: result.projects.length }));
        } else {
          setImportResults({
            success: 0,
            failed: result.errors.length || 1,
            errors: result.errors.length > 0 ? result.errors : ['No valid projects found in ZIP file'],
          });
          toast.error(tToasts('importFailed'));
        }
      } else {
        toast.error(tToasts('invalidFileType'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      setImportResults({ success: 0, failed: 1, errors: [errorMessage] });
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [createProject, importProjects, tToasts]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && (file.name.endsWith('.json') || file.name.endsWith('.zip'))) {
        const input = fileInputRef.current;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        toast.error(tToasts('invalidFileType'));
      }
    },
    [tToasts]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              {t('export')}
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              {t('import')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noProjects')}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    {t('selectProjects')}
                  </Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedProjects.length === projects.length ? t('deselectAll') : t('selectAll')}
                  </Button>
                </div>

                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <ProjectSelectItem
                        key={project.id}
                        project={project}
                        selected={selectedProjects.includes(project.id)}
                        onToggle={() => handleToggleProject(project.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={handleExportJSON}
                    disabled={isProcessing || selectedProjects.length === 0}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileJson className="h-4 w-4 mr-2" />
                    )}
                    {t('exportJson')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleExportZip}
                    disabled={isProcessing || selectedProjects.length === 0}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FolderArchive className="h-4 w-4 mr-2" />
                    )}
                    {t('exportZip')}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  <p className="mt-2 text-sm text-muted-foreground">{t('importing')}</p>
                </div>
              ) : (
                <>
                  <File className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    {t('dropHint')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('supportedFormats')}
                  </p>
                </>
              )}
            </div>

            {importResults && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  {importResults.failed === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {t('importResult', { success: importResults.success, failed: importResults.failed })}
                  </span>
                </div>
                {importResults.errors.length > 0 && (
                  <ScrollArea className="mt-2 max-h-[100px]">
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {importResults.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectSelectItemProps {
  project: Project;
  selected: boolean;
  onToggle: () => void;
}

function ProjectSelectItem({ project, selected, onToggle }: ProjectSelectItemProps) {
  const t = useTranslations('importExport');
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
      onClick={onToggle}
    >
      <Checkbox checked={selected} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground">
          {t('filesCount', { count: project.knowledgeBase.length })}
        </p>
      </div>
      {project.defaultMode && (
        <Badge variant="outline" className="text-xs">
          {project.defaultMode}
        </Badge>
      )}
    </div>
  );
}

export default ImportExportDialog;
