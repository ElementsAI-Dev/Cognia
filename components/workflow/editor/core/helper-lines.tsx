'use client';

/**
 * HelperLines - Visual alignment guide lines during node drag
 * Shows horizontal/vertical lines when dragged nodes align with other nodes
 */

import { memo } from 'react';
import { useStore, type ReactFlowState } from '@xyflow/react';

interface HelperLinesProps {
  horizontal?: number | null;
  vertical?: number | null;
}

const GUIDE_COLOR = 'hsl(var(--primary) / 0.5)';
const GUIDE_DASH = '5,5';

function HelperLinesComponent({ horizontal, vertical }: HelperLinesProps) {
  const transform = useStore((s: ReactFlowState) => s.transform);

  if (horizontal === null && vertical === null) return null;

  const [tx, ty, scale] = transform;

  return (
    <svg
      className="react-flow__helper-lines pointer-events-none absolute inset-0 z-50 overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      {horizontal !== null && horizontal !== undefined && (
        <line
          x1="0"
          y1={horizontal * scale + ty}
          x2="100%"
          y2={horizontal * scale + ty}
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          strokeDasharray={GUIDE_DASH}
        />
      )}
      {vertical !== null && vertical !== undefined && (
        <line
          x1={vertical * scale + tx}
          y1="0"
          x2={vertical * scale + tx}
          y2="100%"
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          strokeDasharray={GUIDE_DASH}
        />
      )}
    </svg>
  );
}

export const HelperLines = memo(HelperLinesComponent);

/**
 * Calculate helper line positions based on a dragging node and other nodes.
 * Returns horizontal/vertical guide positions when alignment is detected.
 */
const SNAP_THRESHOLD = 5; // pixels in flow coords

interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getHelperLines(
  draggingNode: NodeBounds,
  otherNodes: NodeBounds[]
): { horizontal: number | null; vertical: number | null; snapX: number | null; snapY: number | null } {
  let horizontal: number | null = null;
  let vertical: number | null = null;
  let snapX: number | null = null;
  let snapY: number | null = null;

  const dragCenterX = draggingNode.x + draggingNode.width / 2;
  const dragCenterY = draggingNode.y + draggingNode.height / 2;
  const dragRight = draggingNode.x + draggingNode.width;
  const dragBottom = draggingNode.y + draggingNode.height;

  let minDistH = SNAP_THRESHOLD;
  let minDistV = SNAP_THRESHOLD;

  for (const node of otherNodes) {
    if (node.id === draggingNode.id) continue;

    const nodeCenterX = node.x + node.width / 2;
    const nodeCenterY = node.y + node.height / 2;
    const nodeRight = node.x + node.width;
    const nodeBottom = node.y + node.height;

    // Vertical alignment checks (for vertical guide line = same X)
    const vChecks = [
      { drag: draggingNode.x, target: node.x },             // left-left
      { drag: draggingNode.x, target: nodeRight },           // left-right
      { drag: dragRight, target: node.x },                   // right-left
      { drag: dragRight, target: nodeRight },                 // right-right
      { drag: dragCenterX, target: nodeCenterX },             // center-center
    ];

    for (const check of vChecks) {
      const dist = Math.abs(check.drag - check.target);
      if (dist < minDistV) {
        minDistV = dist;
        vertical = check.target;
        snapX = draggingNode.x + (check.target - check.drag);
      }
    }

    // Horizontal alignment checks (for horizontal guide line = same Y)
    const hChecks = [
      { drag: draggingNode.y, target: node.y },              // top-top
      { drag: draggingNode.y, target: nodeBottom },           // top-bottom
      { drag: dragBottom, target: node.y },                   // bottom-top
      { drag: dragBottom, target: nodeBottom },                // bottom-bottom
      { drag: dragCenterY, target: nodeCenterY },              // center-center
    ];

    for (const check of hChecks) {
      const dist = Math.abs(check.drag - check.target);
      if (dist < minDistH) {
        minDistH = dist;
        horizontal = check.target;
        snapY = draggingNode.y + (check.target - check.drag);
      }
    }
  }

  return { horizontal, vertical, snapX, snapY };
}

export default HelperLines;
