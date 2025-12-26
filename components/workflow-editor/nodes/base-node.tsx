'use client';

/**
 * BaseNode - Base component for all workflow nodes
 * Provides common styling and functionality
 */

import { memo, type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
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
  AlertCircle,
  CheckCircle,
  Loader2,
  XCircle,
  Pause,
} from 'lucide-react';
import type {
  WorkflowNodeData,
  WorkflowNodeType,
  NodeExecutionStatus,
} from '@/types/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow-editor';

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
};

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
  const nodeType = data.nodeType;
  const Icon = NODE_ICONS[nodeType] || Workflow;
  const StatusIcon = STATUS_ICONS[data.executionStatus];
  const color = NODE_TYPE_COLORS[nodeType];

  return (
    <div
      className={cn(
        'relative min-w-[180px] max-w-[280px] rounded-lg border-2 bg-card shadow-md transition-all',
        selected && 'ring-2 ring-primary ring-offset-2',
        data.hasError && 'border-destructive',
        data.executionStatus === 'running' && 'border-blue-500',
        data.executionStatus === 'completed' && 'border-green-500',
        data.executionStatus === 'failed' && 'border-red-500',
        !data.hasError && data.executionStatus === 'idle' && 'border-border'
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

        {/* Execution time */}
        {data.executionTime !== undefined && data.executionTime > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {(data.executionTime / 1000).toFixed(2)}s
          </div>
        )}

        {/* Configuration indicator */}
        {!data.isConfigured && nodeType !== 'start' && nodeType !== 'end' && (
          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
            <AlertCircle className="h-3 w-3" />
            <span>Not configured</span>
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
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
