'use client';

/**
 * EmojiPopover - Emoji picker popover for chat input
 *
 * Features:
 * - Search by name and keywords
 * - Category organization
 * - Keyboard navigation
 * - Frequently used section
 */

import { useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { searchEmojis, FREQUENT_EMOJIS, EMOJI_CATEGORY_LABELS } from '@/lib/chat/emoji-data';
import type { EmojiData, EmojiCategory } from '@/types/chat/input-completion';

export interface EmojiPopoverProps {
  /** Whether the popover is open */
  open: boolean;
  /** Callback to close the popover */
  onClose: () => void;
  /** Callback when an emoji is selected */
  onSelect: (emoji: EmojiData) => void;
  /** Current query (text after :) */
  query: string;
  /** Selected index for keyboard navigation */
  selectedIndex: number;
  /** Callback to update selected index */
  onSelectedIndexChange: (index: number) => void;
}

export function EmojiPopover({
  open,
  onClose,
  onSelect,
  query,
  selectedIndex,
  onSelectedIndexChange,
}: EmojiPopoverProps) {
  const t = useTranslations('emojiPicker');
  const listRef = useRef<HTMLDivElement>(null);

  // Get filtered emojis
  const filteredEmojis = useMemo(() => searchEmojis(query, 50), [query]);

  // Group emojis by category when not searching
  const groupedEmojis = useMemo(() => {
    if (query) {
      return new Map([['search', filteredEmojis]]);
    }

    // Show frequent emojis first, then by category
    const groups = new Map<string, EmojiData[]>();
    groups.set('frequent', FREQUENT_EMOJIS);

    for (const emoji of filteredEmojis) {
      const category = emoji.category;
      const existing = groups.get(category) || [];
      if (!existing.some((e) => e.emoji === emoji.emoji)) {
        existing.push(emoji);
        groups.set(category, existing);
      }
    }

    return groups;
  }, [query, filteredEmojis]);

  // Flatten for keyboard navigation
  const flatEmojis = useMemo(() => {
    const result: EmojiData[] = [];
    groupedEmojis.forEach((emojis) => result.push(...emojis));
    return result;
  }, [groupedEmojis]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatEmojis.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onSelectedIndexChange(
          selectedIndex > 0 ? selectedIndex - 1 : flatEmojis.length - 1
        );
        break;
      case 'ArrowDown':
        e.preventDefault();
        onSelectedIndexChange(
          selectedIndex < flatEmojis.length - 1 ? selectedIndex + 1 : 0
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (flatEmojis[selectedIndex]) {
          onSelect(flatEmojis[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!open) return null;

  return (
    <Popover open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <PopoverAnchor asChild>
        <div className="absolute" />
      </PopoverAnchor>
      <PopoverContent
        className="w-72 p-0"
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
      >
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder={t('searchPlaceholder') || 'Search emoji...'}
            value={query}
            className="h-9"
          />
          <CommandList ref={listRef} className="max-h-64">
            <CommandEmpty>{t('noResults') || 'No emoji found.'}</CommandEmpty>
            {Array.from(groupedEmojis.entries()).map(([category, emojis]) => {
              if (emojis.length === 0) return null;

              const label =
                category === 'frequent'
                  ? t('frequent') || 'Frequently Used'
                  : category === 'search'
                    ? t('searchResults') || 'Search Results'
                    : EMOJI_CATEGORY_LABELS[category as EmojiCategory] || category;

              return (
                <CommandGroup key={category} heading={label}>
                  <div className="grid grid-cols-8 gap-1 p-1">
                    {emojis.map((emoji) => {
                      const globalIndex = flatEmojis.indexOf(emoji);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <CommandItem
                          key={`${category}-${emoji.name}`}
                          value={emoji.name}
                          onSelect={() => onSelect(emoji)}
                          className={cn(
                            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-0 text-xl hover:bg-accent',
                            isSelected && 'bg-accent ring-2 ring-primary'
                          )}
                          title={`:${emoji.name}:`}
                        >
                          {emoji.emoji}
                        </CommandItem>
                      );
                    })}
                  </div>
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default EmojiPopover;
