'use client';

/**
 * BaseNode - Base component for all workflow nodes
 * Provides common styling and functionality
 */

import { memo, useCallback, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NodePreviewTooltip } from '../utils/node-preview-tooltip';
import { NodeQuickConfig } from '../utils/node-quick-config';
import {
  Workflow,
  AlertCircle,
  CheckCircle,
  Loader2,
  XCircle,
  Pause,
  Clock,
  Play,
  Power,
  Database,
} from 'lucide-react';
import { NODE_ICONS } from '@/lib/workflow-editor/constants';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import type {
  WorkflowNodeData,
  NodeExecutionStatus,
} from '@/types/workflow/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';


const STATUS_ICONS: Record<NodeExecutionStatus, React.ComponentType<{ className?: string }> | null> = {
  idle: null,
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  skipped: Pause,
  waiting: AlertCircle,
};

const STATUS_COLORS: Record<NodeExecutionStatus, string> = {
  idle: '',
  pending: 'text-yellow-500',
  running: 'text-blue-500 animate-spin',
  completed: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-gray-400',
  waiting: 'text-orange-500',
};

export interface BaseNodeProps extends NodeProps {
  data: WorkflowNodeData;
  children?: ReactNode;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  sourceHandlePosition?: Position;
  targetHandlePosition?: Position;
  multipleSourceHandles?: { id: string; position: Position; label?: string }[];
  multipleTargetHandles?: { id: string; position: Position; label?: string }[];
}

function BaseNodeComponent({
  data,
  selected,
  children,
  showSourceHandle = true,
  showTargetHandle = true,
  sourceHandlePosition = Position.Bottom,
  targetHandlePosition = Position.Top,
  multipleSourceHandles,
  multipleTargetHandles,
}: BaseNodeProps) {
  const t = useTranslations('workflowEditor');
  const nodeType = data.nodeType;
  const Icon = NODE_ICONS[nodeType] || Workflow;
  const StatusIcon = STATUS_ICONS[data.executionStatus];
  const color = NODE_TYPE_COLORS[nodeType];
  const isDisabled = Boolean(data.isDisabled);

  const { executeSingleNode, updateNode, isExecuting } = useWorkflowEditorStore(
    useShallow((state) => ({
      executeSingleNode: state.executeSingleNode,
      updateNode: state.updateNode,
      isExecuting: state.isExecuting,
    }))
  );

  const handleTestRun = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.id && !isExecuting && !isDisabled) {
      executeSingleNode(data.id);
    }
  }, [data.id, isExecuting, isDisabled, executeSingleNode]);

  const handleToggleDisable = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.id) {
      updateNode(data.id, { isDisabled: !isDisabled });
    }
  }, [data.id, isDisabled, updateNode]);

  return (
    <NodePreviewTooltip data={data}>
      <NodeQuickConfig nodeId={data.id || ''} data={data}>
      <div
        className={cn(
          'group/node relative min-w-[180px] max-w-[280px] rounded-lg border-2 bg-card shadow-md',
          'transition-all duration-200 ease-in-out',
          'hover:shadow-lg hover:scale-[1.02]',
          // Selection state
          selected && 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]',
          // Disabled state
          isDisabled && 'opacity-40 grayscale border-dashed',
          // Error state
          !isDisabled && data.hasError && 'border-destructive animate-pulse',
          // Execution states with animations
          !isDisabled && data.executionStatus === 'running' && 'border-blue-500 shadow-blue-500/30 shadow-lg animate-pulse',
          !isDisabled && data.executionStatus === 'completed' && 'border-green-500 shadow-green-500/20 shadow-md',
          !isDisabled && data.executionStatus === 'failed' && 'border-red-500 shadow-red-500/30 shadow-md',
          !isDisabled && data.executionStatus === 'pending' && 'border-yellow-500 opacity-70',
          !isDisabled && data.executionStatus === 'skipped' && 'border-gray-400 opacity-50',
          // Default state
          !isDisabled && !data.hasError && data.executionStatus === 'idle' && 'border-border hover:border-primary/50'
        )}
      >
      {/* Color indicator bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: color }}
      />

      {/* Target handles */}
      {showTargetHandle && !multipleTargetHandles && nodeType !== 'start' && (
        <Handle
          type="target"
          position={targetHandlePosition}
          className="w-3! h-3! bg-muted-foreground! border-2! border-background!"
        />
      )}
      {multipleTargetHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={handle.position}
          className="w-3! h-3! bg-muted-foreground! border-2! border-background!"
        />
      ))}

      {/* Node content */}
      <div className="p-3 pl-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{data.label}</h4>
          </div>
          {StatusIcon && (
            <StatusIcon className={cn('h-4 w-4', STATUS_COLORS[data.executionStatus])} />
          )}

          {/* Node action buttons (hover-visible) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/node:opacity-100 transition-opacity">
            {/* Test run button */}
            {nodeType !== 'start' && nodeType !== 'end' && nodeType !== 'annotation' && (
              <button
                onClick={handleTestRun}
                disabled={isExecuting || isDisabled}
                className={cn(
                  'p-0.5 rounded hover:bg-accent',
                  isExecuting || isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                )}
                title={t('testNode')}
              >
                <Play className="h-3 w-3 text-green-500" />
              </button>
            )}
            {/* Disable toggle button */}
            {nodeType !== 'start' && nodeType !== 'end' && (
              <button
                onClick={handleToggleDisable}
                className="p-0.5 rounded hover:bg-accent cursor-pointer"
                title={isDisabled ? t('enableNode') : t('disableNode')}
              >
                <Power className={cn('h-3 w-3', isDisabled ? 'text-red-500' : 'text-muted-foreground')} />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {data.description}
          </p>
        )}

        {/* Custom content */}
        {children && <div className="mt-2">{children}</div>}

        {/* Error message */}
        {data.hasError && data.errorMessage && (
          <div className="mt-2 flex items-start gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{data.errorMessage}</span>
          </div>
        )}

        {/* Execution status indicator */}
        {data.executionStatus === 'running' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-500 bg-blue-500/10 rounded px-2 py-1">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{t('executing')}</span>
          </div>
        )}

        {/* Execution time */}
        {data.executionTime !== undefined && data.executionTime > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>⏱</span>
            <span>{(data.executionTime / 1000).toFixed(2)}s</span>
          </div>
        )}

        {/* Inline output summary (1.3) */}
        {data.executionOutput !== undefined && data.executionOutput !== null && data.executionStatus === 'completed' && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
            <Database className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {Array.isArray(data.executionOutput)
                ? `${data.executionOutput.length} items`
                : typeof data.executionOutput === 'object'
                  ? `${Object.keys(data.executionOutput as Record<string, unknown>).length} keys`
                  : String(data.executionOutput).slice(0, 50)}
            </span>
          </div>
        )}

        {/* Disabled indicator */}
        {isDisabled && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Power className="h-3 w-3" />
            <span>{t('nodeDisabled')}</span>
          </div>
        )}

        {/* Configuration indicator */}
        {!data.isConfigured && !isDisabled && nodeType !== 'start' && nodeType !== 'end' && (
          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
            <AlertCircle className="h-3 w-3" />
            <span>{t('notConfigured')}</span>
          </div>
        )}
      </div>

      {/* Source handles */}
      {showSourceHandle && !multipleSourceHandles && nodeType !== 'end' && (
        <Handle
          type="source"
          position={sourceHandlePosition}
          className="w-3! h-3! bg-muted-foreground! border-2! border-background!"
        />
      )}
      {multipleSourceHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          className="w-3! h-3! bg-muted-foreground! border-2! border-background!"
        />
      ))}
      </div>
    </NodeQuickConfig>
    </NodePreviewTooltip>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
