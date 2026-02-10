'use client';

/**
 * SidebarWorkflows - Quick access to workflows from sidebar
 * Shows recent workflows and allows quick execution
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Workflow, Play, Clock, ChevronDown, ChevronRight, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { workflowRepository } from '@/lib/db/repositories';
import { useWorkflowEditorStore, useWorkflowStore, selectActiveExecution, selectExecutionProgress } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { Progress } from '@/components/ui/progress';
import type { VisualWorkflow } from '@/types/workflow/workflow-editor';

interface SidebarWorkflowsProps {
  defaultOpen?: boolean;
  limit?: number;
  collapsed?: boolean;
}

export function SidebarWorkflows({
  defaultOpen = true,
  limit = 5,
  collapsed = false,
}: SidebarWorkflowsProps) {
  const t = useTranslations('workflowEditor');
  const tCommon = useTranslations('common');
  const tSidebar = useTranslations('sidebar');
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [workflows, setWorkflows] = useState<VisualWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);

  const { loadWorkflow, startExecution, isExecuting } = useWorkflowEditorStore(
    useShallow((state) => ({
      loadWorkflow: state.loadWorkflow,
      startExecution: state.startExecution,
      isExecuting: state.isExecuting,
    }))
  );

  // Active execution & progress from workflow store selectors
  const activeExecution = useWorkflowStore(selectActiveExecution);
  const executionProgress = useWorkflowStore(selectExecutionProgress);

  // Load recent workflows
  const loadRecentWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await workflowRepository.getAll();
      setWorkflows(data.slice(0, limit));
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadRecentWorkflows();
  }, [loadRecentWorkflows]);

  // Handle quick run workflow
  const handleQuickRun = useCallback(
    async (workflow: VisualWorkflow, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isExecuting) return;

      setRunningWorkflowId(workflow.id);
      loadWorkflow(workflow);

      // Small delay to ensure workflow is loaded
      setTimeout(() => {
        startExecution({});
        router.push(`/workflows?id=${workflow.id}`);
      }, 100);
    },
    [isExecuting, loadWorkflow, startExecution, router]
  );

  // Handle open workflow
  const handleOpenWorkflow = useCallback(
    (workflow: VisualWorkflow) => {
      loadWorkflow(workflow);
      router.push(`/workflows?id=${workflow.id}`);
    },
    [loadWorkflow, router]
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/workflows">
                <Workflow className="h-4 w-4 text-green-500" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {tSidebar('workflows') || t('workflows') || 'Workflows'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors h-auto group"
        >
          <span className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-green-500" />
            <span>{tSidebar('workflows') || t('workflows') || 'Workflows'}</span>
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {workflows.length}
            </Badge>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 pt-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              {tSidebar('noWorkflows') || t('noWorkflows') || 'No workflows yet'}
            </p>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href="/workflows">
                <Plus className="h-3 w-3 mr-1" />
                {tSidebar('createWorkflow') || t('createWorkflow') || 'Create Workflow'}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {workflows.map((workflow) => (
              <WorkflowItem
                key={workflow.id}
                workflow={workflow}
                isRunning={runningWorkflowId === workflow.id && isExecuting}
                progress={
                  runningWorkflowId === workflow.id && activeExecution
                    ? executionProgress
                    : undefined
                }
                onOpen={() => handleOpenWorkflow(workflow)}
                onQuickRun={(e) => handleQuickRun(workflow, e)}
                runningLabel={tSidebar('running') || t('running') || 'Running...'}
                quickRunLabel={tSidebar('quickRun') || t('quickRun') || 'Quick Run'}
              />
            ))}

            <div className="pt-1">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs justify-start text-muted-foreground hover:text-foreground"
              >
                <Link href="/workflows">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {tCommon('viewAll') || tSidebar('viewAll') || 'View All'}
                </Link>
              </Button>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface WorkflowItemProps {
  workflow: VisualWorkflow;
  isRunning: boolean;
  progress?: number;
  onOpen: () => void;
  onQuickRun: (e: React.MouseEvent) => void;
  runningLabel: string;
  quickRunLabel: string;
}

function WorkflowItem({
  workflow,
  isRunning,
  progress,
  onOpen,
  onQuickRun,
  runningLabel,
  quickRunLabel,
}: WorkflowItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer',
        'bg-card/20 supports-[backdrop-filter]:bg-card/10 hover:bg-accent/50 transition-colors'
      )}
      onClick={onOpen}
    >
      <span className="text-lg shrink-0">{workflow.icon || '🔄'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{workflow.name}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(workflow.updatedAt).toLocaleDateString()}
        </p>
      </div>
      {/* Execution progress bar */}
      {isRunning && progress !== undefined && progress > 0 && (
        <Progress value={progress} className="h-1 w-12" />
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onQuickRun}
              disabled={isRunning}
            >
              {isRunning ? (
                <LoadingSpinner size="sm" className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 text-green-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isRunning ? runningLabel : quickRunLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default SidebarWorkflows;
