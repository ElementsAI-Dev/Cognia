'use client';

/**
 * NodeConfigPanel - Configuration panel for selected nodes
 * Refactored to use lazy-loaded node-specific config components
 */

import { Suspense, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { AlertCircle, AlertTriangle, Settings, Trash2 } from 'lucide-react';
import { validateNode } from '@/lib/workflow-editor/validation';
import type { ValidationResult } from '@/lib/workflow-editor/validation';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';

// Lazy-loaded node config components
import {
  AINodeConfig,
  ToolNodeConfig,
  ConditionalNodeConfig,
  CodeNodeConfig,
  LoopNodeConfig,
  HumanNodeConfig,
  StartNodeConfig,
  EndNodeConfig,
  ParallelNodeConfig,
  DelayNodeConfig,
  SubworkflowNodeConfig,
  WebhookNodeConfig,
  TransformNodeConfig,
  MergeNodeConfig,
  GroupNodeConfig,
  AnnotationNodeConfig,
  KnowledgeRetrievalNodeConfig,
  ParameterExtractorNodeConfig,
  VariableAggregatorNodeConfig,
  QuestionClassifierNodeConfig,
  TemplateTransformNodeConfig,
  IOSchemaEditor,
  NodeErrorConfigPanel,
  NodeOutputPreview,
  ConfigLoadingFallback,
  type AINodeData,
  type ToolNodeData,
  type ConditionalNodeData,
  type CodeNodeData,
  type LoopNodeData,
  type HumanNodeData,
  type StartNodeData,
  type EndNodeData,
  type ParallelNodeData,
  type DelayNodeData,
  type SubworkflowNodeData,
  type WebhookNodeData,
  type TransformNodeData,
  type MergeNodeData,
  type GroupNodeData,
  type AnnotationNodeData,
  type KnowledgeRetrievalNodeData,
  type ParameterExtractorNodeData,
  type VariableAggregatorNodeData,
  type QuestionClassifierNodeData,
  type TemplateTransformNodeData,
} from './node-config';
import type { NodeErrorConfig } from '@/types/workflow/workflow-editor';

interface NodeConfigPanelProps {
  nodeId: string;
  className?: string;
}

export function NodeConfigPanel({ nodeId, className }: NodeConfigPanelProps) {
  const t = useTranslations('workflowEditor');

  const {
    currentWorkflow,
    updateNode,
    deleteNode,
    activeConfigTab,
    setActiveConfigTab,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      currentWorkflow: state.currentWorkflow,
      updateNode: state.updateNode,
      deleteNode: state.deleteNode,
      activeConfigTab: state.activeConfigTab,
      setActiveConfigTab: state.setActiveConfigTab,
    }))
  );

  const node = useMemo(() => {
    return currentWorkflow?.nodes.find((n) => n.id === nodeId);
  }, [currentWorkflow, nodeId]);

  const data = node?.data as WorkflowNodeData | undefined;
  const nodeType = node?.type;

  const validation = useMemo((): ValidationResult => {
    if (!node || !currentWorkflow) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateNode(node.data.nodeType, node.data);
  }, [node, currentWorkflow]);

  const handleUpdateData = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      if (nodeId) {
        updateNode(nodeId, updates);
      }
    },
    [nodeId, updateNode]
  );

  const handleDelete = useCallback(() => {
    if (nodeId) {
      deleteNode(nodeId);
    }
  }, [nodeId, deleteNode]);

  if (!node || !data) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        {t('selectNodeToConfig')}
      </div>
    );
  }

  const nodeColor = NODE_TYPE_COLORS[nodeType as keyof typeof NODE_TYPE_COLORS] || '#6b7280';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: nodeColor }}
          />
          <span className="text-sm font-medium truncate max-w-[150px]">
            {data.label || nodeType}
          </span>
          <Badge variant="outline" className="text-xs">
            {nodeType}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="p-2 space-y-1 border-b shrink-0">
          {validation.errors.map((error, i) => (
            <div
              key={`error-${i}`}
              className="flex items-start gap-2 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error.message}</span>
            </div>
          ))}
          {validation.warnings.map((warning, i) => (
            <div
              key={`warning-${i}`}
              className="flex items-start gap-2 text-xs text-warning"
            >
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeConfigTab}
        onValueChange={setActiveConfigTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-4 px-3 pt-2 shrink-0">
          <TabsTrigger value="properties" className="text-xs">
            {t('properties')}
          </TabsTrigger>
          <TabsTrigger value="inputs" className="text-xs">
            {t('inputs')}
          </TabsTrigger>
          <TabsTrigger value="outputs" className="text-xs">
            {t('outputs')}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            Advanced
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          {/* Properties Tab */}
          <TabsContent value="properties" className="p-3 space-y-4 mt-0">
            {/* Common properties */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-xs flex items-center gap-1">
                  {t('name')}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="label"
                  value={data.label}
                  onChange={(e) => {
                    handleUpdateData({ label: e.target.value });
                    if (e.target.value.trim()) {
                      handleUpdateData({ isConfigured: true });
                    }
                  }}
                  className="h-8 text-sm"
                  placeholder="Enter node name"
                />
                {!data.label.trim() && (
                  <p className="text-xs text-destructive">Node name is required</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">
                  {t('description')}
                </Label>
                <Textarea
                  id="description"
                  value={data.description || ''}
                  onChange={(e) => handleUpdateData({ description: e.target.value })}
                  className="text-sm min-h-[60px] resize-none"
                  rows={2}
                  placeholder="Describe what this node does..."
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => handleUpdateData({ isConfigured: true })}
                  disabled={data.isConfigured}
                >
                  Mark as Configured
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => handleUpdateData({ executionStatus: 'idle' })}
                >
                  Reset Status
                </Button>
              </div>
            </div>

            {/* Type-specific properties with lazy loading */}
            <Suspense fallback={<ConfigLoadingFallback />}>
              {nodeType === 'ai' && (
                <AINodeConfig
                  data={data as AINodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'tool' && (
                <ToolNodeConfig
                  data={data as ToolNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'conditional' && (
                <ConditionalNodeConfig
                  data={data as ConditionalNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'code' && (
                <CodeNodeConfig
                  data={data as CodeNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'loop' && (
                <LoopNodeConfig
                  data={data as LoopNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'human' && (
                <HumanNodeConfig
                  data={data as HumanNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'start' && (
                <StartNodeConfig
                  data={data as StartNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'end' && (
                <EndNodeConfig
                  data={data as EndNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'parallel' && (
                <ParallelNodeConfig
                  data={data as ParallelNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'delay' && (
                <DelayNodeConfig
                  data={data as DelayNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'subworkflow' && (
                <SubworkflowNodeConfig
                  data={data as SubworkflowNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'webhook' && (
                <WebhookNodeConfig
                  data={data as WebhookNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'transform' && (
                <TransformNodeConfig
                  data={data as TransformNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'merge' && (
                <MergeNodeConfig
                  data={data as MergeNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'group' && (
                <GroupNodeConfig
                  data={data as GroupNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'annotation' && (
                <AnnotationNodeConfig
                  data={data as AnnotationNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'knowledgeRetrieval' && (
                <KnowledgeRetrievalNodeConfig
                  data={data as KnowledgeRetrievalNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'parameterExtractor' && (
                <ParameterExtractorNodeConfig
                  data={data as ParameterExtractorNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'variableAggregator' && (
                <VariableAggregatorNodeConfig
                  data={data as VariableAggregatorNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'questionClassifier' && (
                <QuestionClassifierNodeConfig
                  data={data as QuestionClassifierNodeData}
                  onUpdate={handleUpdateData}
                />
              )}

              {nodeType === 'templateTransform' && (
                <TemplateTransformNodeConfig
                  data={data as TemplateTransformNodeData}
                  onUpdate={handleUpdateData}
                />
              )}
            </Suspense>
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs" className="p-3 space-y-4 mt-0">
            <IOSchemaEditor
              schema={(data as AINodeData).inputs || {}}
              onChange={(inputs) => handleUpdateData({ inputs } as Partial<WorkflowNodeData>)}
              type="input"
            />
          </TabsContent>

          {/* Outputs Tab */}
          <TabsContent value="outputs" className="p-3 space-y-4 mt-0">
            <IOSchemaEditor
              schema={(data as AINodeData).outputs || {}}
              onChange={(outputs) => handleUpdateData({ outputs } as Partial<WorkflowNodeData>)}
              type="output"
            />

            {/* Node Output Preview & Pin Data (n8n-inspired) */}
            <NodeOutputPreview
              executionOutput={data.executionOutput}
              pinnedData={data.pinnedData}
              onPinnedDataChange={(pinnedData) =>
                handleUpdateData({ pinnedData } as Partial<WorkflowNodeData>)
              }
            />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="p-3 space-y-4 mt-0">
            <div className="space-y-4">
              {/* Execution Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  Execution Settings
                </h4>
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">Cache Results</Label>
                      <p className="text-xs text-muted-foreground">Reuse output for identical inputs</p>
                    </div>
                    <Switch
                      checked={Boolean((data as Record<string, unknown>).cacheResults)}
                      onCheckedChange={(cacheResults) => handleUpdateData({ cacheResults } as Partial<WorkflowNodeData>)}
                    />
                  </div>
                </div>
              </div>

              {/* Per-Node Error Handling (n8n-inspired) */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Error Handling & Retry
                </h4>
                <NodeErrorConfigPanel
                  config={data.errorConfig as NodeErrorConfig | undefined}
                  onChange={(errorConfig) =>
                    handleUpdateData({ errorConfig } as Partial<WorkflowNodeData>)
                  }
                />
              </div>

              {/* Node Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </h4>
                <Textarea
                  value={(data as Record<string, unknown>).notes as string || ''}
                  onChange={(e) => handleUpdateData({ notes: e.target.value } as Partial<WorkflowNodeData>)}
                  placeholder="Add notes for this node..."
                  className="text-xs min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* Node Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Metadata
                </h4>
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node ID</span>
                      <span className="font-mono">{nodeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-mono">{nodeType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="text-xs">{data.executionStatus}</Badge>
                    </div>
                    {data.executionTime !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Duration</span>
                        <span className="font-mono">{data.executionTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default NodeConfigPanel;
