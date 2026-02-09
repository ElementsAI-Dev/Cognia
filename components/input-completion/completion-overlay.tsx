'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CompletionSuggestion } from '@/types/input-completion';

export interface CompletionOverlayProps {
  /** Position of the overlay */
  position?: { x: number; y: number };
  /** Whether the overlay is visible */
  visible?: boolean;
  /** Multiple suggestions to display */
  suggestions?: CompletionSuggestion[];
  /** Callback when suggestion is accepted */
  onAccept?: (suggestion: CompletionSuggestion) => void;
  /** Callback when suggestion is dismissed */
  onDismiss?: () => void;
  /** Callback when suggestion index changes */
  onIndexChange?: (index: number) => void;
  /** Custom class name */
  className?: string;
  /** Ghost text opacity (0-1) */
  ghostTextOpacity?: number;
  /** Font size in px */
  fontSize?: number;
  /** Show accept/dismiss hint bar */
  showAcceptHint?: boolean;
  /** Auto-dismiss delay in ms (0 = disabled) */
  autoDismissMs?: number;
}

export function CompletionOverlay({
  position,
  visible: visibleProp,
  suggestions: suggestionsProp,
  onAccept: _onAccept,
  onDismiss,
  onIndexChange,
  className,
  ghostTextOpacity = 0.5,
  fontSize = 13,
  showAcceptHint = true,
  autoDismissMs = 0,
}: CompletionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Use prop suggestions directly (driven by unified completion system)
  const suggestions = suggestionsProp ?? [];
  const hasMultipleSuggestions = suggestions.length > 1;

  // Clamp selectedIndex to valid range
  const clampedIndex = suggestions.length > 0 ? Math.min(selectedIndex, suggestions.length - 1) : 0;
  const activeSuggestion = suggestions[clampedIndex];

  const visible = visibleProp ?? false;
  const showOverlay = visible && activeSuggestion;

  // Navigate to next suggestion
  const navigateNext = useCallback(() => {
    if (!hasMultipleSuggestions) return;
    const newIndex = (selectedIndex + 1) % suggestions.length;
    setSelectedIndex(newIndex);
    onIndexChange?.(newIndex);
  }, [hasMultipleSuggestions, selectedIndex, suggestions.length, onIndexChange]);

  // Navigate to previous suggestion
  const navigatePrev = useCallback(() => {
    if (!hasMultipleSuggestions) return;
    const newIndex = selectedIndex === 0 ? suggestions.length - 1 : selectedIndex - 1;
    setSelectedIndex(newIndex);
    onIndexChange?.(newIndex);
  }, [hasMultipleSuggestions, selectedIndex, suggestions.length, onIndexChange]);

  // Handle keyboard shortcuts for multi-suggestion navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!showOverlay) return;

      // Only handle Alt+[/] navigation; Tab/Escape are handled by unified hook
      if (e.key === ']' && e.altKey) {
        e.preventDefault();
        navigateNext();
      } else if (e.key === '[' && e.altKey) {
        e.preventDefault();
        navigatePrev();
      }
    },
    [showOverlay, navigateNext, navigatePrev]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!showOverlay || autoDismissMs === 0) return;

    const timer = setTimeout(() => {
      onDismiss?.();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [showOverlay, autoDismissMs, onDismiss]);

  if (!showOverlay || !activeSuggestion) {
    return null;
  }

  const overlayStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
      }
    : {};

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        style={overlayStyle}
        className={cn(
          'pointer-events-none select-none',
          'max-w-lg rounded-md border border-border/50',
          'bg-popover/95 backdrop-blur-sm shadow-lg',
          'px-3 py-2',
          className
        )}
      >
        {/* Suggestion text with multi-line rendering optimization */}
        <div
          className="font-mono text-sm whitespace-pre-wrap break-words overflow-hidden"
          style={{
            fontSize,
            opacity: ghostTextOpacity,
            color: 'var(--muted-foreground)',
            maxHeight: '200px',
            lineHeight: 1.5,
          }}
        >
          {activeSuggestion?.display_text.split('\n').map((line, idx, arr) => (
            <span key={idx}>
              {line}
              {idx < arr.length - 1 && (
                <>
                  <span className="text-muted-foreground/30 select-none">↵</span>
                  <br />
                </>
              )}
            </span>
          ))}
        </div>

        {/* Multi-suggestion indicator */}
        {hasMultipleSuggestions && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/50">
            <span>
              {selectedIndex + 1}/{suggestions.length}
            </span>
            <span className="mx-1">·</span>
            <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Alt+[</kbd>
            <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Alt+]</kbd>
            <span>to navigate</span>
          </div>
        )}

        {/* Accept hint */}
        {showAcceptHint && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Tab</kbd>
            <span>to accept</span>
            <span className="mx-1">·</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Esc</kbd>
            <span>to dismiss</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default CompletionOverlay;
