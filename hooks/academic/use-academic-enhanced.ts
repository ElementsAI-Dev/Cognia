/**
 * useAcademicEnhanced - Enhanced hook for academic mode with A2UI and web search integration
 *
 * Extends useAcademic with:
 * - Direct API-based academic search (no Tauri dependency)
 * - A2UI surface generation for search results and analysis
 * - Web search integration for finding related resources
 * - AI-powered paper analysis
 */

'use client';

import { useCallback, useState } from 'react';
import { useAcademic } from './use-academic';
import { useA2UI } from '@/hooks/a2ui/use-a2ui';
import { useSettingsStore } from '@/stores/settings';

type SupportedAcademicProvider =
  | 'arxiv'
  | 'semantic-scholar'
  | 'core'
  | 'openalex'
  | 'dblp'
  | 'huggingface-papers';
import {
  executeAcademicSearch,
  type AcademicSearchInput,
  type AcademicSearchResult,
} from '@/lib/ai/tools/academic-search-tool';
import {
  executeAcademicAnalysis,
  type AcademicAnalysisInput,
  type AcademicAnalysisResult,
} from '@/lib/ai/tools/academic-analysis-tool';
import {
  createSearchResultsSurface,
  createAnalysisPanelSurface,
  createPaperCardSurface,
  createPaperComparisonSurface,
} from '@/lib/a2ui/academic-templates';
import type { Paper, LibraryPaper, PaperAnalysisType } from '@/types/learning/academic';

export interface UseAcademicEnhancedOptions {
  enableA2UI?: boolean;
  enableWebSearch?: boolean;
  defaultProviders?: SupportedAcademicProvider[];
}

export interface UseAcademicEnhancedReturn {
  // From base useAcademic
  searchQuery: string;
  searchResults: Paper[];
  isSearching: boolean;
  searchError: string | null;
  totalResults: number;
  libraryPapers: LibraryPaper[];

  // Enhanced search
  searchPapersEnhanced: (
    query: string,
    options?: Partial<AcademicSearchInput>
  ) => Promise<AcademicSearchResult>;
  lastSearchResult: AcademicSearchResult | null;

  // A2UI integration
  createSearchResultsUI: (papers: Paper[], query: string) => string | null;
  createPaperCardUI: (paper: Paper) => string | null;
  createAnalysisUI: (
    paper: Paper,
    analysisType: PaperAnalysisType,
    content: string
  ) => string | null;
  createComparisonUI: (papers: Paper[], content: string) => string | null;

  // Analysis
  analyzePaperEnhanced: (
    paper: Paper | LibraryPaper,
    analysisType: PaperAnalysisType
  ) => Promise<AcademicAnalysisResult>;
  lastAnalysisResult: AcademicAnalysisResult | null;
  isAnalyzing: boolean;

  // Web search integration
  searchWebForPaper: (paper: Paper) => Promise<void>;
  findRelatedPapers: (paper: Paper) => Promise<Paper[]>;

  // Combined actions
  searchAndDisplay: (query: string) => Promise<string | null>;
  analyzeAndDisplay: (
    paper: Paper | LibraryPaper,
    analysisType: PaperAnalysisType
  ) => Promise<string | null>;

  // Base hook re-exports
  addToLibrary: (paper: Paper, collectionId?: string) => Promise<LibraryPaper>;
  setSearchQuery: (query: string) => void;
}

export function useAcademicEnhanced(
  options: UseAcademicEnhancedOptions = {}
): UseAcademicEnhancedReturn {
  const {
    enableA2UI = true,
    enableWebSearch = true,
    defaultProviders = ['arxiv', 'semantic-scholar'] as SupportedAcademicProvider[],
  } = options;

  const baseAcademic = useAcademic();
  const a2ui = useA2UI();
  const searchProviders = useSettingsStore((state) => state.searchProviders);
  const searchEnabled = useSettingsStore((state) => state.searchEnabled);

  const [lastSearchResult, setLastSearchResult] = useState<AcademicSearchResult | null>(null);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<AcademicAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Enhanced paper search using direct API calls
   */
  const searchPapersEnhanced = useCallback(
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

  /**
   * Create A2UI surface for search results
   */
  const createSearchResultsUI = useCallback(
    (papers: Paper[], query: string): string | null => {
      if (!enableA2UI) return null;

      const { surfaceId, messages } = createSearchResultsSurface(papers, query, papers.length);
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  /**
   * Create A2UI surface for a paper card
   */
  const createPaperCardUI = useCallback(
    (paper: Paper): string | null => {
      if (!enableA2UI) return null;

      const { surfaceId, messages } = createPaperCardSurface(paper);
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  /**
   * Create A2UI surface for analysis results
   */
  const createAnalysisUI = useCallback(
    (paper: Paper, analysisType: PaperAnalysisType, content: string): string | null => {
      if (!enableA2UI) return null;

      const { surfaceId, messages } = createAnalysisPanelSurface(
        { title: paper.title, abstract: paper.abstract },
        analysisType,
        content
      );
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  /**
   * Create A2UI surface for paper comparison
   */
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

  /**
   * Enhanced paper analysis
   */
  const analyzePaperEnhanced = useCallback(
    async (
      paper: Paper | LibraryPaper,
      analysisType: PaperAnalysisType
    ): Promise<AcademicAnalysisResult> => {
      setIsAnalyzing(true);
      try {
        const input: AcademicAnalysisInput = {
          paperTitle: paper.title,
          paperAbstract: paper.abstract,
          analysisType,
          depth: 'standard',
          language: 'en',
        };

        const result = await executeAcademicAnalysis(input);
        setLastAnalysisResult(result);
        return result;
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  /**
   * Search web for related resources about a paper
   */
  const searchWebForPaper = useCallback(
    async (paper: Paper): Promise<void> => {
      if (!enableWebSearch || !searchEnabled) return;

      const searchQuery = `${paper.title} ${paper.authors[0]?.name || ''} research paper`;

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            providerSettings: searchProviders,
            options: { maxResults: 5 },
          }),
        });

        if (response.ok) {
          const _data = await response.json();
        }
      } catch (error) {
        console.error('Web search for paper failed:', error);
      }
    },
    [enableWebSearch, searchEnabled, searchProviders]
  );

  /**
   * Find related papers using academic search
   */
  const findRelatedPapers = useCallback(
    async (paper: Paper): Promise<Paper[]> => {
      const keywords = [...(paper.keywords || []), ...(paper.fieldsOfStudy || [])].slice(0, 3);

      const searchQuery =
        keywords.length > 0 ? keywords.join(' ') : paper.title.split(' ').slice(0, 5).join(' ');

      const result = await searchPapersEnhanced(searchQuery, {
        maxResults: 5,
        providers: defaultProviders as SupportedAcademicProvider[],
      });

      return result.papers.filter((p) => p.id !== paper.id);
    },
    [searchPapersEnhanced, defaultProviders]
  );

  /**
   * Combined search and display action
   */
  const searchAndDisplay = useCallback(
    async (query: string): Promise<string | null> => {
      baseAcademic.setSearchQuery(query);
      const result = await searchPapersEnhanced(query);

      if (result.success && result.papers.length > 0) {
        return createSearchResultsUI(result.papers, query);
      }
      return null;
    },
    [baseAcademic, searchPapersEnhanced, createSearchResultsUI]
  );

  /**
   * Combined analyze and display action
   */
  const analyzeAndDisplay = useCallback(
    async (
      paper: Paper | LibraryPaper,
      analysisType: PaperAnalysisType
    ): Promise<string | null> => {
      const result = await analyzePaperEnhanced(paper, analysisType);

      if (result.success) {
        return createAnalysisUI(paper, analysisType, result.analysis);
      }
      return null;
    },
    [analyzePaperEnhanced, createAnalysisUI]
  );

  return {
    // From base useAcademic
    searchQuery: baseAcademic.searchQuery,
    searchResults: baseAcademic.searchResults,
    isSearching: baseAcademic.isSearching,
    searchError: baseAcademic.searchError,
    totalResults: baseAcademic.totalResults,
    libraryPapers: baseAcademic.libraryPapers,

    // Enhanced search
    searchPapersEnhanced,
    lastSearchResult,

    // A2UI integration
    createSearchResultsUI,
    createPaperCardUI,
    createAnalysisUI,
    createComparisonUI,

    // Analysis
    analyzePaperEnhanced,
    lastAnalysisResult,
    isAnalyzing,

    // Web search integration
    searchWebForPaper,
    findRelatedPapers,

    // Combined actions
    searchAndDisplay,
    analyzeAndDisplay,

    // Base hook re-exports
    addToLibrary: baseAcademic.addToLibrary,
    setSearchQuery: baseAcademic.setSearchQuery,
  };
}

export default useAcademicEnhanced;
