'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useInputCompletion } from '@/hooks/input-completion';
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
}

export function CompletionOverlay({
  position,
  visible: visibleProp,
  suggestions: suggestionsProp,
  onAccept,
  onDismiss,
  onIndexChange,
  className,
}: CompletionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [internalVisible, setInternalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    currentSuggestion,
    config,
    accept,
    dismiss,
  } = useInputCompletion({
    onSuggestion: () => setInternalVisible(true),
    onAccept: (suggestion) => {
      setInternalVisible(false);
      onAccept?.(suggestion);
    },
    onDismiss: () => {
      setInternalVisible(false);
      onDismiss?.();
    },
  });

  // Use prop suggestions or wrap current suggestion
  const suggestions = suggestionsProp ?? (currentSuggestion ? [currentSuggestion] : []);
  const hasMultipleSuggestions = suggestions.length > 1;

  // Clamp selectedIndex to valid range to prevent out-of-bounds access
  const clampedIndex = suggestions.length > 0
    ? Math.min(selectedIndex, suggestions.length - 1)
    : 0;
  const activeSuggestion = suggestions[clampedIndex] ?? currentSuggestion;

  const visible = visibleProp ?? internalVisible;
  const showOverlay = visible && activeSuggestion && config.ui.show_inline_preview;

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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!showOverlay) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        accept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      } else if (e.key === ']' && e.altKey) {
        e.preventDefault();
        navigateNext();
      } else if (e.key === '[' && e.altKey) {
        e.preventDefault();
        navigatePrev();
      }
    },
    [showOverlay, accept, dismiss, navigateNext, navigatePrev]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!showOverlay || config.ui.auto_dismiss_ms === 0) return;

    const timer = setTimeout(() => {
      dismiss();
    }, config.ui.auto_dismiss_ms);

    return () => clearTimeout(timer);
  }, [showOverlay, config.ui.auto_dismiss_ms, dismiss]);

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
            fontSize: config.ui.font_size,
            opacity: config.ui.ghost_text_opacity,
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
            <span>{selectedIndex + 1}/{suggestions.length}</span>
            <span className="mx-1">·</span>
            <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Alt+[</kbd>
            <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Alt+]</kbd>
            <span>to navigate</span>
          </div>
        )}

        {/* Accept hint */}
        {config.ui.show_accept_hint && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              Tab
            </kbd>
            <span>to accept</span>
            <span className="mx-1">·</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              Esc
            </kbd>
            <span>to dismiss</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default CompletionOverlay;
