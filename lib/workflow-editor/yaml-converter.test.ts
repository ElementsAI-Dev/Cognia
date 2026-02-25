/**
 * YAML Converter Tests
 */

import { visualToYamlDSL, serializeToYaml } from './yaml-converter';
import type { VisualWorkflow, WorkflowNode, StartNodeData, EndNodeData, AINodeData } from '@/types/workflow/workflow-editor';

const createTestWorkflow = (extraNodes: WorkflowNode[] = [], extraEdges: VisualWorkflow['edges'] = []): VisualWorkflow => {
  const startNode: WorkflowNode = {
    id: 'start-1',
    type: 'start',
    position: { x: 0, y: 0 },
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
    position: { x: 0, y: 400 },
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
    id: 'wf-test',
    name: 'Test Workflow',
    description: 'A test workflow for YAML conversion',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'test',
    tags: ['test'],
    nodes: [startNode, ...extraNodes, endNode],
    edges: extraEdges,
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

describe('visualToYamlDSL', () => {
  it('converts a minimal workflow', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);

    expect(dsl.name).toBe('Test Workflow');
    expect(dsl.description).toBe('A test workflow for YAML conversion');
    expect(dsl.version).toBe('1.0');
    expect(dsl.steps).toHaveLength(2); // start + end
  });

  it('preserves node type in steps', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);

    expect(dsl.steps[0].type).toBe('start');
    expect(dsl.steps[dsl.steps.length - 1].type).toBe('end');
  });

  it('maps edges to next references', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 0, y: 200 },
      data: {
        label: 'AI Step',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'Hello',
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const edges = [
      { id: 'e1', source: 'start-1', target: 'ai-1', type: 'default', data: {} },
      { id: 'e2', source: 'ai-1', target: 'end-1', type: 'default', data: {} },
    ];

    const workflow = createTestWorkflow([aiNode], edges as VisualWorkflow['edges']);
    const dsl = visualToYamlDSL(workflow);

    const startStep = dsl.steps.find(s => s.id === 'start-1');
    expect(startStep?.next).toBe('ai-1');

    const aiStep = dsl.steps.find(s => s.id === 'ai-1');
    expect(aiStep?.next).toBe('end-1');
  });

  it('maps multiple outgoing edges to array', () => {
    const condNode: WorkflowNode = {
      id: 'cond-1',
      type: 'conditional',
      position: { x: 0, y: 200 },
      data: {
        label: 'Check',
        nodeType: 'conditional',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        condition: 'x > 0',
        conditionType: 'expression',
        inputs: {},
      },
    };

    const edges = [
      { id: 'e1', source: 'cond-1', target: 'end-1', type: 'default', data: {} },
      { id: 'e2', source: 'cond-1', target: 'start-1', type: 'default', data: {} },
    ];

    const workflow = createTestWorkflow([condNode], edges as VisualWorkflow['edges']);
    const dsl = visualToYamlDSL(workflow);

    const condStep = dsl.steps.find(s => s.id === 'cond-1');
    expect(Array.isArray(condStep?.next)).toBe(true);
    expect(condStep?.next).toContain('end-1');
    expect(condStep?.next).toContain('start-1');
  });

  it('excludes base fields from config', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);

    const startStep = dsl.steps.find(s => s.id === 'start-1');
    // Base fields (label, nodeType, executionStatus, etc.) should NOT be in config
    expect(startStep?.config?.nodeType).toBeUndefined();
    expect(startStep?.config?.executionStatus).toBeUndefined();
    expect(startStep?.config?.label).toBeUndefined();
    expect(startStep?.config?.isConfigured).toBeUndefined();
    expect(startStep?.config?.hasError).toBeUndefined();
  });

  it('includes type-specific fields in config', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 0, y: 200 },
      data: {
        label: 'AI Step',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'Process data',
        model: 'gpt-4o',
        temperature: 0.7,
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const workflow = createTestWorkflow([aiNode]);
    const dsl = visualToYamlDSL(workflow);

    const aiStep = dsl.steps.find(s => s.id === 'ai-1');
    expect(aiStep?.config?.aiPrompt).toBe('Process data');
    expect(aiStep?.config?.model).toBe('gpt-4o');
    expect(aiStep?.config?.temperature).toBe(0.7);
  });

  it('omits variables when empty', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);
    expect(dsl.variables).toBeUndefined();
  });

  it('includes variables when present', () => {
    const workflow = createTestWorkflow();
    workflow.variables = {
      apiKey: { type: 'string', defaultValue: 'secret', scope: 'global' },
    } as unknown as VisualWorkflow['variables'];
    const dsl = visualToYamlDSL(workflow);
    expect(dsl.variables).toBeDefined();
    expect(dsl.variables?.apiKey).toBeDefined();
  });
});

describe('serializeToYaml', () => {
  it('produces valid YAML-like output', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);

    expect(yaml).toContain('name: "Test Workflow"');
    expect(yaml).toContain('description: "A test workflow for YAML conversion"');
    expect(yaml).toContain('version: "1.0"');
    expect(yaml).toContain('steps:');
  });

  it('serializes step ids and types', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);

    expect(yaml).toContain('id: "start-1"');
    expect(yaml).toContain('type: start');
    expect(yaml).toContain('id: "end-1"');
    expect(yaml).toContain('type: end');
  });

  it('serializes single next reference', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 0, y: 200 },
      data: {
        label: 'AI',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'test',
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const edges = [
      { id: 'e1', source: 'ai-1', target: 'end-1', type: 'default', data: {} },
    ];

    const workflow = createTestWorkflow([aiNode], edges as VisualWorkflow['edges']);
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);

    expect(yaml).toContain('next: "end-1"');
  });

  it('serializes multiple next references as list', () => {
    const condNode: WorkflowNode = {
      id: 'cond-1',
      type: 'conditional',
      position: { x: 0, y: 200 },
      data: {
        label: 'Check',
        nodeType: 'conditional',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        condition: 'true',
        conditionType: 'expression',
        inputs: {},
      },
    };

    const edges = [
      { id: 'e1', source: 'cond-1', target: 'end-1', type: 'default', data: {} },
      { id: 'e2', source: 'cond-1', target: 'start-1', type: 'default', data: {} },
    ];

    const workflow = createTestWorkflow([condNode], edges as VisualWorkflow['edges']);
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);

    expect(yaml).toContain('next:');
    expect(yaml).toContain('- "end-1"');
    expect(yaml).toContain('- "start-1"');
  });

  it('escapes special characters in strings', () => {
    const workflow = createTestWorkflow();
    workflow.name = 'Test "Quoted" Workflow\nNewline';
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);

    expect(yaml).toContain('Test \\"Quoted\\" Workflow\\nNewline');
  });

  it('serializes config values', () => {
    const aiNode: WorkflowNode = {
      id: 'ai-1',
      type: 'ai',
      position: { x: 0, y: 200 },
      data: {
        label: 'AI',
        nodeType: 'ai',
        executionStatus: 'idle',
        isConfigured: true,
        hasError: false,
        aiPrompt: 'test',
        temperature: 0.5,
        inputs: {},
        outputs: {},
      } as AINodeData,
    };

    const workflow = createTestWorkflow([aiNode]);
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);

    expect(yaml).toContain('config:');
    expect(yaml).toContain('temperature: 0.5');
  });

  it('ends with newline', () => {
    const workflow = createTestWorkflow();
    const dsl = visualToYamlDSL(workflow);
    const yaml = serializeToYaml(dsl);
    expect(yaml.endsWith('\n')).toBe(true);
  });
});
