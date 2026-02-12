/**
 * useAcademicLibrary - Hook for paper library management
 *
 * Handles library CRUD, collections, tags, batch operations, and import/export
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useAcademicStore } from '@/stores/academic';
import type {
  Paper,
  LibraryPaper,
  PaperCollection,
  PaperReadingStatus,
  PaperAnalysisResult,
} from '@/types/academic';

export interface UseAcademicLibraryReturn {
  // Library state
  libraryPapers: LibraryPaper[];
  collections: PaperCollection[];
  selectedPaper: LibraryPaper | null;
  selectedCollection: PaperCollection | null;
  viewMode: 'grid' | 'list' | 'table';
  isLoading: boolean;
  error: string | null;

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

  // UI actions
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

  // Analysis history
  saveAnalysisResult: (paperId: string, result: PaperAnalysisResult) => void;
  getAnalysisHistory: (paperId: string) => PaperAnalysisResult[];

  // Refresh
  refresh: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshCollections: () => Promise<void>;
}

export function useAcademicLibrary(): UseAcademicLibraryReturn {
  const academicStore = useAcademicStore();

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

  return {
    libraryPapers,
    collections,
    selectedPaper,
    selectedCollection,
    viewMode: academicStore.library.viewMode,
    isLoading: academicStore.isLoading,
    error: academicStore.error,
    addToLibrary,
    removeFromLibrary,
    updatePaperStatus,
    updatePaperRating,
    addPaperNote,
    createCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    downloadPdf,
    hasPdf,
    selectPaper,
    selectCollection,
    setViewMode: academicStore.setViewMode,
    importBibtex,
    exportBibtex,
    addTag,
    removeTag,
    selectedPaperIds: academicStore.library.selectedPaperIds,
    togglePaperSelection: academicStore.togglePaperSelection,
    selectAllPapers: academicStore.selectAllPapers,
    clearPaperSelection: academicStore.clearPaperSelection,
    batchUpdateStatus,
    batchAddToCollection,
    batchRemove,
    saveAnalysisResult: academicStore.saveAnalysisResult,
    getAnalysisHistory: academicStore.getAnalysisHistory,
    refresh,
    refreshLibrary: academicStore.refreshLibrary,
    refreshCollections: academicStore.refreshCollections,
  };
}
