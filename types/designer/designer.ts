/**
 * Designer types - V0-style web page designer mode
 */

// Component element in the design tree
export interface DesignerElement {
  id: string;
  tagName: string;
  className: string;
  textContent?: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  children: DesignerElement[];
  parentId: string | null;
  // Position in source code
  sourceRange?: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
}

// Viewport sizes for responsive preview
export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';

export interface ViewportDimensions {
  width: number;
  height: number | 'auto';
  label: string;
}

export const VIEWPORT_PRESETS: Record<ViewportSize, ViewportDimensions> = {
  mobile: { width: 375, height: 667, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: 1280, height: 800, label: 'Desktop' },
  full: { width: 0, height: 'auto', label: 'Full Width' }, // 0 means 100%
};

// Style categories for the property panel
export interface StyleCategory {
  id: string;
  label: string;
  icon: string;
  properties: StyleProperty[];
}

export interface StyleProperty {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'color' | 'spacing' | 'slider';
  options?: { value: string; label: string }[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Common style categories
export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    id: 'layout',
    label: 'Layout',
    icon: 'layout',
    properties: [
      {
        key: 'display',
        label: 'Display',
        type: 'select',
        options: [
          { value: 'block', label: 'Block' },
          { value: 'flex', label: 'Flex' },
          { value: 'grid', label: 'Grid' },
          { value: 'inline', label: 'Inline' },
          { value: 'inline-block', label: 'Inline Block' },
          { value: 'none', label: 'None' },
        ],
      },
      {
        key: 'flexDirection',
        label: 'Direction',
        type: 'select',
        options: [
          { value: 'row', label: 'Row' },
          { value: 'column', label: 'Column' },
          { value: 'row-reverse', label: 'Row Reverse' },
          { value: 'column-reverse', label: 'Column Reverse' },
        ],
      },
      {
        key: 'justifyContent',
        label: 'Justify',
        type: 'select',
        options: [
          { value: 'flex-start', label: 'Start' },
          { value: 'center', label: 'Center' },
          { value: 'flex-end', label: 'End' },
          { value: 'space-between', label: 'Space Between' },
          { value: 'space-around', label: 'Space Around' },
          { value: 'space-evenly', label: 'Space Evenly' },
        ],
      },
      {
        key: 'alignItems',
        label: 'Align',
        type: 'select',
        options: [
          { value: 'flex-start', label: 'Start' },
          { value: 'center', label: 'Center' },
          { value: 'flex-end', label: 'End' },
          { value: 'stretch', label: 'Stretch' },
          { value: 'baseline', label: 'Baseline' },
        ],
      },
      {
        key: 'gap',
        label: 'Gap',
        type: 'text',
      },
    ],
  },
  {
    id: 'spacing',
    label: 'Spacing',
    icon: 'move',
    properties: [
      { key: 'padding', label: 'Padding', type: 'spacing' },
      { key: 'margin', label: 'Margin', type: 'spacing' },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    icon: 'maximize',
    properties: [
      { key: 'width', label: 'Width', type: 'text' },
      { key: 'height', label: 'Height', type: 'text' },
      { key: 'minWidth', label: 'Min Width', type: 'text' },
      { key: 'maxWidth', label: 'Max Width', type: 'text' },
      { key: 'minHeight', label: 'Min Height', type: 'text' },
      { key: 'maxHeight', label: 'Max Height', type: 'text' },
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    icon: 'type',
    properties: [
      { key: 'fontSize', label: 'Font Size', type: 'text' },
      { key: 'fontWeight', label: 'Font Weight', type: 'select', options: [
        { value: '100', label: 'Thin' },
        { value: '300', label: 'Light' },
        { value: '400', label: 'Normal' },
        { value: '500', label: 'Medium' },
        { value: '600', label: 'Semibold' },
        { value: '700', label: 'Bold' },
        { value: '800', label: 'Extrabold' },
      ]},
      { key: 'lineHeight', label: 'Line Height', type: 'text' },
      { key: 'letterSpacing', label: 'Letter Spacing', type: 'text' },
      { key: 'textAlign', label: 'Text Align', type: 'select', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'justify', label: 'Justify' },
      ]},
      { key: 'color', label: 'Color', type: 'color' },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    icon: 'palette',
    properties: [
      { key: 'backgroundColor', label: 'Color', type: 'color' },
      { key: 'backgroundImage', label: 'Image', type: 'text' },
      { key: 'backgroundSize', label: 'Size', type: 'select', options: [
        { value: 'auto', label: 'Auto' },
        { value: 'cover', label: 'Cover' },
        { value: 'contain', label: 'Contain' },
      ]},
      { key: 'backgroundPosition', label: 'Position', type: 'text' },
    ],
  },
  {
    id: 'border',
    label: 'Border',
    icon: 'square',
    properties: [
      { key: 'borderWidth', label: 'Width', type: 'text' },
      { key: 'borderStyle', label: 'Style', type: 'select', options: [
        { value: 'none', label: 'None' },
        { value: 'solid', label: 'Solid' },
        { value: 'dashed', label: 'Dashed' },
        { value: 'dotted', label: 'Dotted' },
      ]},
      { key: 'borderColor', label: 'Color', type: 'color' },
      { key: 'borderRadius', label: 'Radius', type: 'text' },
    ],
  },
  {
    id: 'effects',
    label: 'Effects',
    icon: 'sparkles',
    properties: [
      { key: 'opacity', label: 'Opacity', type: 'slider', min: 0, max: 1, step: 0.1 },
      { key: 'boxShadow', label: 'Shadow', type: 'text' },
      { key: 'transform', label: 'Transform', type: 'text' },
      { key: 'transition', label: 'Transition', type: 'text' },
    ],
  },
  {
    id: 'position',
    label: 'Position',
    icon: 'crosshair',
    properties: [
      { key: 'position', label: 'Position', type: 'select', options: [
        { value: 'static', label: 'Static' },
        { value: 'relative', label: 'Relative' },
        { value: 'absolute', label: 'Absolute' },
        { value: 'fixed', label: 'Fixed' },
        { value: 'sticky', label: 'Sticky' },
      ]},
      { key: 'top', label: 'Top', type: 'text' },
      { key: 'right', label: 'Right', type: 'text' },
      { key: 'bottom', label: 'Bottom', type: 'text' },
      { key: 'left', label: 'Left', type: 'text' },
      { key: 'zIndex', label: 'Z-Index', type: 'number' },
    ],
  },
];

// Designer mode
export type DesignerMode = 'preview' | 'design' | 'code';

// AI edit request
export interface DesignerAIRequest {
  type: 'edit' | 'add' | 'remove' | 'style' | 'generate';
  prompt: string;
  targetElementId?: string;
  context?: string;
}

// History entry for undo/redo
export interface DesignerHistoryEntry {
  id: string;
  timestamp: Date;
  action: string;
  previousCode: string;
  newCode: string;
}
