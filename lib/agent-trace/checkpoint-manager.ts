/**
 * Checkpoint Manager for Agent Trace
 *
 * Provides automatic file snapshots before agent modifications,
 * enabling one-click rollback of agent changes (inspired by Cursor's checkpoint system).
 *
 * Features:
 * - Auto-snapshot files before agent writes
 * - Per-session checkpoint management
 * - Unified diff generation between original and modified content
 * - Rollback to any checkpoint
 */

import { nanoid } from 'nanoid';
import db from '@/lib/db/schema';
import type { DBCheckpoint } from '@/lib/db/schema';

/** Maximum checkpoints per session to prevent excessive storage */
const MAX_CHECKPOINTS_PER_SESSION = 200;

/** Maximum total checkpoints across all sessions */
const MAX_TOTAL_CHECKPOINTS = 2000;

/**
 * Unified diff line type
 */
export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Unified diff hunk
 */
export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

/**
 * File diff result
 */
export interface FileDiff {
  filePath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  hasChanges: boolean;
}

/**
 * Session checkpoint summary
 */
export interface SessionCheckpointSummary {
  sessionId: string;
  checkpointCount: number;
  filesAffected: string[];
  firstCheckpointAt: Date;
  lastCheckpointAt: Date;
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Create a checkpoint before an agent modifies a file.
 * Stores the original content so it can be restored later.
 */
export async function createCheckpoint(
  sessionId: string,
  traceId: string,
  filePath: string,
  originalContent: string,
  modifiedContent?: string,
  modelId?: string
): Promise<string> {
  const id = nanoid();
  const now = new Date();

  const checkpoint: DBCheckpoint = {
    id,
    sessionId,
    traceId,
    filePath,
    originalContent,
    modifiedContent: modifiedContent ?? null,
    modelId: modelId ?? null,
    timestamp: now,
    createdAt: now,
  };

  await db.checkpoints.add(checkpoint);

  // Enforce per-session limit
  await enforceSessionLimit(sessionId);

  // Enforce total limit
  await enforceTotalLimit();

  return id;
}

/**
 * Update a checkpoint with the modified content after the agent finishes writing.
 */
export async function updateCheckpointModifiedContent(
  checkpointId: string,
  modifiedContent: string
): Promise<void> {
  await db.checkpoints.update(checkpointId, { modifiedContent });
}

/**
 * Get all checkpoints for a session, ordered by timestamp.
 */
export async function getSessionCheckpoints(sessionId: string): Promise<DBCheckpoint[]> {
  return db.checkpoints
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp');
}

/**
 * Get a single checkpoint by ID.
 */
export async function getCheckpoint(checkpointId: string): Promise<DBCheckpoint | undefined> {
  return db.checkpoints.get(checkpointId);
}

/**
 * Get the latest checkpoint for a specific file in a session.
 */
export async function getLatestFileCheckpoint(
  sessionId: string,
  filePath: string
): Promise<DBCheckpoint | undefined> {
  const checkpoints = await db.checkpoints
    .where('[sessionId+filePath]')
    .equals([sessionId, filePath])
    .sortBy('timestamp');

  return checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : undefined;
}

/**
 * Get all unique sessions that have checkpoints.
 */
export async function getCheckpointSessions(): Promise<string[]> {
  const all = await db.checkpoints.orderBy('sessionId').uniqueKeys();
  return all as string[];
}

/**
 * Get a summary of checkpoints for a session.
 */
export async function getSessionCheckpointSummary(
  sessionId: string
): Promise<SessionCheckpointSummary | null> {
  const checkpoints = await getSessionCheckpoints(sessionId);
  if (checkpoints.length === 0) return null;

  const filesAffected = [...new Set(checkpoints.map((c) => c.filePath))];
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const cp of checkpoints) {
    if (cp.modifiedContent) {
      const diff = generateDiffFromContent(cp.originalContent, cp.modifiedContent);
      totalAdditions += diff.additions;
      totalDeletions += diff.deletions;
    }
  }

  return {
    sessionId,
    checkpointCount: checkpoints.length,
    filesAffected,
    firstCheckpointAt: checkpoints[0].timestamp,
    lastCheckpointAt: checkpoints[checkpoints.length - 1].timestamp,
    totalAdditions,
    totalDeletions,
  };
}

/**
 * Generate a unified diff for a checkpoint.
 */
export async function generateDiff(checkpointId: string): Promise<FileDiff | null> {
  const checkpoint = await getCheckpoint(checkpointId);
  if (!checkpoint) return null;

  const modified = checkpoint.modifiedContent ?? '';
  return generateDiffFromContent(checkpoint.originalContent, modified, checkpoint.filePath);
}

/**
 * Generate a unified diff from two content strings.
 */
export function generateDiffFromContent(
  original: string,
  modified: string,
  filePath = 'file'
): FileDiff {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');

  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  // Simple line-by-line diff using LCS approach
  const lcs = computeLCS(oldLines, newLines);
  const diffOps = buildDiffOps(oldLines, newLines, lcs);

  // Group diff operations into hunks with context
  const CONTEXT_LINES = 3;
  let currentHunk: DiffHunk | null = null;
  let oldIdx = 0;
  let newIdx = 0;

  for (let i = 0; i < diffOps.length; i++) {
    const op = diffOps[i];

    if (op.type === 'equal') {
      // Check if we need to close the current hunk
      if (currentHunk) {
        // Add trailing context
        const trailingCount = Math.min(CONTEXT_LINES, countConsecutiveEquals(diffOps, i));
        for (let j = 0; j < trailingCount; j++) {
          currentHunk.lines.push({
            type: 'context',
            content: oldLines[oldIdx + j],
            oldLineNumber: oldIdx + j + 1,
            newLineNumber: newIdx + j + 1,
          });
          currentHunk.oldCount++;
          currentHunk.newCount++;
        }

        // Check if the next change is far enough to close the hunk
        const nextChangeIdx = findNextChange(diffOps, i + trailingCount);
        if (nextChangeIdx === -1 || nextChangeIdx - (i + trailingCount) > CONTEXT_LINES * 2) {
          hunks.push(currentHunk);
          currentHunk = null;
        } else {
          // Add bridging context
          for (let j = trailingCount; j < nextChangeIdx - i; j++) {
            currentHunk.lines.push({
              type: 'context',
              content: oldLines[oldIdx + j],
              oldLineNumber: oldIdx + j + 1,
              newLineNumber: newIdx + j + 1,
            });
            currentHunk.oldCount++;
            currentHunk.newCount++;
          }
        }
      }
      oldIdx++;
      newIdx++;
    } else if (op.type === 'delete') {
      if (!currentHunk) {
        // Start new hunk with leading context
        const contextStart = Math.max(0, oldIdx - CONTEXT_LINES);
        currentHunk = {
          oldStart: contextStart + 1,
          oldCount: 0,
          newStart: Math.max(0, newIdx - CONTEXT_LINES) + 1,
          newCount: 0,
          lines: [],
        };
        for (let j = contextStart; j < oldIdx; j++) {
          currentHunk.lines.push({
            type: 'context',
            content: oldLines[j],
            oldLineNumber: j + 1,
            newLineNumber: newIdx - (oldIdx - j) + 1,
          });
          currentHunk.oldCount++;
          currentHunk.newCount++;
        }
      }
      currentHunk.lines.push({
        type: 'remove',
        content: oldLines[oldIdx],
        oldLineNumber: oldIdx + 1,
      });
      currentHunk.oldCount++;
      deletions++;
      oldIdx++;
    } else if (op.type === 'insert') {
      if (!currentHunk) {
        const contextStart = Math.max(0, oldIdx - CONTEXT_LINES);
        currentHunk = {
          oldStart: contextStart + 1,
          oldCount: 0,
          newStart: Math.max(0, newIdx - CONTEXT_LINES) + 1,
          newCount: 0,
          lines: [],
        };
        for (let j = contextStart; j < oldIdx; j++) {
          currentHunk.lines.push({
            type: 'context',
            content: oldLines[j],
            oldLineNumber: j + 1,
            newLineNumber: newIdx - (oldIdx - j) + 1,
          });
          currentHunk.oldCount++;
          currentHunk.newCount++;
        }
      }
      currentHunk.lines.push({
        type: 'add',
        content: newLines[newIdx],
        newLineNumber: newIdx + 1,
      });
      currentHunk.newCount++;
      additions++;
      newIdx++;
    }
  }

  // Close final hunk
  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return {
    filePath,
    hunks,
    additions,
    deletions,
    hasChanges: additions > 0 || deletions > 0,
  };
}

/**
 * Delete a checkpoint by ID.
 */
export async function deleteCheckpoint(checkpointId: string): Promise<void> {
  await db.checkpoints.delete(checkpointId);
}

/**
 * Delete all checkpoints for a session.
 */
export async function deleteSessionCheckpoints(sessionId: string): Promise<number> {
  return db.checkpoints.where('sessionId').equals(sessionId).delete();
}

/**
 * Delete all checkpoints.
 */
export async function deleteAllCheckpoints(): Promise<void> {
  await db.checkpoints.clear();
}

/**
 * Count total checkpoints.
 */
export async function countCheckpoints(): Promise<number> {
  return db.checkpoints.count();
}

// --- Internal helpers ---

interface DiffOp {
  type: 'equal' | 'delete' | 'insert';
}

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function buildDiffOps(a: string[], b: string[], dp: number[][]): DiffOp[] {
  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'insert' });
      j--;
    } else {
      ops.unshift({ type: 'delete' });
      i--;
    }
  }

  return ops;
}

function countConsecutiveEquals(ops: DiffOp[], startIdx: number): number {
  let count = 0;
  for (let i = startIdx; i < ops.length && ops[i].type === 'equal'; i++) {
    count++;
  }
  return count;
}

function findNextChange(ops: DiffOp[], startIdx: number): number {
  for (let i = startIdx; i < ops.length; i++) {
    if (ops[i].type !== 'equal') return i;
  }
  return -1;
}

async function enforceSessionLimit(sessionId: string): Promise<void> {
  const count = await db.checkpoints.where('sessionId').equals(sessionId).count();
  if (count <= MAX_CHECKPOINTS_PER_SESSION) return;

  const excess = count - MAX_CHECKPOINTS_PER_SESSION;
  const oldest = await db.checkpoints
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp');

  const idsToDelete = oldest.slice(0, excess).map((c) => c.id);
  await db.checkpoints.bulkDelete(idsToDelete);
}

async function enforceTotalLimit(): Promise<void> {
  const total = await db.checkpoints.count();
  if (total <= MAX_TOTAL_CHECKPOINTS) return;

  const excess = total - MAX_TOTAL_CHECKPOINTS;
  const oldest = await db.checkpoints.orderBy('timestamp').limit(excess).toArray();
  const idsToDelete = oldest.map((c) => c.id);
  await db.checkpoints.bulkDelete(idsToDelete);
}
