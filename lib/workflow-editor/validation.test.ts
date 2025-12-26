/**
 * Workflow Editor Validation Tests
 */

import {
  validateNode,
  getFieldError,
  getFieldWarning,
  hasFieldError,
  hasFieldWarning,
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
} from '@/types/workflow-editor';

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
