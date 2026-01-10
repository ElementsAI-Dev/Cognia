'use client';

/**
 * Keyboard Navigation Hook for Tour
 * Handles keyboard shortcuts for navigating the onboarding tour
 */

import { useEffect, useCallback } from 'react';

interface UseTourKeyboardOptions {
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function useTourKeyboard({
  isActive,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  isFirst,
  isLast,
}: UseTourKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive) return;

      // Prevent default for handled keys
      const handledKeys = ['ArrowLeft', 'ArrowRight', 'Escape', 'Enter', 'Tab'];
      if (handledKeys.includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
        case ' ':
          if (!isLast) {
            onNext();
          } else if (event.key === 'Enter') {
            onNext(); // Complete on last step
          }
          break;

        case 'ArrowLeft':
          if (!isFirst) {
            onPrevious();
          }
          break;

        case 'Escape':
          onClose();
          break;

        case 'Tab':
          if (event.shiftKey) {
            if (!isFirst) onPrevious();
          } else {
            if (!isLast) onNext();
            else onNext(); // Complete
          }
          break;

        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onSkip();
          }
          break;
      }
    },
    [isActive, onNext, onPrevious, onSkip, onClose, isFirst, isLast]
  );

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  return {
    // Provide keyboard hint text
    keyboardHints: {
      next: '→ or Enter',
      previous: '←',
      skip: 'Esc',
      complete: 'Enter',
    },
  };
}

export default useTourKeyboard;
