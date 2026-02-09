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
  KnowledgeRetrievalNodeData,
  ParameterExtractorNodeData,
  VariableAggregatorNodeData,
  QuestionClassifierNodeData,
  TemplateTransformNodeData,
  WorkflowNodeType,
} from '@/types/workflow/workflow-editor';

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
    case 'knowledgeRetrieval':
      validateKnowledgeRetrievalNode(data as KnowledgeRetrievalNodeData, errors, warnings);
      break;
    case 'parameterExtractor':
      validateParameterExtractorNode(data as ParameterExtractorNodeData, errors, warnings);
      break;
    case 'variableAggregator':
      validateVariableAggregatorNode(data as VariableAggregatorNodeData, errors, warnings);
      break;
    case 'questionClassifier':
      validateQuestionClassifierNode(data as QuestionClassifierNodeData, errors, warnings);
      break;
    case 'templateTransform':
      validateTemplateTransformNode(data as TemplateTransformNodeData, errors, warnings);
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
 * Knowledge Retrieval Node validation
 */
function validateKnowledgeRetrievalNode(data: KnowledgeRetrievalNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (data.knowledgeBaseIds.length === 0) {
    errors.push({
      field: 'knowledgeBaseIds',
      message: 'At least one knowledge base must be selected',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!data.queryVariable) {
    warnings.push({
      field: 'queryVariable',
      message: 'No query variable selected — node will need runtime input',
      code: 'MISSING_VARIABLE_REF',
    });
  }

  if (data.topK < 1 || data.topK > 50) {
    errors.push({
      field: 'topK',
      message: 'Top K must be between 1 and 50',
      code: 'OUT_OF_RANGE',
    });
  }

  if (data.scoreThreshold < 0 || data.scoreThreshold > 1) {
    errors.push({
      field: 'scoreThreshold',
      message: 'Score threshold must be between 0 and 1',
      code: 'OUT_OF_RANGE',
    });
  }
}

/**
 * Parameter Extractor Node validation
 */
function validateParameterExtractorNode(data: ParameterExtractorNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.instruction || data.instruction.trim() === '') {
    errors.push({
      field: 'instruction',
      message: 'Extraction instruction is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (data.parameters.length === 0) {
    errors.push({
      field: 'parameters',
      message: 'At least one parameter must be defined',
      code: 'REQUIRED_FIELD',
    });
  }

  // Check for duplicate parameter names
  const names = data.parameters.map(p => p.name);
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicates.length > 0) {
    errors.push({
      field: 'parameters',
      message: `Duplicate parameter names: ${[...new Set(duplicates)].join(', ')}`,
      code: 'DUPLICATE_NAME',
    });
  }

  if (!data.model) {
    warnings.push({
      field: 'model',
      message: 'No model selected, will use default',
      code: 'DEFAULT_VALUE',
    });
  }
}

/**
 * Variable Aggregator Node validation
 */
function validateVariableAggregatorNode(data: VariableAggregatorNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (data.variableRefs.length === 0) {
    warnings.push({
      field: 'variableRefs',
      message: 'No variable references selected',
      code: 'EMPTY_REFS',
    });
  }

  if (!data.outputVariableName || data.outputVariableName.trim() === '') {
    errors.push({
      field: 'outputVariableName',
      message: 'Output variable name is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.outputVariableName)) {
    errors.push({
      field: 'outputVariableName',
      message: 'Output variable name must be a valid identifier',
      code: 'INVALID_FORMAT',
    });
  }
}

/**
 * Question Classifier Node validation
 */
function validateQuestionClassifierNode(data: QuestionClassifierNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (data.classes.length < 2) {
    errors.push({
      field: 'classes',
      message: 'At least 2 classification classes are required',
      code: 'MIN_ITEMS',
    });
  }

  // Check for empty class names
  data.classes.forEach((cls, i) => {
    if (!cls.name || cls.name.trim() === '') {
      errors.push({
        field: `classes[${i}].name`,
        message: `Class ${i + 1} name is required`,
        code: 'REQUIRED_FIELD',
      });
    }
    if (!cls.description || cls.description.trim() === '') {
      warnings.push({
        field: `classes[${i}].description`,
        message: `Class "${cls.name}" has no description — may reduce classification accuracy`,
        code: 'MISSING_DESCRIPTION',
      });
    }
  });

  if (!data.model) {
    warnings.push({
      field: 'model',
      message: 'No model selected, will use default',
      code: 'DEFAULT_VALUE',
    });
  }
}

/**
 * Template Transform Node validation
 */
function validateTemplateTransformNode(data: TemplateTransformNodeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!data.template || data.template.trim() === '') {
    errors.push({
      field: 'template',
      message: 'Template is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Check for unmatched template braces
    const openBraces = (data.template.match(/\{\{/g) || []).length;
    const closeBraces = (data.template.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      warnings.push({
        field: 'template',
        message: 'Template has unmatched {{ }} braces',
        code: 'SYNTAX_WARNING',
      });
    }

    // Check for referenced variables
    if (openBraces > 0 && data.variableRefs.length === 0) {
      warnings.push({
        field: 'variableRefs',
        message: 'Template uses {{variable}} syntax but no variable references are selected',
        code: 'MISSING_VARIABLE_REFS',
      });
    }
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

/**
 * Validate IO schema compatibility between connected nodes
 */
export interface IOCompatibilityResult {
  isCompatible: boolean;
  errors: IOCompatibilityError[];
  warnings: IOCompatibilityWarning[];
}

export interface IOCompatibilityError {
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput: string;
  targetInput: string;
  message: string;
  code: string;
}

export interface IOCompatibilityWarning {
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput: string;
  targetInput: string;
  message: string;
  code: string;
}

/**
 * Validate IO schema compatibility for a workflow
 */
export function validateIOCompatibility(
  nodes: { id: string; type: string; data: WorkflowNodeData }[],
  edges: { id: string; source: string; target: string }[]
): IOCompatibilityResult {
  const errors: IOCompatibilityError[] = [];
  const warnings: IOCompatibilityWarning[] = [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    // Skip non-data flow edges (start, end, annotation, group)
    if (
      sourceNode.type === 'annotation' ||
      sourceNode.type === 'group' ||
      targetNode.type === 'annotation' ||
      targetNode.type === 'group'
    ) {
      continue;
    }

    // Get output schema from source node
    const sourceOutputs = getNodeOutputs(sourceNode);
    // Get input schema from target node
    const targetInputs = getNodeInputs(targetNode);

    // Check if target has required inputs that aren't provided by source
    for (const [inputName, inputSchema] of Object.entries(targetInputs)) {
      if (inputSchema.required && !sourceOutputs[inputName]) {
        // Check if input has a default value
        if (inputSchema.default === undefined) {
          warnings.push({
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceOutput: '',
            targetInput: inputName,
            message: `Required input "${inputName}" may not be provided by upstream node`,
            code: 'MISSING_INPUT',
          });
        }
      }
    }

    // Check type compatibility for matching IO names
    for (const [outputName, outputSchema] of Object.entries(sourceOutputs)) {
      const matchingInput = targetInputs[outputName];
      if (matchingInput) {
        // Check type compatibility
        if (!isTypeCompatible(outputSchema.type, matchingInput.type)) {
          errors.push({
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceOutput: outputName,
            targetInput: outputName,
            message: `Type mismatch: "${outputName}" outputs ${outputSchema.type} but expects ${matchingInput.type}`,
            code: 'TYPE_MISMATCH',
          });
        }
      }
    }
  }

  return {
    isCompatible: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get output schema from a node
 */
function getNodeOutputs(node: { type: string; data: WorkflowNodeData }): Record<string, { type: string; required?: boolean; default?: unknown }> {
  const data = node.data as Record<string, unknown>;
  
  // Type-specific outputs
  switch (node.type) {
    case 'start':
      return (data as StartNodeData).workflowInputs || {};
    case 'ai':
      return {
        text: { type: 'string' },
        usage: { type: 'object' },
        ...(data as AINodeData).outputs,
      };
    case 'tool':
    case 'code':
    case 'transform':
    case 'webhook':
    case 'loop':
    case 'merge':
    case 'subworkflow':
    case 'knowledgeRetrieval':
    case 'parameterExtractor':
    case 'variableAggregator':
    case 'questionClassifier':
    case 'templateTransform':
      return (data as { outputs?: Record<string, { type: string }> }).outputs || { result: { type: 'object' } };
    case 'conditional':
      return {
        conditionResult: { type: 'boolean' },
        ...(data as ConditionalNodeData).inputs,
      };
    case 'delay':
      return { delayed: { type: 'boolean' } };
    case 'human':
      return {
        approved: { type: 'boolean' },
        ...(data as HumanNodeData).outputs,
      };
    case 'parallel':
      return (data as ParallelNodeData).outputs || {};
    default:
      return {};
  }
}

/**
 * Get input schema from a node
 */
function getNodeInputs(node: { type: string; data: WorkflowNodeData }): Record<string, { type: string; required?: boolean; default?: unknown }> {
  const data = node.data as Record<string, unknown>;
  
  switch (node.type) {
    case 'end':
      return (data as EndNodeData).workflowOutputs || {};
    case 'ai':
      return (data as AINodeData).inputs || {};
    case 'tool':
    case 'code':
    case 'transform':
    case 'webhook':
    case 'loop':
    case 'merge':
    case 'subworkflow':
    case 'knowledgeRetrieval':
    case 'parameterExtractor':
    case 'variableAggregator':
    case 'questionClassifier':
    case 'templateTransform':
      return (data as { inputs?: Record<string, { type: string }> }).inputs || {};
    case 'conditional':
      return (data as ConditionalNodeData).inputs || {};
    case 'human':
      return (data as HumanNodeData).inputs || {};
    case 'parallel':
      return (data as ParallelNodeData).inputs || {};
    default:
      return {};
  }
}

/**
 * Check if output type is compatible with input type
 */
function isTypeCompatible(outputType: string, inputType: string): boolean {
  // Exact match
  if (outputType === inputType) return true;
  
  // Allow any type to connect to 'object' (generic)
  if (inputType === 'object') return true;
  
  // Allow 'object' to connect to 'array' (might be array)
  if (outputType === 'object' && inputType === 'array') return true;
  
  // Allow string to connect to any (strings can be parsed)
  if (outputType === 'string') return true;
  
  // Allow number and boolean interconversion
  if (
    (outputType === 'number' && inputType === 'boolean') ||
    (outputType === 'boolean' && inputType === 'number')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Validate complete workflow including structure and IO compatibility
 */
export function validateCompleteWorkflow(
  nodes: { id: string; type: string; data: WorkflowNodeData }[],
  edges: { id: string; source: string; target: string }[]
): {
  isValid: boolean;
  structureValidation: WorkflowValidationResult;
  ioValidation: IOCompatibilityResult;
  summary: string;
} {
  const structureValidation = validateWorkflowStructure(nodes, edges);
  const ioValidation = validateIOCompatibility(nodes, edges);

  const isValid = structureValidation.isValid && ioValidation.isCompatible;
  
  const totalErrors = structureValidation.errors.length + ioValidation.errors.length;
  const totalWarnings = structureValidation.warnings.length + ioValidation.warnings.length;
  
  let summary: string;
  if (isValid && totalWarnings === 0) {
    summary = 'Workflow is valid and ready to execute';
  } else if (isValid) {
    summary = `Workflow is valid with ${totalWarnings} warning(s)`;
  } else {
    summary = `Workflow has ${totalErrors} error(s) and ${totalWarnings} warning(s)`;
  }

  return {
    isValid,
    structureValidation,
    ioValidation,
    summary,
  };
}

/**
 * Default timeout recommendations per step type (milliseconds)
 */
const DEFAULT_STEP_TIMEOUTS: Record<string, number> = {
  ai: 120000,       // 2 minutes
  webhook: 30000,   // 30 seconds
  code: 10000,      // 10 seconds
  tool: 60000,      // 1 minute
  subworkflow: 300000, // 5 minutes
  loop: 180000,     // 3 minutes
  transform: 5000,  // 5 seconds
};

/**
 * Validate step timeout configurations
 * Returns warnings for missing or excessive timeouts
 */
export function validateStepTimeouts(
  nodes: { id: string; type: string; data: WorkflowNodeData | Record<string, unknown> }[]
): WorkflowStructureWarning[] {
  const warnings: WorkflowStructureWarning[] = [];
  const MAX_TIMEOUT = 600000; // 10 minutes max

  for (const node of nodes) {
    // Skip non-executable nodes
    if (['start', 'end', 'annotation', 'group'].includes(node.type)) {
      continue;
    }

    const data = node.data as Record<string, unknown>;
    const timeout = data.timeout as number | undefined;
    const defaultTimeout = DEFAULT_STEP_TIMEOUTS[node.type];
    const label = (data.label as string) || node.id;

    // Check for missing timeout on steps that typically need them
    if (defaultTimeout && !timeout) {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `Node "${label}" has no timeout configured. Recommended: ${defaultTimeout / 1000}s`,
        code: 'MISSING_TIMEOUT',
      });
    }

    // Check for excessively long timeouts
    if (timeout && timeout > MAX_TIMEOUT) {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `Node "${label}" has a very long timeout (${timeout / 1000}s). Consider breaking into smaller steps.`,
        code: 'EXCESSIVE_TIMEOUT',
      });
    }

    // Check for very short timeouts on complex operations
    if (timeout && timeout < 1000 && ['ai', 'webhook', 'subworkflow'].includes(node.type)) {
      warnings.push({
        type: 'node',
        nodeId: node.id,
        message: `Node "${label}" has a very short timeout (${timeout}ms) for ${node.type} step. This may cause premature failures.`,
        code: 'SHORT_TIMEOUT',
      });
    }
  }

  return warnings;
}

/**
 * Validate resource limits and parallelism configuration
 * Returns warnings for potential resource issues
 */
export function validateResourceLimits(
  nodes: { id: string; type: string; data: WorkflowNodeData | Record<string, unknown> }[],
  edges: { id: string; source: string; target: string }[]
): WorkflowStructureWarning[] {
  const warnings: WorkflowStructureWarning[] = [];
  const MAX_PARALLEL_BRANCHES = 10;
  const MAX_LOOP_ITERATIONS = 1000;
  const MAX_WORKFLOW_DEPTH = 5;

  // Build adjacency list for parallelism analysis
  const outgoingEdges = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = outgoingEdges.get(edge.source) || [];
    existing.push(edge.target);
    outgoingEdges.set(edge.source, existing);
  }

  for (const node of nodes) {
    const data = node.data as Record<string, unknown>;
    const label = (data.label as string) || node.id;

    // Check parallel branches
    if (node.type === 'parallel') {
      const branches = outgoingEdges.get(node.id) || [];
      if (branches.length > MAX_PARALLEL_BRANCHES) {
        warnings.push({
          type: 'node',
          nodeId: node.id,
          message: `Parallel node "${label}" has ${branches.length} branches. Consider limiting to ${MAX_PARALLEL_BRANCHES} for better resource management.`,
          code: 'HIGH_PARALLELISM',
        });
      }
    }

    // Check loop iteration limits
    if (node.type === 'loop') {
      const maxIterations = data.maxIterations as number | undefined;
      if (!maxIterations) {
        warnings.push({
          type: 'node',
          nodeId: node.id,
          message: `Loop node "${label}" has no iteration limit. Consider setting maxIterations to prevent infinite loops.`,
          code: 'MISSING_LOOP_LIMIT',
        });
      } else if (maxIterations > MAX_LOOP_ITERATIONS) {
        warnings.push({
          type: 'node',
          nodeId: node.id,
          message: `Loop node "${label}" has a high iteration limit (${maxIterations}). This may cause performance issues.`,
          code: 'HIGH_LOOP_ITERATIONS',
        });
      }
    }

    // Check subworkflow nesting depth
    if (node.type === 'subworkflow') {
      const nestedWorkflowId = data.workflowId as string | undefined;
      if (nestedWorkflowId) {
        // Note: Full depth analysis would require loading the nested workflow
        // Here we just warn about subworkflow usage
        warnings.push({
          type: 'node',
          nodeId: node.id,
          message: `Subworkflow node "${label}" calls nested workflow. Ensure nesting depth doesn't exceed ${MAX_WORKFLOW_DEPTH} levels.`,
          code: 'SUBWORKFLOW_DEPTH_CHECK',
        });
      }
    }

    // Check for potential memory-intensive operations
    if (node.type === 'transform') {
      const transformType = data.transformType as string | undefined;
      if (transformType === 'reduce' || transformType === 'sort') {
        warnings.push({
          type: 'node',
          nodeId: node.id,
          message: `Transform node "${label}" uses ${transformType} operation. Ensure input data size is reasonable to avoid memory issues.`,
          code: 'MEMORY_INTENSIVE_OPERATION',
        });
      }
    }
  }

  // Check total workflow complexity
  const executableNodes = nodes.filter(n => !['start', 'end', 'annotation', 'group'].includes(n.type));
  if (executableNodes.length > 50) {
    warnings.push({
      type: 'structure',
      message: `Workflow has ${executableNodes.length} executable steps. Consider breaking into smaller subworkflows for maintainability.`,
      code: 'HIGH_COMPLEXITY',
    });
  }

  return warnings;
}

/**
 * Validate complete workflow with all available validation rules
 * Enhanced version that includes timeout and resource validation
 */
export function validateWorkflowComprehensive(
  nodes: { id: string; type: string; data: WorkflowNodeData }[],
  edges: { id: string; source: string; target: string }[]
): {
  isValid: boolean;
  structureValidation: WorkflowValidationResult;
  ioValidation: IOCompatibilityResult;
  timeoutWarnings: WorkflowStructureWarning[];
  resourceWarnings: WorkflowStructureWarning[];
  summary: string;
} {
  const structureValidation = validateWorkflowStructure(nodes, edges);
  const ioValidation = validateIOCompatibility(nodes, edges);
  const timeoutWarnings = validateStepTimeouts(nodes);
  const resourceWarnings = validateResourceLimits(nodes, edges);

  const isValid = structureValidation.isValid && ioValidation.isCompatible;

  const totalErrors = structureValidation.errors.length + ioValidation.errors.length;
  const totalWarnings = structureValidation.warnings.length + 
    ioValidation.warnings.length + 
    timeoutWarnings.length + 
    resourceWarnings.length;

  let summary: string;
  if (isValid && totalWarnings === 0) {
    summary = 'Workflow is valid and ready to execute';
  } else if (isValid) {
    summary = `Workflow is valid with ${totalWarnings} warning(s)`;
  } else {
    summary = `Workflow has ${totalErrors} error(s) and ${totalWarnings} warning(s)`;
  }

  return {
    isValid,
    structureValidation,
    ioValidation,
    timeoutWarnings,
    resourceWarnings,
    summary,
  };
}

export const validationUtils = {
  validateNode,
  validateWorkflowStructure,
  validateIOCompatibility,
  validateCompleteWorkflow,
  validateWorkflowComprehensive,
  validateStepTimeouts,
  validateResourceLimits,
  getFieldError,
  getFieldWarning,
  hasFieldError,
  hasFieldWarning,
  getValidationSummary,
};
