/**
 * Workflow Converter Tests
 */

import {
  visualToDefinition,
  definitionToVisual,
  validateVisualWorkflow,
} from './converter';
import type {
  VisualWorkflow,
  WorkflowNode,
  StartNodeData,
  EndNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
} from '@/types/workflow/workflow-editor';
import type { WorkflowDefinition } from '@/types/workflow';

// Helper to create a minimal visual workflow
const createMinimalWorkflow = (nodes: WorkflowNode[] = []): VisualWorkflow => {
  const startNode: WorkflowNode = {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: {
      label: 'Start',
      nodeType: 'start',
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      workflowInputs: {},
    } as StartNodeData,
  };

  const endNode: WorkflowNode = {
    id: 'end-1',
    type: 'end',
    position: { x: 250, y: 400 },
    data: {
      label: 'End',
      nodeType: 'end',
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      workflowOutputs: {},
      outputMapping: {},
    } as EndNodeData,
  };

  return {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'A test workflow',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'test',
    tags: ['test'],
    nodes: [startNode, ...nodes, endNode],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    inputs: {},
    outputs: {},
    variables: {},
    settings: {
      autoSave: true,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      retryOnFailure: false,
      maxRetries: 3,
      logLevel: 'info',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

describe('visualToDefinition', () => {
  it('should convert a minimal workflow with only start and end nodes', () => {
    const visual = createMinimalWorkflow();
    const definition = visualToDefinition(visual);

    expect(definition.id).toBe('test-workflow');
    expect(definition.name).toBe('Test Workflow');
    expect(definition.steps).toHaveLength(0);
  });

  it('should convert workflow with AI node', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 250, y: 200 },
      data: {
        label: 'AI Step',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'Process the input: {{input}}',
        systemPrompt: 'You are a helpful assistant',
        model: 'gpt-4o',
        temperature: 0.7,
        inputs: { input: { type: 'string', description: 'Input text' } },
        outputs: { result: { type: 'string', description: 'Output text' } },
      } as AINodeData,
    };

    const visual = createMinimalWorkflow([aiNode]);
    visual.edges = [
      { id: 'e1', source: 'start-1', target: 'ai-1', type: 'default', data: {} },
      { id: 'e2', source: 'ai-1', target: 'end-1', type: 'default', data: {} },
    ];

    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('ai');
    expect(definition.steps[0].aiPrompt).toBe('Process the input: {{input}}');
  });

  it('should convert workflow with Tool node', () => {
    const toolNode: WorkflowNode = {
      id: 'tool-1',
      type: 'tool',
      position: { x: 250, y: 200 },
      data: {
        label: 'Web Search',
        nodeType: 'tool',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        toolName: 'web_search',
        inputs: { query: { type: 'string', description: 'Search query' } },
        outputs: { results: { type: 'array', description: 'Search results' } },
        parameterMapping: {},
      } as ToolNodeData,
    };

    const visual = createMinimalWorkflow([toolNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('tool');
    expect(definition.steps[0].toolName).toBe('web_search');
  });

  it('should convert workflow with Conditional node', () => {
    const conditionalNode: WorkflowNode = {
      id: 'cond-1',
      type: 'conditional',
      position: { x: 250, y: 200 },
      data: {
        label: 'Check Condition',
        nodeType: 'conditional',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        condition: 'input.value > 10',
        conditionType: 'expression',
        inputs: { input: { type: 'object', description: 'Input object' } },
      } as ConditionalNodeData,
    };

    const visual = createMinimalWorkflow([conditionalNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('conditional');
    expect(definition.steps[0].condition).toBe('input.value > 10');
  });

  it('should preserve workflow inputs from start node', () => {
    const visual = createMinimalWorkflow();
    (visual.nodes[0].data as StartNodeData).workflowInputs = {
      userInput: { type: 'string', description: 'User input' },
      count: { type: 'number', description: 'Count value' },
    };

    const definition = visualToDefinition(visual);

    expect(definition.inputs).toHaveProperty('userInput');
    expect(definition.inputs).toHaveProperty('count');
  });

  it('should preserve workflow outputs from end node', () => {
    const visual = createMinimalWorkflow();
    const endNode = visual.nodes.find(n => n.type === 'end');
    if (endNode) {
      (endNode.data as EndNodeData).workflowOutputs = {
        result: { type: 'string', description: 'Final result' },
      };
    }

    const definition = visualToDefinition(visual);

    expect(definition.outputs).toHaveProperty('result');
  });

  it('should handle dependencies between nodes', () => {
    const aiNode1: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 250, y: 150 },
      data: {
        label: 'AI Step 1',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'First step',
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const aiNode2: WorkflowNode = {
      id: 'ai-2',
      type: 'ai',
      position: { x: 250, y: 300 },
      data: {
        label: 'AI Step 2',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'Second step',
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const visual = createMinimalWorkflow([aiNode1, aiNode2]);
    visual.edges = [
      { id: 'e1', source: 'start-1', target: 'ai-1', type: 'default', data: {} },
      { id: 'e2', source: 'ai-1', target: 'ai-2', type: 'default', data: {} },
      { id: 'e3', source: 'ai-2', target: 'end-1', type: 'default', data: {} },
    ];

    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(2);
    expect(definition.steps[1].dependencies).toContain('ai-1');
  });

  it('should convert code node to code step type (not tool)', () => {
    const codeNode: WorkflowNode = {
      id: 'code-1',
      type: 'code',
      position: { x: 250, y: 200 },
      data: {
        label: 'Code',
        nodeType: 'code',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        language: 'javascript',
        code: 'return input;',
        inputs: {},
        outputs: {},
      },
    };

    const visual = createMinimalWorkflow([codeNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    // Code nodes now have their own step type instead of being coerced to tool
    expect(definition.steps[0].type).toBe('code');
    expect(definition.steps[0].code).toBe('return input;');
    expect(definition.steps[0].language).toBe('javascript');
  });
});

describe('definitionToVisual', () => {
  it('should convert a minimal definition to visual workflow', () => {
    const definition: WorkflowDefinition = {
      id: 'test-def',
      name: 'Test Definition',
      description: 'A test definition',
      type: 'custom',
      version: '1.0.0',
      icon: 'Workflow',
      category: 'test',
      tags: ['test'],
      steps: [],
      inputs: {},
      outputs: {},
      defaultConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const visual = definitionToVisual(definition);

    expect(visual.id).toBe('test-def');
    expect(visual.name).toBe('Test Definition');
    expect(visual.nodes).toHaveLength(2); // start + end
    expect(visual.nodes[0].type).toBe('start');
    expect(visual.nodes[1].type).toBe('end');
  });

  it('should convert definition with AI step', () => {
    const definition: WorkflowDefinition = {
      id: 'test-def',
      name: 'Test Definition',
      description: '',
      type: 'custom',
      version: '1.0.0',
      icon: 'Workflow',
      category: 'test',
      tags: [],
      steps: [
        {
          id: 'step-1',
          name: 'AI Step',
          type: 'ai',
          description: 'An AI step',
          aiPrompt: 'Process this',
          inputs: {},
          outputs: {},
          dependencies: [],
        },
      ],
      inputs: {},
      outputs: {},
      defaultConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const visual = definitionToVisual(definition);

    expect(visual.nodes).toHaveLength(3); // start + step + end
    const aiNode = visual.nodes.find(n => n.id === 'step-1');
    expect(aiNode).toBeDefined();
    expect(aiNode?.type).toBe('ai');
  });

  it('should create edges from dependencies', () => {
    const definition: WorkflowDefinition = {
      id: 'test-def',
      name: 'Test Definition',
      description: '',
      type: 'custom',
      version: '1.0.0',
      icon: 'Workflow',
      category: 'test',
      tags: [],
      steps: [
        {
          id: 'step-1',
          name: 'Step 1',
          type: 'ai',
          description: '',
          aiPrompt: 'First',
          inputs: {},
          outputs: {},
          dependencies: [],
        },
        {
          id: 'step-2',
          name: 'Step 2',
          type: 'ai',
          description: '',
          aiPrompt: 'Second',
          inputs: {},
          outputs: {},
          dependencies: ['step-1'],
        },
      ],
      inputs: {},
      outputs: {},
      defaultConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const visual = definitionToVisual(definition);

    // Should have edge from step-1 to step-2
    const edge = visual.edges.find(e => e.source === 'step-1' && e.target === 'step-2');
    expect(edge).toBeDefined();
  });

  it('should connect steps without dependencies to start node', () => {
    const definition: WorkflowDefinition = {
      id: 'test-def',
      name: 'Test Definition',
      description: '',
      type: 'custom',
      version: '1.0.0',
      icon: 'Workflow',
      category: 'test',
      tags: [],
      steps: [
        {
          id: 'step-1',
          name: 'Step 1',
          type: 'ai',
          description: '',
          aiPrompt: 'First',
          inputs: {},
          outputs: {},
          dependencies: [],
        },
      ],
      inputs: {},
      outputs: {},
      defaultConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const visual = definitionToVisual(definition);

    // Should have edge from start to step-1
    const edge = visual.edges.find(e => e.source === 'start-1' && e.target === 'step-1');
    expect(edge).toBeDefined();
  });

  it('should preserve inputs and outputs', () => {
    const definition: WorkflowDefinition = {
      id: 'test-def',
      name: 'Test Definition',
      description: '',
      type: 'custom',
      version: '1.0.0',
      icon: 'Workflow',
      category: 'test',
      tags: [],
      steps: [],
      inputs: { userInput: { type: 'string', description: 'User input' } },
      outputs: { result: { type: 'string', description: 'Result' } },
      defaultConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const visual = definitionToVisual(definition);

    const startNode = visual.nodes.find(n => n.type === 'start');
    const endNode = visual.nodes.find(n => n.type === 'end');

    expect((startNode?.data as StartNodeData).workflowInputs).toHaveProperty('userInput');
    expect((endNode?.data as EndNodeData).workflowOutputs).toHaveProperty('result');
  });
});

describe('validateVisualWorkflow', () => {
  it('should return valid for a properly configured workflow', () => {
    const visual = createMinimalWorkflow();
    visual.edges = [
      { id: 'e1', source: 'start-1', target: 'end-1', type: 'default', data: {} },
    ];

    const result = validateVisualWorkflow(visual);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error when start node is missing', () => {
    const visual = createMinimalWorkflow();
    visual.nodes = visual.nodes.filter(n => n.type !== 'start');

    const result = validateVisualWorkflow(visual);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('start'))).toBe(true);
  });

  it('should return error when end node is missing', () => {
    const visual = createMinimalWorkflow();
    visual.nodes = visual.nodes.filter(n => n.type !== 'end');

    const result = validateVisualWorkflow(visual);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('end'))).toBe(true);
  });

  it('should return warning for disconnected nodes', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 250, y: 200 },
      data: {
        label: 'AI Step',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'test',
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const visual = createMinimalWorkflow([aiNode]);
    // No edges connecting the AI node

    const result = validateVisualWorkflow(visual);

    // Disconnected nodes generate warnings, not errors
    expect(result.warnings.some(w => w.includes('not connected'))).toBe(true);
  });
});

describe('extended node type conversion', () => {
  it('should convert workflow with Code node', () => {
    const codeNode: WorkflowNode = {
      id: 'code-1',
      type: 'code',
      position: { x: 250, y: 200 },
      data: {
        label: 'JavaScript Code',
        nodeType: 'code',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        language: 'javascript',
        code: 'return input.value * 2;',
        inputs: { value: { type: 'number', description: 'Input value' } },
        outputs: { result: { type: 'number', description: 'Doubled value' } },
      },
    };

    const visual = createMinimalWorkflow([codeNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('code');
    expect(definition.steps[0].code).toBe('return input.value * 2;');
    expect(definition.steps[0].language).toBe('javascript');
  });

  it('should convert workflow with Transform node', () => {
    const transformNode: WorkflowNode = {
      id: 'transform-1',
      type: 'transform',
      position: { x: 250, y: 200 },
      data: {
        label: 'Map Transform',
        nodeType: 'transform',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        transformType: 'map',
        expression: 'item => item.toUpperCase()',
        inputs: { data: { type: 'array', description: 'Input array' } },
        outputs: { result: { type: 'array', description: 'Transformed array' } },
      },
    };

    const visual = createMinimalWorkflow([transformNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('transform');
    expect(definition.steps[0].transformType).toBe('map');
    expect(definition.steps[0].expression).toBe('item => item.toUpperCase()');
  });

  it('should convert workflow with Loop node', () => {
    const loopNode: WorkflowNode = {
      id: 'loop-1',
      type: 'loop',
      position: { x: 250, y: 200 },
      data: {
        label: 'ForEach Loop',
        nodeType: 'loop',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        loopType: 'forEach',
        iteratorVariable: 'item',
        collection: 'items',
        maxIterations: 100,
        inputs: { items: { type: 'array', description: 'Items to iterate' } },
        outputs: { iterations: { type: 'array', description: 'Loop results' } },
      },
    };

    const visual = createMinimalWorkflow([loopNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('loop');
    expect(definition.steps[0].loopType).toBe('forEach');
    expect(definition.steps[0].iteratorVariable).toBe('item');
    expect(definition.steps[0].collection).toBe('items');
  });

  it('should convert workflow with Webhook node', () => {
    const webhookNode: WorkflowNode = {
      id: 'webhook-1',
      type: 'webhook',
      position: { x: 250, y: 200 },
      data: {
        label: 'API Call',
        nodeType: 'webhook',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        webhookUrl: 'https://api.example.com/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"key": "{{value}}"}',
        inputs: { value: { type: 'string', description: 'Request value' } },
        outputs: { response: { type: 'object', description: 'API response' } },
      },
    };

    const visual = createMinimalWorkflow([webhookNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('webhook');
    expect(definition.steps[0].webhookUrl).toBe('https://api.example.com/data');
    expect(definition.steps[0].method).toBe('POST');
  });

  it('should convert workflow with Delay node', () => {
    const delayNode: WorkflowNode = {
      id: 'delay-1',
      type: 'delay',
      position: { x: 250, y: 200 },
      data: {
        label: 'Wait 5 seconds',
        nodeType: 'delay',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        delayType: 'fixed',
        delayMs: 5000,
      },
    };

    const visual = createMinimalWorkflow([delayNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('delay');
    expect(definition.steps[0].delayType).toBe('fixed');
    expect(definition.steps[0].delayMs).toBe(5000);
  });

  it('should convert workflow with Merge node', () => {
    const mergeNode: WorkflowNode = {
      id: 'merge-1',
      type: 'merge',
      position: { x: 250, y: 200 },
      data: {
        label: 'Merge Results',
        nodeType: 'merge',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        mergeStrategy: 'concat',
        inputs: {
          input1: { type: 'array', description: 'First input' },
          input2: { type: 'array', description: 'Second input' },
        },
        outputs: { result: { type: 'array', description: 'Merged result' } },
      },
    };

    const visual = createMinimalWorkflow([mergeNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('merge');
    expect(definition.steps[0].mergeStrategy).toBe('concat');
  });

  it('should convert workflow with Subworkflow node', () => {
    const subworkflowNode: WorkflowNode = {
      id: 'subworkflow-1',
      type: 'subworkflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Sub Process',
        nodeType: 'subworkflow',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        workflowId: 'workflow-123',
        inputMapping: { input: 'parentInput' },
        outputMapping: { result: 'subResult' },
        inputs: { parentInput: { type: 'string', description: 'Parent input' } },
        outputs: { subResult: { type: 'string', description: 'Sub result' } },
      },
    };

    const visual = createMinimalWorkflow([subworkflowNode]);
    const definition = visualToDefinition(visual);

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].type).toBe('subworkflow');
    expect(definition.steps[0].workflowId).toBe('workflow-123');
    expect(definition.steps[0].inputMapping).toEqual({ input: 'parentInput' });
    expect(definition.steps[0].outputMapping).toEqual({ result: 'subResult' });
  });
});

describe('round-trip conversion', () => {
  it('should preserve workflow structure through visual -> definition -> visual', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 250, y: 200 },
      data: {
        label: 'AI Step',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'Process: {{input}}',
        inputs: { input: { type: 'string', description: 'Input' } },
        outputs: { result: { type: 'string', description: 'Result' } },
      } as AINodeData,
    };

    const original = createMinimalWorkflow([aiNode]);
    original.edges = [
      { id: 'e1', source: 'start-1', target: 'ai-1', type: 'default', data: {} },
      { id: 'e2', source: 'ai-1', target: 'end-1', type: 'default', data: {} },
    ];

    const definition = visualToDefinition(original);
    const restored = definitionToVisual(definition);

    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.nodes.length).toBe(original.nodes.length);

    const restoredAiNode = restored.nodes.find(n => n.id === 'ai-1');
    expect(restoredAiNode).toBeDefined();
    expect((restoredAiNode?.data as AINodeData).aiPrompt).toBe('Process: {{input}}');
  });
});
