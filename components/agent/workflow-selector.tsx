'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useWorkflow } from '@/hooks/designer';
import { useWorkflowStore } from '@/stores/workflow-store';
import type {
  WorkflowDefinition,
  WorkflowTemplate,
  PPTGenerationOptions,
} from '@/types/workflow';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import {
  Play,
  Pause,
  StopCircle,
  Presentation,
  FileText,
  Code,
  BarChart3,
  Search,
  Workflow,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Briefcase,
  Rocket,
  GraduationCap,
} from 'lucide-react';

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  'ppt-generation': <Presentation className="h-5 w-5" />,
  'report-generation': <FileText className="h-5 w-5" />,
  'code-project': <Code className="h-5 w-5" />,
  'data-analysis': <BarChart3 className="h-5 w-5" />,
  research: <Search className="h-5 w-5" />,
  workflow: <Workflow className="h-5 w-5" />,
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'business-pitch': <Briefcase className="h-4 w-4" />,
  'product-launch': <Rocket className="h-4 w-4" />,
  educational: <GraduationCap className="h-4 w-4" />,
  'project-update': <BarChart3 className="h-4 w-4" />,
  'quick-presentation': <Zap className="h-4 w-4" />,
};

export interface WorkflowSelectorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onStart?: (workflowId: string, input: Record<string, unknown>) => void;
  onComplete?: (output: Record<string, unknown>) => void;
  className?: string;
}

export function WorkflowSelector({
  open,
  onOpenChange,
  onStart,
  onComplete,
  className,
}: WorkflowSelectorProps) {
  const t = useTranslations('workflow');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // PPT-specific state
  const [pptOptions, setPptOptions] = useState<PPTGenerationOptions>({
    topic: '',
    description: '',
    slideCount: 10,
    style: 'professional',
    targetAudience: '',
    language: 'en',
  });

  const {
    isRunning,
    isPaused,
    progress,
    error,
    logs,
    run,
    runPPT,
    pause,
    resume,
    cancel,
    getWorkflows,
    reset,
  } = useWorkflow({
    onComplete: (execution) => {
      if (execution.output) {
        onComplete?.(execution.output);
      }
    },
  });

  const { openWorkflowPanel, setSelectedWorkflowType } = useWorkflowStore();

  const workflows = useMemo(() => getWorkflows(), [getWorkflows]);

  const templates = useMemo(() => {
    if (!selectedWorkflow) return [];
    const registry = getWorkflows();
    return registry
      .filter((w) => w.id === selectedWorkflow.id)
      .flatMap((_w) => {
        // Get templates from registry - simplified for now
        return [];
      });
  }, [selectedWorkflow, getWorkflows]);

  const handleSelectWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setSelectedTemplate(null);
    setSelectedWorkflowType(workflow.type);
    setShowConfigDialog(true);
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    // Apply template presets
    if (template.workflowId === 'ppt-generation') {
      setPptOptions((prev) => ({
        ...prev,
        ...template.presetInputs,
      }));
    }
  };

  const handleStartWorkflow = async () => {
    if (!selectedWorkflow) return;

    setShowConfigDialog(false);
    openWorkflowPanel();

    if (selectedWorkflow.type === 'ppt-generation') {
      onStart?.(selectedWorkflow.id, pptOptions as unknown as Record<string, unknown>);
      await runPPT(pptOptions);
    } else {
      const input = selectedTemplate?.presetInputs || {};
      onStart?.(selectedWorkflow.id, input);
      await run(selectedWorkflow.id, input);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleCancel = () => {
    cancel();
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className={cn('space-y-4', className)}>
          {/* Workflow selection */}
          {!isRunning && (
            <Card>
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {t('selectWorkflow')}
            </CardTitle>
            <CardDescription>{t('selectWorkflowDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {workflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onSelect={() => handleSelectWorkflow(workflow)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running workflow status */}
      {isRunning && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedWorkflow && WORKFLOW_ICONS[selectedWorkflow.type]}
                {selectedWorkflow?.name || t('runningWorkflow')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseResume}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      {t('resume')}
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      {t('pause')}
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  {t('cancel')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('progress')}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm">
              {isPaused ? (
                <>
                  <Pause className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500">{t('paused')}</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-primary">{t('running')}</span>
                </>
              )}
            </div>

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Logs */}
            {logs.length > 0 && (
              <div className="space-y-2">
                <Label>{t('logs')}</Label>
                <ScrollArea className="h-32 border rounded-lg p-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        'text-xs py-1',
                        log.level === 'error' && 'text-destructive',
                        log.level === 'warn' && 'text-yellow-500',
                        log.level === 'info' && 'text-muted-foreground'
                      )}
                    >
                      <span className="text-muted-foreground">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>{' '}
                      {log.message}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedWorkflow && WORKFLOW_ICONS[selectedWorkflow.type]}
              {selectedWorkflow?.name}
            </DialogTitle>
            <DialogDescription>{selectedWorkflow?.description}</DialogDescription>
          </DialogHeader>

          {selectedWorkflow?.type === 'ppt-generation' && (
            <PPTConfigForm
              options={pptOptions}
              onChange={setPptOptions}
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleSelectTemplate}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleStartWorkflow} disabled={!pptOptions.topic}>
              <Play className="h-4 w-4 mr-2" />
              {t('startWorkflow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WorkflowCardProps {
  workflow: WorkflowDefinition;
  onSelect: () => void;
}

function WorkflowCard({ workflow, onSelect }: WorkflowCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-colors text-left"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        {WORKFLOW_ICONS[workflow.type] || <Workflow className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{workflow.name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {workflow.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {workflow.steps.length} steps
          </Badge>
          {workflow.estimatedDuration && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              ~{Math.ceil(workflow.estimatedDuration / 60)}m
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

interface PPTConfigFormProps {
  options: PPTGenerationOptions;
  onChange: (options: PPTGenerationOptions) => void;
  templates: WorkflowTemplate[];
  selectedTemplate: WorkflowTemplate | null;
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

function PPTConfigForm({
  options,
  onChange,
  templates,
  selectedTemplate,
  onSelectTemplate,
}: PPTConfigFormProps) {
  const t = useTranslations('workflow');

  // Built-in templates for PPT
  const builtInTemplates: WorkflowTemplate[] = [
    {
      id: 'business-pitch',
      name: 'Business Pitch',
      description: 'Create a compelling business pitch',
      workflowId: 'ppt-generation',
      presetInputs: { style: 'professional', slideCount: 12 },
      presetConfig: {},
      icon: 'Briefcase',
      category: 'business',
    },
    {
      id: 'product-launch',
      name: 'Product Launch',
      description: 'Announce a new product',
      workflowId: 'ppt-generation',
      presetInputs: { style: 'creative', slideCount: 15 },
      presetConfig: {},
      icon: 'Rocket',
      category: 'marketing',
    },
    {
      id: 'educational',
      name: 'Educational',
      description: 'Create educational content',
      workflowId: 'ppt-generation',
      presetInputs: { style: 'academic', slideCount: 20 },
      presetConfig: {},
      icon: 'GraduationCap',
      category: 'education',
    },
    {
      id: 'project-update',
      name: 'Project Update',
      description: 'Share project status',
      workflowId: 'ppt-generation',
      presetInputs: { style: 'minimal', slideCount: 8 },
      presetConfig: {},
      icon: 'BarChart',
      category: 'business',
    },
    {
      id: 'quick-presentation',
      name: 'Quick Presentation',
      description: 'Create a simple presentation',
      workflowId: 'ppt-generation',
      presetInputs: { style: 'minimal', slideCount: 5 },
      presetConfig: {},
      icon: 'Zap',
      category: 'quick',
    },
  ];

  const allTemplates = [...builtInTemplates, ...templates];

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">{t('basicSettings')}</TabsTrigger>
        <TabsTrigger value="templates">{t('templates')}</TabsTrigger>
        <TabsTrigger value="advanced">{t('advancedSettings')}</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="topic">{t('topic')} *</Label>
          <Input
            id="topic"
            value={options.topic}
            onChange={(e) => onChange({ ...options, topic: e.target.value })}
            placeholder={t('topicPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea
            id="description"
            value={options.description || ''}
            onChange={(e) => onChange({ ...options, description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slideCount">{t('slideCount')}</Label>
            <Input
              id="slideCount"
              type="number"
              min={3}
              max={50}
              value={options.slideCount || 10}
              onChange={(e) =>
                onChange({ ...options, slideCount: parseInt(e.target.value) || 10 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">{t('style')}</Label>
            <Select
              value={options.style || 'professional'}
              onValueChange={(value) =>
                onChange({
                  ...options,
                  style: value as PPTGenerationOptions['style'],
                })
              }
            >
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="templates" className="mt-4">
        <div className="grid grid-cols-2 gap-3">
          {allTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                selectedTemplate?.id === template.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50 hover:bg-accent'
              )}
            >
              <div className="p-1.5 rounded bg-primary/10 text-primary">
                {TEMPLATE_ICONS[template.id] || <FileText className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-medium text-sm">{template.name}</h5>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
              {selectedTemplate?.id === template.id && (
                <CheckCircle className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="targetAudience">{t('targetAudience')}</Label>
          <Input
            id="targetAudience"
            value={options.targetAudience || ''}
            onChange={(e) => onChange({ ...options, targetAudience: e.target.value })}
            placeholder={t('targetAudiencePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">{t('language')}</Label>
          <Select
            value={options.language || 'en'}
            onValueChange={(value) => onChange({ ...options, language: value })}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('theme')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {DEFAULT_PPT_THEMES.slice(0, 6).map((theme) => (
              <button
                key={theme.id}
                onClick={() =>
                  onChange({
                    ...options,
                    theme: {
                      primaryColor: theme.primaryColor,
                      backgroundColor: theme.backgroundColor,
                    },
                  })
                }
                className={cn(
                  'p-2 rounded-lg border text-xs flex items-center gap-2 transition-colors',
                  options.theme?.primaryColor === theme.primaryColor
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customInstructions">{t('customInstructions')}</Label>
          <Textarea
            id="customInstructions"
            value={options.customInstructions || ''}
            onChange={(e) =>
              onChange({ ...options, customInstructions: e.target.value })
            }
            placeholder={t('customInstructionsPlaceholder')}
            rows={3}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default WorkflowSelector;
