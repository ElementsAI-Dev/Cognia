/**
 * Tests for workflow auto layout using dagre
 */

// Mock dagre-d3-es to avoid ESM transform issues
const mockNodes = new Map<string, { width: number; height: number; x: number; y: number }>();
const mockEdges: Array<{ v: string; w: string }> = [];
let mockGraphConfig: Record<string, unknown> = {};

jest.mock('dagre-d3-es/src/graphlib/index.js', () => ({
  Graph: jest.fn().mockImplementation(() => ({
    setGraph: jest.fn((config: Record<string, unknown>) => { mockGraphConfig = config; }),
    setDefaultEdgeLabel: jest.fn(),
    setNode: jest.fn((id: string, data: { width: number; height: number }) => {
      mockNodes.set(id, { ...data, x: 0, y: 0 });
    }),
    setEdge: jest.fn((source: string, target: string) => {
      mockEdges.push({ v: source, w: target });
    }),
    hasNode: jest.fn((id: string) => mockNodes.has(id)),
    node: jest.fn((id: string) => mockNodes.get(id)),
    nodes: jest.fn(() => Array.from(mockNodes.keys())),
  })),
}));

jest.mock('dagre-d3-es/src/dagre/index.js', () => ({
  layout: jest.fn((_g: unknown, _opts: unknown) => {
    // Simulate dagre layout: position nodes in a simple grid based on topology
    const nodeIds = Array.from(mockNodes.keys());
    const isVertical = mockGraphConfig.rankdir === 'TB' || mockGraphConfig.rankdir === 'BT';

    // Build simple levels from edges
    const inDegree = new Map<string, number>();
    nodeIds.forEach((id) => inDegree.set(id, 0));
    mockEdges.forEach((e) => {
      inDegree.set(e.w, (inDegree.get(e.w) || 0) + 1);
    });

    const levels: string[][] = [];
    const visited = new Set<string>();
    let queue = nodeIds.filter((id) => inDegree.get(id) === 0);

    while (queue.length > 0) {
      levels.push([...queue]);
      queue.forEach((id) => visited.add(id));
      const next: string[] = [];
      queue.forEach((id) => {
        mockEdges.filter((e) => e.v === id).forEach((e) => {
          const deg = (inDegree.get(e.w) || 1) - 1;
          inDegree.set(e.w, deg);
          if (deg === 0 && !visited.has(e.w)) next.push(e.w);
        });
      });
      queue = next;
    }
    // Add unvisited
    const unvisited = nodeIds.filter((id) => !visited.has(id));
    if (unvisited.length) levels.push(unvisited);

    levels.forEach((level, li) => {
      level.forEach((id, ni) => {
        const node = mockNodes.get(id)!;
        if (isVertical) {
          node.x = 100 + ni * 250;
          node.y = 100 + li * 180;
        } else {
          node.x = 100 + li * 250;
          node.y = 100 + ni * 180;
        }
      });
    });
  }),
}));

import { applyDagreLayout } from './layout';
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow/workflow-editor';

// Helper to create a minimal workflow node
function createNode(id: string, x = 0, y = 0): WorkflowNode {
  return {
    id,
    type: 'ai',
    position: { x, y },
    data: {
      label: `Node ${id}`,
      nodeType: 'ai',
      description: '',
      isConfigured: false,
      executionStatus: 'idle',
    },
  } as WorkflowNode;
}

// Helper to create a minimal workflow edge
function createEdge(source: string, target: string): WorkflowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
  } as WorkflowEdge;
}

describe('applyDagreLayout', () => {
  beforeEach(() => {
    mockNodes.clear();
    mockEdges.length = 0;
    mockGraphConfig = {};
  });

  it('should return empty array for empty input', () => {
    const result = applyDagreLayout([], []);
    expect(result).toEqual([]);
  });

  it('should layout a single node', () => {
    const nodes = [createNode('a')];
    const result = applyDagreLayout(nodes, []);
    expect(result).toHaveLength(1);
    expect(result[0].position).toBeDefined();
    expect(typeof result[0].position.x).toBe('number');
    expect(typeof result[0].position.y).toBe('number');
  });

  it('should layout a linear chain (A -> B -> C)', () => {
    const nodes = [createNode('a'), createNode('b'), createNode('c')];
    const edges = [createEdge('a', 'b'), createEdge('b', 'c')];

    const result = applyDagreLayout(nodes, edges, { direction: 'TB' });

    // In TB direction, y should increase from a -> b -> c
    const posA = result.find((n) => n.id === 'a')!.position;
    const posB = result.find((n) => n.id === 'b')!.position;
    const posC = result.find((n) => n.id === 'c')!.position;

    expect(posA.y).toBeLessThan(posB.y);
    expect(posB.y).toBeLessThan(posC.y);
  });

  it('should layout a branching graph', () => {
    const nodes = [
      createNode('start'),
      createNode('left'),
      createNode('right'),
      createNode('end'),
    ];
    const edges = [
      createEdge('start', 'left'),
      createEdge('start', 'right'),
      createEdge('left', 'end'),
      createEdge('right', 'end'),
    ];

    const result = applyDagreLayout(nodes, edges, { direction: 'TB' });

    const posStart = result.find((n) => n.id === 'start')!.position;
    const posLeft = result.find((n) => n.id === 'left')!.position;
    const posRight = result.find((n) => n.id === 'right')!.position;
    const posEnd = result.find((n) => n.id === 'end')!.position;

    // Start should be at top, end at bottom
    expect(posStart.y).toBeLessThan(posLeft.y);
    expect(posStart.y).toBeLessThan(posRight.y);
    expect(posLeft.y).toBeLessThan(posEnd.y);
    expect(posRight.y).toBeLessThan(posEnd.y);

    // Left and right should be at same level but different x
    expect(posLeft.y).toBeCloseTo(posRight.y, 0);
    expect(posLeft.x).not.toEqual(posRight.x);
  });

  it('should respect LR direction', () => {
    const nodes = [createNode('a'), createNode('b')];
    const edges = [createEdge('a', 'b')];

    const result = applyDagreLayout(nodes, edges, { direction: 'LR' });

    const posA = result.find((n) => n.id === 'a')!.position;
    const posB = result.find((n) => n.id === 'b')!.position;

    // In LR direction, x should increase from a -> b
    expect(posA.x).toBeLessThan(posB.x);
  });

  it('should handle disconnected nodes', () => {
    const nodes = [createNode('a'), createNode('b'), createNode('isolated')];
    const edges = [createEdge('a', 'b')];

    const result = applyDagreLayout(nodes, edges);
    expect(result).toHaveLength(3);
    // All nodes should have valid positions
    result.forEach((node) => {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    });
  });

  it('should skip edges with missing source or target', () => {
    const nodes = [createNode('a'), createNode('b')];
    const edges = [createEdge('a', 'b'), createEdge('a', 'nonexistent')];

    // Should not throw
    const result = applyDagreLayout(nodes, edges);
    expect(result).toHaveLength(2);
  });

  it('should preserve node data except position', () => {
    const nodes = [createNode('a')];
    nodes[0].data.label = 'Custom Label';

    const result = applyDagreLayout(nodes, []);
    expect(result[0].data.label).toBe('Custom Label');
    expect(result[0].id).toBe('a');
    expect(result[0].type).toBe('ai');
  });
});
