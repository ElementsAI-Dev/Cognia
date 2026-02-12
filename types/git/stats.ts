/**
 * Git Stats Types
 *
 * Types for repository statistics dashboard sorting and display.
 */

/** Sortable field in the contributor table */
export type SortField = 'commits' | 'additions' | 'deletions' | 'name';

/** Sort direction */
export type SortDir = 'asc' | 'desc';
