'use client';

/**
 * Git Commit Search - Multi-mode commit search
 *
 * Provides:
 * - Search bar with mode selector (message/author/hash/file/content)
 * - Debounced search
 * - Results list with commit info
 * - Click to view commit details
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Loader2,
  AlertCircle,
  GitCommit,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { searchCommits } from '@/lib/native/git/search';
import type { GitSearchMode } from '@/lib/native/git/search';
import type { GitCommitInfo } from '@/types/system/git';
import { formatCommitDate } from '@/types/system/git';

export interface GitCommitSearchProps {
  repoPath: string;
  onCommitClick?: (commit: GitCommitInfo) => void;
  className?: string;
}

const SEARCH_MODES: GitSearchMode[] = ['message', 'author', 'hash', 'file', 'content'];

export function GitCommitSearch({
  repoPath,
  onCommitClick,
  className,
}: GitCommitSearchProps) {
  const t = useTranslations('git');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<GitSearchMode>('message');
  const [results, setResults] = useState<GitCommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(
    async (q: string, m: GitSearchMode) => {
      if (!q.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      try {
        const result = await searchCommits({
          repoPath,
          mode: m,
          query: q.trim(),
          maxCount: 50,
        });
        if (result.success && result.data) {
          setResults(result.data);
        } else {
          setError(result.error || 'Search failed');
          setResults([]);
        }
      } catch (err) {
        setError(String(err));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath]
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query, mode);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, doSearch]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('search.title')}</h2>
        </div>
        <div className="flex gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as GitSearchMode)}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {t(`search.mode.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('');
                }
              }}
              placeholder={t('search.placeholder')}
              className="pl-8 h-9 text-sm"
            />
          </div>
          {isLoading && (
            <div className="flex items-center px-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {error && !isLoading && (
          <div className="flex items-center gap-2 p-4 m-4 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && !hasSearched && (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">{t('search.hint')}</p>
          </div>
        )}

        {!isLoading && !error && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <GitCommit className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t('search.noResults')}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y">
            {results.map((commit) => (
              <button
                key={commit.hash}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                onClick={() => onCommitClick?.(commit)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {commit.shortHash}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {commit.author}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {formatCommitDate(commit.date)}
                  </span>
                </div>
                <p className="text-sm truncate">{commit.message}</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
