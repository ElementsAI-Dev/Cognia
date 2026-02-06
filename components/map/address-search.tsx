'use client';

/**
 * AddressSearch Component
 * Search input with autocomplete for addresses
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import { useGeocoding } from '@/hooks/map/use-geocoding';
import type { AddressSearchProps, GeocodingResult } from '@/types/map';

export function AddressSearch({
  placeholder,
  onSelect,
  onSearch,
  className,
  maxResults = 5,
}: AddressSearchProps) {
  const t = useTranslations('map');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { searchAddress, loading, error } = useGeocoding({
    limit: maxResults,
  });


  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      onSearch?.(searchQuery);

      const searchResults = await searchAddress(searchQuery);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
    },
    [searchAddress, onSearch]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    },
    [handleSearch]
  );

  const handleSelect = useCallback(
    (result: GeocodingResult) => {
      setQuery(result.displayName);
      setIsOpen(false);
      setResults([]);
      onSelect?.(result);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => results.length > 0 && setIsOpen(true)}
              placeholder={placeholder ?? t('searchPlaceholder')}
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'pl-9 pr-9'
              )}
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : query ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>{t('noResults')}</CommandEmpty>
              {results.map((result, index) => (
                <CommandItem
                  key={result.placeId ?? index}
                  value={result.displayName}
                  onSelect={() => handleSelect(result)}
                  className="flex items-start gap-2"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {result.address.city ||
                        result.address.district ||
                        result.displayName.split(',')[0]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.displayName}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default AddressSearch;
