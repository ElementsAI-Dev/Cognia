'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Filter, Sparkles, Bot, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores';
import { messageRepository } from '@/lib/db';
import type { Session } from '@/types';
import type { ChatMode } from '@/types';

export interface SearchFilters {
  modes: ChatMode[];
  dateRange: 'today' | 'week' | 'month' | 'all';
  hasAttachments: boolean;
  pinned: boolean;
}

interface SessionSearchProps {
  onResultsChange?: (results: Session[]) => void;
  collapsed?: boolean;
  className?: string;
}

const modeOptions: { value: ChatMode; label: string; icon: React.ReactNode }[] = [
  { value: 'chat', label: 'Chat', icon: <Sparkles className="h-3 w-3" /> },
  { value: 'agent', label: 'Agent', icon: <Bot className="h-3 w-3" /> },
  { value: 'research', label: 'Research', icon: <Search className="h-3 w-3" /> },
  { value: 'learning', label: 'Learning', icon: <GraduationCap className="h-3 w-3" /> },
];

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
] as const;

export function SessionSearch({ onResultsChange, collapsed, className }: SessionSearchProps) {
  const t = useTranslations('sidebar');
  const sessions = useSessionStore((state) => state.sessions);
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    modes: [],
    dateRange: 'all',
    hasAttachments: false,
    pinned: false,
  });

  const hasActiveFilters = useMemo(() => {
    return filters.modes.length > 0 || 
           filters.dateRange !== 'all' || 
           filters.hasAttachments || 
           filters.pinned;
  }, [filters]);

  const filterSessions = useCallback(async (searchQuery: string, filterOptions: SearchFilters) => {
    setIsSearching(true);
    
    try {
      let filtered = [...sessions];

      // Filter by mode
      if (filterOptions.modes.length > 0) {
        filtered = filtered.filter(s => filterOptions.modes.includes(s.mode));
      }

      // Filter by date range
      if (filterOptions.dateRange !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let cutoff: Date;

        switch (filterOptions.dateRange) {
          case 'today':
            cutoff = today;
            break;
          case 'week':
            cutoff = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoff = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoff = new Date(0);
        }

        filtered = filtered.filter(s => new Date(s.updatedAt) >= cutoff);
      }

      // Filter by pinned
      if (filterOptions.pinned) {
        filtered = filtered.filter(s => s.pinned);
      }

      // Search by query
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        const searchResults: Session[] = [];

        for (const session of filtered) {
          // Search in title
          if (session.title.toLowerCase().includes(lowerQuery)) {
            searchResults.push(session);
            continue;
          }

          // Search in message content
          try {
            const messages = await messageRepository.getBySessionId(session.id);
            const hasMatch = messages.some(m => 
              m.content.toLowerCase().includes(lowerQuery)
            );
            if (hasMatch) {
              searchResults.push(session);
            }
          } catch {
            // Skip on error
          }
        }

        filtered = searchResults;
      }

      onResultsChange?.(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [sessions, onResultsChange]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query || hasActiveFilters) {
        filterSessions(query, filters);
      } else {
        onResultsChange?.(sessions);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, hasActiveFilters, filterSessions, sessions, onResultsChange]);

  const clearSearch = () => {
    setQuery('');
    setFilters({
      modes: [],
      dateRange: 'all',
      hasAttachments: false,
      pinned: false,
    });
  };

  const toggleMode = (mode: ChatMode) => {
    setFilters(prev => ({
      ...prev,
      modes: prev.modes.includes(mode)
        ? prev.modes.filter(m => m !== mode)
        : [...prev.modes, mode],
    }));
  };

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("w-full", className)}
        onClick={() => setFilterOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchChats')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 pr-8 h-9"
          />
          {(query || hasActiveFilters) && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilters ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-4">
              {/* Mode filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Mode</label>
                <div className="flex flex-wrap gap-1">
                  {modeOptions.map((mode) => (
                    <Badge
                      key={mode.value}
                      variant={filters.modes.includes(mode.value) ? "default" : "outline"}
                      className="cursor-pointer gap-1"
                      onClick={() => toggleMode(mode.value)}
                    >
                      {mode.icon}
                      {mode.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Date range filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                <div className="flex flex-wrap gap-1">
                  {dateRangeOptions.map((range) => (
                    <Badge
                      key={range.value}
                      variant={filters.dateRange === range.value ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setFilters(prev => ({ ...prev, dateRange: range.value }))}
                    >
                      {range.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Quick filters */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Quick Filters</label>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant={filters.pinned ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilters(prev => ({ ...prev, pinned: !prev.pinned }))}
                  >
                    Pinned Only
                  </Badge>
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearSearch}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {filters.modes.map((mode) => (
            <Badge key={mode} variant="secondary" className="gap-1 text-xs">
              {modeOptions.find(m => m.value === mode)?.label}
              <X
                className="h-2.5 w-2.5 cursor-pointer"
                onClick={() => toggleMode(mode)}
              />
            </Badge>
          ))}
          {filters.dateRange !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {dateRangeOptions.find(r => r.value === filters.dateRange)?.label}
              <X
                className="h-2.5 w-2.5 cursor-pointer"
                onClick={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
              />
            </Badge>
          )}
          {filters.pinned && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Pinned
              <X
                className="h-2.5 w-2.5 cursor-pointer"
                onClick={() => setFilters(prev => ({ ...prev, pinned: false }))}
              />
            </Badge>
          )}
        </div>
      )}

      {isSearching && (
        <p className="text-xs text-muted-foreground">{t('searching')}</p>
      )}
    </div>
  );
}

export default SessionSearch;
