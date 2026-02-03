/**
 * CLI UI Type Definitions
 *
 * Shared types for CLI components.
 */

/**
 * Key object from ink's useInput hook
 * @see https://github.com/vadimdemedes/ink#useinputinputhandler-options
 */
export interface Key {
  /** Up arrow key */
  upArrow: boolean;
  /** Down arrow key */
  downArrow: boolean;
  /** Left arrow key */
  leftArrow: boolean;
  /** Right arrow key */
  rightArrow: boolean;
  /** Page down key */
  pageDown: boolean;
  /** Page up key */
  pageUp: boolean;
  /** Return (enter) key */
  return: boolean;
  /** Escape key */
  escape: boolean;
  /** Ctrl key was held */
  ctrl: boolean;
  /** Shift key was held */
  shift: boolean;
  /** Tab key */
  tab: boolean;
  /** Backspace key */
  backspace: boolean;
  /** Delete key */
  delete: boolean;
  /** Meta key (Cmd on macOS, Win on Windows) */
  meta: boolean;
}

/**
 * Input handler for useInput hook
 */
export type InputHandler = (input: string, key: Key) => void;

/**
 * Common variant types for status components
 */
export type StatusVariant = 'info' | 'success' | 'warning' | 'error';

/**
 * Badge variant types (includes muted)
 */
export type BadgeVariant = StatusVariant | 'muted';
