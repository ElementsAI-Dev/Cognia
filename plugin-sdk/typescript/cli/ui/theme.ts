/**
 * CLI Theme Configuration
 *
 * Color palette and styling for the CLI interface.
 */

export const colors = {
  primary: '#7C3AED',      // Purple
  secondary: '#3B82F6',    // Blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  info: '#06B6D4',         // Cyan
  muted: '#6B7280',        // Gray
  text: '#F9FAFB',         // White
  dim: '#9CA3AF',          // Light gray
};

export const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  pointer: '❯',
  bullet: '•',
  radio: {
    on: '◉',
    off: '◯',
  },
  checkbox: {
    on: '◼',
    off: '◻',
  },
  folder: '📁',
  file: '📄',
  rocket: '🚀',
  package: '📦',
  gear: '⚙️',
  sparkles: '✨',
  check: '✅',
  cross: '❌',
  eye: '👀',
  wave: '👋',
  hammer: '🔨',
  search: '🔍',
};

export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const borders = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  round: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  },
};
