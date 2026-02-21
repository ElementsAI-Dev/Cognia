/**
 * Academic Store - Library Slice
 * Library CRUD, tags, batch operations, and paper selection
 */

import { academicRuntimeInvoke } from '@/lib/native/academic-runtime';
import type {
  Paper,
  LibraryPaper,
  PaperReadingStatus,
  PaperAnalysisResult,
} from '@/types/academic';
import type { AcademicSliceCreator } from '../types';

// ============================================================================
// Library State Type
// ============================================================================

export interface LibraryState {
  papers: Record<string, LibraryPaper>;
  collections: Record<string, import('@/types/academic').PaperCollection>;
  selectedPaperId: string | null;
  selectedCollectionId: string | null;
  selectedPaperIds: string[];
  viewMode: 'grid' | 'list' | 'table';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  analysisHistory: Record<string, PaperAnalysisResult[]>;
}

export const initialLibraryState: LibraryState = {
  papers: {},
  collections: {},
  selectedPaperId: null,
  selectedCollectionId: null,
  selectedPaperIds: [],
  viewMode: 'list',
  sortBy: 'added_at',
  sortOrder: 'desc',
  analysisHistory: {},
};

// ============================================================================
// Library Actions Type
// ============================================================================

export interface LibraryActions {
  addToLibrary: (paper: Paper, collectionId?: string) => Promise<LibraryPaper>;
  removeFromLibrary: (paperId: string) => Promise<void>;
  updatePaper: (paperId: string, updates: Partial<LibraryPaper>) => Promise<void>;
  getPaper: (paperId: string) => Promise<LibraryPaper | null>;
  refreshLibrary: () => Promise<void>;
  addTag: (paperId: string, tag: string) => Promise<void>;
  removeTag: (paperId: string, tag: string) => Promise<void>;
  batchUpdateStatus: (paperIds: string[], status: PaperReadingStatus) => Promise<void>;
  batchAddToCollection: (paperIds: string[], collectionId: string) => Promise<void>;
  batchRemoveFromLibrary: (paperIds: string[]) => Promise<void>;
  togglePaperSelection: (paperId: string) => void;
  selectAllPapers: () => void;
  clearPaperSelection: () => void;
  saveAnalysisResult: (paperId: string, result: PaperAnalysisResult) => void;
  getAnalysisHistory: (paperId: string) => PaperAnalysisResult[];
  clearAnalysisHistory: (paperId: string) => void;
}

// ============================================================================
// Library Slice Creator
// ============================================================================

export const createLibrarySlice: AcademicSliceCreator<LibraryActions> = (set, get) => ({
    addToLibrary: async (paper, collectionId) => {
      set({ isLoading: true, error: null });
      try {
        const libraryPaper = await academicRuntimeInvoke<LibraryPaper>('academic_add_to_library', {
          paper,
          collectionId,
        });

        set((state) => ({
          library: {
            ...state.library,
            papers: { ...state.library.papers, [libraryPaper.id]: libraryPaper },
          },
          isLoading: false,
        }));

        return libraryPaper;
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    removeFromLibrary: async (paperId) => {
      set({ isLoading: true, error: null });
      try {
        await academicRuntimeInvoke('academic_remove_from_library', { paperId });

        set((state) => {
          const papers = { ...state.library.papers };
          delete papers[paperId];
          return {
            library: { ...state.library, papers },
            isLoading: false,
          };
        });
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    updatePaper: async (paperId, updates) => {
      set({ isLoading: true, error: null });
      try {
        const updated = await academicRuntimeInvoke<LibraryPaper>('academic_update_paper', {
          paperId,
          updates: {
            readingStatus: updates.readingStatus,
            priority: updates.priority,
            readingProgress: updates.readingProgress,
            userRating: updates.userRating,
            userNotes: updates.userNotes,
            tags: updates.tags,
            aiSummary: updates.aiSummary,
            aiKeyInsights: updates.aiKeyInsights,
            aiRelatedTopics: updates.aiRelatedTopics,
          },
        });

        set((state) => ({
          library: {
            ...state.library,
            papers: { ...state.library.papers, [paperId]: updated },
          },
          isLoading: false,
        }));
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    getPaper: async (paperId) => {
      try {
        const paper = await academicRuntimeInvoke<LibraryPaper | null>('academic_get_paper_by_id', {
          paperId,
        });
        return paper;
      } catch {
        return null;
      }
    },

    refreshLibrary: async () => {
      set({ isLoading: true, error: null });
      try {
        const papers = await academicRuntimeInvoke<LibraryPaper[]>('academic_get_library_papers', {
          filter: null,
        });

        const papersMap: Record<string, LibraryPaper> = {};
        for (const paper of papers) {
          papersMap[paper.id] = paper;
        }

        set((state) => ({
          library: { ...state.library, papers: papersMap },
          isLoading: false,
        }));
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
      }
    },

    addTag: async (paperId, tag) => {
      const state = get();
      const paper = state.library.papers[paperId];
      if (!paper) return;

      const currentTags = paper.tags || [];
      if (currentTags.includes(tag)) return;

      const newTags = [...currentTags, tag];
      await get().updatePaper(paperId, { tags: newTags });
    },

    removeTag: async (paperId, tag) => {
      const state = get();
      const paper = state.library.papers[paperId];
      if (!paper) return;

      const currentTags = paper.tags || [];
      const newTags = currentTags.filter((t) => t !== tag);
      await get().updatePaper(paperId, { tags: newTags });
    },

    batchUpdateStatus: async (paperIds, status) => {
      set({ isLoading: true, error: null });
      try {
        const results = await Promise.allSettled(
          paperIds.map((paperId) => get().updatePaper(paperId, { readingStatus: status }))
        );
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          console.error(`Batch status update: ${failures.length}/${paperIds.length} failed`);
        }
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    batchAddToCollection: async (paperIds, collectionId) => {
      set({ isLoading: true, error: null });
      try {
        const results = await Promise.allSettled(
          paperIds.map((paperId) => get().addToCollection(paperId, collectionId))
        );
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          console.error(`Batch add to collection: ${failures.length}/${paperIds.length} failed`);
        }
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    batchRemoveFromLibrary: async (paperIds) => {
      set({ isLoading: true, error: null });
      try {
        const results = await Promise.allSettled(
          paperIds.map((paperId) => get().removeFromLibrary(paperId))
        );
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          console.error(`Batch remove: ${failures.length}/${paperIds.length} failed`);
        }
        set((state) => ({
          library: { ...state.library, selectedPaperIds: [] },
          isLoading: false,
        }));
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    togglePaperSelection: (paperId) => {
      set((state) => {
        const selectedPaperIds = state.library.selectedPaperIds.includes(paperId)
          ? state.library.selectedPaperIds.filter((id) => id !== paperId)
          : [...state.library.selectedPaperIds, paperId];
        return {
          library: { ...state.library, selectedPaperIds },
        };
      });
    },

    selectAllPapers: () => {
      set((state) => ({
        library: {
          ...state.library,
          selectedPaperIds: Object.keys(state.library.papers),
        },
      }));
    },

    clearPaperSelection: () => {
      set((state) => ({
        library: { ...state.library, selectedPaperIds: [] },
      }));
    },

    saveAnalysisResult: (paperId, result) => {
      set((state) => {
        const paperHistory = state.library.analysisHistory[paperId] || [];
        const newHistory = [result, ...paperHistory].slice(0, 10);
        return {
          library: {
            ...state.library,
            analysisHistory: {
              ...state.library.analysisHistory,
              [paperId]: newHistory,
            },
          },
        };
      });
    },

    getAnalysisHistory: (paperId) => {
      return get().library.analysisHistory[paperId] || [];
    },

    clearAnalysisHistory: (paperId) => {
      set((state) => {
        const analysisHistory = { ...state.library.analysisHistory };
        delete analysisHistory[paperId];
        return {
          library: { ...state.library, analysisHistory },
        };
      });
    },
});
