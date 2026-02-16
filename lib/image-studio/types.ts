/**
 * Image Studio Types
 * Shared types for sub-components of the Image Studio page
 */

import type { GeneratedImage, ImageSize, ImageQuality, ImageStyle } from '@/lib/ai';
import type { EditorMode, HistoryOperationType } from '@/types/media/image-studio';

/** Extended image metadata used throughout the Image Studio UI */
export interface GeneratedImageWithMeta extends GeneratedImage {
  id: string;
  prompt: string;
  model: string;
  timestamp: number;
  settings: {
    size: ImageSize;
    quality: ImageQuality;
    style: ImageStyle;
  };
  isFavorite?: boolean;
  parentId?: string;
  version?: number;
}

/** Actions available from gallery cards/dropdowns */
export type ImageEditAction =
  | 'mask'
  | 'crop'
  | 'adjust'
  | 'upscale'
  | 'remove-bg'
  | 'filter'
  | 'text'
  | 'draw'
  | 'compare'
  | 'use-for-edit'
  | 'use-for-variation';

/** Dialog-level edit mode (no direct "use-for-*" actions) */
export type ImageDialogEditMode =
  | Exclude<ImageEditAction, 'use-for-edit' | 'use-for-variation'>
  | null;

export interface ImageEditorSaveResult {
  dataUrl: string;
  mode: EditorMode;
}

/**
 * Editor modes and history operation types are almost identical,
 * except editor uses "filters" while history uses "filter".
 */
export function toHistoryOperationType(mode: EditorMode): HistoryOperationType {
  return mode === 'filters' ? 'filter' : mode;
}
