'use client';

/**
 * ConversationSearch - Search within conversation messages
 */

import { useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types';

interface ConversationSearchProps {
  messages: UIMessage[];
  onNavigateToMessage?: (messageId: string) => void;
  onClose?: () => void;
  className?: string;
}

interface SearchResult {
  message: UIMessage;
  matchIndex: number;
  matchText: string;
  context: string;
}

export function ConversationSearch({
  messages,
  onNavigateToMessage,
  onClose,
  className,
}: ConversationSearchProps) {
  const [query, setQuery] = useState('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  const searchResults = useMemo(() => {
    if (!query.trim() && !showBookmarkedOnly) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    const filteredMessages = showBookmarkedOnly
      ? messages.filter((m) => m.isBookmarked)
      : messages;

    for (const message of filteredMessages) {
      if (!query.trim()) {
        // If only showing bookmarked, include all bookmarked messages
        results.push({
          message,
          matchIndex: 0,
          matchText: '',
          context: message.content.slice(0, 100),
        });
        continue;
      }

      const content = message.content.toLowerCase();
      let searchIndex = 0;
      let matchIndex = content.indexOf(lowerQuery, searchIndex);

      while (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 30);
        const end = Math.min(message.content.length, matchIndex + query.length + 30);
        const context = message.content.slice(start, end);

        results.push({
          message,
          matchIndex,
          matchText: message.content.slice(matchIndex, matchIndex + query.length),
          context: (start > 0 ? '...' : '') + context + (end < message.content.length ? '...' : ''),
        });

        searchIndex = matchIndex + 1;
        matchIndex = content.indexOf(lowerQuery, searchIndex);
      }
    }

    return results;
  }, [messages, query, showBookmarkedOnly]);

  const handlePrevious = useCallback(() => {
    setCurrentResultIndex((prev) =>
      prev > 0 ? prev - 1 : searchResults.length - 1
    );
  }, [searchResults.length]);

  const handleNext = useCallback(() => {
    setCurrentResultIndex((prev) =>
      prev < searchResults.length - 1 ? prev + 1 : 0
    );
  }, [searchResults.length]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onNavigateToMessage?.(result.message.id);
    },
    [onNavigateToMessage]
  );

  // currentResult can be used for highlighting in the main chat view
  const _currentResult = searchResults[currentResultIndex];

  return (
    <div className={cn('flex flex-col bg-background border rounded-lg shadow-lg', className)}>
      {/* Search Input */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentResultIndex(0);
          }}
          placeholder="Search in conversation..."
          className="border-0 focus-visible:ring-0 h-8"
          autoFocus
        />
        <Button
          variant={showBookmarkedOnly ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          title="Show bookmarked only"
        >
          <Bookmark className={cn('h-4 w-4', showBookmarkedOnly && 'fill-current')} />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results Count & Navigation */}
      {searchResults.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {currentResultIndex + 1} of {searchResults.length} results
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevious}
              disabled={searchResults.length <= 1}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNext}
              disabled={searchResults.length <= 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Results List */}
      {searchResults.length > 0 ? (
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {searchResults.map((result, index) => (
              <button
                key={`${result.message.id}-${result.matchIndex}`}
                onClick={() => handleResultClick(result)}
                className={cn(
                  'w-full text-left p-2 rounded-md transition-colors',
                  index === currentResultIndex
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {result.message.role === 'user' ? 'You' : 'AI'}
                  </Badge>
                  {result.message.isBookmarked && (
                    <Bookmark className="h-3 w-3 text-primary fill-primary" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {result.message.createdAt.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">
                  {query ? (
                    <HighlightedText text={result.context} highlight={query} />
                  ) : (
                    result.context
                  )}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : query.trim() || showBookmarkedOnly ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No results found
        </div>
      ) : null}
    </div>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default ConversationSearch;
