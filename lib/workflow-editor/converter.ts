/**
 * Workflow Converter - Converts between visual workflow and execution definition
 */

import type {
  VisualWorkflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  StartNodeData,
  EndNodeData,
} from '@/types/workflow-editor';
import type {
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowIOSchema,
} from '@/types/workflow';

/**
 * Convert a visual workflow to an executable workflow definition
 */
export function visualToDefinition(visual: VisualWorkflow): WorkflowDefinition {
  const steps: WorkflowStepDefinition[] = [];
  const nodeMap = new Map<string, WorkflowNode>();
  
  // Build node map
  visual.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // Build adjacency list for dependencies
  const incomingEdges = new Map<string, string[]>();
  visual.edges.forEach(edge => {
    const existing = incomingEdges.get(edge.target) || [];
    existing.push(edge.source);
    incomingEdges.set(edge.target, existing);
  });

  // Convert nodes to steps (skip start and end nodes)
  visual.nodes.forEach(node => {
    if (node.type === 'start' || node.type === 'end') {
      return;
    }

    const step = nodeToStep(node, incomingEdges.get(node.id) || []);
    if (step) {
      steps.push(step);
    }
  });

  // Get inputs from start node
  const startNode = visual.nodes.find(n => n.type === 'start');
  const inputs: Record<string, WorkflowIOSchema> = startNode
    ? (startNode.data as StartNodeData).workflowInputs || {}
    : {};

  // Get outputs from end node
  const endNode = visual.nodes.find(n => n.type === 'end');
  const outputs: Record<string, WorkflowIOSchema> = endNode
    ? (endNode.data as EndNodeData).workflowOutputs || {}
    : {};

  return {
    id: visual.id,
    name: visual.name,
    description: visual.description,
    type: visual.type,
    version: visual.version,
    icon: visual.icon,
    category: visual.category,
    tags: visual.tags,
    steps,
    inputs,
    outputs,
    defaultConfig: {},
    createdAt: visual.createdAt,
    updatedAt: visual.updatedAt,
  };
}

/**
 * Convert a workflow node to a step definition
 */
function nodeToStep(
  node: WorkflowNode,
  dependencies: string[]
): WorkflowStepDefinition | null {
  const data = node.data;
  const baseStep: Partial<WorkflowStepDefinition> = {
    id: node.id,
    name: data.label,
    description: data.description || '',
    dependencies: dependencies.filter(d => d !== 'start-1'), // Filter out start node
  };

  switch (data.nodeType) {
    case 'ai': {
      const aiData = data as AINodeData;
      return {
        ...baseStep,
        type: 'ai',
        aiPrompt: aiData.aiPrompt,
        inputs: aiData.inputs || {},
        outputs: aiData.outputs || {},
      } as WorkflowStepDefinition;
    }

    case 'tool': {
      const toolData = data as ToolNodeData;
      return {
        ...baseStep,
        type: 'tool',
        toolName: toolData.toolName,
        inputs: toolData.inputs || {},
        outputs: toolData.outputs || {},
      } as WorkflowStepDefinition;
    }

    case 'conditional': {
      const condData = data as ConditionalNodeData;
      return {
        ...baseStep,
        type: 'conditional',
        condition: condData.condition,
        inputs: condData.inputs || {},
        outputs: {},
      } as WorkflowStepDefinition;
    }

    case 'human': {
      return {
        ...baseStep,
        type: 'human',
        inputs: (data as AINodeData).inputs || {},
        outputs: (data as AINodeData).outputs || {},
      } as WorkflowStepDefinition;
    }

    case 'parallel': {
      return {
        ...baseStep,
        type: 'parallel',
        inputs: (data as AINodeData).inputs || {},
        outputs: (data as AINodeData).outputs || {},
      } as WorkflowStepDefinition;
    }

    case 'code':
    case 'transform':
    case 'loop':
    case 'webhook':
    case 'delay':
    case 'merge':
    case 'subworkflow': {
      return {
        ...baseStep,
        type: 'tool',
        toolName: `${data.nodeType}_executor`,
        inputs: (data as AINodeData).inputs || {},
        outputs: (data as AINodeData).outputs || {},
      } as WorkflowStepDefinition;
    }

    default:
      return null;
  }
}

/**
 * Convert an executable workflow definition to a visual workflow
 */
export function definitionToVisual(definition: WorkflowDefinition): VisualWorkflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Create start node
  const startNode: WorkflowNode = {
    id: 'start-1',
    type: 'start',
    position: { x: 400, y: 50 },
    data: {
      label: 'Start',
      nodeType: 'start',
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      workflowInputs: definition.inputs,
    } as StartNodeData,
  };
  nodes.push(startNode);

  // Create step nodes
  const stepPositions = calculateStepPositions(definition.steps);
  
  definition.steps.forEach((step, index) => {
    const node = stepToNode(step, stepPositions[step.id] || { x: 400, y: 150 + index * 120 });
    nodes.push(node);

    // Create edges from dependencies
    if (step.dependencies && step.dependencies.length > 0) {
      step.dependencies.forEach(depId => {
        edges.push({
          id: `edge-${depId}-${step.id}`,
          source: depId,
          target: step.id,
          type: 'default',
          data: {},
        });
      });
    } else {
      // Connect to start node if no dependencies
      edges.push({
        id: `edge-start-${step.id}`,
        source: 'start-1',
        target: step.id,
        type: 'default',
        data: {},
      });
    }
  });

  // Create end node
  const endNode: WorkflowNode = {
    id: 'end-1',
    type: 'end',
    position: { x: 400, y: 150 + definition.steps.length * 120 },
    data: {
      label: 'End',
      nodeType: 'end',
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      workflowOutputs: definition.outputs,
      outputMapping: {},
    } as EndNodeData,
  };
  nodes.push(endNode);

  // Connect last steps to end node
  const lastSteps = findLastSteps(definition.steps);
  lastSteps.forEach(stepId => {
    edges.push({
      id: `edge-${stepId}-end`,
      source: stepId,
      target: 'end-1',
      type: 'default',
      data: {},
    });
  });

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    type: definition.type,
    version: definition.version,
    icon: definition.icon,
    category: definition.category,
    tags: definition.tags,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    inputs: definition.inputs,
    outputs: definition.outputs,
    variables: {},
    settings: {
      autoSave: true,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      retryOnFailure: true,
      maxRetries: 3,
      logLevel: 'info',
    },
    createdAt: definition.createdAt || new Date(),
    updatedAt: definition.updatedAt || new Date(),
  };
}

/**
 * Convert a step definition to a workflow node
 */
function stepToNode(step: WorkflowStepDefinition, position: { x: number; y: number }): WorkflowNode {
  const baseData: Partial<WorkflowNodeData> = {
    label: step.name,
    description: step.description,
    executionStatus: 'idle',
    isConfigured: true,
    hasError: false,
  };

  let nodeType = step.type;
  let data: WorkflowNodeData;

  switch (step.type) {
    case 'ai':
      data = {
        ...baseData,
        nodeType: 'ai',
        aiPrompt: step.aiPrompt || '',
        inputs: step.inputs,
        outputs: step.outputs,
        temperature: 0.7,
        responseFormat: 'text',
      } as AINodeData;
      break;

    case 'tool':
      data = {
        ...baseData,
        nodeType: 'tool',
        toolName: step.toolName || '',
        inputs: step.inputs,
        outputs: step.outputs,
        parameterMapping: {},
      } as ToolNodeData;
      break;

    case 'conditional':
      data = {
        ...baseData,
        nodeType: 'conditional',
        condition: step.condition || '',
        conditionType: 'expression',
        inputs: step.inputs,
      } as ConditionalNodeData;
      nodeType = 'conditional';
      break;

    case 'human':
      data = {
        ...baseData,
        nodeType: 'human',
        approvalMessage: 'Please review and approve',
        approvalOptions: ['Approve', 'Reject'],
        inputs: step.inputs,
        outputs: step.outputs,
      } as WorkflowNodeData;
      break;

    case 'parallel':
      data = {
        ...baseData,
        nodeType: 'parallel',
        branches: [],
        waitForAll: true,
        inputs: step.inputs,
        outputs: step.outputs,
      } as WorkflowNodeData;
      break;

    default:
      data = {
        ...baseData,
        nodeType: 'ai',
        aiPrompt: '',
        inputs: step.inputs,
        outputs: step.outputs,
      } as AINodeData;
  }

  return {
    id: step.id,
    type: nodeType as string,
    position,
    data,
  };
}

/**
 * Calculate positions for steps based on dependencies
 */
function calculateStepPositions(
  steps: WorkflowStepDefinition[]
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const levels = new Map<string, number>();

  // Calculate levels based on dependencies
  const calculateLevel = (stepId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(stepId)) return 0;
    visited.add(stepId);

    if (levels.has(stepId)) return levels.get(stepId)!;

    const step = steps.find(s => s.id === stepId);
    if (!step || !step.dependencies || step.dependencies.length === 0) {
      levels.set(stepId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(
      ...step.dependencies.map(depId => calculateLevel(depId, visited))
    );
    const level = maxDepLevel + 1;
    levels.set(stepId, level);
    return level;
  };

  steps.forEach(step => calculateLevel(step.id));

  // Group steps by level
  const levelGroups = new Map<number, string[]>();
  steps.forEach(step => {
    const level = levels.get(step.id) || 0;
    const group = levelGroups.get(level) || [];
    group.push(step.id);
    levelGroups.set(level, group);
  });

  // Calculate positions
  const nodeWidth = 200;
  const nodeHeight = 80;
  const horizontalGap = 50;
  const verticalGap = 100;
  const startY = 150;

  levelGroups.forEach((stepIds, level) => {
    const totalWidth = stepIds.length * (nodeWidth + horizontalGap) - horizontalGap;
    const startX = (800 - totalWidth) / 2;

    stepIds.forEach((stepId, index) => {
      positions[stepId] = {
        x: startX + index * (nodeWidth + horizontalGap),
        y: startY + level * (nodeHeight + verticalGap),
      };
    });
  });

  return positions;
}

/**
 * Find steps that have no dependents (last steps in the workflow)
 */
function findLastSteps(steps: WorkflowStepDefinition[]): string[] {
  const hasDependent = new Set<string>();

  steps.forEach(step => {
    if (step.dependencies) {
      step.dependencies.forEach(depId => hasDependent.add(depId));
    }
  });

  return steps.filter(step => !hasDependent.has(step.id)).map(step => step.id);
}

/**
 * Validate a visual workflow
 */
export function validateVisualWorkflow(workflow: VisualWorkflow): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for start node
  const startNodes = workflow.nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push('Workflow must have a start node');
  } else if (startNodes.length > 1) {
    errors.push('Workflow can only have one start node');
  }

  // Check for end node
  const endNodes = workflow.nodes.filter(n => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push('Workflow must have an end node');
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  workflow.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  workflow.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && node.type !== 'start' && node.type !== 'end') {
      warnings.push(`Node "${node.data.label}" is not connected`);
    }
  });

  // Check for unconfigured nodes
  workflow.nodes.forEach(node => {
    if (!node.data.isConfigured && node.type !== 'start' && node.type !== 'end') {
      warnings.push(`Node "${node.data.label}" is not configured`);
    }
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) return true;
      } else if (recursionStack.has(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push('Workflow contains circular dependencies');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

const workflowConverter = {
  visualToDefinition,
  definitionToVisual,
  validateVisualWorkflow,
};

export default workflowConverter;
