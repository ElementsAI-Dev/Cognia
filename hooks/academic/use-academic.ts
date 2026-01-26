/**
 * useAcademic - Hook for academic mode functionality
 *
 * Provides easy access to paper search, library management, and AI analysis
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAcademicStore } from '@/stores/academic';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import { useA2UI } from '@/hooks/a2ui/use-a2ui';
import { useSettingsStore } from '@/stores/settings';
import type {
  Paper,
  LibraryPaper,
  PaperCollection,
  AcademicProviderType,
  PaperSearchFilter,
  PaperAnalysisType,
  PaperReadingStatus,
  PaperAnalysisResult,
  PaperToPPTOptions,
  PaperPPTOutlineItem,
} from '@/types/learning/academic';
import {
  executePaperToPPT,
  executePaperToPPTOutline,
} from '@/lib/ai/tools/academic-ppt-tool';
import type { PPTPresentation } from '@/types/workflow';

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

export interface UseAcademicOptions {
  enableA2UI?: boolean;
  enableWebSearch?: boolean;
  defaultProviders?: SupportedAcademicProvider[];
}

export interface UseAcademicReturn {
  // Search state
  searchQuery: string;
  searchResults: Paper[];
  isSearching: boolean;
  searchError: string | null;
  totalResults: number;

  // Library state
  libraryPapers: LibraryPaper[];
  collections: PaperCollection[];
  selectedPaper: LibraryPaper | null;
  selectedCollection: PaperCollection | null;

  // UI state
  activeTab:
    | 'search'
    | 'library'
    | 'collections'
    | 'analysis'
    | 'stats'
    | 'compare'
    | 'recommend'
    | 'smart';
  viewMode: 'grid' | 'list' | 'table';
  isLoading: boolean;
  error: string | null;

  // Enhanced search
  searchPapers: (
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

  // Enhanced analysis
  analyzePaperWithAI: (
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

  // Legacy search actions
  search: (query: string) => Promise<void>;
  searchWithProvider: (provider: AcademicProviderType, query: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: Partial<PaperSearchFilter>) => void;
  clearSearch: () => void;

  // Library actions
  addToLibrary: (paper: Paper, collectionId?: string) => Promise<LibraryPaper>;
  removeFromLibrary: (paperId: string) => Promise<void>;
  updatePaperStatus: (paperId: string, status: string) => Promise<void>;
  updatePaperRating: (paperId: string, rating: number) => Promise<void>;
  addPaperNote: (paperId: string, note: string) => Promise<void>;

  // Collection actions
  createCollection: (
    name: string,
    description?: string,
    color?: string
  ) => Promise<PaperCollection>;
  deleteCollection: (collectionId: string) => Promise<void>;
  addToCollection: (paperId: string, collectionId: string) => Promise<void>;
  removeFromCollection: (paperId: string, collectionId: string) => Promise<void>;

  // PDF actions
  downloadPdf: (paperId: string, pdfUrl: string) => Promise<string>;
  hasPdf: (paperId: string) => boolean;

  // Analysis actions
  analyzePaper: (paperId: string, analysisType: PaperAnalysisType) => Promise<string>;
  startGuidedLearning: (paperId: string) => void;

  // UI actions
  setActiveTab: (
    tab:
      | 'search'
      | 'library'
      | 'collections'
      | 'analysis'
      | 'stats'
      | 'compare'
      | 'recommend'
      | 'smart'
  ) => void;
  selectPaper: (paperId: string | null) => void;
  selectCollection: (collectionId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list' | 'table') => void;

  // Import/Export
  importBibtex: (data: string) => Promise<number>;
  exportBibtex: (paperIds?: string[]) => Promise<string>;

  // Tag actions
  addTag: (paperId: string, tag: string) => Promise<void>;
  removeTag: (paperId: string, tag: string) => Promise<void>;

  // Batch actions
  selectedPaperIds: string[];
  togglePaperSelection: (paperId: string) => void;
  selectAllPapers: () => void;
  clearPaperSelection: () => void;
  batchUpdateStatus: (status: PaperReadingStatus) => Promise<void>;
  batchAddToCollection: (collectionId: string) => Promise<void>;
  batchRemove: () => Promise<void>;

  // Search history
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Analysis history
  saveAnalysisResult: (paperId: string, result: PaperAnalysisResult) => void;
  getAnalysisHistory: (paperId: string) => PaperAnalysisResult[];

  // Refresh
  refresh: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshCollections: () => Promise<void>;

  // PPT Generation
  generatePresentationFromPaper: (
    papers: Paper[],
    options?: Partial<Omit<PaperToPPTOptions, 'papers'>>
  ) => Promise<{
    success: boolean;
    presentation?: PPTPresentation;
    outline?: PaperPPTOutlineItem[];
    error?: string;
  }>;
  generatePPTOutline: (
    papers: Paper[],
    options?: Partial<Omit<PaperToPPTOptions, 'papers'>>
  ) => Promise<{
    success: boolean;
    outline?: PaperPPTOutlineItem[];
    error?: string;
  }>;
  isGeneratingPPT: boolean;
}

export function useAcademic(options: UseAcademicOptions = {}): UseAcademicReturn {
  const {
    enableA2UI = true,
    enableWebSearch = true,
    defaultProviders = ['arxiv', 'semantic-scholar'] as SupportedAcademicProvider[],
  } = options;

  const academicStore = useAcademicStore();
  const learningStore = useLearningStore();
  const sessionStore = useSessionStore();
  const a2ui = useA2UI();
  const searchProviders = useSettingsStore((state) => state.searchProviders);
  const searchEnabled = useSettingsStore((state) => state.searchEnabled);

  const [lastSearchResult, setLastSearchResult] = useState<AcademicSearchResult | null>(null);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<AcademicAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  // Computed values
  const libraryPapers = useMemo(() => {
    return Object.values(academicStore.library.papers);
  }, [academicStore.library.papers]);

  const collections = useMemo(() => {
    return Object.values(academicStore.library.collections);
  }, [academicStore.library.collections]);

  const selectedPaper = useMemo(() => {
    const { selectedPaperId } = academicStore.library;
    const papers = academicStore.library.papers;
    return selectedPaperId ? papers[selectedPaperId] || null : null;
  }, [academicStore.library]);

  const selectedCollection = useMemo(() => {
    const { selectedCollectionId } = academicStore.library;
    const colls = academicStore.library.collections;
    return selectedCollectionId ? colls[selectedCollectionId] || null : null;
  }, [academicStore.library]);

  /**
   * Enhanced paper search using direct API calls
   */
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
  const analyzePaperWithAI = useCallback(
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

      const result = await searchPapers(searchQuery, {
        maxResults: 5,
        providers: defaultProviders as SupportedAcademicProvider[],
      });

      return result.papers.filter((p) => p.id !== paper.id);
    },
    [searchPapers, defaultProviders]
  );

  /**
   * Combined search and display action
   */
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

  /**
   * Combined analyze and display action
   */
  const analyzeAndDisplay = useCallback(
    async (
      paper: Paper | LibraryPaper,
      analysisType: PaperAnalysisType
    ): Promise<string | null> => {
      const result = await analyzePaperWithAI(paper, analysisType);

      if (result.success) {
        return createAnalysisUI(paper, analysisType, result.analysis);
      }
      return null;
    },
    [analyzePaperWithAI, createAnalysisUI]
  );

  // Legacy search action
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

  // Library actions
  const addToLibrary = useCallback(
    async (paper: Paper, collectionId?: string) => {
      return await academicStore.addToLibrary(paper, collectionId);
    },
    [academicStore]
  );

  const removeFromLibrary = useCallback(
    async (paperId: string) => {
      await academicStore.removeFromLibrary(paperId);
    },
    [academicStore]
  );

  const updatePaperStatus = useCallback(
    async (paperId: string, status: string) => {
      await academicStore.updatePaper(paperId, {
        readingStatus: status as LibraryPaper['readingStatus'],
      });
    },
    [academicStore]
  );

  const updatePaperRating = useCallback(
    async (paperId: string, rating: number) => {
      await academicStore.updatePaper(paperId, { userRating: rating });
    },
    [academicStore]
  );

  const addPaperNote = useCallback(
    async (paperId: string, note: string) => {
      await academicStore.updatePaper(paperId, { userNotes: note });
    },
    [academicStore]
  );

  // Collection actions
  const createCollection = useCallback(
    async (name: string, description?: string, color?: string) => {
      return await academicStore.createCollection(name, description, color);
    },
    [academicStore]
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      await academicStore.deleteCollection(collectionId);
    },
    [academicStore]
  );

  const addToCollection = useCallback(
    async (paperId: string, collectionId: string) => {
      await academicStore.addToCollection(paperId, collectionId);
    },
    [academicStore]
  );

  const removeFromCollection = useCallback(
    async (paperId: string, collectionId: string) => {
      await academicStore.removeFromCollection(paperId, collectionId);
    },
    [academicStore]
  );

  // PDF actions
  const downloadPdf = useCallback(
    async (paperId: string, pdfUrl: string) => {
      return await academicStore.downloadPdf(paperId, pdfUrl);
    },
    [academicStore]
  );

  const hasPdf = useCallback(
    (paperId: string) => {
      const paper = academicStore.library.papers[paperId];
      return paper?.hasCachedPdf || false;
    },
    [academicStore.library.papers]
  );

  // Analysis actions
  const analyzePaper = useCallback(
    async (paperId: string, analysisType: PaperAnalysisType) => {
      const paper = academicStore.library.papers[paperId];
      if (!paper) {
        throw new Error('Paper not found in library');
      }

      // This would integrate with AI to analyze the paper
      // For now, return a placeholder
      const analysisPrompt = buildAnalysisPrompt(paper, analysisType);
      return analysisPrompt;
    },
    [academicStore.library.papers]
  );

  const startGuidedLearning = useCallback(
    (paperId: string) => {
      const paper = academicStore.library.papers[paperId];
      if (!paper) return;

      const activeSessionId = sessionStore.activeSessionId;
      if (!activeSessionId) return;

      // Start a learning session for this paper
      learningStore.startLearningSession(activeSessionId, {
        topic: paper.title,
        backgroundKnowledge: paper.abstract || '',
        learningGoals: [
          'Understand the main contributions',
          'Identify key methodology',
          'Evaluate the findings',
        ],
      });
    },
    [academicStore.library.papers, sessionStore.activeSessionId, learningStore]
  );

  // UI actions
  const selectPaper = useCallback(
    (paperId: string | null) => {
      academicStore.setSelectedPaper(paperId);
    },
    [academicStore]
  );

  const selectCollection = useCallback(
    (collectionId: string | null) => {
      academicStore.setSelectedCollection(collectionId);
    },
    [academicStore]
  );

  // Import/Export
  const importBibtex = useCallback(
    async (data: string) => {
      const result = await academicStore.importPapers(data, 'bibtex');
      return result.imported;
    },
    [academicStore]
  );

  const exportBibtex = useCallback(
    async (paperIds?: string[]) => {
      const result = await academicStore.exportPapers(paperIds, undefined, 'bibtex');
      return result.data;
    },
    [academicStore]
  );

  // Tag actions
  const addTag = useCallback(
    async (paperId: string, tag: string) => {
      await academicStore.addTag(paperId, tag);
    },
    [academicStore]
  );

  const removeTag = useCallback(
    async (paperId: string, tag: string) => {
      await academicStore.removeTag(paperId, tag);
    },
    [academicStore]
  );

  // Batch actions
  const batchUpdateStatus = useCallback(
    async (status: PaperReadingStatus) => {
      const selectedIds = academicStore.library.selectedPaperIds;
      if (selectedIds.length === 0) return;
      await academicStore.batchUpdateStatus(selectedIds, status);
    },
    [academicStore]
  );

  const batchAddToCollection = useCallback(
    async (collectionId: string) => {
      const selectedIds = academicStore.library.selectedPaperIds;
      if (selectedIds.length === 0) return;
      await academicStore.batchAddToCollection(selectedIds, collectionId);
    },
    [academicStore]
  );

  const batchRemove = useCallback(async () => {
    const selectedIds = academicStore.library.selectedPaperIds;
    if (selectedIds.length === 0) return;
    await academicStore.batchRemoveFromLibrary(selectedIds);
  }, [academicStore]);

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([
      academicStore.refreshLibrary(),
      academicStore.refreshCollections(),
      academicStore.refreshStatistics(),
    ]);
  }, [academicStore]);

  /**
   * Generate a full PPT presentation from papers
   */
  const generatePresentationFromPaper = useCallback(
    async (
      papers: Paper[],
      options?: Partial<Omit<PaperToPPTOptions, 'papers'>>
    ) => {
      setIsGeneratingPPT(true);
      try {
        const input = {
          papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            abstract: p.abstract,
            authors: p.authors,
            year: p.year,
            venue: p.venue,
          })),
          style: options?.style || 'academic',
          slideCount: options?.slideCount || 15,
          audienceLevel: options?.audienceLevel || 'graduate',
          language: options?.language || 'en',
          includeSections: options?.includeSections,
          generateImages: options?.generateImages ?? true,
          imageStyle: options?.imageStyle || 'diagram',
          includeNotes: options?.includeNotes ?? true,
          includeCitations: options?.includeCitations ?? true,
          includeReferences: options?.includeReferences ?? true,
          customInstructions: options?.customInstructions,
        };

        const result = executePaperToPPT(input);
        return result;
      } finally {
        setIsGeneratingPPT(false);
      }
    },
    []
  );

  /**
   * Generate only the outline from papers (for preview)
   */
  const generatePPTOutline = useCallback(
    async (
      papers: Paper[],
      options?: Partial<Omit<PaperToPPTOptions, 'papers'>>
    ) => {
      setIsGeneratingPPT(true);
      try {
        const input = {
          papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            abstract: p.abstract,
            authors: p.authors,
            year: p.year,
            venue: p.venue,
          })),
          style: options?.style || 'academic',
          slideCount: options?.slideCount || 15,
          audienceLevel: options?.audienceLevel || 'graduate',
          language: options?.language || 'en',
          includeSections: options?.includeSections,
          generateImages: options?.generateImages ?? true,
          imageStyle: options?.imageStyle || 'diagram',
          includeNotes: options?.includeNotes ?? true,
          includeCitations: options?.includeCitations ?? true,
          includeReferences: options?.includeReferences ?? true,
          customInstructions: options?.customInstructions,
        };

        const result = executePaperToPPTOutline(input);
        return result;
      } finally {
        setIsGeneratingPPT(false);
      }
    },
    []
  );

  return {
    // Search state
    searchQuery: academicStore.search.query,
    searchResults: academicStore.search.results,
    isSearching: academicStore.search.isSearching,
    searchError: academicStore.search.searchError,
    totalResults: academicStore.search.totalResults,

    // Library state
    libraryPapers,
    collections,
    selectedPaper,
    selectedCollection,

    // UI state
    activeTab: academicStore.activeTab,
    viewMode: academicStore.library.viewMode,
    isLoading: academicStore.isLoading,
    error: academicStore.error,

    // Enhanced search
    searchPapers,
    lastSearchResult,

    // A2UI integration
    createSearchResultsUI,
    createPaperCardUI,
    createAnalysisUI,
    createComparisonUI,

    // Enhanced analysis
    analyzePaperWithAI,
    lastAnalysisResult,
    isAnalyzing,

    // Web search integration
    searchWebForPaper,
    findRelatedPapers,

    // Combined actions
    searchAndDisplay,
    analyzeAndDisplay,

    // Legacy search actions
    search,
    searchWithProvider,
    setSearchQuery: academicStore.setSearchQuery,
    setSearchFilter: academicStore.setSearchFilter,
    clearSearch,

    // Library actions
    addToLibrary,
    removeFromLibrary,
    updatePaperStatus,
    updatePaperRating,
    addPaperNote,

    // Collection actions
    createCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,

    // PDF actions
    downloadPdf,
    hasPdf,

    // Analysis actions
    analyzePaper,
    startGuidedLearning,

    // UI actions
    setActiveTab: academicStore.setActiveTab,
    selectPaper,
    selectCollection,
    setViewMode: academicStore.setViewMode,

    // Import/Export
    importBibtex,
    exportBibtex,

    // Tag actions
    addTag,
    removeTag,

    // Batch actions
    selectedPaperIds: academicStore.library.selectedPaperIds,
    togglePaperSelection: academicStore.togglePaperSelection,
    selectAllPapers: academicStore.selectAllPapers,
    clearPaperSelection: academicStore.clearPaperSelection,
    batchUpdateStatus,
    batchAddToCollection,
    batchRemove,

    // Search history
    searchHistory: academicStore.search.searchHistory,
    addSearchHistory: academicStore.addSearchHistory,
    clearSearchHistory: academicStore.clearSearchHistory,

    // Analysis history
    saveAnalysisResult: academicStore.saveAnalysisResult,
    getAnalysisHistory: academicStore.getAnalysisHistory,

    // Refresh
    refresh,
    refreshLibrary: academicStore.refreshLibrary,
    refreshCollections: academicStore.refreshCollections,

    // PPT Generation
    generatePresentationFromPaper,
    generatePPTOutline,
    isGeneratingPPT,
  };
}

// Helper function to build analysis prompts
function buildAnalysisPrompt(paper: LibraryPaper, analysisType: PaperAnalysisType): string {
  const { title, abstract, authors } = paper;
  const authorNames = authors.map((a: { name: string }) => a.name).join(', ');

  const baseContext = `
Paper: "${title}"
Authors: ${authorNames}
${abstract ? `Abstract: ${abstract}` : ''}
`;

  const prompts: Record<PaperAnalysisType, string> = {
    summary: `${baseContext}\n\nPlease provide a comprehensive summary of this paper, including the main contributions, methodology, and key findings.`,
    'key-insights': `${baseContext}\n\nIdentify and explain the key insights and takeaways from this paper.`,
    methodology: `${baseContext}\n\nAnalyze and explain the methodology used in this paper in detail.`,
    findings: `${baseContext}\n\nSummarize the main findings and results presented in this paper.`,
    limitations: `${baseContext}\n\nIdentify and discuss the limitations mentioned or implied in this paper.`,
    'future-work': `${baseContext}\n\nWhat future work directions does this paper suggest or imply?`,
    'related-work': `${baseContext}\n\nDiscuss how this paper relates to and builds upon previous work in the field.`,
    'technical-details': `${baseContext}\n\nExplain the technical details and implementation aspects of this paper.`,
    comparison: `${baseContext}\n\nCompare this paper's approach with other methods in the field.`,
    critique: `${baseContext}\n\nProvide a critical analysis of this paper, discussing both strengths and weaknesses.`,
    eli5: `${baseContext}\n\nExplain this paper in simple terms that a non-expert could understand.`,
    custom: baseContext,
  };

  return prompts[analysisType] || baseContext;
}

export default useAcademic;
