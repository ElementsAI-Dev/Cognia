/**
 * Academic Store - Collection Slice
 * Collection CRUD and paper-collection associations
 */

import { invoke } from '@tauri-apps/api/core';
import type { PaperCollection } from '@/types/academic';
import type { AcademicState } from '../academic-store';

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

export function createCollectionSlice(
  set: (updater: ((state: AcademicState) => Partial<AcademicState>) | Partial<AcademicState>) => void,
  get: () => AcademicState
): CollectionActions {
  return {
    createCollection: async (name, description, color) => {
      set({ isLoading: true, error: null });
      try {
        const collection = await invoke<PaperCollection>('academic_create_collection', {
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
        const updated = await invoke<PaperCollection>('academic_update_collection', {
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
        await invoke('academic_delete_collection', { collectionId });

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
        await invoke('academic_add_paper_to_collection', { paperId, collectionId });
        await get().refreshLibrary();
        await get().refreshCollections();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    removeFromCollection: async (paperId, collectionId) => {
      try {
        await invoke('academic_remove_paper_from_collection', { paperId, collectionId });
        await get().refreshLibrary();
        await get().refreshCollections();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    refreshCollections: async () => {
      try {
        const collections = await invoke<PaperCollection[]>('academic_get_collections');

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
  };
}
