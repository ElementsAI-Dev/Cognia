/**
 * Artifact Store - manages artifacts, canvas documents, and analysis results
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { getPluginEventHooks } from '@/lib/plugin';
import type {
  Artifact,
  ArtifactType,
  ArtifactLanguage,
  ArtifactVersion,
  CanvasDocument,
  CanvasDocumentVersion,
  CanvasSuggestion,
  AnalysisResult,
  ArtifactDetectionConfig,
  DetectedArtifact,
} from '@/types';

/**
 * Helper to ensure Date objects are properly parsed from storage
 */
function ensureDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

/**
 * Rehydrate artifact dates from storage
 */
function rehydrateArtifact(artifact: Artifact): Artifact {
  return {
    ...artifact,
    createdAt: ensureDate(artifact.createdAt),
    updatedAt: ensureDate(artifact.updatedAt),
  };
}

/**
 * Rehydrate canvas document dates from storage
 * @internal Reserved for future canvas document getters
 */
function _rehydrateCanvasDocument(doc: CanvasDocument): CanvasDocument {
  return {
    ...doc,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    versions: doc.versions?.map((v) => ({
      ...v,
      createdAt: ensureDate(v.createdAt),
    })),
  };
}

/**
 * Rehydrate analysis result dates from storage
 */
function rehydrateAnalysisResult(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    createdAt: ensureDate(result.createdAt),
  };
}

interface ArtifactState {
  // Artifacts
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  artifactVersions: Record<string, ArtifactVersion[]>;

  // Canvas
  canvasDocuments: Record<string, CanvasDocument>;
  activeCanvasId: string | null;
  canvasOpen: boolean;

  // Analysis
  analysisResults: Record<string, AnalysisResult>;

  // Panel state
  panelOpen: boolean;
  panelView: 'artifact' | 'canvas' | 'analysis';
}

interface ArtifactActions {
  // Artifact actions
  createArtifact: (params: {
    sessionId: string;
    messageId: string;
    type: ArtifactType;
    title: string;
    content: string;
    language?: ArtifactLanguage;
  }) => Artifact;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  deleteArtifact: (id: string) => void;
  getArtifact: (id: string) => Artifact | undefined;
  getSessionArtifacts: (sessionId: string) => Artifact[];
  setActiveArtifact: (id: string | null) => void;

  // Auto-detection and creation
  autoCreateFromContent: (params: {
    sessionId: string;
    messageId: string;
    content: string;
    config?: Partial<ArtifactDetectionConfig>;
  }) => Promise<Artifact[]>;

  // Artifact version history
  saveArtifactVersion: (id: string, description?: string) => ArtifactVersion | null;
  restoreArtifactVersion: (id: string, versionId: string) => void;
  getArtifactVersions: (id: string) => ArtifactVersion[];

  // Canvas actions
  createCanvasDocument: (params: {
    sessionId?: string;
    title: string;
    content: string;
    language: ArtifactLanguage;
    type: 'code' | 'text';
  }) => string;
  updateCanvasDocument: (id: string, updates: Partial<CanvasDocument>) => void;
  deleteCanvasDocument: (id: string) => void;
  setActiveCanvas: (id: string | null) => void;
  openCanvas: () => void;
  closeCanvas: () => void;

  // Canvas suggestions
  addSuggestion: (documentId: string, suggestion: Omit<CanvasSuggestion, 'id'>) => void;
  updateSuggestionStatus: (
    documentId: string,
    suggestionId: string,
    status: CanvasSuggestion['status']
  ) => void;
  applySuggestion: (documentId: string, suggestionId: string) => void;
  clearSuggestions: (documentId: string) => void;

  // Canvas version history
  saveCanvasVersion: (
    documentId: string,
    description?: string,
    isAutoSave?: boolean
  ) => CanvasDocumentVersion | null;
  restoreCanvasVersion: (documentId: string, versionId: string) => void;
  deleteCanvasVersion: (documentId: string, versionId: string) => void;
  getCanvasVersions: (documentId: string) => CanvasDocumentVersion[];
  compareVersions: (
    documentId: string,
    versionId1: string,
    versionId2: string
  ) => { v1: string; v2: string } | null;

  // Analysis actions
  addAnalysisResult: (result: Omit<AnalysisResult, 'id' | 'createdAt'>) => AnalysisResult;
  getMessageAnalysis: (messageId: string) => AnalysisResult[];

  // Panel actions
  openPanel: (view?: 'artifact' | 'canvas' | 'analysis') => void;
  closePanel: () => void;
  setPanelView: (view: 'artifact' | 'canvas' | 'analysis') => void;

  // Utility
  clearSessionData: (sessionId: string) => void;

  // Batch operations
  deleteArtifacts: (ids: string[]) => void;
  duplicateArtifact: (id: string) => Artifact | null;

  // Search and filter
  searchArtifacts: (query: string, sessionId?: string) => Artifact[];
  filterArtifactsByType: (type: ArtifactType, sessionId?: string) => Artifact[];
  getRecentArtifacts: (limit?: number) => Artifact[];
}

const initialState: ArtifactState = {
  artifacts: {},
  activeArtifactId: null,
  artifactVersions: {},
  canvasDocuments: {},
  activeCanvasId: null,
  canvasOpen: false,
  analysisResults: {},
  panelOpen: false,
  panelView: 'artifact',
};

export const useArtifactStore = create<ArtifactState & ArtifactActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Artifact actions
      createArtifact: ({ sessionId, messageId, type, title, content, language }) => {
        const artifact: Artifact = {
          id: nanoid(),
          sessionId,
          messageId,
          type,
          title,
          content,
          language,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          artifacts: { ...state.artifacts, [artifact.id]: artifact },
          activeArtifactId: artifact.id,
          panelOpen: true,
          panelView: 'artifact',
        }));

        getPluginEventHooks().dispatchArtifactCreate(artifact);

        return artifact;
      },

      updateArtifact: (id, updates) => {
        set((state) => {
          const artifact = state.artifacts[id];
          if (!artifact) return state;

          const updated = {
            ...artifact,
            ...updates,
            version: artifact.version + 1,
            updatedAt: new Date(),
          };

          getPluginEventHooks().dispatchArtifactUpdate(updated, updates);

          return {
            artifacts: { ...state.artifacts, [id]: updated },
          };
        });
      },

      deleteArtifact: (id) => {
        set((state) => {
          const { [id]: _removed, ...rest } = state.artifacts;
          getPluginEventHooks().dispatchArtifactDelete(id);
          return {
            artifacts: rest,
            activeArtifactId: state.activeArtifactId === id ? null : state.activeArtifactId,
          };
        });
      },

      getArtifact: (id) => {
        const artifact = get().artifacts[id];
        return artifact ? rehydrateArtifact(artifact) : undefined;
      },

      getSessionArtifacts: (sessionId) =>
        Object.values(get().artifacts)
          .filter((a) => a.sessionId === sessionId)
          .map(rehydrateArtifact)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),

      setActiveArtifact: (id) => {
        const previousId = get().activeArtifactId;
        set({ activeArtifactId: id });
        if (id) {
          set({ panelOpen: true, panelView: 'artifact' });
          getPluginEventHooks().dispatchArtifactOpen(id);
        } else if (previousId) {
          getPluginEventHooks().dispatchArtifactClose();
        }
      },

      // Auto-detection and creation
      autoCreateFromContent: async ({ sessionId, messageId, content, config }) => {
        // Import detection logic dynamically to avoid circular deps
        const { detectArtifacts, DEFAULT_DETECTION_CONFIG } =
          await import('@/lib/ai/generation/artifact-detector');
        const finalConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
        const detected: DetectedArtifact[] = detectArtifacts(content, finalConfig);

        const createdArtifacts: Artifact[] = [];

        for (const item of detected) {
          const artifact: Artifact = {
            id: nanoid(),
            sessionId,
            messageId,
            type: item.type,
            title: item.title,
            content: item.content,
            language: item.language,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            artifacts: { ...state.artifacts, [artifact.id]: artifact },
          }));

          createdArtifacts.push(artifact);
        }

        // Set the first artifact as active and open panel
        if (createdArtifacts.length > 0) {
          set({
            activeArtifactId: createdArtifacts[0].id,
            panelOpen: true,
            panelView: 'artifact',
          });
        }

        return createdArtifacts;
      },

      // Artifact version history
      saveArtifactVersion: (id, description) => {
        const state = get();
        const artifact = state.artifacts[id];
        if (!artifact) return null;

        const version: ArtifactVersion = {
          id: nanoid(),
          artifactId: id,
          content: artifact.content,
          version: artifact.version,
          createdAt: new Date(),
          changeDescription: description,
        };

        set((state) => ({
          artifactVersions: {
            ...state.artifactVersions,
            [id]: [...(state.artifactVersions[id] || []), version],
          },
        }));

        return version;
      },

      restoreArtifactVersion: (id, versionId) => {
        const state = get();
        const versions = state.artifactVersions[id];
        if (!versions) return;

        const version = versions.find((v) => v.id === versionId);
        if (!version) return;

        const artifact = state.artifacts[id];
        if (!artifact) return;

        // Save current state as a new version before restoring
        const currentVersion: ArtifactVersion = {
          id: nanoid(),
          artifactId: id,
          content: artifact.content,
          version: artifact.version,
          createdAt: new Date(),
          changeDescription: 'Auto-saved before restore',
        };

        set((state) => ({
          artifacts: {
            ...state.artifacts,
            [id]: {
              ...artifact,
              content: version.content,
              version: artifact.version + 1,
              updatedAt: new Date(),
            },
          },
          artifactVersions: {
            ...state.artifactVersions,
            [id]: [...(state.artifactVersions[id] || []), currentVersion],
          },
        }));
      },

      getArtifactVersions: (id) => {
        const versions = get().artifactVersions[id];
        if (!versions) return [];
        return [...versions]
          .map((v) => ({ ...v, createdAt: ensureDate(v.createdAt) }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },

      // Canvas actions
      createCanvasDocument: ({ sessionId, title, content, language, type }) => {
        const doc: CanvasDocument = {
          id: nanoid(),
          sessionId: sessionId || 'standalone',
          title,
          content,
          language,
          type,
          createdAt: new Date(),
          updatedAt: new Date(),
          aiSuggestions: [],
        };

        set((state) => ({
          canvasDocuments: { ...state.canvasDocuments, [doc.id]: doc },
          activeCanvasId: doc.id,
          canvasOpen: true,
          panelView: 'canvas',
        }));

        getPluginEventHooks().dispatchCanvasCreate(doc);

        return doc.id;
      },

      updateCanvasDocument: (id, updates) => {
        set((state) => {
          const doc = state.canvasDocuments[id];
          if (!doc) return state;

          const updated = {
            ...doc,
            ...updates,
            updatedAt: new Date(),
          };

          // Track content changes
          if ('content' in updates && updates.content !== doc.content) {
            getPluginEventHooks().dispatchCanvasContentChange(
              id,
              updates.content as string,
              doc.content
            );
          }

          getPluginEventHooks().dispatchCanvasUpdate(updated, updates);

          return {
            canvasDocuments: {
              ...state.canvasDocuments,
              [id]: updated,
            },
          };
        });
      },

      deleteCanvasDocument: (id) => {
        set((state) => {
          const { [id]: _removed, ...rest } = state.canvasDocuments;
          getPluginEventHooks().dispatchCanvasDelete(id);
          return {
            canvasDocuments: rest,
            activeCanvasId: state.activeCanvasId === id ? null : state.activeCanvasId,
          };
        });
      },

      setActiveCanvas: (id) => {
        set({ activeCanvasId: id });
        if (id) {
          set({ canvasOpen: true, panelView: 'canvas' });
        }
        getPluginEventHooks().dispatchCanvasSwitch(id);
      },

      openCanvas: () => set({ canvasOpen: true, panelView: 'canvas' }),
      closeCanvas: () => set({ canvasOpen: false }),

      // Canvas suggestions
      addSuggestion: (documentId, suggestion) => {
        set((state) => {
          const doc = state.canvasDocuments[documentId];
          if (!doc) return state;

          const newSuggestion: CanvasSuggestion = {
            ...suggestion,
            id: nanoid(),
          };

          return {
            canvasDocuments: {
              ...state.canvasDocuments,
              [documentId]: {
                ...doc,
                aiSuggestions: [...(doc.aiSuggestions || []), newSuggestion],
              },
            },
          };
        });
      },

      updateSuggestionStatus: (documentId, suggestionId, status) => {
        set((state) => {
          const doc = state.canvasDocuments[documentId];
          if (!doc) return state;

          return {
            canvasDocuments: {
              ...state.canvasDocuments,
              [documentId]: {
                ...doc,
                aiSuggestions: doc.aiSuggestions?.map((s) =>
                  s.id === suggestionId ? { ...s, status } : s
                ),
              },
            },
          };
        });
      },

      applySuggestion: (documentId, suggestionId) => {
        const state = get();
        const doc = state.canvasDocuments[documentId];
        if (!doc) return;

        const suggestion = doc.aiSuggestions?.find((s) => s.id === suggestionId);
        if (!suggestion) return;

        // Apply the suggestion by replacing the text
        const lines = doc.content.split('\n');
        const newLines = [
          ...lines.slice(0, suggestion.range.startLine),
          suggestion.suggestedText,
          ...lines.slice(suggestion.range.endLine + 1),
        ];

        set((state) => ({
          canvasDocuments: {
            ...state.canvasDocuments,
            [documentId]: {
              ...doc,
              content: newLines.join('\n'),
              aiSuggestions: doc.aiSuggestions?.map((s) =>
                s.id === suggestionId ? { ...s, status: 'accepted' as const } : s
              ),
              updatedAt: new Date(),
            },
          },
        }));
      },

      clearSuggestions: (documentId) => {
        set((state) => {
          const doc = state.canvasDocuments[documentId];
          if (!doc) return state;

          return {
            canvasDocuments: {
              ...state.canvasDocuments,
              [documentId]: { ...doc, aiSuggestions: [] },
            },
          };
        });
      },

      // Canvas version history
      saveCanvasVersion: (documentId, description, isAutoSave = false) => {
        const state = get();
        const doc = state.canvasDocuments[documentId];
        if (!doc) return null;

        const version: CanvasDocumentVersion = {
          id: nanoid(),
          content: doc.content,
          title: doc.title,
          createdAt: new Date(),
          description,
          isAutoSave,
        };

        set((state) => ({
          canvasDocuments: {
            ...state.canvasDocuments,
            [documentId]: {
              ...doc,
              versions: [...(doc.versions || []), version],
              currentVersionId: version.id,
            },
          },
        }));

        getPluginEventHooks().dispatchCanvasVersionSave(documentId, version.id);

        return version;
      },

      restoreCanvasVersion: (documentId, versionId) => {
        set((state) => {
          const doc = state.canvasDocuments[documentId];
          if (!doc || !doc.versions) return state;

          const version = doc.versions.find((v) => v.id === versionId);
          if (!version) return state;

          // Save current state as a new version before restoring
          const currentVersion: CanvasDocumentVersion = {
            id: nanoid(),
            content: doc.content,
            title: doc.title,
            createdAt: new Date(),
            description: 'Auto-saved before restore',
            isAutoSave: true,
          };

          getPluginEventHooks().dispatchCanvasVersionRestore(documentId, versionId);

          return {
            canvasDocuments: {
              ...state.canvasDocuments,
              [documentId]: {
                ...doc,
                content: version.content,
                title: version.title,
                updatedAt: new Date(),
                versions: [...doc.versions, currentVersion],
                currentVersionId: versionId,
              },
            },
          };
        });
      },

      deleteCanvasVersion: (documentId, versionId) => {
        set((state) => {
          const doc = state.canvasDocuments[documentId];
          if (!doc || !doc.versions) return state;

          return {
            canvasDocuments: {
              ...state.canvasDocuments,
              [documentId]: {
                ...doc,
                versions: doc.versions.filter((v) => v.id !== versionId),
              },
            },
          };
        });
      },

      getCanvasVersions: (documentId) => {
        const doc = get().canvasDocuments[documentId];
        if (!doc || !doc.versions) return [];
        return [...doc.versions]
          .map((v) => ({ ...v, createdAt: ensureDate(v.createdAt) }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },

      compareVersions: (documentId, versionId1, versionId2) => {
        const doc = get().canvasDocuments[documentId];
        if (!doc || !doc.versions) return null;

        const v1 = doc.versions.find((v) => v.id === versionId1);
        const v2 = doc.versions.find((v) => v.id === versionId2);

        if (!v1 || !v2) return null;

        return {
          v1: v1.content,
          v2: v2.content,
        };
      },

      // Analysis actions
      addAnalysisResult: (result) => {
        const newResult: AnalysisResult = {
          ...result,
          id: nanoid(),
          createdAt: new Date(),
        };

        set((state) => ({
          analysisResults: { ...state.analysisResults, [newResult.id]: newResult },
        }));

        return newResult;
      },

      getMessageAnalysis: (messageId) =>
        Object.values(get().analysisResults)
          .filter((r) => r.messageId === messageId)
          .map(rehydrateAnalysisResult)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),

      // Panel actions
      openPanel: (view = 'artifact') => set({ panelOpen: true, panelView: view }),
      closePanel: () => set({ panelOpen: false }),
      setPanelView: (view) => set({ panelView: view }),

      // Batch operations
      deleteArtifacts: (ids) => {
        set((state) => {
          const artifacts = { ...state.artifacts };
          const artifactVersions = { ...state.artifactVersions };

          for (const id of ids) {
            delete artifacts[id];
            delete artifactVersions[id];
          }

          return {
            artifacts,
            artifactVersions,
            activeArtifactId: ids.includes(state.activeArtifactId || '')
              ? null
              : state.activeArtifactId,
          };
        });
      },

      duplicateArtifact: (id) => {
        const state = get();
        const original = state.artifacts[id];
        if (!original) return null;

        const duplicated: Artifact = {
          ...rehydrateArtifact(original),
          id: nanoid(),
          title: `${original.title} (Copy)`,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          artifacts: { ...state.artifacts, [duplicated.id]: duplicated },
          activeArtifactId: duplicated.id,
          panelOpen: true,
          panelView: 'artifact',
        }));

        return duplicated;
      },

      // Search and filter
      searchArtifacts: (query, sessionId) => {
        const lowerQuery = query.toLowerCase();
        return Object.values(get().artifacts)
          .filter((a) => {
            if (sessionId && a.sessionId !== sessionId) return false;
            return (
              a.title.toLowerCase().includes(lowerQuery) ||
              a.content.toLowerCase().includes(lowerQuery) ||
              a.type.toLowerCase().includes(lowerQuery) ||
              (a.language && a.language.toLowerCase().includes(lowerQuery))
            );
          })
          .map(rehydrateArtifact)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      },

      filterArtifactsByType: (type, sessionId) =>
        Object.values(get().artifacts)
          .filter((a) => {
            if (sessionId && a.sessionId !== sessionId) return false;
            return a.type === type;
          })
          .map(rehydrateArtifact)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),

      getRecentArtifacts: (limit = 10) =>
        Object.values(get().artifacts)
          .map(rehydrateArtifact)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, limit),

      // Utility
      clearSessionData: (sessionId) => {
        set((state) => {
          const artifacts = Object.fromEntries(
            Object.entries(state.artifacts).filter(([, a]) => a.sessionId !== sessionId)
          );
          // Filter artifact versions - keep only versions for artifacts that still exist
          const artifactVersions = Object.fromEntries(
            Object.entries(state.artifactVersions).filter(([id]) => artifacts[id])
          );
          const canvasDocuments = Object.fromEntries(
            Object.entries(state.canvasDocuments).filter(([, d]) => d.sessionId !== sessionId)
          );
          const analysisResults = Object.fromEntries(
            Object.entries(state.analysisResults).filter(([, r]) => r.sessionId !== sessionId)
          );

          return {
            artifacts,
            artifactVersions,
            canvasDocuments,
            analysisResults,
            activeArtifactId:
              state.activeArtifactId && artifacts[state.activeArtifactId]
                ? state.activeArtifactId
                : null,
            activeCanvasId:
              state.activeCanvasId && canvasDocuments[state.activeCanvasId]
                ? state.activeCanvasId
                : null,
          };
        });
      },
    }),
    {
      name: 'cognia-artifacts',
      partialize: (state) => ({
        artifacts: state.artifacts,
        artifactVersions: state.artifactVersions,
        canvasDocuments: state.canvasDocuments,
        analysisResults: state.analysisResults,
      }),
    }
  )
);

export default useArtifactStore;
