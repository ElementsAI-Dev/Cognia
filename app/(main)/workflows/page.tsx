'use client';

/**
 * Workflows Page - Workflow management and editor interface
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkflowEditorPanel } from '@/components/workflow/editor';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/empty-state';
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
import { useWorkflowEditorStore } from '@/stores/workflow';
import { workflowEditorTemplates } from '@/lib/workflow-editor/templates';
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

  const {
    loadWorkflow,
    createWorkflow,
    currentWorkflow,
    saveWorkflow: saveWorkflowState,
  } = useWorkflowEditorStore();

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

  // Handle export workflow
  const handleExport = async (workflowId: string) => {
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

  // Handle import workflow
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
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
    if (currentWorkflow) {
      const existing = await workflowRepository.getById(currentWorkflow.id);
      if (existing) {
        await workflowRepository.update(currentWorkflow.id, {
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          nodes: currentWorkflow.nodes,
          edges: currentWorkflow.edges,
          settings: currentWorkflow.settings,
          viewport: currentWorkflow.viewport,
        });
      } else {
        await workflowRepository.create({
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          nodes: currentWorkflow.nodes,
          edges: currentWorkflow.edges,
          settings: currentWorkflow.settings,
          viewport: currentWorkflow.viewport,
        });
      }
      // Reset isDirty state after successful save
      saveWorkflowState();
    }
  };

  if (viewMode === 'editor') {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex items-center gap-2 p-2 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tCommon('back')}
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={handleSaveWorkflow}>
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Workflow className="h-6 w-6 text-green-500" />
          <h1 className="text-xl font-semibold">{t('workflows') || 'Workflows'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-1" />
            {t('importWorkflow')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {tCommon('add')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Blank Workflow
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Templates</div>
              {workflowEditorTemplates.slice(0, 5).map((template: WorkflowEditorTemplate) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => handleCreateFromTemplate(template.id)}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  {template.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="max-w-md">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t('searchNodes')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              title="No workflows yet"
              description="Create your first workflow to get started"
              actions={[
                {
                  label: 'Create Workflow',
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
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleEdit(workflow.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{workflow.icon}</span>
                        <CardTitle className="text-base">{workflow.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      {workflow.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {workflow.nodes.length} nodes
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow and all its
              execution history.
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
