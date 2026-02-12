import { computeWordDiff, computeSimilarity } from './diff';

describe('arena diff utilities', () => {
  describe('computeWordDiff', () => {
    it('should return all common for identical texts', () => {
      const { diffA, diffB } = computeWordDiff('hello world', 'hello world');
      expect(diffA.every((s) => s.type === 'common')).toBe(true);
      expect(diffB.every((s) => s.type === 'common')).toBe(true);
    });

    it('should detect added words in B', () => {
      const { diffB } = computeWordDiff('hello', 'hello world');
      const addedSegments = diffB.filter((s) => s.type === 'added');
      expect(addedSegments.length).toBeGreaterThan(0);
      const addedText = addedSegments.map((s) => s.text.trim()).join(' ');
      expect(addedText).toContain('world');
    });

    it('should detect removed words in A', () => {
      const { diffA } = computeWordDiff('hello world', 'hello');
      const removedSegments = diffA.filter((s) => s.type === 'removed');
      expect(removedSegments.length).toBeGreaterThan(0);
      const removedText = removedSegments.map((s) => s.text.trim()).join(' ');
      expect(removedText).toContain('world');
    });

    it('should handle empty strings', () => {
      const { diffA, diffB } = computeWordDiff('', '');
      // ''.split(/(\s+)/) produces [''], so we get a single common segment with empty text
      expect(diffA).toHaveLength(1);
      expect(diffA[0].type).toBe('common');
      expect(diffB).toHaveLength(1);
      expect(diffB[0].type).toBe('common');
    });

    it('should handle one empty string', () => {
      const { diffA, diffB } = computeWordDiff('hello', '');
      expect(diffA.length).toBeGreaterThan(0);
      expect(diffA[0].type).toBe('removed');
      // ''.split(/(\s+)/) produces [''], so diffB has 1 added segment
      expect(diffB).toHaveLength(1);
      expect(diffB[0].type).toBe('added');
    });

    it('should handle completely different texts', () => {
      const { diffA, diffB } = computeWordDiff('aaa bbb', 'ccc ddd');
      const removedInA = diffA.filter((s) => s.type === 'removed');
      const addedInB = diffB.filter((s) => s.type === 'added');
      expect(removedInA.length).toBeGreaterThan(0);
      expect(addedInB.length).toBeGreaterThan(0);
    });

    it('should merge consecutive segments of the same type', () => {
      const { diffA } = computeWordDiff('a b c', 'x y z');
      // All words are different so they should be merged into fewer segments
      for (let i = 1; i < diffA.length; i++) {
        if (diffA[i].type === diffA[i - 1].type) {
          // If two adjacent segments have the same type, they should be merged
          // This shouldn't happen if merging works correctly
          fail('Adjacent segments should be merged');
        }
      }
    });

    it('should handle whitespace-only differences', () => {
      const result = computeWordDiff('hello  world', 'hello world');
      // Both should produce segments (whitespace is part of split)
      expect(result.diffA.length).toBeGreaterThan(0);
      expect(result.diffB.length).toBeGreaterThan(0);
    });
  });

  describe('computeSimilarity', () => {
    it('should return 100 for identical texts', () => {
      expect(computeSimilarity('hello world', 'hello world')).toBe(100);
    });

    it('should return 100 for two empty strings', () => {
      expect(computeSimilarity('', '')).toBe(100);
    });

    it('should return 0 for completely different texts', () => {
      expect(computeSimilarity('aaa bbb', 'ccc ddd')).toBe(0);
    });

    it('should return partial similarity for overlapping texts', () => {
      const similarity = computeSimilarity('hello world foo', 'hello world bar');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(100);
    });

    it('should be case insensitive', () => {
      expect(computeSimilarity('Hello World', 'hello world')).toBe(100);
    });

    it('should handle single word overlap', () => {
      const similarity = computeSimilarity('hello', 'hello world');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(100);
    });
  });
});
