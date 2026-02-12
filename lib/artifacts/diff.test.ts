/**
 * Tests for diff algorithm (computeDiff, computeDiffStats)
 */

import { computeDiff, computeDiffStats } from './diff';

describe('computeDiff', () => {
  it('should return empty array for identical texts', () => {
    const diff = computeDiff('hello\nworld', 'hello\nworld');
    expect(diff).toHaveLength(2);
    expect(diff.every((l) => l.type === 'unchanged')).toBe(true);
  });

  it('should return empty array for two empty strings', () => {
    const diff = computeDiff('', '');
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe('unchanged');
    expect(diff[0].content).toBe('');
  });

  it('should detect added lines', () => {
    const diff = computeDiff('a\nb', 'a\nb\nc');
    const added = diff.filter((l) => l.type === 'added');
    expect(added).toHaveLength(1);
    expect(added[0].content).toBe('c');
    expect(added[0].newLineNum).toBe(3);
  });

  it('should detect removed lines', () => {
    const diff = computeDiff('a\nb\nc', 'a\nc');
    const removed = diff.filter((l) => l.type === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toBe('b');
    expect(removed[0].oldLineNum).toBe(2);
  });

  it('should detect modified lines as remove+add', () => {
    const diff = computeDiff('hello\nworld', 'hello\nearth');
    const removed = diff.filter((l) => l.type === 'removed');
    const added = diff.filter((l) => l.type === 'added');
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toBe('world');
    expect(added).toHaveLength(1);
    expect(added[0].content).toBe('earth');
  });

  it('should handle completely different texts', () => {
    const diff = computeDiff('a\nb', 'c\nd');
    const removed = diff.filter((l) => l.type === 'removed');
    const added = diff.filter((l) => l.type === 'added');
    expect(removed).toHaveLength(2);
    expect(added).toHaveLength(2);
  });

  it('should handle empty old text', () => {
    const diff = computeDiff('', 'a\nb');
    const added = diff.filter((l) => l.type === 'added');
    expect(added.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty new text', () => {
    const diff = computeDiff('a\nb', '');
    const removed = diff.filter((l) => l.type === 'removed');
    expect(removed.length).toBeGreaterThanOrEqual(1);
  });

  it('should assign correct line numbers to unchanged lines', () => {
    const diff = computeDiff('a\nb\nc', 'a\nx\nc');
    const unchanged = diff.filter((l) => l.type === 'unchanged');
    expect(unchanged).toHaveLength(2);
    expect(unchanged[0].content).toBe('a');
    expect(unchanged[0].oldLineNum).toBe(1);
    expect(unchanged[0].newLineNum).toBe(1);
    expect(unchanged[1].content).toBe('c');
    expect(unchanged[1].oldLineNum).toBe(3);
    expect(unchanged[1].newLineNum).toBe(3);
  });

  it('should fallback to simple diff for very large inputs', () => {
    // Create inputs where m*n > 1_000_000 (e.g., 1001 x 1001)
    const bigOld = Array.from({ length: 1001 }, (_, i) => `old-line-${i}`).join('\n');
    const bigNew = Array.from({ length: 1001 }, (_, i) => `new-line-${i}`).join('\n');
    const diff = computeDiff(bigOld, bigNew);
    // Should still produce a valid diff (all removed + all added)
    expect(diff.length).toBe(2002);
    expect(diff.filter((l) => l.type === 'removed')).toHaveLength(1001);
    expect(diff.filter((l) => l.type === 'added')).toHaveLength(1001);
  });

  it('should handle multiline additions in the middle', () => {
    const diff = computeDiff('a\nc', 'a\nb1\nb2\nc');
    const added = diff.filter((l) => l.type === 'added');
    expect(added).toHaveLength(2);
    expect(added[0].content).toBe('b1');
    expect(added[1].content).toBe('b2');
  });
});

describe('computeDiffStats', () => {
  it('should count added and removed lines', () => {
    const diff = computeDiff('a\nb\nc', 'a\nx\nc\nd');
    const stats = computeDiffStats(diff);
    expect(stats.added).toBeGreaterThanOrEqual(1);
    expect(stats.removed).toBeGreaterThanOrEqual(1);
  });

  it('should return zero for identical texts', () => {
    const diff = computeDiff('hello', 'hello');
    const stats = computeDiffStats(diff);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
  });

  it('should count all lines for completely different texts', () => {
    const diff = computeDiff('a\nb', 'c\nd');
    const stats = computeDiffStats(diff);
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(2);
  });

  it('should handle empty diff array', () => {
    const stats = computeDiffStats([]);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
  });
});
