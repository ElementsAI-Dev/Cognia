/**
 * Screenshot Annotation Types
 *
 * Type definitions for screenshot annotations and editor state.
 */

// ============== Annotation Types ==============

export type AnnotationTool =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'freehand'
  | 'text'
  | 'blur'
  | 'highlight'
  | 'marker';

export interface AnnotationStyle {
  color: string;
  strokeWidth: number;
  filled: boolean;
  opacity: number;
  fontSize?: number;
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationTool;
  style: AnnotationStyle;
  timestamp: number;
  rotation?: number; // degrees, default 0
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseAnnotation extends BaseAnnotation {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Array<[number, number]>;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  background?: string;
}

export interface BlurAnnotation extends BaseAnnotation {
  type: 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkerAnnotation extends BaseAnnotation {
  type: 'marker';
  x: number;
  y: number;
  number: number;
  size: number;
}

export type Annotation =
  | RectangleAnnotation
  | EllipseAnnotation
  | ArrowAnnotation
  | FreehandAnnotation
  | TextAnnotation
  | BlurAnnotation
  | HighlightAnnotation
  | MarkerAnnotation;

// ============== Selection Types ==============

export interface SelectionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface Point {
  x: number;
  y: number;
}

// ============== Editor State ==============

export interface EditorState {
  mode: 'selecting' | 'editing' | 'annotating';
  currentTool: AnnotationTool;
  style: AnnotationStyle;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  undoStack: Annotation[][];
  redoStack: Annotation[][];
}

// ============== Constants ==============

export const DEFAULT_STYLE: AnnotationStyle = {
  color: '#FF0000',
  strokeWidth: 2,
  filled: false,
  opacity: 1,
  fontSize: 16,
};

export const PRESET_COLORS = [
  '#FF0000', // Red
  '#FF6B00', // Orange
  '#FFDD00', // Yellow
  '#00FF00', // Green
  '#00DDFF', // Cyan
  '#0066FF', // Blue
  '#9900FF', // Purple
  '#FF00DD', // Pink
  '#FFFFFF', // White
  '#000000', // Black
];

export const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 10];

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

// ============== Type Guards ==============

export function isRectangleAnnotation(a: Annotation): a is RectangleAnnotation {
  return a.type === 'rectangle';
}

export function isEllipseAnnotation(a: Annotation): a is EllipseAnnotation {
  return a.type === 'ellipse';
}

export function isArrowAnnotation(a: Annotation): a is ArrowAnnotation {
  return a.type === 'arrow';
}

export function isFreehandAnnotation(a: Annotation): a is FreehandAnnotation {
  return a.type === 'freehand';
}

export function isTextAnnotation(a: Annotation): a is TextAnnotation {
  return a.type === 'text';
}

export function isBlurAnnotation(a: Annotation): a is BlurAnnotation {
  return a.type === 'blur';
}

export function isHighlightAnnotation(a: Annotation): a is HighlightAnnotation {
  return a.type === 'highlight';
}

export function isMarkerAnnotation(a: Annotation): a is MarkerAnnotation {
  return a.type === 'marker';
}
