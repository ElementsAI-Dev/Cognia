import { parseDiffContent, buildSplitRows } from './diff-parser';
import type { DiffLine } from '@/types/git';

describe('parseDiffContent', () => {
  it('returns empty array for empty input', () => {
    expect(parseDiffContent('')).toEqual([]);
  });

  it('returns empty array for undefined-like input', () => {
    expect(parseDiffContent(null as unknown as string)).toEqual([]);
  });

  it('parses hunk header and extracts line numbers', () => {
    const diff = '@@ -10,5 +20,7 @@ function foo()';
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'header', content: diff });
  });

  it('parses added lines with correct line numbers', () => {
    const diff = '@@ -1,2 +1,3 @@\n+added line';
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: 'add',
      content: 'added line',
      newLineNumber: 1,
    });
  });

  it('parses removed lines with correct line numbers', () => {
    const diff = '@@ -1,2 +1,1 @@\n-removed line';
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: 'remove',
      content: 'removed line',
      oldLineNumber: 1,
    });
  });

  it('parses context lines with both line numbers', () => {
    const diff = '@@ -1,3 +1,3 @@\n context line';
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: 'context',
      content: 'context line',
      oldLineNumber: 1,
      newLineNumber: 1,
    });
  });

  it('skips diff metadata lines (diff, index, ---, +++)', () => {
    const diff = [
      'diff --git a/file.ts b/file.ts',
      'index abc123..def456 100644',
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -1,2 +1,2 @@',
      '-old',
      '+new',
    ].join('\n');
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(3); // header, remove, add
    expect(result[0].type).toBe('header');
    expect(result[1].type).toBe('remove');
    expect(result[2].type).toBe('add');
  });

  it('handles multiple hunks with correct line number continuity', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' unchanged',
      '-old line 2',
      '+new line 2',
      '@@ -10,2 +10,2 @@',
      ' unchanged at 10',
      '-old line 11',
      '+new line 11',
    ].join('\n');
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(8);

    // First hunk context
    expect(result[1]).toMatchObject({ type: 'context', oldLineNumber: 1, newLineNumber: 1 });
    // First hunk remove
    expect(result[2]).toMatchObject({ type: 'remove', oldLineNumber: 2 });
    // First hunk add
    expect(result[3]).toMatchObject({ type: 'add', newLineNumber: 2 });

    // Second hunk header resets line numbers
    expect(result[4].type).toBe('header');
    // Second hunk context
    expect(result[5]).toMatchObject({ type: 'context', oldLineNumber: 10, newLineNumber: 10 });
  });

  it('increments line numbers correctly for consecutive adds/removes', () => {
    const diff = [
      '@@ -5,3 +5,4 @@',
      '-line A',
      '-line B',
      '+line C',
      '+line D',
      '+line E',
    ].join('\n');
    const result = parseDiffContent(diff);

    // 2 removes at old lines 5,6
    expect(result[1]).toMatchObject({ type: 'remove', oldLineNumber: 5 });
    expect(result[2]).toMatchObject({ type: 'remove', oldLineNumber: 6 });

    // 3 adds at new lines 5,6,7
    expect(result[3]).toMatchObject({ type: 'add', newLineNumber: 5 });
    expect(result[4]).toMatchObject({ type: 'add', newLineNumber: 6 });
    expect(result[5]).toMatchObject({ type: 'add', newLineNumber: 7 });
  });

  it('handles hunk header without comma (single line change)', () => {
    const diff = '@@ -1 +1 @@\n-old\n+new';
    const result = parseDiffContent(diff);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('header');
    expect(result[1]).toMatchObject({ type: 'remove', oldLineNumber: 1 });
    expect(result[2]).toMatchObject({ type: 'add', newLineNumber: 1 });
  });
});

describe('buildSplitRows', () => {
  it('returns empty array for empty input', () => {
    expect(buildSplitRows([])).toEqual([]);
  });

  it('places header lines on both sides', () => {
    const header: DiffLine = { type: 'header', content: '@@ -1,2 +1,2 @@' };
    const rows = buildSplitRows([header]);
    expect(rows).toHaveLength(1);
    expect(rows[0].left).toBe(header);
    expect(rows[0].right).toBe(header);
  });

  it('places context lines on both sides', () => {
    const ctx: DiffLine = { type: 'context', content: 'same', oldLineNumber: 1, newLineNumber: 1 };
    const rows = buildSplitRows([ctx]);
    expect(rows).toHaveLength(1);
    expect(rows[0].left).toBe(ctx);
    expect(rows[0].right).toBe(ctx);
  });

  it('pairs consecutive removes and adds side by side', () => {
    const lines: DiffLine[] = [
      { type: 'remove', content: 'old1', oldLineNumber: 1 },
      { type: 'remove', content: 'old2', oldLineNumber: 2 },
      { type: 'add', content: 'new1', newLineNumber: 1 },
      { type: 'add', content: 'new2', newLineNumber: 2 },
    ];
    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(2);
    expect(rows[0].left?.content).toBe('old1');
    expect(rows[0].right?.content).toBe('new1');
    expect(rows[1].left?.content).toBe('old2');
    expect(rows[1].right?.content).toBe('new2');
  });

  it('handles more removes than adds (null on right)', () => {
    const lines: DiffLine[] = [
      { type: 'remove', content: 'old1', oldLineNumber: 1 },
      { type: 'remove', content: 'old2', oldLineNumber: 2 },
      { type: 'add', content: 'new1', newLineNumber: 1 },
    ];
    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(2);
    expect(rows[0].left?.content).toBe('old1');
    expect(rows[0].right?.content).toBe('new1');
    expect(rows[1].left?.content).toBe('old2');
    expect(rows[1].right).toBeNull();
  });

  it('handles more adds than removes (null on left)', () => {
    const lines: DiffLine[] = [
      { type: 'remove', content: 'old1', oldLineNumber: 1 },
      { type: 'add', content: 'new1', newLineNumber: 1 },
      { type: 'add', content: 'new2', newLineNumber: 2 },
    ];
    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(2);
    expect(rows[0].left?.content).toBe('old1');
    expect(rows[0].right?.content).toBe('new1');
    expect(rows[1].left).toBeNull();
    expect(rows[1].right?.content).toBe('new2');
  });

  it('handles standalone adds (no preceding remove)', () => {
    const lines: DiffLine[] = [
      { type: 'add', content: 'new line', newLineNumber: 5 },
    ];
    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(1);
    expect(rows[0].left).toBeNull();
    expect(rows[0].right?.content).toBe('new line');
  });

  it('handles mixed sequence of context, remove, add', () => {
    const lines: DiffLine[] = [
      { type: 'context', content: 'same', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'remove', content: 'old', oldLineNumber: 2 },
      { type: 'add', content: 'new', newLineNumber: 2 },
      { type: 'context', content: 'same2', oldLineNumber: 3, newLineNumber: 3 },
    ];
    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(3);
    expect(rows[0].left?.content).toBe('same');
    expect(rows[0].right?.content).toBe('same');
    expect(rows[1].left?.content).toBe('old');
    expect(rows[1].right?.content).toBe('new');
    expect(rows[2].left?.content).toBe('same2');
    expect(rows[2].right?.content).toBe('same2');
  });
});
