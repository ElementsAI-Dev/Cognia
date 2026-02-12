/**
 * Canvas Panel Types - UI-specific types for Canvas components
 */

import type { CanvasActionType } from '@/lib/ai/generation/canvas-actions';

/**
 * Canvas action item configuration (used in toolbar)
 */
export interface CanvasActionItem {
  type: CanvasActionType;
  labelKey: string;
  icon: string;
  shortcut?: string;
}

/**
 * Diff line for version comparison views
 */
export interface CanvasDiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: { old?: number; new?: number };
}

/**
 * Sort field options for document list
 */
export type DocumentSortField = 'title' | 'updatedAt' | 'language';

/**
 * Sort order options for document list
 */
export type DocumentSortOrder = 'asc' | 'desc';

/**
 * Format action mapping for markdown formatting
 */
export interface FormatActionMapping {
  prefix: string;
  suffix: string;
}

/**
 * Connection state for collaboration
 */
export type CollaborationConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';
