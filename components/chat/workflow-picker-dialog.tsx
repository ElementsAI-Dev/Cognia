'use client';

/**
 * WorkflowPickerDialog - Dialog for selecting and running workflows from chat
 * Allows users to browse, search, and execute workflows with input parameters
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Workflow,
  Search,
  Play,
  Clock,
  Loader2,
  ChevronRight,
  Settings,
  X,
  Sparkles,
  FileText,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { workflowRepository } from '@/lib/db/repositories';
import { workflowEditorTemplates } from '@/lib/workflow-editor/templates';
import type { VisualWorkflow, WorkflowEditorTemplate } from '@/types/workflow/workflow-editor';

interface WorkflowPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWorkflow: (workflow: VisualWorkflow, input: Record<string, unknown>) => void;
  initialInput?: string;
}

export function WorkflowPickerDialog({
  open,
  onOpenChange,
  onSelectWorkflow,
  initialInput = '',
}: WorkflowPickerDialogProps) {
  const t = useTranslations('workflowEditor');

  const [searchQuery, setSearchQuery] = useState('');
  const [workflows, setWorkflows] = useState<VisualWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<VisualWorkflow | null>(null);
  const [workflowInput, setWorkflowInput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('workflows');

  // Load workflows
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
    if (open) {
      loadWorkflows();
      // Set initial input if provided
      if (initialInput) {
        setWorkflowInput({ message: initialInput });
      }
    }
  }, [open, loadWorkflows, initialInput]);

  // Filter workflows by search
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return workflows;
    const query = searchQuery.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query) ||
        w.category?.toLowerCase().includes(query)
    );
  }, [workflows, searchQuery]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return workflowEditorTemplates;
    const query = searchQuery.toLowerCase();
    return workflowEditorTemplates.filter(
      (t: WorkflowEditorTemplate) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle workflow selection
  const handleSelectWorkflow = useCallback((workflow: VisualWorkflow) => {
    setSelectedWorkflow(workflow);
    // Initialize input fields based on workflow inputs
    const initialInputs: Record<string, string> = {};
    if (workflow.inputs) {
      Object.keys(workflow.inputs).forEach((key) => {
        initialInputs[key] = '';
      });
    }
    // Keep any existing input
    setWorkflowInput((prev) => ({ ...initialInputs, ...prev }));
  }, []);

  // Handle template selection - create workflow from template
  const handleSelectTemplate = useCallback((template: WorkflowEditorTemplate) => {
    const workflow: VisualWorkflow = {
      ...template.workflow,
      id: `workflow-${Date.now()}`,
      name: template.name,
      description: template.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    handleSelectWorkflow(workflow);
  }, [handleSelectWorkflow]);

  // Handle run workflow
  const handleRunWorkflow = useCallback(() => {
    if (!selectedWorkflow) return;

    // Convert string inputs to appropriate types
    const processedInput: Record<string, unknown> = {};
    Object.entries(workflowInput).forEach(([key, value]) => {
      // Try to parse JSON for complex values
      try {
        processedInput[key] = JSON.parse(value);
      } catch {
        processedInput[key] = value;
      }
    });

    onSelectWorkflow(selectedWorkflow, processedInput);
    onOpenChange(false);
    
    // Reset state
    setSelectedWorkflow(null);
    setWorkflowInput({});
    setSearchQuery('');
  }, [selectedWorkflow, workflowInput, onSelectWorkflow, onOpenChange]);

  // Handle back to list
  const handleBack = useCallback(() => {
    setSelectedWorkflow(null);
  }, []);

  // Get workflow input fields
  const inputFields = useMemo(() => {
    if (!selectedWorkflow) return [];

    // Check workflow inputs schema
    if (selectedWorkflow.inputs && Object.keys(selectedWorkflow.inputs).length > 0) {
      return Object.entries(selectedWorkflow.inputs).map(([key, schema]) => ({
        key,
        label: (schema as unknown as Record<string, unknown>).label as string || key,
        type: schema.type || 'string',
        description: schema.description,
        required: schema.required,
        default: schema.default,
      }));
    }

    // Default to a single message input
    return [
      {
        key: 'message',
        label: 'Input Message',
        type: 'string',
        description: 'The input message for the workflow',
        required: false,
      },
    ];
  }, [selectedWorkflow]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-green-500" />
            {selectedWorkflow
              ? t('configureWorkflow') || 'Configure Workflow'
              : t('selectWorkflow') || 'Select Workflow'}
          </DialogTitle>
          <DialogDescription>
            {selectedWorkflow
              ? t('configureInputs') || 'Configure inputs for the workflow'
              : t('selectWorkflowDesc') || 'Choose a workflow to run or start from a template'}
          </DialogDescription>
        </DialogHeader>

        {selectedWorkflow ? (
          // Workflow configuration view
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mb-3"
              >
                <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                Back to list
              </Button>

              <div className="flex items-start gap-3">
                <span className="text-3xl">{selectedWorkflow.icon || '🔄'}</span>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedWorkflow.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedWorkflow.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {selectedWorkflow.nodes?.length || 0} nodes
                    </Badge>
                    {selectedWorkflow.category && (
                      <Badge variant="outline">{selectedWorkflow.category}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Input Parameters
                </h4>

                {inputFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {field.type === 'text' || field.description?.includes('long') ? (
                      <Textarea
                        value={workflowInput[field.key] || ''}
                        onChange={(e) =>
                          setWorkflowInput((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.description || `Enter ${field.label}`}
                        className="min-h-[80px]"
                      />
                    ) : (
                      <Input
                        value={workflowInput[field.key] || ''}
                        onChange={(e) =>
                          setWorkflowInput((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.description || `Enter ${field.label}`}
                      />
                    )}
                    {field.description && (
                      <p className="text-xs text-muted-foreground">
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-6 pt-4 border-t">
              <Button onClick={handleRunWorkflow} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Run Workflow
              </Button>
            </div>
          </div>
        ) : (
          // Workflow selection view
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchWorkflows') || 'Search workflows...'}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6">
                <TabsList className="w-full">
                  <TabsTrigger value="workflows" className="flex-1">
                    <FileText className="h-4 w-4 mr-1" />
                    My Workflows
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex-1">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Templates
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="workflows"
                className="flex-1 overflow-hidden mt-0"
              >
                <ScrollArea className="h-[400px]">
                  <div className="px-6 py-4 space-y-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredWorkflows.length === 0 ? (
                      <div className="text-center py-8">
                        <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? 'No workflows found'
                            : 'No workflows yet'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchQuery
                            ? 'Try a different search term'
                            : 'Create a workflow in the editor first'}
                        </p>
                      </div>
                    ) : (
                      filteredWorkflows.map((workflow) => (
                        <WorkflowCard
                          key={workflow.id}
                          workflow={workflow}
                          onClick={() => handleSelectWorkflow(workflow)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="templates"
                className="flex-1 overflow-hidden mt-0"
              >
                <ScrollArea className="h-[400px]">
                  <div className="px-6 py-4 space-y-2">
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-8">
                        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No templates found
                        </p>
                      </div>
                    ) : (
                      filteredTemplates.map((template: WorkflowEditorTemplate) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onClick={() => handleSelectTemplate(template)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface WorkflowCardProps {
  workflow: VisualWorkflow;
  onClick: () => void;
}

function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{workflow.icon || '🔄'}</span>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm">{workflow.name}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {workflow.description || 'No description'}
            </CardDescription>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {workflow.nodes?.length || 0} nodes
          </Badge>
          {workflow.category && (
            <Badge variant="outline" className="text-xs">
              {workflow.category}
            </Badge>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {new Date(workflow.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TemplateCardProps {
  template: WorkflowEditorTemplate;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm">{template.name}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {template.description || 'No description'}
            </CardDescription>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2">
          {template.category && (
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
          )}
          {template.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkflowPickerDialog;
