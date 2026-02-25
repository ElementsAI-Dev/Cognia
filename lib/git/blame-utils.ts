/**
 * Blame Utilities
 *
 * Helpers for grouping, coloring, and formatting git blame data
 * used by the GitBlameViewer component.
 */

import type { GitBlameLineInfo } from '@/lib/native/git/advanced';

// ==================== Types ====================

export interface BlameBlock {
  commitHash: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  commitMessage: string;
  startLine: number;
  endLine: number;
  lines: GitBlameLineInfo[];
}

// ==================== Grouping ====================

/**
 * Group consecutive blame lines by commit hash into blocks.
 * Lines from the same commit that are adjacent merge into one block.
 */
export function groupBlameByCommit(lines: GitBlameLineInfo[]): BlameBlock[] {
  if (lines.length === 0) return [];

  const blocks: BlameBlock[] = [];
  let current: BlameBlock | null = null;

  for (const line of lines) {
    if (current && current.commitHash === line.commitHash) {
      current.endLine = line.lineNumber;
      current.lines.push(line);
    } else {
      if (current) blocks.push(current);
      current = {
        commitHash: line.commitHash,
        authorName: line.authorName,
        authorEmail: line.authorEmail,
        authorDate: line.authorDate,
        commitMessage: line.commitMessage,
        startLine: line.lineNumber,
        endLine: line.lineNumber,
        lines: [line],
      };
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

// ==================== Age Coloring ====================

const BLAME_PALETTE = [
  'hsl(210, 70%, 94%)',
  'hsl(200, 65%, 90%)',
  'hsl(180, 55%, 88%)',
  'hsl(160, 50%, 86%)',
  'hsl(140, 45%, 84%)',
  'hsl(80, 40%, 86%)',
  'hsl(40, 50%, 88%)',
  'hsl(20, 55%, 90%)',
  'hsl(0, 50%, 92%)',
  'hsl(340, 45%, 94%)',
];

/**
 * Compute a background color based on commit age.
 * Recent commits are warm (red/orange), old commits are cool (blue).
 */
export function getBlameAgeColor(commitDate: string, now?: Date): string {
  const ref = now ?? new Date();
  const date = new Date(commitDate);
  const diffMs = ref.getTime() - date.getTime();
  const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

  // Map days to a 0–1 scale (0 = today, 1 = 1 year+)
  const t = Math.min(diffDays / 365, 1);
  const idx = Math.min(Math.floor(t * BLAME_PALETTE.length), BLAME_PALETTE.length - 1);
  return BLAME_PALETTE[idx];
}

// ==================== Date Formatting ====================

/**
 * Format an ISO date into a human-readable relative string.
 */
export function formatBlameRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// ==================== Commit Color Assignment ====================

const COMMIT_COLORS = [
  'hsl(210, 80%, 95%)',
  'hsl(150, 70%, 93%)',
  'hsl(30, 85%, 94%)',
  'hsl(280, 65%, 94%)',
  'hsl(0, 75%, 95%)',
  'hsl(180, 65%, 93%)',
  'hsl(60, 75%, 93%)',
  'hsl(330, 65%, 95%)',
  'hsl(120, 60%, 93%)',
  'hsl(240, 60%, 95%)',
];

/**
 * Assign a unique background color to each commit hash for visual grouping.
 */
export function assignBlameColors(blocks: BlameBlock[]): Map<string, string> {
  const colors = new Map<string, string>();
  let idx = 0;

  for (const block of blocks) {
    if (!colors.has(block.commitHash)) {
      colors.set(block.commitHash, COMMIT_COLORS[idx % COMMIT_COLORS.length]);
      idx++;
    }
  }

  return colors;
}
