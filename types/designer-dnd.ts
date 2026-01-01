/**
 * Designer DnD Types
 * Types for drag-and-drop functionality in the designer
 */

import type { UniqueIdentifier } from '@dnd-kit/core';

// Drag item types
export type DragItemType = 'component' | 'element';

export interface DragItem {
  id: UniqueIdentifier;
  type: DragItemType;
  // For component library items
  componentCode?: string;
  componentName?: string;
  // For existing elements
  elementId?: string;
}
