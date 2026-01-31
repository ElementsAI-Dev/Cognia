/**
 * Window Detection Types for Screenshot Enhancement
 *
 * Types for QQ/WeChat-style window auto-detection, selection snapping,
 * and color picker functionality.
 */

/**
 * Information about a UI element within a window
 */
export interface ElementInfo {
  /** Element bounds - X position */
  x: number;
  /** Element bounds - Y position */
  y: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;
  /** Element type/class name */
  element_type: string;
  /** Element text/name if available */
  name?: string;
  /** Parent window HWND */
  parent_hwnd: number;
}

/**
 * Visual snap guide line for UI feedback
 */
export interface SnapGuide {
  /** Guide orientation: "horizontal" or "vertical" */
  orientation: 'horizontal' | 'vertical';
  /** Position (x for vertical, y for horizontal) */
  position: number;
  /** Start point of the guide line */
  start: number;
  /** End point of the guide line */
  end: number;
  /** Source of the snap (window title or "screen") */
  source: string;
}

/**
 * Result of selection snap calculation
 */
export interface SelectionSnapResult {
  /** Snapped X position of selection */
  x: number;
  /** Snapped Y position of selection */
  y: number;
  /** Snapped width of selection */
  width: number;
  /** Snapped height of selection */
  height: number;
  /** Whether any edge was snapped */
  snapped: boolean;
  /** Visual guide lines to display */
  guides: SnapGuide[];
}

/**
 * Enhanced snap configuration with new options
 */
export interface EnhancedSnapConfig {
  /** Distance in pixels to trigger snapping */
  snap_distance: number;
  /** Enable snapping to screen edges */
  snap_to_screen: boolean;
  /** Enable snapping to other windows */
  snap_to_windows: boolean;
  /** Enable snapping to UI elements within windows */
  snap_to_elements: boolean;
  /** Show visual guide lines when snapping */
  show_guide_lines: boolean;
  /** Enable magnetic edge snapping during region selection */
  magnetic_edges: boolean;
}

/**
 * Window information (mirrors Rust WindowInfo)
 */
export interface WindowInfo {
  hwnd: number;
  title: string;
  process_name: string;
  pid: number;
  x: number;
  y: number;
  width: number;
  height: number;
  is_minimized: boolean;
  is_maximized: boolean;
  is_visible: boolean;
  thumbnail_base64?: string;
}
