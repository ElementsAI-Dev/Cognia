/**
 * Document Store - manages document state and operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DocumentType, DocumentMetadata } from '@/lib/document/document-processor';

export interface StoredDocument {
  id: string;
  filename: string;
  type: DocumentType;
  content: string;
  embeddableContent?: string;
  metadata: DocumentMetadata;
  projectId?: string;
  collectionId?: string;
  isIndexed: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  createdAt: Date;
  createdBy?: string;
}

export interface DocumentFilter {
  type?: DocumentType;
  projectId?: string;
  collectionId?: string;
  isIndexed?: boolean;
  searchQuery?: string;
}

interface DocumentState {
  // State
  documents: StoredDocument[];
  versions: Record<string, DocumentVersion[]>; // documentId -> versions
  selectedDocumentId: string | null;
  isLoading: boolean;
  error: string | null;

  // Document CRUD
  addDocument: (
    doc: Omit<StoredDocument, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'isIndexed'>
  ) => StoredDocument;
  updateDocument: (id: string, updates: Partial<StoredDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocument: (id: string) => StoredDocument | undefined;

  // Bulk operations
  addDocuments: (
    docs: Omit<StoredDocument, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'isIndexed'>[]
  ) => StoredDocument[];
  deleteDocuments: (ids: string[]) => void;
  clearAllDocuments: () => void;

  // Version management
  saveVersion: (documentId: string) => void;
  getVersions: (documentId: string) => DocumentVersion[];
  restoreVersion: (documentId: string, versionId: string) => void;

  // Selection
  selectDocument: (id: string | null) => void;
  getSelectedDocument: () => StoredDocument | undefined;

  // Filtering and search
  filterDocuments: (filter: DocumentFilter) => StoredDocument[];
  searchDocuments: (query: string) => StoredDocument[];

  // Indexing status
  markAsIndexed: (id: string, collectionId: string) => void;
  markAsNotIndexed: (id: string) => void;

  // Project association
  assignToProject: (documentId: string, projectId: string) => void;
  removeFromProject: (documentId: string) => void;
  getDocumentsByProject: (projectId: string) => StoredDocument[];

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      versions: {},
      selectedDocumentId: null,
      isLoading: false,
      error: null,

      addDocument: (input) => {
        const now = new Date();
        const doc: StoredDocument = {
          id: crypto.randomUUID(),
          ...input,
          isIndexed: false,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          documents: [...state.documents, doc],
        }));

        return doc;
      },

      updateDocument: (id, updates) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  ...updates,
                  version: d.version + 1,
                  updatedAt: new Date(),
                }
              : d
          ),
        }));
      },

      deleteDocument: (id) => {
        set((state) => {
          const { [id]: _removed, ...restVersions } = state.versions;
          return {
            documents: state.documents.filter((d) => d.id !== id),
            versions: restVersions,
            selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
          };
        });
      },

      getDocument: (id) => {
        return get().documents.find((d) => d.id === id);
      },

      addDocuments: (inputs) => {
        const now = new Date();
        const docs: StoredDocument[] = inputs.map((input) => ({
          id: crypto.randomUUID(),
          ...input,
          isIndexed: false,
          version: 1,
          createdAt: now,
          updatedAt: now,
        }));

        set((state) => ({
          documents: [...state.documents, ...docs],
        }));

        return docs;
      },

      deleteDocuments: (ids) => {
        set((state) => ({
          documents: state.documents.filter((d) => !ids.includes(d.id)),
          selectedDocumentId: ids.includes(state.selectedDocumentId || '')
            ? null
            : state.selectedDocumentId,
        }));
      },

      clearAllDocuments: () => {
        set({
          documents: [],
          versions: {},
          selectedDocumentId: null,
        });
      },

      saveVersion: (documentId) => {
        const doc = get().getDocument(documentId);
        if (!doc) return;

        const version: DocumentVersion = {
          id: crypto.randomUUID(),
          documentId,
          version: doc.version,
          content: doc.content,
          createdAt: new Date(),
        };

        set((state) => ({
          versions: {
            ...state.versions,
            [documentId]: [...(state.versions[documentId] || []), version],
          },
        }));
      },

      getVersions: (documentId) => {
        return get().versions[documentId] || [];
      },

      restoreVersion: (documentId, versionId) => {
        const versions = get().versions[documentId] || [];
        const version = versions.find((v) => v.id === versionId);
        if (!version) return;

        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  content: version.content,
                  version: d.version + 1,
                  updatedAt: new Date(),
                }
              : d
          ),
        }));
      },

      selectDocument: (id) => {
        set({ selectedDocumentId: id });
      },

      getSelectedDocument: () => {
        const { documents, selectedDocumentId } = get();
        return documents.find((d) => d.id === selectedDocumentId);
      },

      filterDocuments: (filter) => {
        const { documents } = get();
        return documents.filter((d) => {
          if (filter.type && d.type !== filter.type) return false;
          if (filter.projectId && d.projectId !== filter.projectId) return false;
          if (filter.collectionId && d.collectionId !== filter.collectionId) return false;
          if (filter.isIndexed !== undefined && d.isIndexed !== filter.isIndexed) return false;
          if (filter.searchQuery) {
            const query = filter.searchQuery.toLowerCase();
            const matchesFilename = d.filename.toLowerCase().includes(query);
            const matchesContent = d.content.toLowerCase().includes(query);
            if (!matchesFilename && !matchesContent) return false;
          }
          return true;
        });
      },

      searchDocuments: (query) => {
        const { documents } = get();
        const lowerQuery = query.toLowerCase();
        return documents.filter(
          (d) =>
            d.filename.toLowerCase().includes(lowerQuery) ||
            d.content.toLowerCase().includes(lowerQuery) ||
            d.metadata.title?.toLowerCase().includes(lowerQuery)
        );
      },

      markAsIndexed: (id, collectionId) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, isIndexed: true, collectionId, updatedAt: new Date() } : d
          ),
        }));
      },

      markAsNotIndexed: (id) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id
              ? { ...d, isIndexed: false, collectionId: undefined, updatedAt: new Date() }
              : d
          ),
        }));
      },

      assignToProject: (documentId, projectId) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId ? { ...d, projectId, updatedAt: new Date() } : d
          ),
        }));
      },

      removeFromProject: (documentId) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId ? { ...d, projectId: undefined, updatedAt: new Date() } : d
          ),
        }));
      },

      getDocumentsByProject: (projectId) => {
        return get().documents.filter((d) => d.projectId === projectId);
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'cognia-documents',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documents: state.documents.map((d) => ({
          ...d,
          createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
          updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
        })),
        versions: Object.fromEntries(
          Object.entries(state.versions).map(([key, versions]) => [
            key,
            versions.map((v) => ({
              ...v,
              createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
            })),
          ])
        ),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.documents) {
          state.documents = state.documents.map((d) => ({
            ...d,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
          }));
        }
        if (state?.versions) {
          state.versions = Object.fromEntries(
            Object.entries(state.versions).map(([key, versions]) => [
              key,
              versions.map((v) => ({
                ...v,
                createdAt: new Date(v.createdAt),
              })),
            ])
          );
        }
      },
    }
  )
);

export default useDocumentStore;
