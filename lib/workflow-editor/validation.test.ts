/**
 * Workflow Editor Validation Tests
 */

import {
  validateNode,
  validateWorkflowStructure,
  validateStepTimeouts,
  validateResourceLimits,
  validateWorkflowComprehensive,
  getFieldError,
  getFieldWarning,
  hasFieldError,
  hasFieldWarning,
  getValidationSummary,
} from './validation';
import type {
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
} from '@/types/workflow/workflow-editor';

// Helper to create base node data
const createBaseNodeData = (nodeType: string, label = 'Test Node') => ({
  label,
  description: '',
  nodeType,
  executionStatus: 'idle' as const,
  isConfigured: false,
  hasError: false,
});

describe('validateNode', () => {
  describe('common validations', () => {
    it('should return error when label is empty', () => {
      const data = {
        ...createBaseNodeData('ai'),
        label: '',
        aiPrompt: 'test prompt',
        inputs: {},
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'label',
          code: 'REQUIRED_FIELD',
        })
      );
    });

    it('should pass when label is provided', () => {
      const data = {
        ...createBaseNodeData('ai'),
        label: 'My AI Node',
        aiPrompt: 'test prompt',
        inputs: {},
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(hasFieldError(result, 'label')).toBe(false);
    });
  });

  describe('AI node validation', () => {
    it('should return error when aiPrompt is empty', () => {
      const data = {
        ...createBaseNodeData('ai'),
        aiPrompt: '',
        inputs: {},
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(result.isValid).toBe(false);
      expect(getFieldError(result, 'aiPrompt')).toBe('AI prompt is required');
    });

    it('should return error when temperature is out of range', () => {
      const data = {
        ...createBaseNodeData('ai'),
        aiPrompt: 'test',
        temperature: 3,
        inputs: {},
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(hasFieldError(result, 'temperature')).toBe(true);
    });

    it('should return warning when maxTokens is very high', () => {
      const data = {
        ...createBaseNodeData('ai'),
        aiPrompt: 'test',
        maxTokens: 200000,
        inputs: {},
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(hasFieldWarning(result, 'maxTokens')).toBe(true);
    });

    it('should return warning when inputs defined but no placeholders in prompt', () => {
      const data = {
        ...createBaseNodeData('ai'),
        aiPrompt: 'test prompt without variables',
        inputs: { input1: { type: 'string', description: 'test' } },
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(getFieldWarning(result, 'aiPrompt')).toContain('no {{variable}} placeholders');
    });

    it('should pass with valid AI node data', () => {
      const data = {
        ...createBaseNodeData('ai'),
        aiPrompt: 'Process {{input}}',
        temperature: 0.7,
        maxTokens: 4096,
        model: 'gpt-4o',
        inputs: { input: { type: 'string', description: 'test' } },
        outputs: {},
      } as AINodeData;

      const result = validateNode('ai', data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Tool node validation', () => {
    it('should return error when toolName is empty', () => {
      const data = {
        ...createBaseNodeData('tool'),
        toolName: '',
        inputs: {},
        outputs: {},
        parameterMapping: {},
      } as ToolNodeData;

      const result = validateNode('tool', data);
      expect(result.isValid).toBe(false);
      expect(getFieldError(result, 'toolName')).toBe('Tool name is required');
    });

    it('should pass with valid tool name', () => {
      const data = {
        ...createBaseNodeData('tool'),
        toolName: 'web_search',
        inputs: {},
        outputs: {},
        parameterMapping: {},
      } as ToolNodeData;

      const result = validateNode('tool', data);
      expect(hasFieldError(result, 'toolName')).toBe(false);
    });
  });

  describe('Conditional node validation', () => {
    it('should return error when conditionType is missing', () => {
      const data = {
        ...createBaseNodeData('conditional'),
        condition: '',
        conditionType: '' as ConditionalNodeData['conditionType'],
        inputs: {},
      } as ConditionalNodeData;

      const result = validateNode('conditional', data);
      expect(hasFieldError(result, 'conditionType')).toBe(true);
    });

    it('should return error when expression is empty for expression type', () => {
      const data = {
        ...createBaseNodeData('conditional'),
        condition: '',
        conditionType: 'expression',
        inputs: {},
      } as ConditionalNodeData;

      const result = validateNode('conditional', data);
      expect(getFieldError(result, 'condition')).toBe('Expression is required');
    });

    it('should return error when operator is missing for comparison type', () => {
      const data = {
        ...createBaseNodeData('conditional'),
        condition: '',
        conditionType: 'comparison',
        inputs: {},
      } as ConditionalNodeData;

      const result = validateNode('conditional', data);
      expect(hasFieldError(result, 'comparisonOperator')).toBe(true);
    });
  });

  describe('Code node validation', () => {
    it('should return error when language is missing', () => {
      const data = {
        ...createBaseNodeData('code'),
        language: '' as CodeNodeData['language'],
        code: 'return input;',
        inputs: {},
        outputs: {},
      } as CodeNodeData;

      const result = validateNode('code', data);
      expect(hasFieldError(result, 'language')).toBe(true);
    });

    it('should return error when code is empty', () => {
      const data = {
        ...createBaseNodeData('code'),
        language: 'javascript',
        code: '',
        inputs: {},
        outputs: {},
      } as CodeNodeData;

      const result = validateNode('code', data);
      expect(getFieldError(result, 'code')).toBe('Code is required');
    });

    it('should return warning when eval is used', () => {
      const data = {
        ...createBaseNodeData('code'),
        language: 'javascript',
        code: 'eval("dangerous code")',
        inputs: {},
        outputs: {},
      } as CodeNodeData;

      const result = validateNode('code', data);
      expect(getFieldWarning(result, 'code')).toContain('eval()');
    });

    it('should return warning for potential infinite loop', () => {
      const data = {
        ...createBaseNodeData('code'),
        language: 'javascript',
        code: 'while(true) { }',
        inputs: {},
        outputs: {},
      } as CodeNodeData;

      const result = validateNode('code', data);
      expect(getFieldWarning(result, 'code')).toContain('infinite loop');
    });
  });

  describe('Loop node validation', () => {
    it('should return error when iteratorVariable is invalid', () => {
      const data = {
        ...createBaseNodeData('loop'),
        loopType: 'forEach',
        iteratorVariable: '123invalid',
        maxIterations: 100,
        inputs: {},
        outputs: {},
      } as LoopNodeData;

      const result = validateNode('loop', data);
      expect(hasFieldError(result, 'iteratorVariable')).toBe(true);
    });

    it('should return error when collection is missing for forEach', () => {
      const data = {
        ...createBaseNodeData('loop'),
        loopType: 'forEach',
        iteratorVariable: 'item',
        collection: '',
        maxIterations: 100,
        inputs: {},
        outputs: {},
      } as LoopNodeData;

      const result = validateNode('loop', data);
      expect(getFieldError(result, 'collection')).toContain('required for forEach');
    });

    it('should return warning when maxIterations is very high', () => {
      const data = {
        ...createBaseNodeData('loop'),
        loopType: 'forEach',
        iteratorVariable: 'item',
        collection: 'items',
        maxIterations: 50000,
        inputs: {},
        outputs: {},
      } as LoopNodeData;

      const result = validateNode('loop', data);
      expect(hasFieldWarning(result, 'maxIterations')).toBe(true);
    });
  });

  describe('Human node validation', () => {
    it('should return error when approvalMessage is empty', () => {
      const data = {
        ...createBaseNodeData('human'),
        approvalMessage: '',
        approvalOptions: ['Approve', 'Reject'],
        inputs: {},
        outputs: {},
      } as HumanNodeData;

      const result = validateNode('human', data);
      expect(getFieldError(result, 'approvalMessage')).toBe('Approval message is required');
    });

    it('should return warning when timeout is very short', () => {
      const data = {
        ...createBaseNodeData('human'),
        approvalMessage: 'Please approve',
        approvalOptions: ['Approve', 'Reject'],
        timeout: 30,
        inputs: {},
        outputs: {},
      } as HumanNodeData;

      const result = validateNode('human', data);
      expect(hasFieldWarning(result, 'timeout')).toBe(true);
    });
  });

  describe('Delay node validation', () => {
    it('should return error when delayType is missing', () => {
      const data = {
        ...createBaseNodeData('delay'),
        delayType: '' as DelayNodeData['delayType'],
      } as DelayNodeData;

      const result = validateNode('delay', data);
      expect(hasFieldError(result, 'delayType')).toBe(true);
    });

    it('should return error when delayMs is negative for fixed type', () => {
      const data = {
        ...createBaseNodeData('delay'),
        delayType: 'fixed',
        delayMs: -100,
      } as DelayNodeData;

      const result = validateNode('delay', data);
      expect(hasFieldError(result, 'delayMs')).toBe(true);
    });

    it('should return error when cron expression is invalid', () => {
      const data = {
        ...createBaseNodeData('delay'),
        delayType: 'cron',
        cronExpression: 'invalid',
      } as DelayNodeData;

      const result = validateNode('delay', data);
      expect(hasFieldError(result, 'cronExpression')).toBe(true);
    });

    it('should pass with valid cron expression', () => {
      const data = {
        ...createBaseNodeData('delay'),
        delayType: 'cron',
        cronExpression: '0 * * * *',
      } as DelayNodeData;

      const result = validateNode('delay', data);
      expect(hasFieldError(result, 'cronExpression')).toBe(false);
    });
  });

  describe('Webhook node validation', () => {
    it('should return error when webhookUrl is empty', () => {
      const data = {
        ...createBaseNodeData('webhook'),
        webhookUrl: '',
        method: 'POST',
        headers: {},
        inputs: {},
        outputs: {},
      } as WebhookNodeData;

      const result = validateNode('webhook', data);
      expect(getFieldError(result, 'webhookUrl')).toBe('Webhook URL is required');
    });

    it('should return error when URL format is invalid', () => {
      const data = {
        ...createBaseNodeData('webhook'),
        webhookUrl: 'not-a-valid-url',
        method: 'POST',
        headers: {},
        inputs: {},
        outputs: {},
      } as WebhookNodeData;

      const result = validateNode('webhook', data);
      expect(getFieldError(result, 'webhookUrl')).toBe('Invalid URL format');
    });

    it('should return warning when body is not valid JSON', () => {
      const data = {
        ...createBaseNodeData('webhook'),
        webhookUrl: 'https://api.example.com/webhook',
        method: 'POST',
        headers: {},
        body: 'not valid json',
        inputs: {},
        outputs: {},
      } as WebhookNodeData;

      const result = validateNode('webhook', data);
      expect(hasFieldWarning(result, 'body')).toBe(true);
    });

    it('should pass with valid webhook data', () => {
      const data = {
        ...createBaseNodeData('webhook'),
        webhookUrl: 'https://api.example.com/webhook',
        method: 'POST',
        headers: {},
        body: '{"key": "value"}',
        inputs: {},
        outputs: {},
      } as WebhookNodeData;

      const result = validateNode('webhook', data);
      expect(hasFieldError(result, 'webhookUrl')).toBe(false);
      expect(hasFieldWarning(result, 'body')).toBe(false);
    });
  });

  describe('Transform node validation', () => {
    it('should return error when transformType is missing', () => {
      const data = {
        ...createBaseNodeData('transform'),
        transformType: '' as TransformNodeData['transformType'],
        expression: '',
        inputs: {},
        outputs: {},
      } as TransformNodeData;

      const result = validateNode('transform', data);
      expect(hasFieldError(result, 'transformType')).toBe(true);
    });

    it('should return error when expression is empty', () => {
      const data = {
        ...createBaseNodeData('transform'),
        transformType: 'map',
        expression: '',
        inputs: {},
        outputs: {},
      } as TransformNodeData;

      const result = validateNode('transform', data);
      expect(getFieldError(result, 'expression')).toBe('Transform expression is required');
    });

    it('should return warning when expression lacks arrow function syntax', () => {
      const data = {
        ...createBaseNodeData('transform'),
        transformType: 'map',
        expression: 'item.value * 2',
        inputs: {},
        outputs: {},
      } as TransformNodeData;

      const result = validateNode('transform', data);
      expect(hasFieldWarning(result, 'expression')).toBe(true);
    });
  });

  describe('Merge node validation', () => {
    it('should return error when mergeStrategy is missing', () => {
      const data = {
        ...createBaseNodeData('merge'),
        mergeStrategy: '' as MergeNodeData['mergeStrategy'],
        inputs: {},
        outputs: {},
      } as MergeNodeData;

      const result = validateNode('merge', data);
      expect(hasFieldError(result, 'mergeStrategy')).toBe(true);
    });

    it('should pass with valid merge strategy', () => {
      const data = {
        ...createBaseNodeData('merge'),
        mergeStrategy: 'concat',
        inputs: {},
        outputs: {},
      } as MergeNodeData;

      const result = validateNode('merge', data);
      expect(hasFieldError(result, 'mergeStrategy')).toBe(false);
    });
  });

  describe('Start node validation', () => {
    it('should return warning when input has no description', () => {
      const data = {
        ...createBaseNodeData('start'),
        workflowInputs: {
          input1: { type: 'string', description: '' },
        },
      } as StartNodeData;

      const result = validateNode('start', data);
      expect(result.warnings.some(w => w.field.includes('workflowInputs'))).toBe(true);
    });
  });

  describe('End node validation', () => {
    it('should return warning when output has no description', () => {
      const data = {
        ...createBaseNodeData('end'),
        workflowOutputs: {
          output1: { type: 'string', description: '' },
        },
        outputMapping: {},
      } as EndNodeData;

      const result = validateNode('end', data);
      expect(result.warnings.some(w => w.field.includes('workflowOutputs'))).toBe(true);
    });
  });

  describe('Parallel node validation', () => {
    it('should return error when maxConcurrency is less than 1', () => {
      const data = {
        ...createBaseNodeData('parallel'),
        branches: [],
        waitForAll: true,
        maxConcurrency: 0,
        inputs: {},
        outputs: {},
      } as ParallelNodeData;

      const result = validateNode('parallel', data);
      expect(hasFieldError(result, 'maxConcurrency')).toBe(true);
    });

    it('should return warning when maxConcurrency is very high', () => {
      const data = {
        ...createBaseNodeData('parallel'),
        branches: [],
        waitForAll: true,
        maxConcurrency: 200,
        inputs: {},
        outputs: {},
      } as ParallelNodeData;

      const result = validateNode('parallel', data);
      expect(hasFieldWarning(result, 'maxConcurrency')).toBe(true);
    });
  });

  describe('Subworkflow node validation', () => {
    it('should return error when workflowId is empty', () => {
      const data = {
        ...createBaseNodeData('subworkflow'),
        workflowId: '',
        inputMapping: {},
        outputMapping: {},
        inputs: {},
        outputs: {},
      } as SubworkflowNodeData;

      const result = validateNode('subworkflow', data);
      expect(getFieldError(result, 'workflowId')).toBe('Workflow ID is required');
    });

    it('should return warning when workflowName is missing', () => {
      const data = {
        ...createBaseNodeData('subworkflow'),
        workflowId: 'workflow-123',
        workflowName: '',
        inputMapping: {},
        outputMapping: {},
        inputs: {},
        outputs: {},
      } as SubworkflowNodeData;

      const result = validateNode('subworkflow', data);
      expect(hasFieldWarning(result, 'workflowName')).toBe(true);
    });
  });
});

describe('helper functions', () => {
  const mockResult = {
    isValid: false,
    errors: [
      { field: 'field1', message: 'Error 1', code: 'ERR1' },
      { field: 'field2', message: 'Error 2', code: 'ERR2' },
    ],
    warnings: [
      { field: 'field3', message: 'Warning 1', code: 'WARN1' },
    ],
  };

  describe('getFieldError', () => {
    it('should return error message for existing field', () => {
      expect(getFieldError(mockResult, 'field1')).toBe('Error 1');
    });

    it('should return undefined for non-existing field', () => {
      expect(getFieldError(mockResult, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getFieldWarning', () => {
    it('should return warning message for existing field', () => {
      expect(getFieldWarning(mockResult, 'field3')).toBe('Warning 1');
    });

    it('should return undefined for non-existing field', () => {
      expect(getFieldWarning(mockResult, 'nonexistent')).toBeUndefined();
    });
  });

  describe('hasFieldError', () => {
    it('should return true for field with error', () => {
      expect(hasFieldError(mockResult, 'field1')).toBe(true);
    });

    it('should return false for field without error', () => {
      expect(hasFieldError(mockResult, 'field3')).toBe(false);
    });
  });

  describe('hasFieldWarning', () => {
    it('should return true for field with warning', () => {
      expect(hasFieldWarning(mockResult, 'field3')).toBe(true);
    });

    it('should return false for field without warning', () => {
      expect(hasFieldWarning(mockResult, 'field1')).toBe(false);
    });
  });
});

describe('validateWorkflowStructure', () => {
  const createNode = (id: string, type: string, label: string) => ({
    id,
    type,
    data: {
      label,
      nodeType: type,
      executionStatus: 'idle' as const,
      isConfigured: true,
      hasError: false,
    } as Parameters<typeof validateWorkflowStructure>[0][0]['data'],
  });

  describe('start node validation', () => {
    it('should return error when no start node exists', () => {
      const nodes = [
        createNode('end-1', 'end', 'End'),
      ];
      const edges: { id: string; source: string; target: string }[] = [];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_START',
        })
      );
    });

    it('should return error when multiple start nodes exist', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start 1'),
        createNode('start-2', 'start', 'Start 2'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MULTIPLE_START',
        })
      );
    });
  });

  describe('end node validation', () => {
    it('should return error when no end node exists', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
      ];
      const edges: { id: string; source: string; target: string }[] = [];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_END',
        })
      );
    });
  });

  describe('orphan node detection', () => {
    it('should warn about orphan nodes', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('ai-1', 'ai', 'AI Node'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ORPHAN_NODE',
          nodeId: 'ai-1',
        })
      );
    });

    it('should not warn about annotation nodes without connections', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('annotation-1', 'annotation', 'Note'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      const annotationWarning = result.warnings.find(
        w => w.nodeId === 'annotation-1' && w.code === 'ORPHAN_NODE'
      );
      expect(annotationWarning).toBeUndefined();
    });
  });

  describe('dead end detection', () => {
    it('should warn about nodes with no outgoing connections', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('ai-1', 'ai', 'AI Node'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'start-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DEAD_END',
          nodeId: 'ai-1',
        })
      );
    });
  });

  describe('unreachable node detection', () => {
    it('should warn about unreachable nodes', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('ai-1', 'ai', 'AI Node'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
        { id: 'e2', source: 'ai-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'UNREACHABLE',
          nodeId: 'ai-1',
        })
      );
    });
  });

  describe('conditional node validation', () => {
    it('should warn when conditional node has less than 2 branches', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('cond-1', 'conditional', 'Condition'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'cond-1' },
        { id: 'e2', source: 'cond-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPLETE_CONDITIONAL',
          nodeId: 'cond-1',
        })
      );
    });
  });

  describe('parallel node validation', () => {
    it('should warn when parallel node has less than 2 branches', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('parallel-1', 'parallel', 'Parallel'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'parallel-1' },
        { id: 'e2', source: 'parallel-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SINGLE_BRANCH_PARALLEL',
          nodeId: 'parallel-1',
        })
      );
    });
  });

  describe('merge node validation', () => {
    it('should warn when merge node has less than 2 incoming branches', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        createNode('merge-1', 'merge', 'Merge'),
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'merge-1' },
        { id: 'e2', source: 'merge-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SINGLE_BRANCH_MERGE',
          nodeId: 'merge-1',
        })
      );
    });
  });

  describe('valid workflow', () => {
    it('should pass validation for a valid workflow', () => {
      const nodes = [
        createNode('start-1', 'start', 'Start'),
        {
          id: 'ai-1',
          type: 'ai',
          data: {
            label: 'AI Node',
            nodeType: 'ai',
            executionStatus: 'idle' as const,
            isConfigured: true,
            hasError: false,
            aiPrompt: 'Process the input',
            inputs: {},
            outputs: {},
          } as AINodeData,
        },
        createNode('end-1', 'end', 'End'),
      ];
      const edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'end-1' },
      ];

      const result = validateWorkflowStructure(nodes, edges);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('getValidationSummary', () => {
  it('should return valid message when no errors or warnings', () => {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    expect(getValidationSummary(result)).toBe('Workflow is valid');
  });

  it('should return error count when errors exist', () => {
    const result = {
      isValid: false,
      errors: [
        { type: 'structure' as const, message: 'Error 1', code: 'E1' },
        { type: 'structure' as const, message: 'Error 2', code: 'E2' },
      ],
      warnings: [],
    };

    expect(getValidationSummary(result)).toBe('2 error(s)');
  });

  it('should return warning count when warnings exist', () => {
    const result = {
      isValid: true,
      errors: [],
      warnings: [
        { type: 'structure' as const, message: 'Warning 1', code: 'W1' },
      ],
    };

    expect(getValidationSummary(result)).toBe('1 warning(s)');
  });

  it('should return both counts when errors and warnings exist', () => {
    const result = {
      isValid: false,
      errors: [
        { type: 'structure' as const, message: 'Error 1', code: 'E1' },
      ],
      warnings: [
        { type: 'structure' as const, message: 'Warning 1', code: 'W1' },
        { type: 'structure' as const, message: 'Warning 2', code: 'W2' },
      ],
    };

    expect(getValidationSummary(result)).toBe('1 error(s), 2 warning(s)');
  });
});

describe('validateStepTimeouts', () => {

  const createNode = (id: string, type: string, data: Record<string, unknown> = {}) => ({
    id,
    type,
    data: {
      label: `Test ${type}`,
      ...data,
    },
  });

  it('should warn when AI node has no timeout', () => {
    const nodes = [createNode('ai-1', 'ai')];
    const warnings = validateStepTimeouts(nodes);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_TIMEOUT',
        nodeId: 'ai-1',
      })
    );
  });

  it('should warn when webhook node has no timeout', () => {
    const nodes = [createNode('webhook-1', 'webhook')];
    const warnings = validateStepTimeouts(nodes);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_TIMEOUT',
        nodeId: 'webhook-1',
      })
    );
  });

  it('should warn when timeout is excessively long', () => {
    const nodes = [createNode('ai-1', 'ai', { timeout: 700000 })]; // > 10 min
    const warnings = validateStepTimeouts(nodes);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'EXCESSIVE_TIMEOUT',
        nodeId: 'ai-1',
      })
    );
  });

  it('should warn when timeout is too short for complex operations', () => {
    const nodes = [createNode('ai-1', 'ai', { timeout: 500 })]; // < 1 sec
    const warnings = validateStepTimeouts(nodes);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'SHORT_TIMEOUT',
        nodeId: 'ai-1',
      })
    );
  });

  it('should skip non-executable nodes', () => {
    const nodes = [
      createNode('start-1', 'start'),
      createNode('end-1', 'end'),
      createNode('annotation-1', 'annotation'),
    ];
    const warnings = validateStepTimeouts(nodes);

    expect(warnings).toHaveLength(0);
  });

  it('should not warn when timeout is properly configured', () => {
    const nodes = [createNode('ai-1', 'ai', { timeout: 60000 })]; // 1 min
    const warnings = validateStepTimeouts(nodes);

    const timeoutWarnings = warnings.filter(
      (w: { code: string }) => w.code === 'MISSING_TIMEOUT' || w.code === 'EXCESSIVE_TIMEOUT'
    );
    expect(timeoutWarnings).toHaveLength(0);
  });
});

describe('validateResourceLimits', () => {

  const createNode = (id: string, type: string, data: Record<string, unknown> = {}) => ({
    id,
    type,
    data: {
      label: `Test ${type}`,
      ...data,
    },
  });

  it('should warn when parallel node has too many branches', () => {
    const nodes = [createNode('parallel-1', 'parallel')];
    // Create 15 outgoing edges (> 10 limit)
    const edges = Array.from({ length: 15 }, (_, i) => ({
      id: `e${i}`,
      source: 'parallel-1',
      target: `target-${i}`,
    }));

    const warnings = validateResourceLimits(nodes, edges);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'HIGH_PARALLELISM',
        nodeId: 'parallel-1',
      })
    );
  });

  it('should warn when loop node has no iteration limit', () => {
    const nodes = [createNode('loop-1', 'loop')];
    const warnings = validateResourceLimits(nodes, []);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_LOOP_LIMIT',
        nodeId: 'loop-1',
      })
    );
  });

  it('should warn when loop iteration limit is too high', () => {
    const nodes = [createNode('loop-1', 'loop', { maxIterations: 5000 })];
    const warnings = validateResourceLimits(nodes, []);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'HIGH_LOOP_ITERATIONS',
        nodeId: 'loop-1',
      })
    );
  });

  it('should warn about subworkflow nesting', () => {
    const nodes = [createNode('sub-1', 'subworkflow', { workflowId: 'nested-workflow' })];
    const warnings = validateResourceLimits(nodes, []);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'SUBWORKFLOW_DEPTH_CHECK',
        nodeId: 'sub-1',
      })
    );
  });

  it('should warn about memory-intensive transform operations', () => {
    const nodes = [createNode('transform-1', 'transform', { transformType: 'reduce' })];
    const warnings = validateResourceLimits(nodes, []);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'MEMORY_INTENSIVE_OPERATION',
        nodeId: 'transform-1',
      })
    );
  });

  it('should warn when workflow has too many steps', () => {
    // Create 55 AI nodes (> 50 limit)
    const nodes = Array.from({ length: 55 }, (_, i) =>
      createNode(`ai-${i}`, 'ai')
    );
    const warnings = validateResourceLimits(nodes, []);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'HIGH_COMPLEXITY',
      })
    );
  });
});

describe('validateWorkflowComprehensive', () => {

  const createNode = (id: string, type: string, data: Record<string, unknown> = {}) => ({
    id,
    type,
    data: {
      label: `Test ${type}`,
      nodeType: type,
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      ...data,
    },
  });

  it('should return comprehensive validation result', () => {
    const nodes = [
      createNode('start-1', 'start'),
      createNode('ai-1', 'ai', { aiPrompt: 'test' }),
      createNode('end-1', 'end'),
    ];
    const edges = [
      { id: 'e1', source: 'start-1', target: 'ai-1' },
      { id: 'e2', source: 'ai-1', target: 'end-1' },
    ];

    const result = validateWorkflowComprehensive(nodes, edges);

    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('structureValidation');
    expect(result).toHaveProperty('ioValidation');
    expect(result).toHaveProperty('timeoutWarnings');
    expect(result).toHaveProperty('resourceWarnings');
    expect(result).toHaveProperty('summary');
  });

  it('should combine all validation types in summary', () => {
    const nodes = [
      createNode('start-1', 'start'),
      createNode('end-1', 'end'),
    ];
    const edges = [{ id: 'e1', source: 'start-1', target: 'end-1' }];

    const result = validateWorkflowComprehensive(nodes, edges);

    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
  });
});
