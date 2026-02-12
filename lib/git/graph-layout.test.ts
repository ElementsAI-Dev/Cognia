import {
  assignLanes,
  LANE_WIDTH,
  NODE_RADIUS,
  ROW_HEIGHT,
  SVG_PADDING_LEFT,
  SVG_PADDING_TOP,
  LANE_COLORS,
} from './graph-layout';
import type { GitGraphCommit } from '@/types/system/git';

function makeCommit(
  hash: string,
  parents: string[] = [],
  overrides: Partial<GitGraphCommit> = {}
): GitGraphCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    message: `commit ${hash}`,
    author: 'test',
    authorEmail: 'test@example.com',
    date: '2025-01-01',
    parents,
    refs: [],
    lane: 0,
    ...overrides,
  };
}

describe('graph-layout constants', () => {
  it('exports expected constant values', () => {
    expect(LANE_WIDTH).toBe(20);
    expect(NODE_RADIUS).toBe(5);
    expect(ROW_HEIGHT).toBe(32);
    expect(SVG_PADDING_LEFT).toBe(10);
    expect(SVG_PADDING_TOP).toBe(16);
  });

  it('exports 8 lane colors', () => {
    expect(LANE_COLORS).toHaveLength(8);
    LANE_COLORS.forEach((color) => {
      expect(color).toMatch(/^hsl\(/);
    });
  });
});

describe('assignLanes', () => {
  it('returns empty result for empty input', () => {
    const result = assignLanes([]);
    expect(result).toEqual({ commits: [], maxLane: 0 });
  });

  it('assigns lane 0 to a single commit', () => {
    const commits = [makeCommit('a')];
    const result = assignLanes(commits);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].lane).toBe(0);
    expect(result.maxLane).toBe(0);
  });

  it('assigns all commits to lane 0 for linear history', () => {
    const commits = [
      makeCommit('c', ['b']),
      makeCommit('b', ['a']),
      makeCommit('a'),
    ];
    const result = assignLanes(commits);
    expect(result.commits.every((c) => c.lane === 0)).toBe(true);
    expect(result.maxLane).toBe(0);
  });

  it('assigns different lanes for branching', () => {
    // c merges b1 and b2 (two parents)
    // b1 and b2 both have parent a
    const commits = [
      makeCommit('c', ['b1', 'b2']),
      makeCommit('b1', ['a']),
      makeCommit('b2', ['a']),
      makeCommit('a'),
    ];
    const result = assignLanes(commits);
    // c is on lane 0, b1 continues on lane 0, b2 should be on a different lane
    expect(result.commits[0].lane).toBe(0); // c
    expect(result.commits[1].lane).toBe(0); // b1 (first parent)
    expect(result.commits[2].lane).not.toBe(result.commits[1].lane); // b2 on different lane
    expect(result.maxLane).toBeGreaterThan(0);
  });

  it('handles commits with unknown parents (not in the list)', () => {
    const commits = [
      makeCommit('b', ['unknown-parent']),
      makeCommit('a'),
    ];
    // Should not throw
    const result = assignLanes(commits);
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0].lane).toBe(0);
  });

  it('preserves commit data while adding lane', () => {
    const commits = [
      makeCommit('abc', ['def'], { message: 'test msg', author: 'alice', refs: ['main'] }),
    ];
    const result = assignLanes(commits);
    expect(result.commits[0].hash).toBe('abc');
    expect(result.commits[0].message).toBe('test msg');
    expect(result.commits[0].author).toBe('alice');
    expect(result.commits[0].refs).toEqual(['main']);
  });

  it('handles multiple merge commits', () => {
    const commits = [
      makeCommit('d', ['c', 'b2']),
      makeCommit('c', ['b1']),
      makeCommit('b2', ['a']),
      makeCommit('b1', ['a']),
      makeCommit('a'),
    ];
    const result = assignLanes(commits);
    expect(result.commits).toHaveLength(5);
    // All commits should have valid lane numbers
    result.commits.forEach((c) => {
      expect(c.lane).toBeGreaterThanOrEqual(0);
    });
  });
});
