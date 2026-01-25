'use client';

/**
 * SlashCommandPopover - Popover for slash command selection
 *
 * Displays available slash commands grouped by category with:
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Search filtering
 * - Category grouping
 * - Command descriptions and examples
 */

import { useEffect, useRef } from 'react';
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
import {
  MessageCircle,
  Bot,
  Image,
  Settings,
  Compass,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';
import { cn as _cn } from '@/lib/utils';
import type { SlashCommandDefinition } from '@/types/chat/slash-commands';
import type { SlashCommandCategory } from '@/types/chat/input-completion';
import { getGroupedCommands, searchCommands } from '@/lib/chat/slash-command-registry';

/** Category icons */
const CATEGORY_ICONS: Record<SlashCommandCategory, LucideIcon> = {
  chat: MessageCircle,
  agent: Bot,
  media: Image,
  system: Settings,
  navigation: Compass,
  custom: Puzzle,
};

export interface SlashCommandPopoverProps {
  /** Whether the popover is open */
  open: boolean;
  /** Callback to close the popover */
  onClose: () => void;
  /** Callback when a command is selected */
  onSelect: (command: SlashCommandDefinition) => void;
  /** Current query (text after /) */
  query: string;
  /** Anchor rect for positioning */
  anchorRect?: DOMRect | null;
  /** Container ref for positioning (reserved for future use) */
  containerRef?: React.RefObject<HTMLElement>;
}

export function SlashCommandPopover({
  open,
  onClose,
  onSelect,
  query,
  anchorRect,
  containerRef: _containerRef,
}: SlashCommandPopoverProps) {
  const t = useTranslations('slashCommands');
  const listRef = useRef<HTMLDivElement>(null);

  // Get filtered commands
  const filteredCommands = searchCommands(query);
  const groupedCommands = getGroupedCommands().filter(
    (group) => group.commands.some((cmd) => filteredCommands.includes(cmd))
  );

  // Flatten commands for keyboard navigation
  const flatCommands = groupedCommands.flatMap((g) =>
    g.commands.filter((cmd) => filteredCommands.includes(cmd))
  );

  // Reset selection when query changes - use key prop on parent for proper reset
  // The parent component should handle query changes by re-mounting or using key prop

  // Scroll first item into view when popover opens
  useEffect(() => {
    if (listRef.current && flatCommands.length > 0) {
      const firstItem = listRef.current.querySelector('[data-index="0"]');
      firstItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [flatCommands.length]);

  // Keyboard navigation is handled by the Command component internally
  // We pass onSelect to CommandItem which handles selection

  // Popover positioning is handled by Radix PopoverContent
  const _anchorRect = anchorRect; // Reserved for custom positioning

  if (!open) return null;

  return (
    <Popover open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <PopoverAnchor asChild>
        <div className="absolute" />
      </PopoverAnchor>
      <PopoverContent
        className="w-80 p-0"
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder={t('searchPlaceholder') || 'Search commands...'}
            value={query}
            className="h-9"
          />
          <CommandList ref={listRef} className="max-h-64">
            <CommandEmpty>{t('noResults') || 'No commands found.'}</CommandEmpty>
            {groupedCommands.map((group) => {
              const CategoryIcon = CATEGORY_ICONS[group.category];
              const groupCommands = group.commands.filter((cmd) =>
                filteredCommands.includes(cmd)
              );

              if (groupCommands.length === 0) return null;

              return (
                <CommandGroup
                  key={group.category}
                  heading={
                    <span className="flex items-center gap-1.5">
                      <CategoryIcon className="h-3.5 w-3.5" />
                      {group.label}
                    </span>
                  }
                >
                  {groupCommands.map((command, idx) => (
                      <CommandItem
                        key={command.id}
                        data-index={idx}
                        value={command.command}
                        onSelect={() => onSelect(command)}
                        className="flex flex-col items-start gap-0.5 px-2 py-1.5"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="font-mono text-sm font-medium text-primary">
                            /{command.command}
                          </span>
                          {command.aliases && command.aliases.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({command.aliases.map((a) => `/${a}`).join(', ')})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {command.description}
                        </span>
                      </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SlashCommandPopover;
