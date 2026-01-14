'use client';

/**
 * FlowSearchPanel - Search and filter panel for flow chat canvas
 * Allows searching nodes by content, filtering by role, tags, etc.
 */

import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  X,
  Filter,
  User,
  Bot,
  Settings,
  Tag,
  Bookmark,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { 
  FlowCanvasSearchState, 
  FlowNodeTag,
} from '@/types/chat/flow-chat';
import type { MessageRole, UIMessage } from '@/types/core/message';

interface FlowSearchPanelProps {
  /** Current search state */
  searchState?: FlowCanvasSearchState;
  /** Available tag definitions */
  availableTags: FlowNodeTag[];
  /** All messages for searching */
  messages: UIMessage[];
  /** Callback when search state changes */
  onSearchStateChange: (state: FlowCanvasSearchState) => void;
  /** Callback when a result is clicked */
  onResultClick?: (messageId: string) => void;
  /** Callback to clear search */
  onClearSearch?: () => void;
  className?: string;
}

interface SearchResult {
  messageId: string;
  role: MessageRole;
  content: string;
  matchStart: number;
  matchEnd: number;
  matchText: string;
}

const ROLE_OPTIONS: { value: MessageRole; label: string; icon: React.ReactNode }[] = [
  { value: 'user', label: 'User', icon: <User className="h-3.5 w-3.5" /> },
  { value: 'assistant', label: 'Assistant', icon: <Bot className="h-3.5 w-3.5" /> },
  { value: 'system', label: 'System', icon: <Settings className="h-3.5 w-3.5" /> },
];

function highlightMatch(text: string, start: number, end: number): React.ReactNode {
  const before = text.slice(0, start);
  const match = text.slice(start, end);
  const after = text.slice(end);
  
  return (
    <>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{match}</mark>
      {after}
    </>
  );
}

function FlowSearchPanelComponent({
  searchState,
  availableTags,
  messages,
  onSearchStateChange,
  onResultClick,
  onClearSearch,
  className,
}: FlowSearchPanelProps) {
  const t = useTranslations('flowChat');
  // Use searchState query directly, with local state for immediate feedback
  const queryFromState = searchState?.query || '';
  const [localQuery, setLocalQuery] = useState(queryFromState);
  
  // Track if we need to sync from external state
  const prevQueryRef = useRef(queryFromState);
  if (prevQueryRef.current !== queryFromState) {
    prevQueryRef.current = queryFromState;
    // Only update if different to avoid loops
    if (localQuery !== queryFromState) {
      setLocalQuery(queryFromState);
    }
  }

  // Perform search on messages
  const performSearch = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const message of messages) {
      const content = message.content || '';
      const lowerContent = content.toLowerCase();
      const matchIndex = lowerContent.indexOf(lowerQuery);
      
      if (matchIndex !== -1) {
        // Apply filters
        if (searchState?.roleFilter?.length && !searchState.roleFilter.includes(message.role)) {
          continue;
        }
        
        results.push({
          messageId: message.id,
          role: message.role,
          content,
          matchStart: matchIndex,
          matchEnd: matchIndex + query.length,
          matchText: content.slice(
            Math.max(0, matchIndex - 30),
            Math.min(content.length, matchIndex + query.length + 30)
          ),
        });
      }
    }
    
    return results;
  }, [messages, searchState]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchState?.query) {
        const results = performSearch(localQuery);
        onSearchStateChange({
          query: localQuery,
          roleFilter: searchState?.roleFilter,
          tagFilter: searchState?.tagFilter,
          dateRange: searchState?.dateRange,
          bookmarkedOnly: searchState?.bookmarkedOnly,
          hasMediaOnly: searchState?.hasMediaOnly,
          highlightedNodeIds: results.map(r => r.messageId),
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchState, onSearchStateChange, performSearch]);

  // Compute search results
  const searchResults = useMemo(() => {
    return performSearch(localQuery);
  }, [localQuery, performSearch]);

  // Toggle role filter
  const toggleRoleFilter = useCallback((role: MessageRole) => {
    const current = searchState?.roleFilter || [];
    const newFilter = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    
    onSearchStateChange({
      ...searchState,
      query: localQuery,
      roleFilter: newFilter.length > 0 ? newFilter : undefined,
      highlightedNodeIds: searchState?.highlightedNodeIds || [],
    });
  }, [searchState, localQuery, onSearchStateChange]);

  // Toggle tag filter
  const toggleTagFilter = useCallback((tagId: string) => {
    const current = searchState?.tagFilter || [];
    const newFilter = current.includes(tagId)
      ? current.filter(t => t !== tagId)
      : [...current, tagId];
    
    onSearchStateChange({
      ...searchState,
      query: localQuery,
      tagFilter: newFilter.length > 0 ? newFilter : undefined,
      highlightedNodeIds: searchState?.highlightedNodeIds || [],
    });
  }, [searchState, localQuery, onSearchStateChange]);

  // Toggle boolean filters
  const toggleBooleanFilter = useCallback((key: 'bookmarkedOnly' | 'hasMediaOnly') => {
    onSearchStateChange({
      ...searchState,
      query: localQuery,
      [key]: !searchState?.[key],
      highlightedNodeIds: searchState?.highlightedNodeIds || [],
    });
  }, [searchState, localQuery, onSearchStateChange]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setLocalQuery('');
    onClearSearch?.();
    onSearchStateChange({
      query: '',
      highlightedNodeIds: [],
    });
  }, [onClearSearch, onSearchStateChange]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchState?.roleFilter?.length) count++;
    if (searchState?.tagFilter?.length) count++;
    if (searchState?.bookmarkedOnly) count++;
    if (searchState?.hasMediaOnly) count++;
    if (searchState?.dateRange) count++;
    return count;
  }, [searchState]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search input */}
      <div className="flex items-center gap-2 p-2 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={t('searchNodes')}
            className="pl-9 pr-8 h-9"
          />
          {localQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => setLocalQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        {/* Filter button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
              size="icon"
              className="h-9 w-9 relative"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{t('filters')}</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 text-xs"
                  >
                    {t('clearAll')}
                  </Button>
                )}
              </div>
            </div>
            
            <ScrollArea className="max-h-[300px]">
              <div className="p-3 space-y-4">
                {/* Role filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('filterByRole')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={searchState?.roleFilter?.includes(option.value) ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-7 gap-1.5"
                        onClick={() => toggleRoleFilter(option.value)}
                      >
                        {option.icon}
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Tag filter */}
                {availableTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {t('filterByTags')}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTagFilter(tag.id)}
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs transition-colors border',
                            searchState?.tagFilter?.includes(tag.id)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted hover:bg-muted/80 border-border'
                          )}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Quick filters */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('quickFilters')}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bookmarked"
                        checked={searchState?.bookmarkedOnly || false}
                        onCheckedChange={() => toggleBooleanFilter('bookmarkedOnly')}
                      />
                      <label
                        htmlFor="bookmarked"
                        className="text-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                        {t('bookmarkedOnly')}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasMedia"
                        checked={searchState?.hasMediaOnly || false}
                        onCheckedChange={() => toggleBooleanFilter('hasMediaOnly')}
                      />
                      <label
                        htmlFor="hasMedia"
                        className="text-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {t('withMediaOnly')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search results */}
      {localQuery && (
        <div className="flex-1 overflow-hidden">
          <div className="p-2 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {searchResults.length} {t('resultsFound')}
            </p>
          </div>
          <ScrollArea className="h-[calc(100%-36px)]">
            <div className="p-2 space-y-1">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('noResults')}</p>
                </div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.messageId}
                    onClick={() => onResultClick?.(result.messageId)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg transition-colors',
                      'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {result.role === 'user' ? (
                        <User className="h-3 w-3 text-muted-foreground" />
                      ) : result.role === 'assistant' ? (
                        <Bot className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Settings className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium capitalize">{result.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {highlightMatch(
                        result.matchText,
                        result.matchText.indexOf(result.content.slice(result.matchStart, result.matchEnd)),
                        result.matchText.indexOf(result.content.slice(result.matchStart, result.matchEnd)) + (result.matchEnd - result.matchStart)
                      )}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export const FlowSearchPanel = memo(FlowSearchPanelComponent);
export default FlowSearchPanel;
