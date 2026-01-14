'use client';

/**
 * FlowChatEdge - Custom edge component for flow chat canvas
 * Shows animated connections between message nodes
 */

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowChatEdgeType } from '@/types/chat/flow-chat';

interface EdgeData {
  edgeType?: FlowChatEdgeType;
  branchId?: string;
  animated?: boolean;
  label?: string;
}

function FlowChatEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as EdgeData | undefined;
  const edgeType: FlowChatEdgeType = edgeData?.edgeType || 'conversation';
  const isAnimated = edgeData?.animated || edgeType === 'branch';
  const edgeLabel = edgeData?.label;

  // Determine edge style based on type
  const edgeStyles: Record<FlowChatEdgeType, React.CSSProperties> = {
    conversation: {
      stroke: 'hsl(var(--muted-foreground))',
      strokeWidth: 2,
    },
    branch: {
      stroke: 'hsl(var(--orange-500, 249 115 22))',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    },
    reference: {
      stroke: 'hsl(var(--blue-500, 59 130 246))',
      strokeWidth: 1.5,
      strokeDasharray: '3,3',
    },
    parallel: {
      stroke: 'hsl(var(--purple-500, 168 85 247))',
      strokeWidth: 2,
    },
  };

  const currentStyle = edgeStyles[edgeType] || edgeStyles.conversation;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...currentStyle,
          ...(style || {}),
        }}
        className={cn(
          'transition-all duration-200',
          selected && 'stroke-primary',
          isAnimated && 'animate-pulse'
        )}
      />
      
      {/* Edge label for branch edges */}
      {edgeType === 'branch' && edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Badge
              variant="secondary"
              className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            >
              {edgeLabel}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Animated dot for active connections */}
      {isAnimated && (
        <circle
          r={4}
          fill="hsl(var(--primary))"
          className="animate-flow-dot"
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  );
}

export const FlowChatEdge = memo(FlowChatEdgeComponent);
export default FlowChatEdge;
