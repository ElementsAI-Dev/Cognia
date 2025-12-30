'use client';

/**
 * KbdInline - Keyboard shortcut renderer
 * Features:
 * - Styled keyboard keys
 * - Shortcut combinations
 * - Platform-aware symbols (Mac vs Windows)
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface KbdInlineProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * Single keyboard key
 */
export const KbdInline = memo(function KbdInline({
  children,
  className,
  variant = 'default',
}: KbdInlineProps) {
  const variantClasses = {
    default:
      'bg-muted border border-border shadow-sm shadow-muted-foreground/20',
    outline: 'border border-border',
    ghost: 'bg-muted/50',
  };

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-mono font-medium',
        'min-w-[1.5rem] h-5',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </kbd>
  );
});

interface KeyboardShortcutProps {
  keys: string[];
  className?: string;
  separator?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * Keyboard shortcut combination (e.g., Ctrl+C)
 */
export const KeyboardShortcut = memo(function KeyboardShortcut({
  keys,
  className,
  separator = '+',
  variant = 'default',
}: KeyboardShortcutProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <span key={index} className="inline-flex items-center">
          {index > 0 && (
            <span className="mx-0.5 text-muted-foreground text-xs">{separator}</span>
          )}
          <KbdInline variant={variant}>{formatKey(key)}</KbdInline>
        </span>
      ))}
    </span>
  );
});

/**
 * Format key for display, converting common names to symbols
 */
function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  const keyMap: Record<string, { mac: string; other: string }> = {
    cmd: { mac: '⌘', other: 'Ctrl' },
    command: { mac: '⌘', other: 'Ctrl' },
    ctrl: { mac: '⌃', other: 'Ctrl' },
    control: { mac: '⌃', other: 'Ctrl' },
    alt: { mac: '⌥', other: 'Alt' },
    option: { mac: '⌥', other: 'Alt' },
    shift: { mac: '⇧', other: 'Shift' },
    enter: { mac: '↵', other: 'Enter' },
    return: { mac: '↵', other: 'Enter' },
    tab: { mac: '⇥', other: 'Tab' },
    backspace: { mac: '⌫', other: 'Backspace' },
    delete: { mac: '⌦', other: 'Del' },
    escape: { mac: '⎋', other: 'Esc' },
    esc: { mac: '⎋', other: 'Esc' },
    space: { mac: '␣', other: 'Space' },
    up: { mac: '↑', other: '↑' },
    down: { mac: '↓', other: '↓' },
    left: { mac: '←', other: '←' },
    right: { mac: '→', other: '→' },
    pageup: { mac: '⇞', other: 'PgUp' },
    pagedown: { mac: '⇟', other: 'PgDn' },
    home: { mac: '↖', other: 'Home' },
    end: { mac: '↘', other: 'End' },
    capslock: { mac: '⇪', other: 'CapsLock' },
  };

  const lowerKey = key.toLowerCase();
  if (keyMap[lowerKey]) {
    return isMac ? keyMap[lowerKey].mac : keyMap[lowerKey].other;
  }

  // Capitalize single letters
  if (key.length === 1) {
    return key.toUpperCase();
  }

  // Return as-is for function keys (F1, F2, etc.) and other special keys
  return key;
}

/**
 * Parse shortcut string like "Ctrl+Shift+P" into keys array
 */
export function parseShortcut(shortcut: string): string[] {
  return shortcut.split(/[+\s]+/).filter(Boolean);
}

export default KbdInline;
