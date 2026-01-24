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
  MarkerType,
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
      strokeWidth: 2,
      opacity: 0.8,
    },
    branch: {
      strokeWidth: 2.5,
      strokeDasharray: '5,5',
    },
    reference: {
      strokeWidth: 2,
      strokeDasharray: '3,3',
    },
    parallel: {
      strokeWidth: 2.5,
    },
  };

  const edgeClassNames: Record<FlowChatEdgeType, string> = {
    conversation: 'stroke-muted-foreground',
    branch: 'stroke-orange-500',
    reference: 'stroke-blue-500',
    parallel: 'stroke-purple-500',
  };

  const currentStyle = edgeStyles[edgeType] || edgeStyles.conversation;
  const currentClassName = edgeClassNames[edgeType] || edgeClassNames.conversation;

  // Helper to get marker color based on type
  // This is a simplified mapping that matches the Tailwind classes
  const getMarkerColor = (type: FlowChatEdgeType) => {
    switch (type) {
      case 'branch':
        return 'var(--orange-500)';
      case 'reference':
        return 'var(--blue-500)';
      case 'parallel':
        return 'var(--purple-500)';
      case 'conversation':
      default:
        return 'var(--muted-foreground)';
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...currentStyle,
          ...(style || {}),
        }}
        markerEnd={
          {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: (style?.stroke as string) || getMarkerColor(edgeType),
          } as any
        }
        className={cn(
          'transition-all duration-200',
          currentClassName,
          selected && 'stroke-primary opacity-100 stroke-[3px]!',
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
        <circle r={4} fill="var(--primary)" className="animate-flow-dot">
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

export const FlowChatEdge = memo(FlowChatEdgeComponent);
export default FlowChatEdge;
