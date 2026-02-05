'use client';

/**
 * LaTeX Autocomplete Component
 * Provides autocomplete suggestions for LaTeX commands
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import type { LaTeXSuggestion } from '@/types/latex';

interface LaTeXAutocompleteProps {
  position: { x: number; y: number };
  suggestions: LaTeXSuggestion[];
  onSelect: (suggestion: LaTeXSuggestion) => void;
  onClose: () => void;
  className?: string;
}

export function LaTeXAutocomplete({
  position,
  suggestions,
  onSelect,
  onClose,
  className,
}: LaTeXAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when suggestions change
  // Note: Using useMemo to derive selectedIndex based on suggestions length
  const _effectiveSelectedIndex = suggestions.length > 0 ? Math.min(selectedIndex, suggestions.length - 1) : 0;

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [suggestions, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 min-w-[200px] max-w-[400px]',
        'border rounded-md shadow-lg',
        className
      )}
      style={{ left: position.x, top: position.y }}
    >
      <Command className="rounded-md">
        <CommandList>
          <CommandEmpty>No suggestions found</CommandEmpty>
          {suggestions.map((suggestion, index) => (
            <CommandItem
              key={suggestion.label}
              value={suggestion.label}
              onSelect={() => onSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                index === selectedIndex && 'bg-accent text-accent-foreground'
              )}
            >
              <span className="font-mono text-xs bg-muted px-1 rounded">
                {suggestion.label}
              </span>
              {suggestion.detail && (
                <span className="text-muted-foreground text-xs truncate flex-1">
                  {suggestion.detail}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}

export default LaTeXAutocomplete;
