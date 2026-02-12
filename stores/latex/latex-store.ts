/**
 * LaTeX Store - Zustand state management for LaTeX documents
 *
 * Manages document history, version control, citation library, and editor settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  LaTeXVersionControlService,
  serializeVersionControl,
  deserializeVersionControl,
  type SerializedVersionControl,
} from '@/lib/latex/version-control';
import type { LaTeXVersionEntry } from '@/types/latex';
import {
  createCitationLibrary,
  addToCitationLibrary,
  removeFromCitationLibrary,
  markCitationUsed,
  exportLibraryToBibTeX,
  type CitationLibrary,
  type CitationEntry,
} from '@/lib/latex/citation-inserter';
import type { Paper } from '@/types/academic';

// ============================================================================
// Types
// ============================================================================

export interface LaTeXDocument {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  templateId?: string;
}

export interface LaTeXEditorSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveIntervalMs: number;
  previewEnabled: boolean;
  splitMode: 'horizontal' | 'vertical';
  mathRenderer: 'mathjax' | 'katex';
}

export interface LaTeXState {
  // Documents
  documents: Record<string, LaTeXDocument>;
  currentDocumentId: string | null;
  documentHistory: LaTeXDocument[];

  // Version control
  versionControlService: LaTeXVersionControlService | null;

  // Citation library
  citationLibrary: CitationLibrary;

  // Editor settings
  settings: LaTeXEditorSettings;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Document actions
  createDocument: (name?: string, content?: string, templateId?: string) => LaTeXDocument;
  saveDocument: (content: string, name?: string) => void;
  loadDocument: (documentId: string) => LaTeXDocument | null;
  deleteDocument: (documentId: string) => void;
  renameDocument: (documentId: string, newName: string) => void;
  duplicateDocument: (documentId: string) => LaTeXDocument | null;

  // Version control actions
  initVersionControl: (documentId: string) => void;
  createVersion: (message?: string) => string | null;
  restoreVersion: (versionId: string) => boolean;
  getVersionHistory: () => Array<{ id: string; timestamp: number; message?: string }>;

  // Citation actions
  addCitation: (paper: Paper, collection?: string) => CitationEntry;
  removeCitation: (key: string) => boolean;
  useCitation: (key: string) => void;
  exportCitations: () => string;
  getCitation: (key: string) => CitationEntry | undefined;

  // Settings actions
  updateSettings: (settings: Partial<LaTeXEditorSettings>) => void;
  resetSettings: () => void;

  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_SETTINGS: LaTeXEditorSettings = {
  theme: 'system',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  lineNumbers: true,
  wordWrap: true,
  autoSave: true,
  autoSaveIntervalMs: 30000,
  previewEnabled: true,
  splitMode: 'vertical',
  mathRenderer: 'katex',
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useLatexStore = create<LaTeXState>()(
  persist(
    (set, get) => ({
      // Initial state
      documents: {},
      currentDocumentId: null,
      documentHistory: [],
      versionControlService: null,
      citationLibrary: createCitationLibrary(),
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      // Document actions
      createDocument: (name, content = '', templateId) => {
        const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const now = Date.now();
        const doc: LaTeXDocument = {
          id,
          name: name || `Document ${Object.keys(get().documents).length + 1}`,
          content,
          createdAt: now,
          updatedAt: now,
          templateId,
        };

        set((state) => ({
          documents: { ...state.documents, [id]: doc },
          currentDocumentId: id,
          documentHistory: [doc, ...state.documentHistory].slice(0, 50),
        }));

        return doc;
      },

      saveDocument: (content, name) => {
        const { currentDocumentId, documents } = get();

        if (!currentDocumentId) {
          // Create new document if none exists
          get().createDocument(name, content);
          return;
        }

        const doc = documents[currentDocumentId];
        if (!doc) return;

        const updatedDoc: LaTeXDocument = {
          ...doc,
          content,
          name: name || doc.name,
          updatedAt: Date.now(),
        };

        set((state) => ({
          documents: { ...state.documents, [currentDocumentId]: updatedDoc },
          documentHistory: [
            updatedDoc,
            ...state.documentHistory.filter((d) => d.id !== currentDocumentId),
          ].slice(0, 50),
        }));
      },

      loadDocument: (documentId) => {
        const doc = get().documents[documentId];
        if (!doc) return null;

        set({ currentDocumentId: documentId });
        return doc;
      },

      deleteDocument: (documentId) => {
        set((state) => {
          const { [documentId]: _, ...remainingDocs } = state.documents;
          return {
            documents: remainingDocs,
            currentDocumentId:
              state.currentDocumentId === documentId ? null : state.currentDocumentId,
            documentHistory: state.documentHistory.filter((d) => d.id !== documentId),
          };
        });
      },

      renameDocument: (documentId, newName) => {
        set((state) => {
          const doc = state.documents[documentId];
          if (!doc) return state;

          const updatedDoc = { ...doc, name: newName, updatedAt: Date.now() };
          return {
            documents: { ...state.documents, [documentId]: updatedDoc },
          };
        });
      },

      duplicateDocument: (documentId) => {
        const doc = get().documents[documentId];
        if (!doc) return null;

        return get().createDocument(`${doc.name} (Copy)`, doc.content, doc.templateId);
      },

      // Version control actions
      initVersionControl: (documentId) => {
        const doc = get().documents[documentId];
        if (!doc) return;

        const service = new LaTeXVersionControlService();
        service.initDocument(documentId, doc.content);
        set({ versionControlService: service });
      },

      createVersion: (message) => {
        const { versionControlService, currentDocumentId, documents } = get();
        if (!versionControlService || !currentDocumentId) return null;

        const doc = documents[currentDocumentId];
        if (!doc) return null;

        const version = versionControlService.createVersion(currentDocumentId, doc.content, message);
        return version?.id ?? null;
      },

      restoreVersion: (versionId) => {
        const { versionControlService, currentDocumentId } = get();
        if (!versionControlService || !currentDocumentId) return false;

        // Find version number from versionId
        const history = versionControlService.getHistory(currentDocumentId);
        if (!history) return false;

        const versionEntry = history.versions.find((v: LaTeXVersionEntry) => v.id === versionId);
        if (!versionEntry) return false;

        const restoredVersion = versionControlService.restoreVersion(currentDocumentId, versionEntry.version);
        if (!restoredVersion) return false;

        get().saveDocument(restoredVersion.content);
        return true;
      },

      getVersionHistory: () => {
        const { versionControlService, currentDocumentId } = get();
        if (!versionControlService || !currentDocumentId) return [];

        const history = versionControlService.getHistory(currentDocumentId);
        if (!history) return [];

        return history.versions.map((v: LaTeXVersionEntry) => ({
          id: v.id,
          timestamp: v.timestamp instanceof Date ? v.timestamp.getTime() : v.timestamp,
          message: v.message,
        }));
      },

      // Citation actions
      addCitation: (paper, collection) => {
        const { citationLibrary } = get();
        const entry = addToCitationLibrary(citationLibrary, paper, collection);
        set({ citationLibrary: { ...citationLibrary } });
        return entry;
      },

      removeCitation: (key) => {
        const { citationLibrary } = get();
        const result = removeFromCitationLibrary(citationLibrary, key);
        if (result) {
          set({ citationLibrary: { ...citationLibrary } });
        }
        return result;
      },

      useCitation: (key) => {
        const { citationLibrary } = get();
        markCitationUsed(citationLibrary, key);
        set({ citationLibrary: { ...citationLibrary } });
      },

      exportCitations: () => {
        return exportLibraryToBibTeX(get().citationLibrary);
      },

      getCitation: (key) => {
        return get().citationLibrary.entries.get(key);
      },

      // Settings actions
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },

      // Utility actions
      clearError: () => set({ error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'cognia-latex',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documents: state.documents,
        documentHistory: state.documentHistory,
        settings: state.settings,
        // Note: citationLibrary entries are Maps, need special handling
        citationLibraryData: {
          entries: Array.from(state.citationLibrary.entries.entries()),
          collections: Array.from(state.citationLibrary.collections.entries()),
          recentlyUsed: state.citationLibrary.recentlyUsed,
          favorites: state.citationLibrary.favorites,
        },
        // Version control serialization
        versionControlData: state.versionControlService
          ? serializeVersionControl(state.versionControlService)
          : null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Restore citation library from serialized data
          const stateWithData = state as unknown as {
            citationLibraryData?: {
              entries: Array<[string, CitationEntry]>;
              collections: Array<[string, string[]]>;
              recentlyUsed: string[];
              favorites: string[];
            };
            versionControlData?: SerializedVersionControl;
          };
          
          if (stateWithData.citationLibraryData) {
            state.citationLibrary = {
              entries: new Map(stateWithData.citationLibraryData.entries),
              collections: new Map(stateWithData.citationLibraryData.collections),
              recentlyUsed: stateWithData.citationLibraryData.recentlyUsed || [],
              favorites: stateWithData.citationLibraryData.favorites || [],
            };
          }
          
          // Restore version control from serialized data
          if (stateWithData.versionControlData) {
            state.versionControlService = deserializeVersionControl(stateWithData.versionControlData);
          }
        }
      },
    }
  )
);

export default useLatexStore;
