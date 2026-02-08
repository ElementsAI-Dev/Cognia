/**
 * Tests for SubAgent dependency graph walker and topological sort
 */

import { topologicalSort } from './sub-agent-executor';
import type { SubAgent } from '@/types/agent/sub-agent';

/**
 * Helper to create a minimal SubAgent for testing
 */
function createTestSubAgent(
  id: string,
  order: number,
  dependencies: string[] = []
): SubAgent {
  return {
    id,
    name: `Agent ${id}`,
    parentAgentId: 'parent-1',
    task: `Task for ${id}`,
    status: 'pending',
    order,
    config: {
      maxSteps: 10,
      summarizeResults: false,
      dependencies,
    },
    steps: [],
    logs: [],
    retryCount: 0,
    progress: 0,
    createdAt: new Date(),
  } as SubAgent;
}

describe('topologicalSort', () => {
  it('should handle empty input', () => {
    const result = topologicalSort([]);
    expect(result).toEqual([]);
  });

  it('should handle single agent', () => {
    const agent = createTestSubAgent('a', 0);
    const layers = topologicalSort([agent]);

    expect(layers).toHaveLength(1);
    expect(layers[0]).toHaveLength(1);
    expect(layers[0][0].id).toBe('a');
  });

  it('should handle independent agents (all in one layer)', () => {
    const agents = [
      createTestSubAgent('a', 0),
      createTestSubAgent('b', 1),
      createTestSubAgent('c', 2),
    ];
    const layers = topologicalSort(agents);

    expect(layers).toHaveLength(1);
    expect(layers[0]).toHaveLength(3);
  });

  it('should handle linear dependency chain', () => {
    // a -> b -> c
    const agents = [
      createTestSubAgent('a', 0),
      createTestSubAgent('b', 1, ['a']),
      createTestSubAgent('c', 2, ['b']),
    ];
    const layers = topologicalSort(agents);

    expect(layers).toHaveLength(3);
    expect(layers[0].map(a => a.id)).toEqual(['a']);
    expect(layers[1].map(a => a.id)).toEqual(['b']);
    expect(layers[2].map(a => a.id)).toEqual(['c']);
  });

  it('should handle diamond dependency', () => {
    //     a
    //    / \
    //   b   c
    //    \ /
    //     d
    const agents = [
      createTestSubAgent('a', 0),
      createTestSubAgent('b', 1, ['a']),
      createTestSubAgent('c', 2, ['a']),
      createTestSubAgent('d', 3, ['b', 'c']),
    ];
    const layers = topologicalSort(agents);

    expect(layers).toHaveLength(3);
    expect(layers[0].map(a => a.id)).toEqual(['a']);
    expect(layers[1].map(a => a.id).sort()).toEqual(['b', 'c']);
    expect(layers[2].map(a => a.id)).toEqual(['d']);
  });

  it('should handle complex multi-level dependencies', () => {
    // a, b (independent)
    // c depends on a
    // d depends on a and b
    // e depends on c and d
    const agents = [
      createTestSubAgent('a', 0),
      createTestSubAgent('b', 1),
      createTestSubAgent('c', 2, ['a']),
      createTestSubAgent('d', 3, ['a', 'b']),
      createTestSubAgent('e', 4, ['c', 'd']),
    ];
    const layers = topologicalSort(agents);

    expect(layers).toHaveLength(3);
    // Layer 0: a, b (no deps)
    expect(layers[0].map(a => a.id).sort()).toEqual(['a', 'b']);
    // Layer 1: c, d (deps met by layer 0)
    expect(layers[1].map(a => a.id).sort()).toEqual(['c', 'd']);
    // Layer 2: e (deps met by layer 1)
    expect(layers[2].map(a => a.id)).toEqual(['e']);
  });

  it('should handle dependencies on non-existent agents (ignore them)', () => {
    const agents = [
      createTestSubAgent('a', 0, ['nonexistent']),
      createTestSubAgent('b', 1, ['a']),
    ];
    const layers = topologicalSort(agents);

    // 'nonexistent' is not in the agent list, so 'a' has no in-graph deps
    expect(layers).toHaveLength(2);
    expect(layers[0].map(a => a.id)).toEqual(['a']);
    expect(layers[1].map(a => a.id)).toEqual(['b']);
  });

  it('should detect cycles and append cyclic agents', () => {
    // a -> b -> a (cycle)
    const agents = [
      createTestSubAgent('a', 0, ['b']),
      createTestSubAgent('b', 1, ['a']),
    ];
    const layers = topologicalSort(agents);

    // Both have in-degree > 0, so they can't be in the initial queue
    // They should be appended as cyclic
    expect(layers).toHaveLength(1);
    expect(layers[0]).toHaveLength(2);
  });

  it('should sort agents within layers by order', () => {
    const agents = [
      createTestSubAgent('c', 2),
      createTestSubAgent('a', 0),
      createTestSubAgent('b', 1),
    ];
    const layers = topologicalSort(agents);

    expect(layers).toHaveLength(1);
    expect(layers[0].map(a => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('should handle partial dependency (some in cycle, some not)', () => {
    // a -> b -> c -> b (b and c cycle, a is free)
    const agents = [
      createTestSubAgent('a', 0),
      createTestSubAgent('b', 1, ['c']),
      createTestSubAgent('c', 2, ['b']),
      createTestSubAgent('d', 3, ['a']),
    ];
    const layers = topologicalSort(agents);

    // a and d can proceed normally, b and c are cyclic
    const allIds = layers.flat().map(a => a.id);
    expect(allIds).toContain('a');
    expect(allIds).toContain('b');
    expect(allIds).toContain('c');
    expect(allIds).toContain('d');
  });

  it('should handle wide tree (many children of one parent)', () => {
    const agents = [
      createTestSubAgent('root', 0),
      createTestSubAgent('c1', 1, ['root']),
      createTestSubAgent('c2', 2, ['root']),
      createTestSubAgent('c3', 3, ['root']),
      createTestSubAgent('c4', 4, ['root']),
      createTestSubAgent('c5', 5, ['root']),
    ];
    const layers = topologicalSort(agents);

    expect(layers).toHaveLength(2);
    expect(layers[0].map(a => a.id)).toEqual(['root']);
    expect(layers[1]).toHaveLength(5);
  });
});
