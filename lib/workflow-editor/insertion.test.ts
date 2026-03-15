import type { VisualWorkflow } from '@/types/workflow/workflow-editor';
import type { WorkflowInsertionIntent } from '@/stores/workflow/workflow-editor-store/types';

import { planWorkflowInsertion, resolveInsertionModeForNode } from './insertion';

function createWorkflowFixture(): VisualWorkflow {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'workflow-fixture',
    name: 'Fixture',
    description: '',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'custom',
    tags: [],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start', nodeType: 'start', executionStatus: 'idle', isConfigured: true, hasError: false },
      } as VisualWorkflow['nodes'][number],
      {
        id: 'end-1',
        type: 'end',
        position: { x: 100, y: 400 },
        data: { label: 'End', nodeType: 'end', executionStatus: 'idle', isConfigured: true, hasError: false },
      } as VisualWorkflow['nodes'][number],
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start-1',
        target: 'end-1',
        type: 'default',
        data: {},
      },
    ],
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
      retryOnFailure: true,
      maxRetries: 3,
      logLevel: 'info',
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe('planWorkflowInsertion', () => {
  it('rewires an edge for insert-between mode', () => {
    const workflow = createWorkflowFixture();
    const intent: WorkflowInsertionIntent = {
      mode: 'insert-between',
      origin: 'edge-gap',
      edgeId: 'edge-1',
      sourceNodeId: 'start-1',
      targetNodeId: 'end-1',
      openedAt: 123,
    };

    const plan = planWorkflowInsertion({
      workflow,
      newNodeId: 'ai-1',
      intent,
    });

    expect(plan.edgeIdsToRemove).toEqual(['edge-1']);
    expect(plan.edgesToAdd).toEqual([
      expect.objectContaining({ source: 'start-1', target: 'ai-1' }),
      expect.objectContaining({ source: 'ai-1', target: 'end-1' }),
    ]);
    expect(plan.position).toEqual({ x: 100, y: 250 });
  });

  it('plans append mode from the source node', () => {
    const workflow = createWorkflowFixture();
    const intent: WorkflowInsertionIntent = {
      mode: 'append',
      origin: 'node-exit',
      sourceNodeId: 'start-1',
      openedAt: 123,
    };

    const plan = planWorkflowInsertion({
      workflow,
      newNodeId: 'tool-1',
      intent,
    });

    expect(plan.edgeIdsToRemove).toEqual([]);
    expect(plan.edgesToAdd).toEqual([expect.objectContaining({ source: 'start-1', target: 'tool-1' })]);
    expect(plan.position).toEqual({ x: 100, y: 280 });
  });

  it('plans branch mode with horizontal offset from the source node', () => {
    const workflow = createWorkflowFixture();
    const intent: WorkflowInsertionIntent = {
      mode: 'branch',
      origin: 'node-exit',
      sourceNodeId: 'start-1',
      openedAt: 123,
    };

    const plan = planWorkflowInsertion({
      workflow,
      newNodeId: 'conditional-1',
      intent,
    });

    expect(plan.edgesToAdd).toEqual([
      expect.objectContaining({ source: 'start-1', target: 'conditional-1' }),
    ]);
    expect(plan.position.x).toBeGreaterThan(100);
  });
});

describe('resolveInsertionModeForNode', () => {
  it('returns branch mode for branching nodes', () => {
    expect(resolveInsertionModeForNode('conditional')).toBe('branch');
    expect(resolveInsertionModeForNode('parallel')).toBe('branch');
  });

  it('returns append mode for linear nodes', () => {
    expect(resolveInsertionModeForNode('tool')).toBe('append');
  });
});
