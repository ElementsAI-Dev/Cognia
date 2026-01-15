/**
 * Tests for executor-integration.ts
 * Workflow Editor Executor Integration
 */

import {
  executeVisualWorkflow,
  createVisualWorkflowExecution,
  getWorkflowDefinition,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
  validateVisualWorkflow,
  getActiveExecutions,
  getActiveExecutionCount,
  removeActiveExecution,
} from './executor-integration';
import * as converter from './converter';
import * as workflows from '@/lib/ai/workflows';
import type { VisualWorkflow, VisualWorkflowNode, VisualWorkflowEdge } from '@/types/workflow/workflow-editor';
import type { WorkflowExecution, WorkflowDefinition } from '@/types/workflow';

// Mock converter
jest.mock('./converter', () => ({
  visualToDefinition: jest.fn(),
}));

// Mock workflows module
jest.mock('@/lib/ai/workflows', () => ({
  executeWorkflow: jest.fn(),
  createWorkflowExecution: jest.fn(),
  pauseWorkflow: jest.fn(),
  resumeWorkflow: jest.fn(),
  cancelWorkflow: jest.fn(),
  getGlobalWorkflowRegistry: jest.fn(() => ({
    register: jest.fn(),
  })),
}));

const mockedConverter = converter as jest.Mocked<typeof converter>;
const mockedWorkflows = workflows as jest.Mocked<typeof workflows>;

// Helper to create mock visual workflow
const createMockVisualWorkflow = (options: {
  hasStart?: boolean;
  hasEnd?: boolean;
  extraNodes?: VisualWorkflowNode[];
  extraEdges?: VisualWorkflowEdge[];
} = {}): VisualWorkflow => {
  const nodes: VisualWorkflowNode[] = [];
  const edges: VisualWorkflowEdge[] = [];

  if (options.hasStart !== false) {
    nodes.push({
      id: 'start-1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start', isConfigured: true },
    });
  }

  if (options.hasEnd !== false) {
    nodes.push({
      id: 'end-1',
      type: 'end',
      position: { x: 200, y: 0 },
      data: { label: 'End', isConfigured: true },
    });
  }

  if (nodes.length >= 2) {
    edges.push({
      id: 'edge-1',
      source: 'start-1',
      target: 'end-1',
    });
  }

  if (options.extraNodes) {
    nodes.push(...options.extraNodes);
  }

  if (options.extraEdges) {
    edges.push(...options.extraEdges);
  }

  return {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'A test workflow',
    version: '1.0.0',
    nodes,
    edges,
    variables: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
};

// Helper to create mock workflow definition
const createMockDefinition = (): WorkflowDefinition => ({
  id: 'test-workflow-def',
  name: 'Test Workflow',
  version: '1.0.0',
  description: 'Test',
  steps: [],
  inputs: {},
  outputs: {},
});

// Helper to create mock execution
const createMockExecution = (id: string, status: WorkflowExecution['status'] = 'running'): WorkflowExecution => ({
  id,
  workflowId: 'test-workflow',
  sessionId: 'test-session',
  status,
  currentStep: 'step-1',
  variables: {},
  stepResults: {},
  startedAt: new Date(),
  completedAt: status === 'completed' ? new Date() : undefined,
});

describe('executor-integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear active executions between tests
    const executions = getActiveExecutions();
    executions.forEach((_, id) => removeActiveExecution(id));
  });

  describe('executeVisualWorkflow', () => {
    it('should convert and execute visual workflow', async () => {
      const workflow = createMockVisualWorkflow();
      const definition = createMockDefinition();
      const execution = createMockExecution('exec-1');

      mockedConverter.visualToDefinition.mockReturnValue(definition);
      mockedWorkflows.executeWorkflow.mockResolvedValue({
        execution,
        output: { result: 'success' },
      });

      const result = await executeVisualWorkflow(
        workflow,
        { input: 'value' },
        { maxSteps: 10 }
      );

      expect(mockedConverter.visualToDefinition).toHaveBeenCalledWith(workflow);
      expect(mockedWorkflows.executeWorkflow).toHaveBeenCalledWith(
        definition.id,
        expect.stringContaining('visual-test-workflow'),
        { input: 'value' },
        { maxSteps: 10 },
        expect.any(Object)
      );
      expect(result.execution).toBe(execution);
    });

    it('should register workflow with global registry', async () => {
      const workflow = createMockVisualWorkflow();
      const definition = createMockDefinition();
      const mockRegister = jest.fn();

      mockedConverter.visualToDefinition.mockReturnValue(definition);
      mockedWorkflows.getGlobalWorkflowRegistry.mockReturnValue({ register: mockRegister } as never);
      mockedWorkflows.executeWorkflow.mockResolvedValue({
        execution: createMockExecution('exec-1'),
        output: {},
      });

      await executeVisualWorkflow(workflow, {}, {});

      expect(mockRegister).toHaveBeenCalledWith(definition);
    });

    it('should store execution in active executions', async () => {
      const workflow = createMockVisualWorkflow();
      const execution = createMockExecution('active-exec');

      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({
        execution,
        output: {},
      });

      await executeVisualWorkflow(workflow, {}, {});

      expect(getActiveExecutionCount()).toBeGreaterThan(0);
    });

    it('should wrap callbacks for cleanup', async () => {
      const workflow = createMockVisualWorkflow();
      const execution = createMockExecution('callback-exec');
      const onComplete = jest.fn();

      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({
        execution,
        output: {},
      });

      await executeVisualWorkflow(workflow, {}, {}, { onComplete });

      // The wrapped callback should be passed
      const passedCallbacks = mockedWorkflows.executeWorkflow.mock.calls[0][4];
      expect(passedCallbacks?.onComplete).toBeDefined();
    });
  });

  describe('createVisualWorkflowExecution', () => {
    it('should create execution from visual workflow', () => {
      const workflow = createMockVisualWorkflow();
      const definition = createMockDefinition();
      const execution = createMockExecution('created-exec');

      mockedConverter.visualToDefinition.mockReturnValue(definition);
      mockedWorkflows.createWorkflowExecution.mockReturnValue(execution);

      const result = createVisualWorkflowExecution(workflow, { key: 'value' });

      expect(mockedConverter.visualToDefinition).toHaveBeenCalledWith(workflow);
      expect(mockedWorkflows.createWorkflowExecution).toHaveBeenCalledWith(
        definition,
        expect.stringContaining('visual-test-workflow'),
        { key: 'value' },
        {}
      );
      expect(result).toBe(execution);
    });

    it('should use empty input by default', () => {
      const workflow = createMockVisualWorkflow();
      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.createWorkflowExecution.mockReturnValue(createMockExecution('exec'));

      createVisualWorkflowExecution(workflow);

      expect(mockedWorkflows.createWorkflowExecution).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {},
        {}
      );
    });
  });

  describe('getWorkflowDefinition', () => {
    it('should convert visual workflow to definition', () => {
      const workflow = createMockVisualWorkflow();
      const definition = createMockDefinition();

      mockedConverter.visualToDefinition.mockReturnValue(definition);

      const result = getWorkflowDefinition(workflow);

      expect(mockedConverter.visualToDefinition).toHaveBeenCalledWith(workflow);
      expect(result).toBe(definition);
    });
  });

  describe('pauseVisualWorkflow', () => {
    it('should pause active execution', async () => {
      const execution = createMockExecution('pause-exec');
      
      // Set up active execution
      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({ execution, output: {} });
      await executeVisualWorkflow(createMockVisualWorkflow(), {}, {});

      pauseVisualWorkflow('pause-exec');

      expect(mockedWorkflows.pauseWorkflow).toHaveBeenCalledWith(execution);
    });

    it('should do nothing for unknown execution', () => {
      pauseVisualWorkflow('unknown-exec');

      expect(mockedWorkflows.pauseWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('resumeVisualWorkflow', () => {
    it('should resume paused execution', async () => {
      const execution = createMockExecution('resume-exec', 'paused');
      
      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({ execution, output: {} });
      await executeVisualWorkflow(createMockVisualWorkflow(), {}, {});

      resumeVisualWorkflow('resume-exec');

      expect(mockedWorkflows.resumeWorkflow).toHaveBeenCalledWith(execution);
    });
  });

  describe('cancelVisualWorkflow', () => {
    it('should cancel running execution', async () => {
      const execution = createMockExecution('cancel-exec');
      
      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({ execution, output: {} });
      await executeVisualWorkflow(createMockVisualWorkflow(), {}, {});

      cancelVisualWorkflow('cancel-exec');

      expect(mockedWorkflows.cancelWorkflow).toHaveBeenCalledWith(execution);
    });
  });

  describe('validateVisualWorkflow', () => {
    it('should validate valid workflow', () => {
      const workflow = createMockVisualWorkflow();

      const result = validateVisualWorkflow(workflow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing start node', () => {
      const workflow = createMockVisualWorkflow({ hasStart: false });

      const result = validateVisualWorkflow(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('start node'), severity: 'error' })
      );
    });

    it('should detect missing end node', () => {
      const workflow = createMockVisualWorkflow({ hasEnd: false });

      const result = validateVisualWorkflow(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('end node'), severity: 'error' })
      );
    });

    it('should detect multiple start nodes', () => {
      const workflow = createMockVisualWorkflow({
        extraNodes: [{
          id: 'start-2',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Start 2', isConfigured: true },
        }],
      });

      const result = validateVisualWorkflow(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('only have one start node') })
      );
    });

    it('should detect multiple end nodes', () => {
      const workflow = createMockVisualWorkflow({
        extraNodes: [{
          id: 'end-2',
          type: 'end',
          position: { x: 300, y: 0 },
          data: { label: 'End 2', isConfigured: true },
        }],
      });

      const result = validateVisualWorkflow(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('only have one end node') })
      );
    });

    it('should warn about disconnected nodes', () => {
      const workflow = createMockVisualWorkflow({
        extraNodes: [{
          id: 'disconnected',
          type: 'action',
          position: { x: 400, y: 0 },
          data: { label: 'Disconnected', isConfigured: true },
        }],
      });

      const result = validateVisualWorkflow(workflow);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          nodeId: 'disconnected',
          message: expect.stringContaining('not connected'),
          severity: 'warning',
        })
      );
    });

    it('should warn about unconfigured nodes', () => {
      const workflow = createMockVisualWorkflow({
        extraNodes: [{
          id: 'unconfigured',
          type: 'action',
          position: { x: 100, y: 100 },
          data: { label: 'Unconfigured', isConfigured: false },
        }],
        extraEdges: [
          { id: 'e1', source: 'start-1', target: 'unconfigured' },
          { id: 'e2', source: 'unconfigured', target: 'end-1' },
        ],
      });
      // Remove the direct start-end edge
      workflow.edges = workflow.edges.filter(e => e.id !== 'edge-1');

      const result = validateVisualWorkflow(workflow);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          nodeId: 'unconfigured',
          message: expect.stringContaining('not fully configured'),
          severity: 'warning',
        })
      );
    });

    it('should detect cycles', () => {
      const workflow = createMockVisualWorkflow({
        extraNodes: [
          { id: 'node-a', type: 'action', position: { x: 100, y: 0 }, data: { label: 'A', isConfigured: true } },
          { id: 'node-b', type: 'action', position: { x: 150, y: 0 }, data: { label: 'B', isConfigured: true } },
        ],
        extraEdges: [
          { id: 'e1', source: 'start-1', target: 'node-a' },
          { id: 'e2', source: 'node-a', target: 'node-b' },
          { id: 'e3', source: 'node-b', target: 'node-a' }, // Creates cycle
          { id: 'e4', source: 'node-b', target: 'end-1' },
        ],
      });
      workflow.edges = workflow.edges.filter(e => e.id !== 'edge-1');

      const result = validateVisualWorkflow(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('cycle'), severity: 'error' })
      );
    });

    it('should return isValid true when only warnings exist', () => {
      const workflow = createMockVisualWorkflow({
        extraNodes: [{
          id: 'unconfigured',
          type: 'action',
          position: { x: 100, y: 100 },
          data: { label: 'Unconfigured', isConfigured: false },
        }],
        extraEdges: [
          { id: 'e1', source: 'start-1', target: 'unconfigured' },
          { id: 'e2', source: 'unconfigured', target: 'end-1' },
        ],
      });
      workflow.edges = workflow.edges.filter(e => e.id !== 'edge-1');

      const result = validateVisualWorkflow(workflow);

      // Has warnings but no errors
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.every(e => e.severity === 'warning')).toBe(true);
    });
  });

  describe('getActiveExecutions', () => {
    it('should return copy of active executions', async () => {
      const execution = createMockExecution('get-exec');
      
      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({ execution, output: {} });
      await executeVisualWorkflow(createMockVisualWorkflow(), {}, {});

      const executions = getActiveExecutions();

      expect(executions.size).toBeGreaterThan(0);
      expect(executions).not.toBe(getActiveExecutions()); // Should be a copy
    });
  });

  describe('getActiveExecutionCount', () => {
    it('should return count of active executions', async () => {
      expect(getActiveExecutionCount()).toBe(0);

      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({
        execution: createMockExecution('count-exec'),
        output: {},
      });
      await executeVisualWorkflow(createMockVisualWorkflow(), {}, {});

      expect(getActiveExecutionCount()).toBe(1);
    });
  });

  describe('removeActiveExecution', () => {
    it('should remove execution from active map', async () => {
      const execution = createMockExecution('remove-exec');
      
      mockedConverter.visualToDefinition.mockReturnValue(createMockDefinition());
      mockedWorkflows.executeWorkflow.mockResolvedValue({ execution, output: {} });
      await executeVisualWorkflow(createMockVisualWorkflow(), {}, {});

      expect(getActiveExecutionCount()).toBe(1);

      removeActiveExecution('remove-exec');

      expect(getActiveExecutionCount()).toBe(0);
    });

    it('should do nothing for unknown execution', () => {
      removeActiveExecution('nonexistent');
      // Should not throw
    });
  });
});
