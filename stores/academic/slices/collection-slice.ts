/**
 * Academic Store - Collection Slice
 * Collection CRUD and paper-collection associations
 */

import { academicRuntimeInvoke } from '@/lib/native/academic-runtime';
import type { PaperCollection } from '@/types/academic';
import type { AcademicSliceCreator } from '../types';

// ============================================================================
// Collection Actions Type
// ============================================================================

export interface CollectionActions {
  createCollection: (name: string, description?: string, color?: string) => Promise<PaperCollection>;
  updateCollection: (collectionId: string, updates: Partial<PaperCollection>) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  addToCollection: (paperId: string, collectionId: string) => Promise<void>;
  removeFromCollection: (paperId: string, collectionId: string) => Promise<void>;
  refreshCollections: () => Promise<void>;
}

// ============================================================================
// Collection Slice Creator
// ============================================================================

export const createCollectionSlice: AcademicSliceCreator<CollectionActions> = (set, get) => ({
    createCollection: async (name, description, color) => {
      set({ isLoading: true, error: null });
      try {
        const collection = await academicRuntimeInvoke<PaperCollection>('academic_create_collection', {
          name,
          description,
          color,
          parentId: null,
        });

        set((state) => ({
          library: {
            ...state.library,
            collections: { ...state.library.collections, [collection.id]: collection },
          },
          isLoading: false,
        }));

        return collection;
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    updateCollection: async (collectionId, updates) => {
      set({ isLoading: true, error: null });
      try {
        const updated = await academicRuntimeInvoke<PaperCollection>('academic_update_collection', {
          collectionId,
          updates,
        });

        set((state) => ({
          library: {
            ...state.library,
            collections: { ...state.library.collections, [collectionId]: updated },
          },
          isLoading: false,
        }));
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    deleteCollection: async (collectionId) => {
      set({ isLoading: true, error: null });
      try {
        await academicRuntimeInvoke('academic_delete_collection', { collectionId });

        set((state) => {
          const collections = { ...state.library.collections };
          delete collections[collectionId];
          return {
            library: { ...state.library, collections },
            isLoading: false,
          };
        });
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    addToCollection: async (paperId, collectionId) => {
      try {
        await academicRuntimeInvoke('academic_add_paper_to_collection', { paperId, collectionId });
        await get().refreshLibrary();
        await get().refreshCollections();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    removeFromCollection: async (paperId, collectionId) => {
      try {
        await academicRuntimeInvoke('academic_remove_paper_from_collection', { paperId, collectionId });
        await get().refreshLibrary();
        await get().refreshCollections();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    refreshCollections: async () => {
      try {
        const collections = await academicRuntimeInvoke<PaperCollection[]>('academic_get_collections');

        const collectionsMap: Record<string, PaperCollection> = {};
        for (const collection of collections) {
          collectionsMap[collection.id] = collection;
        }

        set((state) => ({
          library: { ...state.library, collections: collectionsMap },
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },
});
