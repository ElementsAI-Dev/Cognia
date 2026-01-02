'use client';

/**
 * TagInput Component - input for adding and managing tags
 */

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SUGGESTED_TAGS } from '@/types/project';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag...',
  suggestions = SUGGESTED_TAGS,
  maxTags = 10,
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (tag) =>
      !value.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim().toLowerCase();
      if (
        trimmedTag &&
        !value.includes(trimmedTag) &&
        value.length < maxTags
      ) {
        onChange([...value, trimmedTag]);
        setInputValue('');
        setShowSuggestions(false);
      }
    },
    [value, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        removeTag(value[value.length - 1]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [inputValue, value, addTag, removeTag]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      {!disabled && value.length < maxTags && (
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
              {filteredSuggestions.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => addTag(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Max tags indicator */}
      {value.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxTags} tags reached
        </p>
      )}
    </div>
  );
}

export default TagInput;
