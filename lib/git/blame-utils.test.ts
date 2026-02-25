import {
  groupBlameByCommit,
  getBlameAgeColor,
  formatBlameRelativeDate,
  assignBlameColors,
} from './blame-utils';
import type { BlameBlock } from './blame-utils';
import type { GitBlameLineInfo } from '@/lib/native/git/advanced';

// ==================== Helpers ====================

function makeLine(overrides: Partial<GitBlameLineInfo> = {}): GitBlameLineInfo {
  return {
    lineNumber: 1,
    commitHash: 'abc1234',
    authorName: 'Alice',
    authorEmail: 'alice@test.com',
    authorDate: '2025-01-15T10:00:00Z',
    commitMessage: 'init commit',
    content: 'const x = 1;',
    ...overrides,
  };
}

// ==================== groupBlameByCommit ====================

describe('groupBlameByCommit', () => {
  it('returns empty array for empty input', () => {
    expect(groupBlameByCommit([])).toEqual([]);
  });

  it('creates one block for a single line', () => {
    const lines = [makeLine({ lineNumber: 1 })];
    const blocks = groupBlameByCommit(lines);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(1);
    expect(blocks[0].endLine).toBe(1);
    expect(blocks[0].lines).toHaveLength(1);
  });

  it('merges consecutive lines from the same commit', () => {
    const lines = [
      makeLine({ lineNumber: 1, commitHash: 'aaa' }),
      makeLine({ lineNumber: 2, commitHash: 'aaa' }),
      makeLine({ lineNumber: 3, commitHash: 'aaa' }),
    ];
    const blocks = groupBlameByCommit(lines);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(1);
    expect(blocks[0].endLine).toBe(3);
    expect(blocks[0].lines).toHaveLength(3);
  });

  it('splits blocks when commit hash changes', () => {
    const lines = [
      makeLine({ lineNumber: 1, commitHash: 'aaa' }),
      makeLine({ lineNumber: 2, commitHash: 'bbb' }),
      makeLine({ lineNumber: 3, commitHash: 'aaa' }),
    ];
    const blocks = groupBlameByCommit(lines);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].commitHash).toBe('aaa');
    expect(blocks[1].commitHash).toBe('bbb');
    expect(blocks[2].commitHash).toBe('aaa');
  });

  it('preserves author info in blocks', () => {
    const lines = [
      makeLine({ lineNumber: 1, authorName: 'Bob', authorEmail: 'bob@test.com', commitMessage: 'fix bug' }),
    ];
    const blocks = groupBlameByCommit(lines);
    expect(blocks[0].authorName).toBe('Bob');
    expect(blocks[0].authorEmail).toBe('bob@test.com');
    expect(blocks[0].commitMessage).toBe('fix bug');
  });

  it('handles alternating commits correctly', () => {
    const lines = [
      makeLine({ lineNumber: 1, commitHash: 'aaa' }),
      makeLine({ lineNumber: 2, commitHash: 'bbb' }),
      makeLine({ lineNumber: 3, commitHash: 'aaa' }),
      makeLine({ lineNumber: 4, commitHash: 'bbb' }),
    ];
    const blocks = groupBlameByCommit(lines);
    expect(blocks).toHaveLength(4);
  });
});

// ==================== getBlameAgeColor ====================

describe('getBlameAgeColor', () => {
  const refDate = new Date('2025-06-15T00:00:00Z');

  it('returns first palette color for a commit from today', () => {
    const color = getBlameAgeColor('2025-06-15T00:00:00Z', refDate);
    expect(color).toBe('hsl(210, 70%, 94%)');
  });

  it('returns last palette color for a commit from 1+ years ago', () => {
    const color = getBlameAgeColor('2024-01-01T00:00:00Z', refDate);
    expect(color).toBe('hsl(340, 45%, 94%)');
  });

  it('returns a middle palette color for ~6 months ago', () => {
    // ~183 days → t ≈ 0.50 → idx ≈ 5
    const color = getBlameAgeColor('2024-12-15T00:00:00Z', refDate);
    expect(color).toMatch(/^hsl\(/);
    // Should not be first or last
    expect(color).not.toBe('hsl(210, 70%, 94%)');
    expect(color).not.toBe('hsl(340, 45%, 94%)');
  });

  it('uses current date when now is not provided', () => {
    const color = getBlameAgeColor(new Date().toISOString());
    expect(color).toBe('hsl(210, 70%, 94%)');
  });

  it('clamps future dates to first color', () => {
    const color = getBlameAgeColor('2030-01-01T00:00:00Z', refDate);
    expect(color).toBe('hsl(210, 70%, 94%)');
  });
});

// ==================== formatBlameRelativeDate ====================

describe('formatBlameRelativeDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for a date seconds ago', () => {
    expect(formatBlameRelativeDate('2025-06-15T11:59:50Z')).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(formatBlameRelativeDate('2025-06-15T11:55:00Z')).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatBlameRelativeDate('2025-06-15T09:00:00Z')).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(formatBlameRelativeDate('2025-06-12T12:00:00Z')).toBe('3d ago');
  });

  it('returns months ago', () => {
    expect(formatBlameRelativeDate('2025-03-15T12:00:00Z')).toBe('3mo ago');
  });

  it('returns years ago', () => {
    expect(formatBlameRelativeDate('2023-06-15T12:00:00Z')).toBe('2y ago');
  });
});

// ==================== assignBlameColors ====================

describe('assignBlameColors', () => {
  function makeBlock(hash: string): BlameBlock {
    return {
      commitHash: hash,
      authorName: 'Alice',
      authorEmail: 'alice@test.com',
      authorDate: '2025-01-01',
      commitMessage: 'msg',
      startLine: 1,
      endLine: 1,
      lines: [],
    };
  }

  it('returns empty map for empty blocks', () => {
    expect(assignBlameColors([]).size).toBe(0);
  });

  it('assigns a color to each unique commit hash', () => {
    const blocks = [makeBlock('aaa'), makeBlock('bbb'), makeBlock('ccc')];
    const colors = assignBlameColors(blocks);
    expect(colors.size).toBe(3);
    expect(colors.get('aaa')).toBeDefined();
    expect(colors.get('bbb')).toBeDefined();
    expect(colors.get('ccc')).toBeDefined();
  });

  it('does not duplicate colors for repeated commit hashes', () => {
    const blocks = [makeBlock('aaa'), makeBlock('bbb'), makeBlock('aaa')];
    const colors = assignBlameColors(blocks);
    expect(colors.size).toBe(2);
  });

  it('assigns different colors to different hashes', () => {
    const blocks = [makeBlock('aaa'), makeBlock('bbb')];
    const colors = assignBlameColors(blocks);
    expect(colors.get('aaa')).not.toBe(colors.get('bbb'));
  });

  it('wraps around color palette for many commits', () => {
    const blocks = Array.from({ length: 15 }, (_, i) =>
      makeBlock(`hash${i}`)
    );
    const colors = assignBlameColors(blocks);
    expect(colors.size).toBe(15);
    // Colors should still be valid HSL strings
    for (const c of colors.values()) {
      expect(c).toMatch(/^hsl\(/);
    }
  });
});
