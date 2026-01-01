/**
 * Workflow Node Validation
 * Real-time validation rules for node configuration forms
 */

import type {
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  CodeNodeData,
  LoopNodeData,
  HumanNodeData,
  StartNodeData,
  EndNodeData,
  ParallelNodeData,
  DelayNodeData,
  SubworkflowNodeData,
  WebhookNodeData,
  TransformNodeData,
  MergeNodeData,
  WorkflowNodeType,
} from '@/types/workflow-editor';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate a node based on its type
 */
export function validateNode(nodeType: WorkflowNodeType, data: WorkflowNodeData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Common validations
  if (!data.label || data.label.trim() === '') {
    errors.push({
      field: 'label',
      message: 'Node name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Type-specific validations
  switch (nodeType) {
    case 'ai':
      validateAINode(data as AINodeData, errors, warnings);
      break;
    case 'tool':
      validateToolNode(data as ToolNodeData, errors, warnings);
      break;
    case 'conditional':
      validateConditionalNode(data as ConditionalNodeData, errors, warnings);
      break;
    case 'code':
      validateCodeNode(data as CodeNodeData, errors, warnings);
      break;
    case 'loop':
      validateLoopNode(data as LoopNodeData, errors, warnings);
      break;
    case 'human':
      validateHumanNode(data as HumanNodeData, errors, warnings);
      break;
    case 'start':
      validateStartNode(data as StartNodeData, errors, warnings);
      break;
    case 'end':
      validateEndNode(data as EndNodeData, errors, warnings);
      break;
    case 'parallel':
      validateParallelNode(data as ParallelNodeData, errors, warnings);
      break;
    case 'delay':
      validateDelayNode(data as DelayNodeData, errors, warnings);
      break;
    case 'subworkflow':
      validateSubworkflowNode(data as SubworkflowNodeData, errors, warnings);
      break;
    case 'webhook':
      validateWebhookNode(data as WebhookNodeData, errors, warnings);
      break;
    case 'transform':
      validateTransformNode(data as TransformNodeData, errors, warnings);
      break;
    case 'merge':
      validateMergeNode(data as MergeNodeData, errors, warnings);
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * AI Node validation
 */
function validateAINode(data: AINodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  // Required: AI prompt
  if (!data.aiPrompt || data.aiPrompt.trim() === '') {
    errors.push({
      field: 'aiPrompt',
      message: 'AI prompt is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Temperature range
  if (data.temperature !== undefined) {
    if (data.temperature < 0 || data.temperature > 2) {
      errors.push({
        field: 'temperature',
        message: 'Temperature must be between 0 and 2',
        code: 'OUT_OF_RANGE',
      });
    }
  }

  // Max tokens range
  if (data.maxTokens !== undefined) {
    if (data.maxTokens < 1) {
      errors.push({
        field: 'maxTokens',
        message: 'Max tokens must be at least 1',
        code: 'OUT_OF_RANGE',
      });
    }
    if (data.maxTokens > 128000) {
      warnings.push({
        field: 'maxTokens',
        message: 'Very high max tokens may cause issues with some models',
        code: 'HIGH_VALUE',
      });
    }
  }

  // Check for variable syntax in prompt
  if (data.aiPrompt && !data.aiPrompt.includes('{{') && Object.keys(data.inputs || {}).length > 0) {
    warnings.push({
      field: 'aiPrompt',
      message: 'Prompt has inputs defined but no {{variable}} placeholders',
      code: 'UNUSED_INPUTS',
    });
  }

  // Model recommendation
  if (!data.model) {
    warnings.push({
      field: 'model',
      message: 'No model selected, will use default',
      code: 'DEFAULT_VALUE',
    });
  }
}

/**
 * Tool Node validation
 */
function validateToolNode(data: ToolNodeData, errors: ValidationError[], _warnings: ValidationWarning[]): void {
  if (!data.toolName || data.toolName.trim() === '') {
    errors.push({
      field: 'toolName',
      message: 'Tool name is required',
      code: 'REQUIRED_FIELD',
    });
  }
}

/**
 * Conditional Node validation
 */
function validateConditionalNode(data: ConditionalNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.conditionType) {
    errors.push({
      field: 'conditionType',
      message: 'Condition type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (data.conditionType === 'expression') {
    if (!data.condition || data.condition.trim() === '') {
      errors.push({
        field: 'condition',
        message: 'Expression is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      // Basic syntax check
      try {
        // Simple check for balanced parentheses
        let balance = 0;
        for (const char of data.condition) {
          if (char === '(') balance++;
          if (char === ')') balance--;
          if (balance < 0) throw new Error('Unbalanced');
        }
        if (balance !== 0) throw new Error('Unbalanced');
      } catch {
        warnings.push({
          field: 'condition',
          message: 'Expression may have syntax issues',
          code: 'SYNTAX_WARNING',
        });
      }
    }
  }

  if (data.conditionType === 'comparison') {
    if (!data.comparisonOperator) {
      errors.push({
        field: 'comparisonOperator',
        message: 'Comparison operator is required',
        code: 'REQUIRED_FIELD',
      });
    }
  }
}

/**
 * Code Node validation
 */
function validateCodeNode(data: CodeNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.language) {
    errors.push({
      field: 'language',
      message: 'Programming language is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!data.code || data.code.trim() === '') {
    errors.push({
      field: 'code',
      message: 'Code is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Check for common issues
    if (data.code.includes('eval(')) {
      warnings.push({
        field: 'code',
        message: 'Using eval() is not recommended for security reasons',
        code: 'SECURITY_WARNING',
      });
    }

    // Check for infinite loops (basic)
    if (data.code.includes('while(true)') || data.code.includes('while (true)')) {
      warnings.push({
        field: 'code',
        message: 'Potential infinite loop detected',
        code: 'INFINITE_LOOP',
      });
    }
  }
}

/**
 * Loop Node validation
 */
function validateLoopNode(data: LoopNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.loopType) {
    errors.push({
      field: 'loopType',
      message: 'Loop type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!data.iteratorVariable || data.iteratorVariable.trim() === '') {
    errors.push({
      field: 'iteratorVariable',
      message: 'Iterator variable is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Check for valid variable name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.iteratorVariable)) {
      errors.push({
        field: 'iteratorVariable',
        message: 'Iterator variable must be a valid identifier',
        code: 'INVALID_FORMAT',
      });
    }
  }

  if (data.maxIterations !== undefined) {
    if (data.maxIterations < 1) {
      errors.push({
        field: 'maxIterations',
        message: 'Max iterations must be at least 1',
        code: 'OUT_OF_RANGE',
      });
    }
    if (data.maxIterations > 10000) {
      warnings.push({
        field: 'maxIterations',
        message: 'Very high iteration count may cause performance issues',
        code: 'HIGH_VALUE',
      });
    }
  }

  if (data.loopType === 'forEach' && (!data.collection || data.collection.trim() === '')) {
    errors.push({
      field: 'collection',
      message: 'Collection is required for forEach loops',
      code: 'REQUIRED_FIELD',
    });
  }

  if (data.loopType === 'while' && (!data.condition || data.condition.trim() === '')) {
    errors.push({
      field: 'condition',
      message: 'Condition is required for while loops',
      code: 'REQUIRED_FIELD',
    });
  }
}

/**
 * Human Node validation
 */
function validateHumanNode(data: HumanNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.approvalMessage || data.approvalMessage.trim() === '') {
    errors.push({
      field: 'approvalMessage',
      message: 'Approval message is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (data.timeout !== undefined) {
    if (data.timeout < 0) {
      errors.push({
        field: 'timeout',
        message: 'Timeout cannot be negative',
        code: 'OUT_OF_RANGE',
      });
    }
    if (data.timeout > 0 && data.timeout < 60) {
      warnings.push({
        field: 'timeout',
        message: 'Very short timeout may not give users enough time to respond',
        code: 'LOW_VALUE',
      });
    }
  }

  if (data.assignee) {
    // Basic email validation
    if (data.assignee.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.assignee)) {
      warnings.push({
        field: 'assignee',
        message: 'Assignee email format may be invalid',
        code: 'INVALID_FORMAT',
      });
    }
  }
}

/**
 * Start Node validation
 */
function validateStartNode(data: StartNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const inputs = data.workflowInputs || {};
  
  // Check for empty input names
  for (const [key, value] of Object.entries(inputs)) {
    if (!key || key.trim() === '') {
      errors.push({
        field: 'workflowInputs',
        message: 'Input parameter name cannot be empty',
        code: 'EMPTY_KEY',
      });
    }
    if (!value.description || value.description.trim() === '') {
      warnings.push({
        field: `workflowInputs.${key}`,
        message: `Input "${key}" has no description`,
        code: 'MISSING_DESCRIPTION',
      });
    }
  }
}

/**
 * End Node validation
 */
function validateEndNode(data: EndNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const outputs = data.workflowOutputs || {};
  
  // Check for empty output names
  for (const [key, value] of Object.entries(outputs)) {
    if (!key || key.trim() === '') {
      errors.push({
        field: 'workflowOutputs',
        message: 'Output parameter name cannot be empty',
        code: 'EMPTY_KEY',
      });
    }
    if (!value.description || value.description.trim() === '') {
      warnings.push({
        field: `workflowOutputs.${key}`,
        message: `Output "${key}" has no description`,
        code: 'MISSING_DESCRIPTION',
      });
    }
  }
}

/**
 * Parallel Node validation
 */
function validateParallelNode(data: ParallelNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (data.maxConcurrency !== undefined) {
    if (data.maxConcurrency < 1) {
      errors.push({
        field: 'maxConcurrency',
        message: 'Max concurrency must be at least 1',
        code: 'OUT_OF_RANGE',
      });
    }
    if (data.maxConcurrency > 100) {
      warnings.push({
        field: 'maxConcurrency',
        message: 'Very high concurrency may cause resource issues',
        code: 'HIGH_VALUE',
      });
    }
  }
}

/**
 * Delay Node validation
 */
function validateDelayNode(data: DelayNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.delayType) {
    errors.push({
      field: 'delayType',
      message: 'Delay type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (data.delayType === 'fixed') {
    if (data.delayMs === undefined || data.delayMs < 0) {
      errors.push({
        field: 'delayMs',
        message: 'Delay duration must be a positive number',
        code: 'OUT_OF_RANGE',
      });
    }
    if (data.delayMs && data.delayMs > 86400000) { // 24 hours
      warnings.push({
        field: 'delayMs',
        message: 'Delay longer than 24 hours may cause issues',
        code: 'HIGH_VALUE',
      });
    }
  }

  if (data.delayType === 'until') {
    if (!data.untilTime) {
      errors.push({
        field: 'untilTime',
        message: 'Target time is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      const targetDate = new Date(data.untilTime);
      if (isNaN(targetDate.getTime())) {
        errors.push({
          field: 'untilTime',
          message: 'Invalid date/time format',
          code: 'INVALID_FORMAT',
        });
      } else if (targetDate < new Date()) {
        warnings.push({
          field: 'untilTime',
          message: 'Target time is in the past',
          code: 'PAST_DATE',
        });
      }
    }
  }

  if (data.delayType === 'cron') {
    if (!data.cronExpression || data.cronExpression.trim() === '') {
      errors.push({
        field: 'cronExpression',
        message: 'Cron expression is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      // Basic cron validation (5 or 6 parts)
      const parts = data.cronExpression.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        errors.push({
          field: 'cronExpression',
          message: 'Cron expression must have 5 or 6 parts',
          code: 'INVALID_FORMAT',
        });
      }
    }
  }
}

/**
 * Subworkflow Node validation
 */
function validateSubworkflowNode(data: SubworkflowNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.workflowId || data.workflowId.trim() === '') {
    errors.push({
      field: 'workflowId',
      message: 'Workflow ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!data.workflowName || data.workflowName.trim() === '') {
    warnings.push({
      field: 'workflowName',
      message: 'Workflow name is recommended for clarity',
      code: 'MISSING_NAME',
    });
  }
}

/**
 * Webhook Node validation
 */
function validateWebhookNode(data: WebhookNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.webhookUrl || data.webhookUrl.trim() === '') {
    errors.push({
      field: 'webhookUrl',
      message: 'Webhook URL is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Basic URL validation
    try {
      new URL(data.webhookUrl);
    } catch {
      errors.push({
        field: 'webhookUrl',
        message: 'Invalid URL format',
        code: 'INVALID_FORMAT',
      });
    }
  }

  if (!data.method) {
    errors.push({
      field: 'method',
      message: 'HTTP method is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate JSON body if provided
  if (data.body && data.body.trim() !== '') {
    try {
      JSON.parse(data.body);
    } catch {
      warnings.push({
        field: 'body',
        message: 'Request body is not valid JSON',
        code: 'INVALID_JSON',
      });
    }
  }
}

/**
 * Transform Node validation
 */
function validateTransformNode(data: TransformNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.transformType) {
    errors.push({
      field: 'transformType',
      message: 'Transform type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!data.expression || data.expression.trim() === '') {
    errors.push({
      field: 'expression',
      message: 'Transform expression is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Check for arrow function syntax
    if (!data.expression.includes('=>') && data.transformType !== 'custom') {
      warnings.push({
        field: 'expression',
        message: 'Expression should use arrow function syntax (e.g., item => item.value)',
        code: 'SYNTAX_WARNING',
      });
    }
  }
}

/**
 * Merge Node validation
 */
function validateMergeNode(data: MergeNodeData, errors: ValidationError[], _warnings: ValidationWarning[]): void {
  if (!data.mergeStrategy) {
    errors.push({
      field: 'mergeStrategy',
      message: 'Merge strategy is required',
      code: 'REQUIRED_FIELD',
    });
  }
}

/**
 * Get field-specific error message
 */
export function getFieldError(result: ValidationResult, field: string): string | undefined {
  const error = result.errors.find(e => e.field === field);
  return error?.message;
}

/**
 * Get field-specific warning message
 */
export function getFieldWarning(result: ValidationResult, field: string): string | undefined {
  const warning = result.warnings.find(w => w.field === field);
  return warning?.message;
}

/**
 * Check if a field has errors
 */
export function hasFieldError(result: ValidationResult, field: string): boolean {
  return result.errors.some(e => e.field === field);
}

/**
 * Check if a field has warnings
 */
export function hasFieldWarning(result: ValidationResult, field: string): boolean {
  return result.warnings.some(w => w.field === field);
}

/**
 * Workflow structure validation result
 */
export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowStructureError[];
  warnings: WorkflowStructureWarning[];
}

export interface WorkflowStructureError {
  type: 'structure' | 'node' | 'edge';
  nodeId?: string;
  edgeId?: string;
  message: string;
  code: string;
}

export interface WorkflowStructureWarning {
  type: 'structure' | 'node' | 'edge';
  nodeId?: string;
  edgeId?: string;
  message: string;
  code: string;
}

/**
 * Validate entire workflow structure
 */
export function validateWorkflowStructure(
  nodes: { id: string; type: string; data: WorkflowNodeData }[],
  edges: { id: string; source: string; target: string }[]
): WorkflowValidationResult {
  const errors: WorkflowStructureError[] = [];
  const warnings: WorkflowStructureWarning[] = [];

  // Check for start node
  const startNodes = nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push({
      type: 'structure',
      message: 'Workflow must have a Start node',
      code: 'MISSING_START',
    });
  } else if (startNodes.length > 1) {
    errors.push({
      type: 'structure',
      message: 'Workflow can only have one Start node',
      code: 'MULTIPLE_START',
    });
  }

  // Check for end node
  const endNodes = nodes.filter(n => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push({
      type: 'structure',
      message: 'Workflow must have an End node',
      code: 'MISSING_END',
    });
  }

  // Check for orphan nodes (no connections)
  const connectedNodeIds = new Set<string>();
  edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  const orphanNodes = nodes.filter(n => 
    n.type !== 'annotation' && 
    n.type !== 'group' && 
    !connectedNodeIds.has(n.id)
  );
  
  orphanNodes.forEach(node => {
    warnings.push({
      type: 'node',
      nodeId: node.id,
      message: `Node "${node.data.label}" is not connected to the workflow`,
      code: 'ORPHAN_NODE',
    });
  });

  // Check for nodes with no outgoing edges (except end nodes)
  const nodesWithOutgoing = new Set(edges.map(e => e.source));
  const deadEndNodes = nodes.filter(n => 
    n.type !== 'end' && 
    n.type !== 'annotation' && 
    n.type !== 'group' &&
    connectedNodeIds.has(n.id) &&
    !nodesWithOutgoing.has(n.id)
  );

  deadEndNodes.forEach(node => {
    warnings.push({
      type: 'node',
      nodeId: node.id,
      message: `Node "${node.data.label}" has no outgoing connections`,
      code: 'DEAD_END',
    });
  });

  // Check for nodes with no incoming edges (except start nodes)
  const nodesWithIncoming = new Set(edges.map(e => e.target));
  const unreachableNodes = nodes.filter(n => 
    n.type !== 'start' && 
    n.type !== 'annotation' && 
    n.type !== 'group' &&
    connectedNodeIds.has(n.id) &&
    !nodesWithIncoming.has(n.id)
  );

  unreachableNodes.forEach(node => {
    warnings.push({
      type: 'node',
      nodeId: node.id,
      message: `Node "${node.data.label}" is unreachable from Start`,
      code: 'UNREACHABLE',
    });
  });

  // Check for cycles (basic detection)
  const hasCycle = detectCycle(nodes, edges);
  if (hasCycle) {
    warnings.push({
      type: 'structure',
      message: 'Workflow contains a cycle - ensure loop nodes are used correctly',
      code: 'CYCLE_DETECTED',
    });
  }

  // Check conditional nodes have both branches
  const conditionalNodes = nodes.filter(n => n.type === 'conditional');
  conditionalNodes.forEach(node => {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    if (outgoingEdges.length < 2) {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `Conditional node "${node.data.label}" should have both true and false branches`,
        code: 'INCOMPLETE_CONDITIONAL',
      });
    }
  });

  // Check parallel nodes have multiple outgoing edges
  const parallelNodes = nodes.filter(n => n.type === 'parallel');
  parallelNodes.forEach(node => {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    if (outgoingEdges.length < 2) {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `Parallel node "${node.data.label}" should have multiple branches`,
        code: 'SINGLE_BRANCH_PARALLEL',
      });
    }
  });

  // Check merge nodes have multiple incoming edges
  const mergeNodes = nodes.filter(n => n.type === 'merge');
  mergeNodes.forEach(node => {
    const incomingEdges = edges.filter(e => e.target === node.id);
    if (incomingEdges.length < 2) {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `Merge node "${node.data.label}" should have multiple incoming branches`,
        code: 'SINGLE_BRANCH_MERGE',
      });
    }
  });

  // Validate individual nodes
  nodes.forEach(node => {
    if (node.type === 'annotation' || node.type === 'group') return;
    
    const result = validateNode(node.type as WorkflowNodeType, node.data);
    result.errors.forEach(err => {
      errors.push({
        type: 'node',
        nodeId: node.id,
        message: `${node.data.label}: ${err.message}`,
        code: err.code,
      });
    });
    result.warnings.forEach(warn => {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `${node.data.label}: ${warn.message}`,
        code: warn.code,
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect cycles in workflow graph using DFS
 */
function detectCycle(
  nodes: { id: string; type: string }[],
  edges: { source: string; target: string }[]
): boolean {
  const nodeIds = new Set(nodes.filter(n => n.type !== 'loop').map(n => n.id));
  const adjacency: Record<string, string[]> = {};
  
  nodeIds.forEach(id => {
    adjacency[id] = [];
  });
  
  edges.forEach(e => {
    if (adjacency[e.source]) {
      adjacency[e.source].push(e.target);
    }
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recStack.add(nodeId);

    for (const neighbor of adjacency[nodeId] || []) {
      if (dfs(neighbor)) return true;
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of nodeIds) {
    if (dfs(nodeId)) return true;
  }

  return false;
}

/**
 * Get validation summary text
 */
export function getValidationSummary(result: WorkflowValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return 'Workflow is valid';
  }
  
  const parts: string[] = [];
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error(s)`);
  }
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }
  return parts.join(', ');
}

export const validationUtils = {
  validateNode,
  validateWorkflowStructure,
  getFieldError,
  getFieldWarning,
  hasFieldError,
  hasFieldWarning,
  getValidationSummary,
};
