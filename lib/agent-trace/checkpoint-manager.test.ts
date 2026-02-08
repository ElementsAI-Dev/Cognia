import { generateDiffFromContent } from './checkpoint-manager';

describe('checkpoint-manager', () => {
  describe('generateDiffFromContent', () => {
    it('returns no changes for identical content', () => {
      const content = 'line1\nline2\nline3';
      const diff = generateDiffFromContent(content, content);
      expect(diff.hasChanges).toBe(false);
      expect(diff.additions).toBe(0);
      expect(diff.deletions).toBe(0);
    });

    it('detects added lines', () => {
      const original = 'line1\nline2';
      const modified = 'line1\nline2\nline3';
      const diff = generateDiffFromContent(original, modified, 'test.ts');
      expect(diff.hasChanges).toBe(true);
      expect(diff.additions).toBe(1);
      expect(diff.deletions).toBe(0);
      expect(diff.filePath).toBe('test.ts');
    });

    it('detects removed lines', () => {
      const original = 'line1\nline2\nline3';
      const modified = 'line1\nline3';
      const diff = generateDiffFromContent(original, modified);
      expect(diff.hasChanges).toBe(true);
      expect(diff.deletions).toBe(1);
    });

    it('detects modified lines', () => {
      const original = 'line1\nline2\nline3';
      const modified = 'line1\nmodified\nline3';
      const diff = generateDiffFromContent(original, modified);
      expect(diff.hasChanges).toBe(true);
      expect(diff.additions).toBeGreaterThanOrEqual(1);
      expect(diff.deletions).toBeGreaterThanOrEqual(1);
    });

    it('handles empty original content', () => {
      const diff = generateDiffFromContent('', 'new content');
      expect(diff.hasChanges).toBe(true);
      expect(diff.additions).toBeGreaterThan(0);
    });

    it('handles empty modified content', () => {
      const diff = generateDiffFromContent('existing content', '');
      expect(diff.hasChanges).toBe(true);
      expect(diff.deletions).toBeGreaterThan(0);
    });

    it('generates hunks with context lines', () => {
      const original = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
      const lines = original.split('\n');
      lines[10] = 'MODIFIED LINE 11';
      const modified = lines.join('\n');

      const diff = generateDiffFromContent(original, modified);
      expect(diff.hunks.length).toBeGreaterThan(0);

      const hunk = diff.hunks[0];
      expect(hunk.lines.length).toBeGreaterThan(0);

      const contextLines = hunk.lines.filter((l) => l.type === 'context');
      const addLines = hunk.lines.filter((l) => l.type === 'add');
      const removeLines = hunk.lines.filter((l) => l.type === 'remove');

      expect(contextLines.length).toBeGreaterThan(0);
      expect(addLines.length).toBe(1);
      expect(removeLines.length).toBe(1);
    });

    it('handles both empty strings', () => {
      const diff = generateDiffFromContent('', '');
      expect(diff.hasChanges).toBe(false);
    });
  });
});
