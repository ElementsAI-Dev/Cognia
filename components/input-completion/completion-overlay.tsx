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
  /** Callback when suggestion is accepted */
  onAccept?: (suggestion: CompletionSuggestion) => void;
  /** Callback when suggestion is dismissed */
  onDismiss?: () => void;
  /** Custom class name */
  className?: string;
}

export function CompletionOverlay({
  position,
  visible: visibleProp,
  onAccept,
  onDismiss,
  className,
}: CompletionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [internalVisible, setInternalVisible] = useState(false);

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

  const visible = visibleProp ?? internalVisible;
  const showOverlay = visible && currentSuggestion && config.ui.show_inline_preview;

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
      }
    },
    [showOverlay, accept, dismiss]
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

  if (!showOverlay || !currentSuggestion) {
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
        {/* Suggestion text */}
        <div
          className="font-mono text-sm whitespace-pre-wrap break-words"
          style={{
            fontSize: config.ui.font_size,
            opacity: config.ui.ghost_text_opacity,
            color: 'var(--muted-foreground)',
          }}
        >
          {currentSuggestion.display_text}
        </div>

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
