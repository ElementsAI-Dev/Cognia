'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow';
import type { WorkflowInspectorSection } from '@/stores/workflow/workflow-editor-store/types';
import { NodeConfigPanel } from './node-config-panel';
import { WorkflowInputTestPanel } from './workflow-input-test-panel';
import { ExecutionPanel } from '../execution/execution-panel';
import { NodeOutputPreview } from './node-config/node-output-preview';

interface WorkflowInspectorPanelProps {
  className?: string;
  preferredSection?: WorkflowInspectorSection;
}

export function WorkflowInspectorPanel({
  className,
  preferredSection,
}: WorkflowInspectorPanelProps) {
  const t = useTranslations('workflowEditor');
  const {
    currentWorkflow,
    selectedNodes,
    activeInspectorSection,
    setActiveInspectorSection,
    retryFromNode,
    updateNode,
    executionState,
    validationErrors,
  } = useWorkflowEditorStore((state) => ({
    currentWorkflow: state.currentWorkflow,
    selectedNodes: state.selectedNodes,
    activeInspectorSection: state.activeInspectorSection,
    setActiveInspectorSection: state.setActiveInspectorSection,
    retryFromNode: state.retryFromNode,
    updateNode: state.updateNode,
    executionState: state.executionState,
    validationErrors: state.validationErrors,
  }));
  const lastAppliedPreferredSectionRef = useRef<WorkflowInspectorSection | null>(null);

  useEffect(() => {
    if (!preferredSection) {
      lastAppliedPreferredSectionRef.current = null;
      return;
    }

    if (lastAppliedPreferredSectionRef.current === preferredSection) {
      return;
    }

    lastAppliedPreferredSectionRef.current = preferredSection;

    if (preferredSection !== activeInspectorSection) {
      setActiveInspectorSection(preferredSection);
    }
  }, [activeInspectorSection, preferredSection, setActiveInspectorSection]);

  const selectedNode = useMemo(
    () => currentWorkflow?.nodes.find((node) => node.id === selectedNodes[0]),
    [currentWorkflow, selectedNodes]
  );
  const selectedNodeState = selectedNode ? executionState?.nodeStates?.[selectedNode.id] : undefined;
  const selectedNodeIssues = validationErrors.filter((issue) => issue.nodeId === selectedNode?.id);

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="border-b px-3 py-2">
        <div className="text-sm font-medium">
          {selectedNode?.data.label || t('inspector') || 'Inspector'}
        </div>
        <div className="text-xs text-muted-foreground">
          {selectedNode ? selectedNode.type : t('selectNodeToConfig')}
        </div>
      </div>

      <Tabs
        value={activeInspectorSection}
        onValueChange={(value) => setActiveInspectorSection(value as WorkflowInspectorSection)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid w-full grid-cols-3 px-3 pt-2">
          <TabsTrigger value="config" className="text-xs">
            {t('properties') || 'Config'}
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs">
            {t('outputs') || 'Data'}
          </TabsTrigger>
          <TabsTrigger value="execution" className="text-xs">
            {t('execution') || 'Run'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-0 flex-1 min-h-0">
          {selectedNode ? (
            <NodeConfigPanel nodeId={selectedNode.id} className="h-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t('selectNodeToConfig')}
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-0 flex-1 min-h-0">
          {selectedNode ? (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-3">
                {selectedNodeIssues.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="text-xs font-medium text-destructive">
                      {selectedNodeIssues.length} validation issue(s)
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {selectedNodeIssues[0]?.message}
                    </div>
                  </div>
                )}

                <NodeOutputPreview
                  executionOutput={selectedNode.data.executionOutput}
                  pinnedData={selectedNode.data.pinnedData}
                  onPinnedDataChange={(pinnedData) => updateNode(selectedNode.id, { pinnedData })}
                />

                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Inputs
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys((selectedNode.data.inputs as Record<string, unknown>) || {}).length > 0 ? (
                      Object.keys((selectedNode.data.inputs as Record<string, unknown>) || {}).map((key) => (
                        <span key={key} className="rounded bg-muted px-2 py-1 text-xs">
                          {key}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No inputs</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Outputs
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys((selectedNode.data.outputs as Record<string, unknown>) || {}).length > 0 ? (
                      Object.keys((selectedNode.data.outputs as Record<string, unknown>) || {}).map((key) => (
                        <span key={key} className="rounded bg-muted px-2 py-1 text-xs">
                          {key}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No outputs</span>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t('selectNodeToConfig')}
            </div>
          )}
        </TabsContent>

        <TabsContent value="execution" className="mt-0 flex-1 min-h-0">
          <div className="flex h-full flex-col gap-3 p-3">
            {selectedNode && selectedNodeState?.status === 'failed' && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => retryFromNode(selectedNode.id)}
              >
                {`Retry ${selectedNode.id}`}
              </Button>
            )}
            <div className="shrink-0">
              <WorkflowInputTestPanel />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
              <ExecutionPanel className="h-full border-0" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WorkflowInspectorPanel;
