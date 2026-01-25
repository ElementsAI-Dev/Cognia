'use client';

/**
 * GhostTextOverlay - AI-powered inline text completion overlay
 *
 * Displays ghost text (semi-transparent suggestion) after the cursor position
 * in a textarea. Supports Tab to accept and Escape to dismiss.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface GhostTextOverlayProps {
  /** The ghost text to display */
  text: string;
  /** Reference to the textarea element */
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  /** Callback when ghost text is accepted (Tab) */
  onAccept: () => void;
  /** Callback when ghost text is dismissed (Escape or typing) */
  onDismiss: () => void;
  /** Opacity of the ghost text (0-1) */
  opacity?: number;
  /** Custom class name */
  className?: string;
}

export function GhostTextOverlay({
  text,
  textareaRef,
  onAccept,
  onDismiss,
  opacity = 0.5,
  className,
}: GhostTextOverlayProps) {
  const overlayRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on cursor in textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const updatePosition = () => {
      const { selectionStart } = textarea;
      if (selectionStart === null) return;

      // Create a mirror div to calculate cursor position
      const mirror = document.createElement('div');
      const computed = window.getComputedStyle(textarea);

      // Copy relevant styles
      const styles = [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'fontStyle',
        'letterSpacing',
        'textTransform',
        'wordSpacing',
        'textIndent',
        'whiteSpace',
        'wordWrap',
        'lineHeight',
        'padding',
        'paddingLeft',
        'paddingRight',
        'paddingTop',
        'paddingBottom',
        'border',
        'boxSizing',
      ] as const;

      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.overflow = 'hidden';
      mirror.style.width = computed.width;

      styles.forEach((style) => {
        (mirror.style as unknown as Record<string, string>)[style] = computed.getPropertyValue(
          style.replace(/([A-Z])/g, '-$1').toLowerCase()
        );
      });

      // Get text before cursor
      const textBeforeCursor = textarea.value.substring(0, selectionStart);
      mirror.textContent = textBeforeCursor;

      // Add marker span
      const marker = document.createElement('span');
      marker.textContent = '|';
      mirror.appendChild(marker);

      document.body.appendChild(mirror);

      const markerRect = marker.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();

      // Calculate position relative to textarea
      const left = markerRect.left - mirrorRect.left;
      const top = markerRect.top - mirrorRect.top - textarea.scrollTop;

      document.body.removeChild(mirror);

      setPosition({ top, left });
    };

    updatePosition();

    // Update on selection change
    textarea.addEventListener('input', updatePosition);
    textarea.addEventListener('click', updatePosition);
    textarea.addEventListener('keyup', updatePosition);
    textarea.addEventListener('scroll', updatePosition);

    return () => {
      textarea.removeEventListener('input', updatePosition);
      textarea.removeEventListener('click', updatePosition);
      textarea.removeEventListener('keyup', updatePosition);
      textarea.removeEventListener('scroll', updatePosition);
    };
  }, [textareaRef, text]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onAccept, onDismiss]);

  if (!text) return null;

  return (
    <span
      ref={overlayRef}
      className={cn(
        'pointer-events-none absolute whitespace-pre-wrap font-mono text-muted-foreground',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        opacity,
      }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

export default GhostTextOverlay;
