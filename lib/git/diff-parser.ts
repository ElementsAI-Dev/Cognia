/**
 * Git Diff Parser
 *
 * Pure utility functions for parsing raw Git diff content
 * into structured formats for unified and split view rendering.
 */

import type { DiffLine, SplitRow } from '@/types/git';

/**
 * Parse a raw Git diff string into structured DiffLine objects.
 * Each line includes its type (add/remove/context/header) and line numbers.
 */
export function parseDiffContent(content: string): DiffLine[] {
  if (!content) return [];

  const lines = content.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLine++,
      });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({
        type: 'remove',
        content: line.slice(1),
        oldLineNumber: oldLine++,
      });
    } else if (
      !line.startsWith('diff ') &&
      !line.startsWith('index ') &&
      !line.startsWith('---') &&
      !line.startsWith('+++')
    ) {
      result.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    }
  }

  return result;
}

/**
 * Transform parsed DiffLine array into SplitRow objects
 * for side-by-side (split) diff view rendering.
 *
 * Intelligently pairs consecutive additions and removals,
 * and handles context and header lines.
 */
export function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'header') {
      rows.push({ left: line, right: line });
      i++;
    } else if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i++;
    } else if (line.type === 'remove') {
      // Collect consecutive removes
      const removes: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'remove') {
        removes.push(lines[i]);
        i++;
      }
      // Collect consecutive adds
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'add') {
        adds.push(lines[i]);
        i++;
      }
      // Pair them up
      const maxLen = Math.max(removes.length, adds.length);
      for (let j = 0; j < maxLen; j++) {
        rows.push({
          left: j < removes.length ? removes[j] : null,
          right: j < adds.length ? adds[j] : null,
        });
      }
    } else if (line.type === 'add') {
      rows.push({ left: null, right: line });
      i++;
    } else {
      i++;
    }
  }
  return rows;
}
