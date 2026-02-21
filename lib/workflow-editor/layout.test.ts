/**
 * Tests for workflow auto layout using dagre
 *
 * The global mock at __mocks__/dagre-d3-es.js is used via moduleNameMapper.
 * We import `layout` from the same mapped module and configure its
 * implementation to simulate dagre positioning for each test.
 */

// Both dagre-d3-es/src/graphlib/index.js and dagre-d3-es/src/dagre/index.js
// are mapped to __mocks__/dagre-d3-es.js by moduleNameMapper.
 
const dagreMock = require('dagre-d3-es');
const mockedLayout = dagreMock.layout as jest.Mock;

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
    jest.clearAllMocks();
    // Configure layout mock to simulate dagre positioning
    mockedLayout.mockImplementation((g: { _nodes: Record<string, { width: number; height: number; x?: number; y?: number }>; _edges: Record<string, unknown>; _label?: { rankdir?: string } }) => {
      const nodeIds = Object.keys(g._nodes);
      const isVertical = g._label?.rankdir === 'TB' || g._label?.rankdir === 'BT' || !g._label?.rankdir;

      // Parse edges from the keys like "a->b"
      const edgePairs = Object.keys(g._edges).map((key) => {
        const [v, w] = key.split('->');
        return { v, w };
      });

      // Build topological levels
      const inDegree = new Map<string, number>();
      nodeIds.forEach((id) => inDegree.set(id, 0));
      edgePairs.forEach((e) => {
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
          edgePairs.filter((e) => e.v === id).forEach((e) => {
            const deg = (inDegree.get(e.w) || 1) - 1;
            inDegree.set(e.w, deg);
            if (deg === 0 && !visited.has(e.w)) next.push(e.w);
          });
        });
        queue = next;
      }
      const unvisited = nodeIds.filter((id) => !visited.has(id));
      if (unvisited.length) levels.push(unvisited);

      // Assign center positions (dagre convention)
      levels.forEach((level, li) => {
        level.forEach((id, ni) => {
          const node = g._nodes[id];
          if (isVertical) {
            node.x = 200 + ni * 300;
            node.y = 200 + li * 200;
          } else {
            node.x = 200 + li * 300;
            node.y = 200 + ni * 200;
          }
        });
      });
    });
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
