'use client';

/**
 * Workflows Page - Workflow management and editor interface
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkflowEditorPanel } from '@/components/workflow/editor';
import { TemplateBrowser } from '@/components/workflow/marketplace/template-browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { workflowRepository } from '@/lib/db/repositories';
import { useWorkflowEditor } from '@/hooks/designer/use-workflow-editor';
import { useWorkflowExecutionWithKeyboard } from '@/hooks/designer/use-workflow-execution';
import { workflowEditorTemplates, getTemplateCategories } from '@/lib/workflow-editor/templates';
import { definitionToVisual } from '@/lib/workflow-editor/converter';
import { toast } from 'sonner';
import type { VisualWorkflow, WorkflowEditorTemplate } from '@/types/workflow/workflow-editor';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Download,
  Upload,
  ArrowLeft,
  LayoutTemplate,
  Clock,
  Workflow,
  Store,
  Play,
  Pause,
  Square,
  AlertTriangle,
} from 'lucide-react';

type ViewMode = 'list' | 'editor';

export default function WorkflowsPage() {
  const t = useTranslations('workflowEditor');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [workflows, setWorkflows] = useState<VisualWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);

  const {
    currentWorkflow,
    isExecuting,
    isDirty,
    validationErrors,
    createWorkflow,
    loadWorkflow,
    saveWorkflow,
    executeWorkflow,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    validate,
    exportWorkflow: exportCurrentWorkflow,
    importWorkflow: importWorkflowFromJson,
  } = useWorkflowEditor({
    autoSave: true,
    autoSaveInterval: 30000,
    onExecutionComplete: () => {
      toast.success(t('executionComplete') || 'Workflow execution completed');
    },
    onExecutionError: (error) => {
      toast.error(error);
    },
  });

  // Keyboard shortcuts for execution (Space=pause/resume, Esc=cancel)
  useWorkflowExecutionWithKeyboard({
    onSuccess: () => toast.success(t('executionComplete') || 'Done'),
    onError: (error: string) => toast.error(error),
  });

  const hasErrors = useMemo(
    () => validationErrors.some((e) => e.severity === 'error'),
    [validationErrors]
  );

  // Load workflows from database
  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await workflowRepository.getAll();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Check for workflow ID in URL
  useEffect(() => {
    const workflowId = searchParams.get('id');
    if (workflowId) {
      workflowRepository.getById(workflowId).then((workflow) => {
        if (workflow) {
          loadWorkflow(workflow);
          setViewMode('editor');
        }
      });
    }
  }, [searchParams, loadWorkflow]);

  // Filter workflows by search query
  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle create new workflow
  const handleCreateNew = () => {
    createWorkflow();
    setViewMode('editor');
  };

  // Handle create from template
  const handleCreateFromTemplate = (templateId: string) => {
    const template = workflowEditorTemplates.find(
      (t: WorkflowEditorTemplate) => t.id === templateId
    );
    if (template) {
      const workflow: VisualWorkflow = {
        ...template.workflow,
        id: `workflow-${Date.now()}`,
        name: template.name,
        description: template.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      loadWorkflow(workflow);
      setViewMode('editor');
    }
  };

  // Handle edit workflow
  const handleEdit = async (workflowId: string) => {
    const workflow = await workflowRepository.getById(workflowId);
    if (workflow) {
      loadWorkflow(workflow);
      setViewMode('editor');
      router.push(`/workflows?id=${workflowId}`);
    }
  };

  // Handle duplicate workflow
  const handleDuplicate = async (workflowId: string) => {
    await workflowRepository.duplicate(workflowId);
    loadWorkflows();
  };

  // Handle delete workflow
  const handleDelete = async () => {
    if (workflowToDelete) {
      await workflowRepository.delete(workflowToDelete);
      setWorkflowToDelete(null);
      setDeleteDialogOpen(false);
      loadWorkflows();
    }
  };

  // Handle export workflow (uses hook's exportCurrentWorkflow for current, or repo for any)
  const handleExport = async (workflowId: string) => {
    // If exporting the currently loaded workflow, use the hook
    if (currentWorkflow && currentWorkflow.id === workflowId) {
      const json = exportCurrentWorkflow();
      if (json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${workflowId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }
    const json = await workflowRepository.export(workflowId);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${workflowId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Handle import workflow (uses hook's importWorkflow for loading into editor)
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        // Try to load into editor first
        if (importWorkflowFromJson(text)) {
          setViewMode('editor');
          return;
        }
        // Try converting from WorkflowDefinition format
        try {
          const parsed = JSON.parse(text);
          if (parsed.steps && !parsed.nodes) {
            const visual = definitionToVisual(parsed);
            loadWorkflow(visual);
            setViewMode('editor');
            return;
          }
        } catch { /* not a definition format */ }
        // Fallback to repository import
        await workflowRepository.import(text);
        loadWorkflows();
      }
    };
    input.click();
  };

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list');
    router.push('/workflows');
    loadWorkflows();
  };

  // Handle save workflow
  const handleSaveWorkflow = async () => {
    if (!currentWorkflow) return;
    await saveWorkflow();
    await loadWorkflows();
  };

  // Handle execute workflow
  const handleExecuteWorkflow = async () => {
    if (!currentWorkflow) return;
    if (!validate()) {
      toast.error(t('validationErrors') || 'Fix validation errors before running');
      return;
    }
    await executeWorkflow();
  };

  if (viewMode === 'editor') {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex items-center gap-2 p-2 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tCommon('back')}
          </Button>

          {/* Dirty / validation indicators */}
          <div className="flex items-center gap-1.5">
            {isDirty && (
              <Badge variant="outline" className="text-xs text-yellow-600">
                {t('unsaved') || 'Unsaved'}
              </Badge>
            )}
            {hasErrors && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validationErrors.filter((e) => e.severity === 'error').length}
              </Badge>
            )}
          </div>

          <div className="flex-1" />

          {/* Execution controls */}
          {isExecuting ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={pauseExecution}>
                <Pause className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resumeExecution}>
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={cancelExecution}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleExecuteWorkflow} disabled={hasErrors}>
              <Play className="h-4 w-4 mr-1" />
              {t('run') || 'Run'}
            </Button>
          )}

          <Button size="sm" onClick={handleSaveWorkflow} disabled={!isDirty}>
            {tCommon('save')}
          </Button>
        </div>
        <div className="flex-1">
          <WorkflowEditorPanel className="h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Workflow className="h-6 w-6 text-green-500" />
          <h1 className="text-xl font-semibold">{t('workflows') || 'Workflows'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Browse Templates button */}
          <Button variant="outline" size="sm" onClick={() => setTemplateBrowserOpen(true)} className="h-9">
            <Store className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('browseTemplates') || 'Templates'}</span>
          </Button>
          {/* Import button - icon only on mobile */}
          <Button variant="outline" size="sm" onClick={handleImport} className="h-9">
            <Upload className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('importWorkflow')}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{tCommon('add')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('blankWorkflow')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {getTemplateCategories().map((category) => {
                const categoryTemplates = workflowEditorTemplates.filter(
                  (tmpl: WorkflowEditorTemplate) => tmpl.category === category
                );
                if (categoryTemplates.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize">{category}</div>
                    {categoryTemplates.slice(0, 3).map((template: WorkflowEditorTemplate) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => handleCreateFromTemplate(template.id)}
                      >
                        <LayoutTemplate className="h-4 w-4 mr-2" />
                        {template.name}
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search - Full width on mobile */}
      <div className="p-4 border-b">
        <div className="w-full sm:max-w-md">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t('searchNodes')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
            />
          </InputGroup>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              {tCommon('loading')}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title={t('noWorkflowsYet')}
              description={t('createFirstHint')}
              actions={[
                {
                  label: t('createWorkflow'),
                  onClick: handleCreateNew,
                  icon: Plus,
                },
              ]}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98] touch-manipulation"
                  onClick={() => handleEdit(workflow.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-2xl shrink-0">{workflow.icon}</span>
                        <CardTitle className="text-base truncate">{workflow.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(workflow.id);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(workflow.id);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {tCommon('copy')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(workflow.id);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {t('exportWorkflow')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWorkflowToDelete(workflow.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {tCommon('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {workflow.description || t('noDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {t('nodesCount', { count: workflow.nodes.length })}
                        </Badge>
                        {workflow.category && (
                          <Badge variant="outline" className="text-xs">
                            {workflow.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(workflow.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Template Browser dialog */}
      <Dialog open={templateBrowserOpen} onOpenChange={setTemplateBrowserOpen}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('browseTemplates') || 'Browse Templates'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <TemplateBrowser />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteWorkflow')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteWorkflowConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
