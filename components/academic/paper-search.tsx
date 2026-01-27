'use client';

/**
 * PaperSearch - Academic paper search component
 * Supports searching across multiple providers with filters
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Filter,
  Loader2,
  Plus,
  ExternalLink,
  BookOpen,
  Calendar,
  Users,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';
import type { Paper, AcademicProviderType } from '@/types/learning/academic';
import { DEFAULT_ACADEMIC_PROVIDERS } from '@/types/learning/academic';

const PROVIDER_OPTIONS: { id: AcademicProviderType; name: string }[] = [
  { id: 'arxiv', name: 'arXiv' },
  { id: 'semantic-scholar', name: 'Semantic Scholar' },
  { id: 'core', name: 'CORE' },
  { id: 'openalex', name: 'OpenAlex' },
  { id: 'dblp', name: 'DBLP' },
];

interface PaperSearchProps {
  onPaperSelect?: (paper: Paper) => void;
  className?: string;
}

export function PaperSearch({ onPaperSelect, className }: PaperSearchProps) {
  const t = useTranslations('academic.paperSearch');
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    totalResults,
    search,
    setSearchQuery,
    setSearchFilter,
    addToLibrary,
  } = useAcademic();

  const [selectedProviders, setSelectedProviders] = useState<AcademicProviderType[]>([
    'arxiv',
    'semantic-scholar',
  ]);
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);

  const handleSearch = useCallback(async () => {
    setSearchFilter({
      providers: selectedProviders,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      openAccessOnly,
    });
    await search(searchQuery);
  }, [search, searchQuery, selectedProviders, yearFrom, yearTo, openAccessOnly, setSearchFilter]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleAddToLibrary = useCallback(
    async (paper: Paper, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await addToLibrary(paper);
      } catch (error) {
        console.error('Failed to add paper to library:', error);
      }
    },
    [addToLibrary]
  );

  const toggleProvider = useCallback((providerId: AcademicProviderType) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId) ? prev.filter((p) => p !== providerId) : [...prev, providerId]
    );
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t('providers')}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PROVIDER_OPTIONS.map((provider) => (
                      <div key={provider.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={provider.id}
                          checked={selectedProviders.includes(provider.id)}
                          onCheckedChange={() => toggleProvider(provider.id)}
                        />
                        <Label htmlFor={provider.id} className="text-sm cursor-pointer">
                          {provider.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">{t('yearFrom')}</Label>
                    <Input
                      type="number"
                      placeholder="2020"
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{t('yearTo')}</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="openAccess"
                    checked={openAccessOnly}
                    onCheckedChange={(checked) => setOpenAccessOnly(checked === true)}
                  />
                  <Label htmlFor="openAccess" className="text-sm cursor-pointer">
                    {t('openAccessOnly')}
                  </Label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t('search')}
          </Button>
        </div>

        {/* Provider badges */}
        <div className="flex flex-wrap gap-1">
          {selectedProviders.map((providerId) => (
            <Badge key={providerId} variant="secondary" className="text-xs">
              {DEFAULT_ACADEMIC_PROVIDERS[providerId]?.name || providerId}
            </Badge>
          ))}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {searchError && <div className="text-center text-destructive py-4">{searchError}</div>}

          {!isSearching && searchResults.length === 0 && searchQuery && !searchError && (
            <div className="text-center text-muted-foreground py-8">
              {t('noResults')}
            </div>
          )}

          {!isSearching && searchResults.length === 0 && !searchQuery && (
            <div className="text-center text-muted-foreground py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('emptyState')}</p>
              <p className="text-sm mt-2">{t('emptyStateHint')}</p>
            </div>
          )}

          {totalResults > 0 && (
            <div className="text-sm text-muted-foreground mb-2">
              {t('foundPapers', { count: totalResults.toLocaleString() })}
            </div>
          )}

          {searchResults.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onSelect={() => onPaperSelect?.(paper)}
              onAddToLibrary={(e) => handleAddToLibrary(paper, e)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface PaperCardProps {
  paper: Paper;
  onSelect?: () => void;
  onAddToLibrary?: (e: React.MouseEvent) => void;
}

function PaperCard({ paper, onSelect, onAddToLibrary }: PaperCardProps) {
  const t = useTranslations('academic.paperSearch');
  const authors = paper.authors
    .slice(0, 3)
    .map((a) => a.name)
    .join(', ');
  const hasMoreAuthors = paper.authors.length > 3;

  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onSelect}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium leading-tight line-clamp-2">
            {paper.title}
          </CardTitle>
          <div className="flex gap-1 shrink-0">
            {paper.pdfUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(paper.pdfUrl!, '_blank');
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddToLibrary}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <Users className="h-3 w-3" />
          {authors}
          {hasMoreAuthors && ' et al.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {paper.abstract && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{paper.abstract}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {paper.year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {paper.year}
            </span>
          )}
          {paper.venue && <span className="truncate max-w-[200px]">{paper.venue}</span>}
          {paper.citationCount !== undefined && paper.citationCount > 0 && (
            <span className="flex items-center gap-1">
              <Quote className="h-3 w-3" />
              {paper.citationCount.toLocaleString()} {t('citations')}
            </span>
          )}
          <Badge variant="outline" className="text-xs">
            {paper.providerId}
          </Badge>
          {paper.isOpenAccess && (
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
              Open Access
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PaperSearch;
