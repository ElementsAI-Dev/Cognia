import type { WorkflowEdge, WorkflowNodeType, VisualWorkflow } from '@/types/workflow/workflow-editor';
import type { WorkflowInsertionIntent } from '@/stores/workflow/workflow-editor-store/types';

const DEFAULT_INSERTION_POSITION = { x: 250, y: 250 };
const APPEND_VERTICAL_GAP = 180;
const BRANCH_HORIZONTAL_GAP = 240;
const BRANCH_VERTICAL_GAP = 140;

export interface PlannedWorkflowInsertionEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: WorkflowEdge['type'];
  data?: WorkflowEdge['data'];
}

export interface WorkflowInsertionPlan {
  position: { x: number; y: number };
  edgeIdsToRemove: string[];
  edgesToAdd: PlannedWorkflowInsertionEdge[];
}

interface PlanWorkflowInsertionParams {
  workflow: VisualWorkflow;
  newNodeId: string;
  intent: WorkflowInsertionIntent | null;
}

function resolveEdge(workflow: VisualWorkflow, intent: WorkflowInsertionIntent | null) {
  if (!intent?.edgeId) {
    return undefined;
  }

  return workflow.edges.find((edge) => edge.id === intent.edgeId);
}

export function planWorkflowInsertion({
  workflow,
  newNodeId,
  intent,
}: PlanWorkflowInsertionParams): WorkflowInsertionPlan {
  if (!intent) {
    return {
      position: { ...DEFAULT_INSERTION_POSITION },
      edgeIdsToRemove: [],
      edgesToAdd: [],
    };
  }

  const sourceNode = intent.sourceNodeId
    ? workflow.nodes.find((node) => node.id === intent.sourceNodeId)
    : undefined;
  const targetNode = intent.targetNodeId
    ? workflow.nodes.find((node) => node.id === intent.targetNodeId)
    : undefined;
  const targetEdge = resolveEdge(workflow, intent);

  if (intent.mode === 'insert-between' && targetEdge && sourceNode && targetNode) {
    return {
      position: {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
      },
      edgeIdsToRemove: [targetEdge.id],
      edgesToAdd: [
        {
          source: targetEdge.source,
          target: newNodeId,
          sourceHandle: targetEdge.sourceHandle,
          type: targetEdge.type,
          data: targetEdge.data,
        },
        {
          source: newNodeId,
          target: targetEdge.target,
          targetHandle: targetEdge.targetHandle,
          type: targetEdge.type,
          data: targetEdge.data,
        },
      ],
    };
  }

  if (sourceNode) {
    const outgoingEdges = workflow.edges.filter((edge) => edge.source === sourceNode.id);
    const isBranch = intent.mode === 'branch';

    return {
      position: isBranch
        ? {
            x: sourceNode.position.x + BRANCH_HORIZONTAL_GAP,
            y: sourceNode.position.y + outgoingEdges.length * BRANCH_VERTICAL_GAP,
          }
        : {
            x: sourceNode.position.x,
            y: sourceNode.position.y + APPEND_VERTICAL_GAP,
          },
      edgeIdsToRemove: [],
      edgesToAdd: [
        {
          source: sourceNode.id,
          target: newNodeId,
        },
      ],
    };
  }

  return {
    position: intent.position || { ...DEFAULT_INSERTION_POSITION },
    edgeIdsToRemove: [],
    edgesToAdd: [],
  };
}

export function resolveInsertionModeForNode(type: WorkflowNodeType): 'append' | 'branch' {
  return type === 'conditional' || type === 'parallel' ? 'branch' : 'append';
}
