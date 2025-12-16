'use client';

/**
 * AgentPlanEditor - Interactive plan editor with AI refinement
 */

import { useState, useCallback } from 'react';
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanFooter,
  PlanTrigger,
  PlanAction,
} from '@/components/ai-elements/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAgentStore, useSettingsStore, useSessionStore } from '@/stores';
import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '@/lib/ai/client';
import type { AgentPlan, PlanStep, PlanStepStatus } from '@/types/agent';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  Check,
  X,
  Wand2,
  Edit2,
  MoreVertical,
  CheckCircle,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
  ListChecks,
} from 'lucide-react';

interface AgentPlanEditorProps {
  sessionId: string;
  onExecute?: (plan: AgentPlan) => void;
  className?: string;
}

interface StepItemProps {
  step: PlanStep;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onSave: (title: string, description?: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}

function StepItem({
  step,
  isEditing,
  isFirst,
  isLast,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: StepItemProps) {
  const [editTitle, setEditTitle] = useState(step.title);
  const [editDescription, setEditDescription] = useState(step.description || '');

  const statusIcons: Record<PlanStepStatus, React.ReactNode> = {
    pending: <Circle className="h-4 w-4 text-muted-foreground" />,
    in_progress: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
    skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
  };

  const statusColors: Record<PlanStepStatus, string> = {
    pending: 'bg-muted/50',
    in_progress: 'border-primary bg-primary/5',
    completed: 'bg-green-500/5 border-green-500/20',
    failed: 'bg-destructive/5 border-destructive/20',
    skipped: 'bg-muted/30',
  };

  const handleSave = () => {
    onSave(editTitle, editDescription || undefined);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-all',
        statusColors[step.status],
        disabled && 'opacity-60'
      )}
    >
      {/* Reorder buttons */}
      {step.status === 'pending' && !disabled && (
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Status icon */}
      <div className="mt-1">{statusIcons[step.status]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Step title"
              className="h-8"
              autoFocus
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optional)"
              className="min-h-[60px] resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Step {step.order + 1}
              </span>
              <span className="font-medium">{step.title}</span>
            </div>
            {step.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            )}
            {step.output && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                ✓ {step.output}
              </p>
            )}
            {step.error && (
              <p className="mt-1 text-sm text-destructive">✗ {step.error}</p>
            )}
            {step.actualDuration && (
              <p className="mt-1 text-xs text-muted-foreground">
                Completed in {step.actualDuration.toFixed(1)}s
              </p>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {step.status === 'pending' && !isEditing && !disabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function AgentPlanEditor({
  sessionId,
  onExecute,
  className,
}: AgentPlanEditorProps) {
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);
  const session = getActiveSession();

  const {
    createPlan,
    updatePlan,
    deletePlan,
    setActivePlan,
    getActivePlan,
    addPlanStep,
    updatePlanStep,
    deletePlanStep,
    reorderPlanSteps,
    approvePlan,
    startPlanExecution,
    cancelPlanExecution,
  } = useAgentStore();

  const activePlan = getActivePlan();

  // Local state
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [showNewStepInput, setShowNewStepInput] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');

  const handleMoveStep = useCallback(
    (stepId: string, direction: 'up' | 'down') => {
      if (!activePlan) return;
      const currentIndex = activePlan.steps.findIndex((s) => s.id === stepId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= activePlan.steps.length) return;

      const newOrder = [...activePlan.steps.map((s) => s.id)];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      reorderPlanSteps(activePlan.id, newOrder);
    },
    [activePlan, reorderPlanSteps]
  );

  const handleCreatePlan = useCallback(() => {
    if (!newPlanTitle.trim()) return;

    createPlan({
      sessionId,
      title: newPlanTitle,
      description: newPlanDescription || undefined,
      steps: [],
    });

    setNewPlanTitle('');
    setNewPlanDescription('');
    setShowCreateDialog(false);
  }, [sessionId, newPlanTitle, newPlanDescription, createPlan]);

  const handleAddStep = useCallback(() => {
    if (!activePlan || !newStepTitle.trim()) return;

    addPlanStep(activePlan.id, {
      title: newStepTitle,
      description: newStepDescription || undefined,
    });

    setNewStepTitle('');
    setNewStepDescription('');
    setShowNewStepInput(false);
  }, [activePlan, newStepTitle, newStepDescription, addPlanStep]);

  const handleUpdateStep = useCallback(
    (stepId: string, title: string, description?: string) => {
      if (!activePlan) return;
      updatePlanStep(activePlan.id, stepId, { title, description });
      setEditingStepId(null);
    },
    [activePlan, updatePlanStep]
  );

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      if (!activePlan) return;
      deletePlanStep(activePlan.id, stepId);
    },
    [activePlan, deletePlanStep]
  );

  const handleRefinePlan = useCallback(async () => {
    if (!activePlan || activePlan.steps.length === 0) return;

    const provider = (session?.provider || 'openai') as ProviderName;
    const model = session?.model || 'gpt-4o-mini';
    const settings = providerSettings[provider];

    if (!settings?.apiKey) return;

    setIsRefining(true);

    try {
      const modelInstance = getProviderModel(
        provider,
        model,
        settings.apiKey,
        settings.baseURL
      );

      const currentSteps = activePlan.steps
        .map((s, i) => `${i + 1}. ${s.title}${s.description ? `: ${s.description}` : ''}`)
        .join('\n');

      const result = await generateText({
        model: modelInstance,
        system: `You are a task planning expert. Analyze the given plan and suggest improvements. 
Output a refined list of steps in JSON format: [{"title": "step title", "description": "optional description"}].
Focus on:
- Breaking down complex steps
- Adding missing steps
- Improving clarity
- Ensuring logical order`,
        prompt: `Plan: ${activePlan.title}
${activePlan.description ? `Description: ${activePlan.description}` : ''}

Current steps:
${currentSteps}

Provide an improved version of this plan:`,
        temperature: 0.7,
      });

      // Parse the refined steps
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const refinedSteps = JSON.parse(jsonMatch[0]) as Array<{
          title: string;
          description?: string;
        }>;

        // Update the plan with refined steps
        const newSteps: PlanStep[] = refinedSteps.map((step, index) => ({
          id: `refined-${index}-${Date.now()}`,
          title: step.title,
          description: step.description,
          status: 'pending' as PlanStepStatus,
          order: index,
        }));

        updatePlan(activePlan.id, { steps: newSteps });
      }
    } catch (error) {
      console.error('Failed to refine plan:', error);
    } finally {
      setIsRefining(false);
    }
  }, [activePlan, session, providerSettings, updatePlan]);

  const handleApproveAndExecute = useCallback(() => {
    if (!activePlan) return;
    approvePlan(activePlan.id);
    startPlanExecution(activePlan.id);
    onExecute?.(activePlan);
  }, [activePlan, approvePlan, startPlanExecution, onExecute]);

  const handleCancel = useCallback(() => {
    if (!activePlan) return;
    cancelPlanExecution(activePlan.id);
  }, [activePlan, cancelPlanExecution]);

  // Calculate progress
  const progress = activePlan
    ? (activePlan.completedSteps / activePlan.totalSteps) * 100
    : 0;

  const isExecuting = activePlan?.status === 'executing';
  const isDraft = activePlan?.status === 'draft';
  const canEdit = isDraft && !isRefining;

  if (!activePlan) {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <ListChecks className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">No Active Plan</h3>
            <p className="text-sm text-muted-foreground">
              Create a plan to organize your agent tasks
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>

        {/* Create Plan Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Create a plan to organize and execute agent tasks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="Plan title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  placeholder="Describe what this plan will accomplish"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} disabled={!newPlanTitle.trim()}>
                Create Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Plan
      defaultOpen={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn('bg-card', className)}
    >
      <PlanHeader>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <PlanTitle>{activePlan.title}</PlanTitle>
            <Badge
              variant={
                activePlan.status === 'executing'
                  ? 'default'
                  : activePlan.status === 'completed'
                    ? 'secondary'
                    : activePlan.status === 'failed'
                      ? 'destructive'
                      : 'outline'
              }
            >
              {activePlan.status}
            </Badge>
          </div>
          {activePlan.description && (
            <PlanDescription>{activePlan.description}</PlanDescription>
          )}
          {activePlan.totalSteps > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {activePlan.completedSteps} / {activePlan.totalSteps} steps
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
        <PlanAction>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefinePlan}
                disabled={isRefining || activePlan.steps.length === 0}
                title="Refine with AI"
              >
                {isRefining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <PlanTrigger />
          </div>
        </PlanAction>
      </PlanHeader>

      <PlanContent>
        <div className="space-y-2">
          {/* Steps list */}
          {activePlan.steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isEditing={editingStepId === step.id}
              isFirst={index === 0}
              isLast={index === activePlan.steps.length - 1}
              onEdit={() => setEditingStepId(step.id)}
              onSave={(title, description) =>
                handleUpdateStep(step.id, title, description)
              }
              onCancel={() => setEditingStepId(null)}
              onDelete={() => handleDeleteStep(step.id)}
              onMoveUp={() => handleMoveStep(step.id, 'up')}
              onMoveDown={() => handleMoveStep(step.id, 'down')}
              disabled={!canEdit}
            />
          ))}

          {/* Add new step */}
          {canEdit && (
            <>
              {showNewStepInput ? (
                <div className="rounded-lg border border-dashed p-3 space-y-2">
                  <Input
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    placeholder="Step title"
                    className="h-8"
                    autoFocus
                  />
                  <Textarea
                    value={newStepDescription}
                    onChange={(e) => setNewStepDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="min-h-[60px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddStep} disabled={!newStepTitle.trim()}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Step
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewStepInput(false);
                        setNewStepTitle('');
                        setNewStepDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setShowNewStepInput(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              )}
            </>
          )}
        </div>
      </PlanContent>

      <PlanFooter className="flex justify-between">
        <div className="flex gap-2">
          {isDraft && activePlan.steps.length > 0 && (
            <Button onClick={handleApproveAndExecute} className="gap-2">
              <Play className="h-4 w-4" />
              Execute Plan
            </Button>
          )}
          {isExecuting && (
            <Button variant="destructive" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            deletePlan(activePlan.id);
            setActivePlan(null);
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Plan
        </Button>
      </PlanFooter>
    </Plan>
  );
}

export default AgentPlanEditor;
