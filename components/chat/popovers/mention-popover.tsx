'use client';

/**
 * MentionPopover - Autocomplete popover for @ mentions in chat
 * 
 * Shows available MCP tools, resources, and prompts grouped by server
 * Supports keyboard navigation, filtering, and history-based sorting
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import {
  Wrench,
  FileText,
  MessageSquare,
  Server,
  Zap,
  Star,
  Pin,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { MentionItem } from '@/types/mcp';
import { useToolHistoryStore, createToolId } from '@/stores';
import type { ToolUsageStats } from '@/types/agent/tool-history';

/** Sort mode for tools */
export type MentionSortMode = 'default' | 'recent' | 'frequent' | 'custom';

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
  /** Enable history-based sorting and badges */
  enableHistory?: boolean;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (item: MentionItem) => void;
  /** Callback when pin is toggled */
  onTogglePin?: (item: MentionItem) => void;
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

interface MentionItemRowProps {
  item: MentionItem;
  stats?: ToolUsageStats;
  isSelected: boolean;
  enableHistory: boolean;
  onSelect: (item: MentionItem) => void;
  onToggleFavorite?: (item: MentionItem) => void;
  onTogglePin?: (item: MentionItem) => void;
  toggleFavorite: (toolId: string, toolType: 'mcp' | 'skill', toolName: string, serverId?: string, serverName?: string) => void;
  togglePinned: (toolId: string) => void;
}

function MentionItemRow({
  item,
  stats,
  isSelected,
  enableHistory,
  onSelect,
  onToggleFavorite,
  onTogglePin,
  toggleFavorite,
  togglePinned,
}: MentionItemRowProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const toolId = createToolId('mcp', item.label, item.serverId);
    toggleFavorite(toolId, 'mcp', item.label, item.serverId, item.serverName);
    onToggleFavorite?.(item);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const toolId = createToolId('mcp', item.label, item.serverId);
    togglePinned(toolId);
    onTogglePin?.(item);
  };

  return (
    <CommandItem
      value={item.id}
      data-selected={isSelected}
      onSelect={() => onSelect(item)}
      className={cn(
        'flex items-start gap-3 px-3 py-2 cursor-pointer group',
        isSelected && 'bg-accent'
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
        {getMentionIcon(item.type)}
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.label}</span>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
            {getMentionTypeLabel(item.type)}
          </span>
          {enableHistory && stats && (
            <>
              {stats.isFavorite && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              {stats.totalCalls > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {stats.totalCalls}×
                </Badge>
              )}
            </>
          )}
        </div>
        {item.description && (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </span>
        )}
      </div>
      {enableHistory && item.type === 'tool' && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFavoriteClick}
            className={cn(
              'p-1 rounded hover:bg-muted transition-colors',
              stats?.isFavorite && 'text-yellow-500'
            )}
            title={stats?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={cn('h-3 w-3', stats?.isFavorite && 'fill-current')} />
          </button>
          <button
            onClick={handlePinClick}
            className={cn(
              'p-1 rounded hover:bg-muted transition-colors',
              stats?.isPinned && 'text-primary'
            )}
            title={stats?.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className={cn('h-3 w-3', stats?.isPinned && 'fill-current')} />
          </button>
        </div>
      )}
    </CommandItem>
  );
}

export function MentionPopover({
  open,
  onClose,
  onSelect,
  groupedMentions,
  query,
  anchorRect,
  containerRef,
  enableHistory = true,
  onToggleFavorite,
  onTogglePin,
}: MentionPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortMode, setSortMode] = useState<MentionSortMode>('custom');
  const listRef = useRef<HTMLDivElement>(null);
  
  // Tool history store
  const usageStats = useToolHistoryStore((state) => state.usageStats);
  const settings = useToolHistoryStore((state) => state.settings);
  const toggleFavorite = useToolHistoryStore((state) => state.toggleFavorite);
  const togglePinned = useToolHistoryStore((state) => state.togglePinned);

  // Get stats for a mention item
  const getItemStats = useCallback((item: MentionItem): ToolUsageStats | undefined => {
    if (!enableHistory || item.type === 'server') return undefined;
    const toolId = createToolId('mcp', item.label, item.serverId);
    return usageStats[toolId];
  }, [enableHistory, usageStats]);

  // Sort and organize mentions based on history
  const organizedMentions = useMemo(() => {
    if (!enableHistory || !settings.showRecentInPopover) {
      return { pinned: [], recent: [], grouped: groupedMentions };
    }

    const allItems = Array.from(groupedMentions.values()).flat();
    const pinned: MentionItem[] = [];
    const recent: MentionItem[] = [];
    const remaining = new Map<string, MentionItem[]>();

    // Separate pinned and recent items
    for (const item of allItems) {
      const stats = getItemStats(item);
      if (stats?.isPinned) {
        pinned.push(item);
      } else if (stats?.lastUsedAt) {
        recent.push(item);
      }
    }

    // Sort recent by last used date
    recent.sort((a, b) => {
      const statsA = getItemStats(a);
      const statsB = getItemStats(b);
      return (statsB?.lastUsedAt?.getTime() ?? 0) - (statsA?.lastUsedAt?.getTime() ?? 0);
    });

    // Sort based on mode for remaining items
    const sortedItems = [...allItems].filter(item => {
      const stats = getItemStats(item);
      return !stats?.isPinned;
    });

    if (sortMode === 'frequent') {
      sortedItems.sort((a, b) => {
        const statsA = getItemStats(a);
        const statsB = getItemStats(b);
        return (statsB?.totalCalls ?? 0) - (statsA?.totalCalls ?? 0);
      });
    } else if (sortMode === 'recent') {
      sortedItems.sort((a, b) => {
        const statsA = getItemStats(a);
        const statsB = getItemStats(b);
        return (statsB?.lastUsedAt?.getTime() ?? 0) - (statsA?.lastUsedAt?.getTime() ?? 0);
      });
    } else if (sortMode === 'custom') {
      // Favorites first, then by frequency
      sortedItems.sort((a, b) => {
        const statsA = getItemStats(a);
        const statsB = getItemStats(b);
        if (statsA?.isFavorite !== statsB?.isFavorite) {
          return statsA?.isFavorite ? -1 : 1;
        }
        return (statsB?.totalCalls ?? 0) - (statsA?.totalCalls ?? 0);
      });
    }

    // Regroup sorted items
    for (const item of sortedItems) {
      const key = item.serverName;
      if (!remaining.has(key)) {
        remaining.set(key, []);
      }
      remaining.get(key)!.push(item);
    }

    return {
      pinned: pinned.slice(0, 3),
      recent: recent.slice(0, settings.recentToolsCount),
      grouped: remaining,
    };
  }, [groupedMentions, enableHistory, settings, sortMode, getItemStats]);
  
  // Flatten items for keyboard navigation
  const flatItems = useMemo(() => {
    const items: MentionItem[] = [];
    items.push(...organizedMentions.pinned);
    items.push(...organizedMentions.recent.filter(r => !organizedMentions.pinned.includes(r)));
    for (const groupItems of organizedMentions.grouped.values()) {
      for (const item of groupItems) {
        if (!items.includes(item)) {
          items.push(item);
        }
      }
    }
    return items;
  }, [organizedMentions]);
  
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
      style={popoverStyle as React.CSSProperties}
    >
      <Command className="rounded-lg" shouldFilter={false}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {query ? `Searching: ${query}` : 'Select a tool or resource'}
            </span>
          </div>
          {enableHistory && !query && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortMode('recent')}
                className={cn(
                  'p-1 rounded hover:bg-muted transition-colors',
                  sortMode === 'recent' && 'bg-muted text-primary'
                )}
                title="Sort by recent"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSortMode('frequent')}
                className={cn(
                  'p-1 rounded hover:bg-muted transition-colors',
                  sortMode === 'frequent' && 'bg-muted text-primary'
                )}
                title="Sort by frequency"
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSortMode('custom')}
                className={cn(
                  'p-1 rounded hover:bg-muted transition-colors',
                  sortMode === 'custom' && 'bg-muted text-primary'
                )}
                title="Custom order (favorites first)"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <CommandList ref={listRef} className="max-h-[300px]">
          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
            No tools or resources found
          </CommandEmpty>
          
          {/* Pinned Tools */}
          {organizedMentions.pinned.length > 0 && (
            <CommandGroup heading="📌 Pinned">
              {organizedMentions.pinned.map((item) => {
                const itemIndex = currentIndex++;
                const isSelected = itemIndex === selectedIndex;
                const stats = getItemStats(item);
                
                return (
                  <MentionItemRow
                    key={`pinned-${item.id}`}
                    item={item}
                    stats={stats}
                    isSelected={isSelected}
                    enableHistory={enableHistory}
                    onSelect={onSelect}
                    onToggleFavorite={onToggleFavorite}
                    onTogglePin={onTogglePin}
                    toggleFavorite={toggleFavorite}
                    togglePinned={togglePinned}
                  />
                );
              })}
            </CommandGroup>
          )}

          {/* Recently Used */}
          {organizedMentions.recent.length > 0 && !query && (
            <CommandGroup heading="🕐 Recently Used">
              {organizedMentions.recent
                .filter(item => !organizedMentions.pinned.includes(item))
                .slice(0, 3)
                .map((item) => {
                  const itemIndex = currentIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  const stats = getItemStats(item);
                  
                  return (
                    <MentionItemRow
                      key={`recent-${item.id}`}
                      item={item}
                      stats={stats}
                      isSelected={isSelected}
                      enableHistory={enableHistory}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                      onTogglePin={onTogglePin}
                      toggleFavorite={toggleFavorite}
                      togglePinned={togglePinned}
                    />
                  );
                })}
            </CommandGroup>
          )}

          {/* All Tools by Server */}
          {Array.from(organizedMentions.grouped.entries()).map(([serverName, items]) => (
            <CommandGroup key={serverName} heading={serverName}>
              {items.map((item) => {
                // Skip if already shown in pinned or recent
                if (organizedMentions.pinned.includes(item)) return null;
                if (!query && organizedMentions.recent.slice(0, 3).includes(item)) return null;
                
                const itemIndex = currentIndex++;
                const isSelected = itemIndex === selectedIndex;
                const stats = getItemStats(item);
                
                return (
                  <MentionItemRow
                    key={item.id}
                    item={item}
                    stats={stats}
                    isSelected={isSelected}
                    enableHistory={enableHistory}
                    onSelect={onSelect}
                    onToggleFavorite={onToggleFavorite}
                    onTogglePin={onTogglePin}
                    toggleFavorite={toggleFavorite}
                    togglePinned={togglePinned}
                  />
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        
        <div className="border-t px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <Kbd>↑↓</Kbd> Navigate
            </span>
            <span>
              <Kbd>Enter</Kbd> Select
            </span>
            <span>
              <Kbd>Esc</Kbd> Close
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
