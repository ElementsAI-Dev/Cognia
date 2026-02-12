/**
 * useAcademicSearch - Hook for academic paper search
 *
 * Handles enhanced search, A2UI integration, web search, and legacy store search
 */

'use client';

import { useCallback, useState } from 'react';
import { useAcademicStore } from '@/stores/academic';
import { useA2UI } from '@/hooks/a2ui/use-a2ui';
import { useSettingsStore } from '@/stores/settings';
import type {
  Paper,
  AcademicProviderType,
  PaperSearchFilter,
} from '@/types/academic';
import {
  executeAcademicSearch,
  type AcademicSearchInput,
  type AcademicSearchResult,
} from '@/lib/ai/tools/academic-search-tool';
import {
  createSearchResultsSurface,
  createPaperCardSurface,
  createPaperComparisonSurface,
} from '@/lib/a2ui/academic-templates';

type SupportedAcademicProvider =
  | 'arxiv'
  | 'semantic-scholar'
  | 'core'
  | 'openalex'
  | 'dblp'
  | 'huggingface-papers';

export interface UseAcademicSearchOptions {
  enableA2UI?: boolean;
  enableWebSearch?: boolean;
  defaultProviders?: SupportedAcademicProvider[];
}

export interface UseAcademicSearchReturn {
  // Search state
  searchQuery: string;
  searchResults: Paper[];
  isSearching: boolean;
  searchError: string | null;
  totalResults: number;

  // Enhanced search
  searchPapers: (
    query: string,
    options?: Partial<AcademicSearchInput>
  ) => Promise<AcademicSearchResult>;
  lastSearchResult: AcademicSearchResult | null;

  // A2UI integration
  createSearchResultsUI: (papers: Paper[], query: string) => string | null;
  createPaperCardUI: (paper: Paper) => string | null;
  createComparisonUI: (papers: Paper[], content: string) => string | null;

  // Web search integration
  searchWebForPaper: (paper: Paper) => Promise<void>;
  findRelatedPapers: (paper: Paper) => Promise<Paper[]>;

  // Combined actions
  searchAndDisplay: (query: string) => Promise<string | null>;

  // Legacy search actions
  search: (query: string) => Promise<void>;
  searchWithProvider: (provider: AcademicProviderType, query: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: Partial<PaperSearchFilter>) => void;
  clearSearch: () => void;

  // Search history
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
}

export function useAcademicSearch(
  options: UseAcademicSearchOptions = {}
): UseAcademicSearchReturn {
  const {
    enableA2UI = true,
    enableWebSearch = true,
    defaultProviders = ['arxiv', 'semantic-scholar'] as SupportedAcademicProvider[],
  } = options;

  const academicStore = useAcademicStore();
  const a2ui = useA2UI();
  const searchEnabled = useSettingsStore((state) => state.searchEnabled);

  const [lastSearchResult, setLastSearchResult] = useState<AcademicSearchResult | null>(null);

  const searchPapers = useCallback(
    async (
      query: string,
      searchOptions?: Partial<AcademicSearchInput>
    ): Promise<AcademicSearchResult> => {
      const input: AcademicSearchInput = {
        query,
        providers: searchOptions?.providers || defaultProviders,
        maxResults: searchOptions?.maxResults || 10,
        yearFrom: searchOptions?.yearFrom,
        yearTo: searchOptions?.yearTo,
        categories: searchOptions?.categories,
        openAccessOnly: searchOptions?.openAccessOnly || false,
        sortBy: searchOptions?.sortBy || 'relevance',
      };

      const result = await executeAcademicSearch(input);
      setLastSearchResult(result);
      return result;
    },
    [defaultProviders]
  );

  const createSearchResultsUI = useCallback(
    (papers: Paper[], query: string): string | null => {
      if (!enableA2UI) return null;
      const { surfaceId, messages } = createSearchResultsSurface(papers, query, papers.length);
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  const createPaperCardUI = useCallback(
    (paper: Paper): string | null => {
      if (!enableA2UI) return null;
      const { surfaceId, messages } = createPaperCardSurface(paper);
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  const createComparisonUI = useCallback(
    (papers: Paper[], content: string): string | null => {
      if (!enableA2UI) return null;
      const paperData = papers.map((p) => ({
        title: p.title,
        authors: p.authors.map((a) => a.name).join(', '),
        year: p.year,
        abstract: p.abstract,
      }));
      const { surfaceId, messages } = createPaperComparisonSurface(paperData, content);
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  const searchWebForPaper = useCallback(
    async (paper: Paper): Promise<void> => {
      if (!enableWebSearch || !searchEnabled) return;
      const searchQuery = encodeURIComponent(
        `${paper.title} ${paper.authors[0]?.name || ''}`
      );
      window.open(
        `https://www.semanticscholar.org/search?q=${searchQuery}`,
        '_blank'
      );
    },
    [enableWebSearch, searchEnabled]
  );

  const findRelatedPapers = useCallback(
    async (paper: Paper): Promise<Paper[]> => {
      const keywords = [...(paper.keywords || []), ...(paper.fieldsOfStudy || [])].slice(0, 3);
      const searchQuery =
        keywords.length > 0 ? keywords.join(' ') : paper.title.split(' ').slice(0, 5).join(' ');
      const result = await searchPapers(searchQuery, {
        maxResults: 5,
        providers: defaultProviders as SupportedAcademicProvider[],
      });
      return result.papers.filter((p) => p.id !== paper.id);
    },
    [searchPapers, defaultProviders]
  );

  const searchAndDisplay = useCallback(
    async (query: string): Promise<string | null> => {
      academicStore.setSearchQuery(query);
      const result = await searchPapers(query);
      if (result.success && result.papers.length > 0) {
        return createSearchResultsUI(result.papers, query);
      }
      return null;
    },
    [academicStore, searchPapers, createSearchResultsUI]
  );

  const search = useCallback(
    async (query: string) => {
      academicStore.setSearchQuery(query);
      await academicStore.searchPapers(query);
    },
    [academicStore]
  );

  const searchWithProvider = useCallback(
    async (provider: AcademicProviderType, query: string) => {
      await academicStore.searchWithProvider(provider, query);
    },
    [academicStore]
  );

  const clearSearch = useCallback(() => {
    academicStore.clearSearchResults();
  }, [academicStore]);

  return {
    searchQuery: academicStore.search.query,
    searchResults: academicStore.search.results,
    isSearching: academicStore.search.isSearching,
    searchError: academicStore.search.searchError,
    totalResults: academicStore.search.totalResults,
    searchPapers,
    lastSearchResult,
    createSearchResultsUI,
    createPaperCardUI,
    createComparisonUI,
    searchWebForPaper,
    findRelatedPapers,
    searchAndDisplay,
    search,
    searchWithProvider,
    setSearchQuery: academicStore.setSearchQuery,
    setSearchFilter: academicStore.setSearchFilter,
    clearSearch,
    searchHistory: academicStore.search.searchHistory,
    addSearchHistory: academicStore.addSearchHistory,
    clearSearchHistory: academicStore.clearSearchHistory,
  };
}
