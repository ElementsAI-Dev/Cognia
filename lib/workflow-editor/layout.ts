/**
 * Workflow Auto Layout
 * Uses dagre for hierarchical graph layout of workflow nodes
 */

import { Graph } from 'dagre-d3-es/src/graphlib/index.js';
import { layout } from 'dagre-d3-es/src/dagre/index.js';
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow/workflow-editor';

export type LayoutDirection = 'TB' | 'LR' | 'RL' | 'BT';

export interface LayoutOptions {
  direction: LayoutDirection;
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  direction: 'TB',
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalGap: 50,
  verticalGap: 80,
};

/**
 * Apply dagre layout to workflow nodes
 * Returns updated nodes with new positions
 */
export function applyDagreLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: Partial<LayoutOptions> = {}
): WorkflowNode[] {
  if (nodes.length === 0) return nodes;

  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const g = new Graph();
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.horizontalGap,
    ranksep: opts.verticalGap,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    const width = (node.measured?.width as number) || node.width || opts.nodeWidth;
    const height = (node.measured?.height as number) || node.height || opts.nodeHeight;
    g.setNode(node.id, { width, height });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    // Only add edges where both source and target exist
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  // Run dagre layout
  layout(g, {});

  // Map layout results back to nodes
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    // dagre gives center positions; React Flow uses top-left
    const width = (node.measured?.width as number) || node.width || opts.nodeWidth;
    const height = (node.measured?.height as number) || node.height || opts.nodeHeight;

    return {
      ...node,
      position: {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      },
    };
  });
}
