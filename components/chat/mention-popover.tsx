'use client';

/**
 * MentionPopover - Autocomplete popover for @ mentions in chat
 * 
 * Shows available MCP tools, resources, and prompts grouped by server
 * Supports keyboard navigation and filtering
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  Wrench,
  FileText,
  MessageSquare,
  Server,
  Zap,
} from 'lucide-react';
import type { MentionItem } from '@/types/mcp';

interface MentionPopoverProps {
  /** Whether the popover is open */
  open: boolean;
  /** Callback to close the popover */
  onClose: () => void;
  /** Callback when an item is selected */
  onSelect: (item: MentionItem) => void;
  /** Grouped mention items by server */
  groupedMentions: Map<string, MentionItem[]>;
  /** Current search query */
  query: string;
  /** Anchor position (for positioning) */
  anchorRect?: DOMRect | null;
  /** Container element for positioning */
  containerRef?: React.RefObject<HTMLElement | null>;
}

function getMentionIcon(type: MentionItem['type']) {
  switch (type) {
    case 'tool':
      return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'resource':
      return <FileText className="h-4 w-4 text-green-500" />;
    case 'prompt':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'server':
      return <Server className="h-4 w-4 text-orange-500" />;
  }
}

function getMentionTypeLabel(type: MentionItem['type']) {
  switch (type) {
    case 'tool':
      return 'Tool';
    case 'resource':
      return 'Resource';
    case 'prompt':
      return 'Prompt';
    case 'server':
      return 'Server';
  }
}

export function MentionPopover({
  open,
  onClose,
  onSelect,
  groupedMentions,
  query,
  anchorRect,
  containerRef,
}: MentionPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Flatten items for keyboard navigation
  const flatItems = Array.from(groupedMentions.values()).flat();
  const totalItems = flatItems.length;
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          onSelect(flatItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          onSelect(flatItems[selectedIndex]);
        }
        break;
    }
  }, [open, totalItems, flatItems, selectedIndex, onSelect, onClose]);
  
  // Attach keyboard listener
  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && open) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, open]);
  
  if (!open || totalItems === 0) return null;
  
  // Calculate position
  const popoverStyle: React.CSSProperties = {};
  if (anchorRect && containerRef?.current) {
    const containerRect = containerRef.current.getBoundingClientRect();
    popoverStyle.position = 'absolute';
    popoverStyle.left = anchorRect.left - containerRect.left;
    popoverStyle.bottom = containerRect.bottom - anchorRect.top + 4;
  }
  
  let currentIndex = 0;
  
  return (
    <div 
      className="absolute z-50 w-80 rounded-lg border bg-popover shadow-lg"
      style={popoverStyle}
    >
      <Command className="rounded-lg" shouldFilter={false}>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {query ? `Searching: ${query}` : 'Select a tool or resource'}
          </span>
        </div>
        <CommandList ref={listRef} className="max-h-[300px]">
          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
            No tools or resources found
          </CommandEmpty>
          
          {Array.from(groupedMentions.entries()).map(([serverName, items]) => (
            <CommandGroup key={serverName} heading={serverName}>
              {items.map((item) => {
                const itemIndex = currentIndex++;
                const isSelected = itemIndex === selectedIndex;
                
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    data-selected={isSelected}
                    onSelect={() => onSelect(item)}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2 cursor-pointer',
                      isSelected && 'bg-accent'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                      {getMentionIcon(item.type)}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.label}</span>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                          {getMentionTypeLabel(item.type)}
                        </span>
                      </div>
                      {item.description && (
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        
        <div className="border-t px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> Close
            </span>
          </div>
        </div>
      </Command>
    </div>
  );
}

/**
 * MentionBadge - Display selected mentions in input
 */
interface MentionBadgeProps {
  item: MentionItem;
  onRemove?: () => void;
}

export function MentionBadge({ item, onRemove }: MentionBadgeProps) {
  const t = useTranslations('accessibility');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
        'bg-primary/10 text-primary border border-primary/20',
        'hover:bg-primary/20 transition-colors cursor-default'
      )}
    >
      {getMentionIcon(item.type)}
      <span>{item.serverName}:{item.label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:text-destructive"
          aria-label={t('removeMention')}
        >
          ×
        </button>
      )}
    </span>
  );
}

/**
 * MentionChip - Inline mention chip for display in messages
 */
interface MentionChipProps {
  serverId: string;
  name: string;
  type: 'tool' | 'resource' | 'prompt';
  onClick?: () => void;
}

export function MentionChip({ serverId, name, type, onClick }: MentionChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        'hover:bg-blue-500/20 transition-colors',
        onClick && 'cursor-pointer'
      )}
    >
      {type === 'tool' && <Wrench className="h-3 w-3" />}
      {type === 'resource' && <FileText className="h-3 w-3" />}
      {type === 'prompt' && <MessageSquare className="h-3 w-3" />}
      <span>@{serverId}:{name}</span>
    </button>
  );
}

export default MentionPopover;
