/**
 * useAcademic - Hook for academic mode functionality
 * 
 * Provides easy access to paper search, library management, and AI analysis
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useAcademicStore } from '@/stores/academic';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import type {
  Paper,
  LibraryPaper,
  PaperCollection,
  AcademicProviderType,
  PaperSearchFilter,
  PaperAnalysisType,
} from '@/types/academic';

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
  activeTab: 'search' | 'library' | 'collections' | 'analysis' | 'stats' | 'compare' | 'recommend' | 'smart';
  viewMode: 'grid' | 'list' | 'table';
  isLoading: boolean;
  error: string | null;
  
  // Search actions
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
  createCollection: (name: string, description?: string, color?: string) => Promise<PaperCollection>;
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
  setActiveTab: (tab: 'search' | 'library' | 'collections' | 'analysis' | 'stats' | 'compare' | 'recommend' | 'smart') => void;
  selectPaper: (paperId: string | null) => void;
  selectCollection: (collectionId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list' | 'table') => void;
  
  // Import/Export
  importBibtex: (data: string) => Promise<number>;
  exportBibtex: (paperIds?: string[]) => Promise<string>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useAcademic(): UseAcademicReturn {
  const academicStore = useAcademicStore();
  const learningStore = useLearningStore();
  const sessionStore = useSessionStore();
  
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
  
  // Search actions
  const search = useCallback(async (query: string) => {
    academicStore.setSearchQuery(query);
    await academicStore.searchPapers(query);
  }, [academicStore]);
  
  const searchWithProvider = useCallback(async (provider: AcademicProviderType, query: string) => {
    await academicStore.searchWithProvider(provider, query);
  }, [academicStore]);
  
  const clearSearch = useCallback(() => {
    academicStore.clearSearchResults();
  }, [academicStore]);
  
  // Library actions
  const addToLibrary = useCallback(async (paper: Paper, collectionId?: string) => {
    return await academicStore.addToLibrary(paper, collectionId);
  }, [academicStore]);
  
  const removeFromLibrary = useCallback(async (paperId: string) => {
    await academicStore.removeFromLibrary(paperId);
  }, [academicStore]);
  
  const updatePaperStatus = useCallback(async (paperId: string, status: string) => {
    await academicStore.updatePaper(paperId, { readingStatus: status as LibraryPaper['readingStatus'] });
  }, [academicStore]);
  
  const updatePaperRating = useCallback(async (paperId: string, rating: number) => {
    await academicStore.updatePaper(paperId, { userRating: rating });
  }, [academicStore]);
  
  const addPaperNote = useCallback(async (paperId: string, note: string) => {
    await academicStore.updatePaper(paperId, { userNotes: note });
  }, [academicStore]);
  
  // Collection actions
  const createCollection = useCallback(async (name: string, description?: string, color?: string) => {
    return await academicStore.createCollection(name, description, color);
  }, [academicStore]);
  
  const deleteCollection = useCallback(async (collectionId: string) => {
    await academicStore.deleteCollection(collectionId);
  }, [academicStore]);
  
  const addToCollection = useCallback(async (paperId: string, collectionId: string) => {
    await academicStore.addToCollection(paperId, collectionId);
  }, [academicStore]);
  
  const removeFromCollection = useCallback(async (paperId: string, collectionId: string) => {
    await academicStore.removeFromCollection(paperId, collectionId);
  }, [academicStore]);
  
  // PDF actions
  const downloadPdf = useCallback(async (paperId: string, pdfUrl: string) => {
    return await academicStore.downloadPdf(paperId, pdfUrl);
  }, [academicStore]);
  
  const hasPdf = useCallback((paperId: string) => {
    const paper = academicStore.library.papers[paperId];
    return paper?.hasCachedPdf || false;
  }, [academicStore.library.papers]);
  
  // Analysis actions
  const analyzePaper = useCallback(async (paperId: string, analysisType: PaperAnalysisType) => {
    const paper = academicStore.library.papers[paperId];
    if (!paper) {
      throw new Error('Paper not found in library');
    }
    
    // This would integrate with AI to analyze the paper
    // For now, return a placeholder
    const analysisPrompt = buildAnalysisPrompt(paper, analysisType);
    return analysisPrompt;
  }, [academicStore.library.papers]);
  
  const startGuidedLearning = useCallback((paperId: string) => {
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
  }, [academicStore.library.papers, sessionStore.activeSessionId, learningStore]);
  
  // UI actions
  const selectPaper = useCallback((paperId: string | null) => {
    academicStore.setSelectedPaper(paperId);
  }, [academicStore]);
  
  const selectCollection = useCallback((collectionId: string | null) => {
    academicStore.setSelectedCollection(collectionId);
  }, [academicStore]);
  
  // Import/Export
  const importBibtex = useCallback(async (data: string) => {
    const result = await academicStore.importPapers(data, 'bibtex');
    return result.imported;
  }, [academicStore]);
  
  const exportBibtex = useCallback(async (paperIds?: string[]) => {
    const result = await academicStore.exportPapers(paperIds, undefined, 'bibtex');
    return result.data;
  }, [academicStore]);
  
  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([
      academicStore.refreshLibrary(),
      academicStore.refreshCollections(),
      academicStore.refreshStatistics(),
    ]);
  }, [academicStore]);
  
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
    
    // Search actions
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
    
    // Refresh
    refresh,
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
    'summary': `${baseContext}\n\nPlease provide a comprehensive summary of this paper, including the main contributions, methodology, and key findings.`,
    'key-insights': `${baseContext}\n\nIdentify and explain the key insights and takeaways from this paper.`,
    'methodology': `${baseContext}\n\nAnalyze and explain the methodology used in this paper in detail.`,
    'findings': `${baseContext}\n\nSummarize the main findings and results presented in this paper.`,
    'limitations': `${baseContext}\n\nIdentify and discuss the limitations mentioned or implied in this paper.`,
    'future-work': `${baseContext}\n\nWhat future work directions does this paper suggest or imply?`,
    'related-work': `${baseContext}\n\nDiscuss how this paper relates to and builds upon previous work in the field.`,
    'technical-details': `${baseContext}\n\nExplain the technical details and implementation aspects of this paper.`,
    'comparison': `${baseContext}\n\nCompare this paper's approach with other methods in the field.`,
    'critique': `${baseContext}\n\nProvide a critical analysis of this paper, discussing both strengths and weaknesses.`,
    'eli5': `${baseContext}\n\nExplain this paper in simple terms that a non-expert could understand.`,
    'custom': baseContext,
  };
  
  return prompts[analysisType] || baseContext;
}

export default useAcademic;
