/**
 * Git Diff Types
 *
 * Types for parsing and rendering Git diffs in unified and split views.
 */

/** Diff view display mode */
export type DiffViewMode = 'unified' | 'split';

/** A single parsed line from a Git diff */
export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/** A row in split (side-by-side) diff view */
export interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
}
