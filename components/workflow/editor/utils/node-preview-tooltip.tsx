'use client';

/**
 * NodePreviewTooltip - Hover preview for workflow nodes
 * Shows a detailed preview of node configuration on hover
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Square,
  Sparkles,
  Wrench,
  GitBranch,
  GitFork,
  User,
  Workflow,
  Repeat,
  Clock,
  Globe,
  Code,
  Shuffle,
  GitMerge,
  CheckCircle,
  AlertCircle,
  Info,
  Group,
  StickyNote,
  BarChart2,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Radar,
  BookOpen,
  ListChecks,
  Combine,
  MessageSquare,
  FileCode,
} from 'lucide-react';
import type {
  WorkflowNodeData,
  WorkflowNodeType,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  CodeNodeData,
  LoopNodeData,
  DelayNodeData,
  WebhookNodeData,
  SubworkflowNodeData,
} from '@/types/workflow/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';

const NODE_ICONS: Record<WorkflowNodeType, React.ComponentType<{ className?: string }>> = {
  start: Play,
  end: Square,
  ai: Sparkles,
  tool: Wrench,
  conditional: GitBranch,
  parallel: GitFork,
  human: User,
  subworkflow: Workflow,
  loop: Repeat,
  delay: Clock,
  webhook: Globe,
  code: Code,
  transform: Shuffle,
  merge: GitMerge,
  group: Group,
  annotation: StickyNote,
  knowledgeRetrieval: BookOpen,
  parameterExtractor: ListChecks,
  variableAggregator: Combine,
  questionClassifier: MessageSquare,
  templateTransform: FileCode,
  chart: BarChart2,
  lineChart: LineChart,
  barChart: BarChart2,
  pieChart: PieChart,
  areaChart: AreaChart,
  scatterChart: ScatterChart,
  radarChart: Radar,
};

interface NodePreviewTooltipProps {
  data: WorkflowNodeData;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function NodePreviewTooltip({
  data,
  children,
  side = 'right',
  align = 'start',
}: NodePreviewTooltipProps) {
  const t = useTranslations('nodePreview');
  const nodeType = data.nodeType;
  const Icon = NODE_ICONS[nodeType] || Workflow;
  const color = NODE_TYPE_COLORS[nodeType];

  const previewContent = useMemo(() => {
    switch (nodeType) {
      case 'ai': {
        const aiData = data as AINodeData;
        return (
          <div className="space-y-2">
            {aiData.model && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('model')}:</span>
                <Badge variant="secondary" className="text-xs">{aiData.model}</Badge>
              </div>
            )}
            {aiData.aiPrompt && (
              <div>
                <span className="text-xs text-muted-foreground">{t('prompt')}:</span>
                <div className="mt-1 p-2 bg-muted/50 rounded text-xs font-mono line-clamp-3">
                  {aiData.aiPrompt}
                </div>
              </div>
            )}
            <div className="flex gap-2 text-xs">
              {aiData.temperature !== undefined && (
                <span>{t('temperature')}: {aiData.temperature}</span>
              )}
              {aiData.maxTokens && (
                <span>{t('maxTokens')}: {aiData.maxTokens}</span>
              )}
            </div>
          </div>
        );
      }
      case 'tool': {
        const toolData = data as ToolNodeData;
        return (
          <div className="space-y-2">
            {toolData.toolName ? (
              <div className="flex items-center gap-2">
                <Wrench className="h-3 w-3" />
                <span className="text-sm font-medium">{toolData.toolName}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">{t('noToolSelected')}</span>
            )}
            {toolData.toolCategory && (
              <Badge variant="outline" className="text-xs">{toolData.toolCategory}</Badge>
            )}
          </div>
        );
      }
      case 'conditional': {
        const condData = data as ConditionalNodeData;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('type')}:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {condData.conditionType}
              </Badge>
            </div>
            {condData.condition && (
              <div className="p-2 bg-muted/50 rounded text-xs font-mono">
                {condData.condition}
              </div>
            )}
          </div>
        );
      }
      case 'code': {
        const codeData = data as CodeNodeData;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('language')}:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {codeData.language}
              </Badge>
            </div>
            {codeData.code && (
              <div className="p-2 bg-muted/50 rounded text-xs font-mono line-clamp-4">
                {codeData.code}
              </div>
            )}
          </div>
        );
      }
      case 'loop': {
        const loopData = data as LoopNodeData;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('type')}:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {loopData.loopType}
              </Badge>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">{t('iterator')}: </span>
              <code className="bg-muted px-1 rounded">{loopData.iteratorVariable}</code>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">{t('maxIterations')}: </span>
              {loopData.maxIterations}
            </div>
          </div>
        );
      }
      case 'delay': {
        const delayData = data as DelayNodeData;
        return (
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs capitalize">
              {delayData.delayType}
            </Badge>
            {delayData.delayType === 'fixed' && delayData.delayMs && (
              <div className="text-xs">
                {t('duration')}: {(delayData.delayMs / 1000).toFixed(1)}s
              </div>
            )}
            {delayData.delayType === 'cron' && delayData.cronExpression && (
              <code className="text-xs bg-muted px-1 rounded">
                {delayData.cronExpression}
              </code>
            )}
          </div>
        );
      }
      case 'webhook': {
        const webhookData = data as WebhookNodeData;
        return (
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              {webhookData.method}
            </Badge>
            {webhookData.webhookUrl && (
              <div className="text-xs font-mono truncate max-w-[200px]">
                {webhookData.webhookUrl}
              </div>
            )}
          </div>
        );
      }
      case 'subworkflow': {
        const subData = data as SubworkflowNodeData;
        return (
          <div className="space-y-2">
            {subData.workflowName || subData.workflowId ? (
              <div className="flex items-center gap-2">
                <Workflow className="h-3 w-3" />
                <span className="text-sm">{subData.workflowName || subData.workflowId}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">{t('noWorkflowSelected')}</span>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  }, [nodeType, data, t]);

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className="w-72 p-0"
        sideOffset={8}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{data.label}</h4>
              <Badge variant="outline" className="text-xs">{nodeType}</Badge>
            </div>
          </div>

          {/* Description */}
          {data.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {data.description}
            </p>
          )}

          <Separator className="my-2" />

          {/* Status & IO */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {data.isConfigured ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>{t('configured')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <AlertCircle className="h-3 w-3" />
                <span>{t('notConfigured')}</span>
              </div>
            )}
            {data.hasError && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{t('hasErrors')}</span>
              </div>
            )}
            {data.executionStatus && data.executionStatus !== 'idle' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] h-4 px-1',
                  data.executionStatus === 'running' && 'border-blue-500 text-blue-600',
                  data.executionStatus === 'completed' && 'border-green-500 text-green-600',
                  data.executionStatus === 'failed' && 'border-red-500 text-red-600',
                  data.executionStatus === 'skipped' && 'border-gray-400 text-gray-500',
                )}
              >
                {data.executionStatus}
              </Badge>
            )}
            {data.inputs && Object.keys(data.inputs as Record<string, unknown>).length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {Object.keys(data.inputs as Record<string, unknown>).length} in
              </Badge>
            )}
            {data.outputs && Object.keys(data.outputs as Record<string, unknown>).length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {Object.keys(data.outputs as Record<string, unknown>).length} out
              </Badge>
            )}
          </div>

          {/* Type-specific content */}
          {previewContent && (
            <ScrollArea className="max-h-[150px]">
              {previewContent}
            </ScrollArea>
          )}

          {/* Hint */}
          <Separator className="my-2" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>{t('doubleClickToConfigure')}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default NodePreviewTooltip;
