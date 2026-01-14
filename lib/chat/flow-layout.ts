/**
 * Flow Layout - Layout algorithm for flow chat canvas
 * Uses dagre for automatic graph layout
 */

import type { UIMessage } from '@/types/core/message';
import type { ConversationBranch } from '@/types/core/session';
import type {
  FlowChatNode,
  FlowChatEdge,
  FlowChatNodeData,
  FlowLayoutOptions,
  FlowLayoutDirection,
  NodePosition,
  FlowChatCanvasState,
} from '@/types/chat/flow-chat';
import { DEFAULT_LAYOUT_OPTIONS } from '@/types/chat/flow-chat';

/**
 * Build message hierarchy for layout
 */
interface MessageHierarchy {
  messageId: string;
  parentId: string | null;
  branchId?: string;
  children: string[];
  depth: number;
  index: number;
}

/**
 * Build message hierarchy from messages and branches
 */
function buildMessageHierarchy(
  messages: UIMessage[],
  branches: ConversationBranch[]
): Map<string, MessageHierarchy> {
  const hierarchy = new Map<string, MessageHierarchy>();
  const branchPoints = new Map<string, string[]>(); // messageId -> branch IDs

  // Map branch points
  for (const branch of branches) {
    const existing = branchPoints.get(branch.branchPointMessageId) || [];
    existing.push(branch.id);
    branchPoints.set(branch.branchPointMessageId, existing);
  }

  // Group messages by branch
  const mainBranchMessages = messages.filter((m) => !m.branchId);
  const branchMessages = new Map<string, UIMessage[]>();

  for (const msg of messages) {
    if (msg.branchId) {
      const existing = branchMessages.get(msg.branchId) || [];
      existing.push(msg);
      branchMessages.set(msg.branchId, existing);
    }
  }

  // Build hierarchy for main branch
  let prevId: string | null = null;
  for (let i = 0; i < mainBranchMessages.length; i++) {
    const msg = mainBranchMessages[i];
    hierarchy.set(msg.id, {
      messageId: msg.id,
      parentId: prevId,
      children: [],
      depth: 0,
      index: i,
    });

    if (prevId) {
      const parent = hierarchy.get(prevId);
      if (parent) {
        parent.children.push(msg.id);
      }
    }

    prevId = msg.id;
  }

  // Build hierarchy for branches
  for (const branch of branches) {
    const branchMsgs = branchMessages.get(branch.id) || [];
    let branchPrevId: string | null = branch.branchPointMessageId;

    for (let i = 0; i < branchMsgs.length; i++) {
      const msg = branchMsgs[i];
      const parentDepth = hierarchy.get(branchPrevId || '')?.depth ?? 0;

      hierarchy.set(msg.id, {
        messageId: msg.id,
        parentId: branchPrevId,
        branchId: branch.id,
        children: [],
        depth: parentDepth + 1,
        index: i,
      });

      if (branchPrevId) {
        const parent = hierarchy.get(branchPrevId);
        if (parent) {
          parent.children.push(msg.id);
        }
      }

      branchPrevId = msg.id;
    }
  }

  return hierarchy;
}

/**
 * Simple dagre-like layout calculation
 * Since we can't import dagre directly, implement a simple tree layout
 */
function calculateTreeLayout(
  hierarchy: Map<string, MessageHierarchy>,
  options: FlowLayoutOptions
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const { direction, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, branchSpacing } = options;

  // Find root nodes (no parent)
  const roots: string[] = [];
  for (const [id, node] of hierarchy) {
    if (!node.parentId) {
      roots.push(id);
    }
  }

  // Calculate positions using BFS
  const visited = new Set<string>();
  const queue: Array<{ id: string; x: number; y: number; branchOffset: number }> = [];

  // Start from roots
  const startX = 0;
  for (const rootId of roots) {
    queue.push({ id: rootId, x: startX, y: 0, branchOffset: 0 });
  }

  // Track branch offsets
  const branchOffsets = new Map<string, number>();
  let currentBranchOffset = 0;

  while (queue.length > 0) {
    const { id, x, y, branchOffset } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    const node = hierarchy.get(id);
    if (!node) continue;

    // Calculate position based on direction
    let posX: number;
    let posY: number;

    if (direction === 'TB' || direction === 'BT') {
      posX = x + branchOffset;
      posY = direction === 'TB' ? y : -y;
    } else {
      posX = direction === 'LR' ? y : -y;
      posY = x + branchOffset;
    }

    positions.set(id, { x: posX, y: posY });

    // Queue children
    const children = node.children;
    const _childBranchOffset = branchOffset;

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const childNode = hierarchy.get(childId);

      if (childNode) {
        // Calculate offset for branches
        let newBranchOffset = branchOffset;
        if (childNode.branchId && !branchOffsets.has(childNode.branchId)) {
          currentBranchOffset += branchSpacing;
          branchOffsets.set(childNode.branchId, currentBranchOffset);
          newBranchOffset = currentBranchOffset;
        } else if (childNode.branchId) {
          newBranchOffset = branchOffsets.get(childNode.branchId) || branchOffset;
        }

        // Calculate next position
        const nextX = direction === 'TB' || direction === 'BT'
          ? x
          : x + nodeWidth + horizontalSpacing;
        const nextY = direction === 'TB' || direction === 'BT'
          ? y + nodeHeight + verticalSpacing
          : y;

        queue.push({
          id: childId,
          x: nextX,
          y: nextY,
          branchOffset: newBranchOffset,
        });
      }
    }
  }

  return positions;
}

/**
 * Convert messages to flow nodes
 */
export function messagesToFlowNodes(
  messages: UIMessage[],
  branches: ConversationBranch[],
  canvasState: FlowChatCanvasState,
  options: Partial<FlowLayoutOptions> = {}
): { nodes: FlowChatNode[]; edges: FlowChatEdge[] } {
  const mergedOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const hierarchy = buildMessageHierarchy(messages, branches);

  // Calculate positions if not manually set
  let positions: Map<string, { x: number; y: number }>;

  if (canvasState.layoutAlgorithm === 'manual' && Object.keys(canvasState.nodePositions).length > 0) {
    // Use manual positions
    positions = new Map();
    for (const [msgId, pos] of Object.entries(canvasState.nodePositions)) {
      positions.set(msgId, { x: pos.x, y: pos.y });
    }
  } else {
    // Calculate automatic layout
    positions = calculateTreeLayout(hierarchy, mergedOptions);
  }

  // Create nodes
  const nodes: FlowChatNode[] = [];
  const edges: FlowChatEdge[] = [];

  // Branch point map
  const branchPointMap = new Map<string, string[]>();
  for (const branch of branches) {
    const existing = branchPointMap.get(branch.branchPointMessageId) || [];
    existing.push(branch.id);
    branchPointMap.set(branch.branchPointMessageId, existing);
  }

  for (const message of messages) {
    const pos = positions.get(message.id) || { x: 0, y: 0 };
    const hierarchyNode = hierarchy.get(message.id);
    const childBranchIds = branchPointMap.get(message.id);

    const nodeData: FlowChatNodeData = {
      message,
      role: message.role,
      branchId: message.branchId,
      isBranchPoint: !!childBranchIds && childBranchIds.length > 0,
      childBranchIds,
      collapseState: canvasState.collapsedNodeIds.includes(message.id) ? 'collapsed' : 'expanded',
      isSelected: canvasState.selectedNodeIds.includes(message.id),
      model: message.model,
      provider: message.provider,
    };

    const node: FlowChatNode = {
      id: message.id,
      type: message.role as 'user' | 'assistant' | 'system',
      position: pos,
      data: nodeData,
      draggable: true,
      selectable: true,
    };

    nodes.push(node);

    // Create edge from parent
    if (hierarchyNode?.parentId) {
      const edge: FlowChatEdge = {
        id: `edge-${hierarchyNode.parentId}-${message.id}`,
        source: hierarchyNode.parentId,
        target: message.id,
        type: 'default',
        data: {
          edgeType: message.branchId ? 'branch' : 'conversation',
          branchId: message.branchId,
          animated: false,
        },
      };
      edges.push(edge);
    }
  }

  return { nodes, edges };
}

/**
 * Auto-layout nodes using dagre-like algorithm
 */
export function autoLayoutNodes(
  nodes: FlowChatNode[],
  edges: FlowChatEdge[],
  direction: FlowLayoutDirection = 'TB',
  options: Partial<FlowLayoutOptions> = {}
): FlowChatNode[] {
  const mergedOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options, direction };

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    const children = adjacency.get(edge.source) || [];
    children.push(edge.target);
    adjacency.set(edge.source, children);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find roots (in-degree 0)
  const roots: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) roots.push(id);
  }

  // BFS to assign positions
  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  const levels = new Map<string, number>();
  const levelNodes = new Map<number, string[]>();

  // Assign levels
  const queue: Array<{ id: string; level: number }> = roots.map((id) => ({ id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    levels.set(id, level);
    const nodesAtLevel = levelNodes.get(level) || [];
    nodesAtLevel.push(id);
    levelNodes.set(level, nodesAtLevel);

    const children = adjacency.get(id) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    }
  }

  // Calculate positions
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = mergedOptions;

  for (const [level, nodeIds] of levelNodes) {
    const levelWidth = nodeIds.length * (nodeWidth + horizontalSpacing) - horizontalSpacing;
    const startX = -levelWidth / 2;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const x = startX + i * (nodeWidth + horizontalSpacing) + nodeWidth / 2;
      const y = level * (nodeHeight + verticalSpacing);

      if (direction === 'TB') {
        positions.set(nodeId, { x, y });
      } else if (direction === 'BT') {
        positions.set(nodeId, { x, y: -y });
      } else if (direction === 'LR') {
        positions.set(nodeId, { x: y, y: x });
      } else {
        positions.set(nodeId, { x: -y, y: x });
      }
    }
  }

  // Apply positions to nodes
  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      return { ...node, position: pos };
    }
    return node;
  });
}

/**
 * Get node positions for persistence
 */
export function getNodePositions(nodes: FlowChatNode[]): NodePosition[] {
  return nodes.map((node) => ({
    messageId: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width,
    height: node.measured?.height,
  }));
}

/**
 * Calculate optimal viewport to fit all nodes
 */
export function calculateFitViewport(
  nodes: FlowChatNode[],
  padding: number = 50
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { x, y } = node.position;
    const width = node.measured?.width || 400;
    const height = node.measured?.height || 150;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);
  }

  const graphWidth = maxX - minX + padding * 2;
  const graphHeight = maxY - minY + padding * 2;

  // Assume viewport is roughly 1200x800
  const viewportWidth = 1200;
  const viewportHeight = 800;

  const zoomX = viewportWidth / graphWidth;
  const zoomY = viewportHeight / graphHeight;
  const zoom = Math.min(zoomX, zoomY, 1);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: -centerX * zoom + viewportWidth / 2,
    y: -centerY * zoom + viewportHeight / 2,
    zoom,
  };
}
