/**
 * Artifact Store - manages artifacts, canvas documents, and analysis results
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { getPluginEventHooks } from '@/lib/plugin';
import {
  buildArtifactSourceMetadata,
  isDuplicateArtifactSource,
} from '@/lib/artifacts/source-metadata';
import type {
  Artifact,
  ArtifactType,
  ArtifactLanguage,
  ArtifactRuntimeHealth,
  ArtifactMetadata,
  ArtifactWorkspaceScope,
  ArtifactWorkspaceState,
  ArtifactWorkspaceReturnContext,
  ArtifactVersion,
  CanvasAIWorkbenchState,
  CanvasActionAttachment,
  CanvasActionHistoryEntry,
  CanvasEditorContext,
  CanvasDocument,
  CanvasDocumentVersion,
  CanvasPendingReview,
  CanvasSuggestion,
  AnalysisResult,
  ArtifactDetectionConfig,
  DetectedArtifact,
} from '@/types';

/** Maximum content size to persist per artifact (100KB) */
const MAX_PERSISTED_CONTENT_SIZE = 100 * 1024;
/** Maximum total artifacts to persist (LRU eviction beyond this) */
const MAX_PERSISTED_ARTIFACTS = 200;
/** Maximum number of auto-save canvas versions retained per document */
const MAX_CANVAS_AUTOSAVE_VERSIONS = 30;
/** Maximum number of AI workbench history entries retained per document */
const MAX_CANVAS_WORKBENCH_HISTORY = 20;

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
    metadata: rehydrateArtifactMetadata(artifact.metadata),
  };
}

function rehydrateArtifactMetadata(
  metadata?: ArtifactMetadata
): ArtifactMetadata | undefined {
  if (!metadata) return undefined;

  return {
    ...metadata,
    lastAccessedAt: metadata.lastAccessedAt ? ensureDate(metadata.lastAccessedAt) : undefined,
  };
}

/**
 * Rehydrate canvas document dates from storage
 */
function rehydrateCanvasDocument(doc: CanvasDocument): CanvasDocument {
  return {
    ...doc,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    editorContext: rehydrateCanvasEditorContext(doc.editorContext),
    aiWorkbench: rehydrateCanvasAIWorkbench(doc.aiWorkbench),
    versions: doc.versions?.map((v) => ({
      ...v,
      createdAt: ensureDate(v.createdAt),
    })),
  };
}

function rehydrateCanvasEditorContext(
  context?: CanvasEditorContext
): CanvasEditorContext | undefined {
  if (!context) return undefined;

  return {
    ...context,
    lastSavedAt: context.lastSavedAt ? ensureDate(context.lastSavedAt) : undefined,
    lastRestoredAt: context.lastRestoredAt ? ensureDate(context.lastRestoredAt) : undefined,
  };
}

function mergeCanvasEditorContext(
  current?: CanvasEditorContext,
  updates?: Partial<CanvasEditorContext>
): CanvasEditorContext | undefined {
  if (!current && !updates) return undefined;

  const merged: CanvasEditorContext = {
    ...(current || {}),
    ...(updates || {}),
    selection:
      updates && 'selection' in updates
        ? updates.selection
          ? { ...(current?.selection || {}), ...updates.selection }
          : updates.selection
        : current?.selection,
    visibleRange:
      updates && 'visibleRange' in updates
        ? updates.visibleRange
          ? { ...(current?.visibleRange || {}), ...updates.visibleRange }
          : updates.visibleRange
        : current?.visibleRange,
    location:
      updates && 'location' in updates
        ? updates.location
          ? {
              ...(current?.location || {}),
              ...updates.location,
              path: updates.location.path ?? current?.location?.path ?? [],
            }
          : updates.location
        : current?.location,
  };

  return rehydrateCanvasEditorContext(merged);
}

function createInitialCanvasAIWorkbenchState(): CanvasAIWorkbenchState {
  return {
    promptDraft: '',
    selectedPresetAction: null,
    attachments: [],
    pendingReview: null,
    actionHistory: [],
    isInlineCommandOpen: false,
  };
}

function normalizeCanvasAttachments(
  attachments?: CanvasActionAttachment[]
): CanvasActionAttachment[] {
  return (attachments || []).map((attachment) => ({
    ...attachment,
  }));
}

function rehydrateCanvasPendingReview(
  pendingReview?: CanvasPendingReview | null
): CanvasPendingReview | null {
  if (!pendingReview) return null;

  return {
    ...pendingReview,
    createdAt: ensureDate(pendingReview.createdAt),
    items: pendingReview.items.map((item) => ({
      ...item,
      diffLines: item.diffLines.map((line) => ({ ...line })),
    })),
  };
}

function rehydrateCanvasActionHistory(
  actionHistory?: CanvasActionHistoryEntry[]
): CanvasActionHistoryEntry[] {
  return (actionHistory || []).map((entry) => ({
    ...entry,
    createdAt: ensureDate(entry.createdAt),
    attachments: normalizeCanvasAttachments(entry.attachments),
  }));
}

function rehydrateCanvasAIWorkbench(
  aiWorkbench?: CanvasAIWorkbenchState
): CanvasAIWorkbenchState {
  const baseline = createInitialCanvasAIWorkbenchState();
  if (!aiWorkbench) {
    return baseline;
  }

  return {
    ...baseline,
    ...aiWorkbench,
    attachments: normalizeCanvasAttachments(aiWorkbench.attachments),
    pendingReview: rehydrateCanvasPendingReview(aiWorkbench.pendingReview),
    actionHistory: rehydrateCanvasActionHistory(aiWorkbench.actionHistory),
    isInlineCommandOpen: Boolean(aiWorkbench.isInlineCommandOpen),
  };
}

function applyCanvasWorkbenchHistoryRetention(
  actionHistory: CanvasActionHistoryEntry[],
  limit = MAX_CANVAS_WORKBENCH_HISTORY
): CanvasActionHistoryEntry[] {
  if (actionHistory.length <= limit) {
    return actionHistory;
  }

  return actionHistory.slice(actionHistory.length - limit);
}

function mergeCanvasAIWorkbench(
  current?: CanvasAIWorkbenchState,
  updates?: Partial<CanvasAIWorkbenchState>
): CanvasAIWorkbenchState {
  const baseline = rehydrateCanvasAIWorkbench(current);

  if (!updates) {
    return baseline;
  }

  return rehydrateCanvasAIWorkbench({
    ...baseline,
    ...updates,
    attachments:
      'attachments' in updates
        ? normalizeCanvasAttachments(updates.attachments)
        : baseline.attachments,
    pendingReview:
      'pendingReview' in updates
        ? rehydrateCanvasPendingReview(updates.pendingReview)
        : baseline.pendingReview,
    actionHistory:
      'actionHistory' in updates
        ? applyCanvasWorkbenchHistoryRetention(
            rehydrateCanvasActionHistory(updates.actionHistory)
          )
        : baseline.actionHistory,
    isInlineCommandOpen:
      'isInlineCommandOpen' in updates
        ? Boolean(updates.isInlineCommandOpen)
        : baseline.isInlineCommandOpen,
  });
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

/**
 * Keep manual versions intact while pruning oldest auto-save checkpoints.
 */
function applyCanvasVersionRetention(
  versions: CanvasDocumentVersion[],
  maxAutoSaveVersions = MAX_CANVAS_AUTOSAVE_VERSIONS
): CanvasDocumentVersion[] {
  const autoSaveVersions = versions
    .filter((v) => v.isAutoSave)
    .sort((a, b) => ensureDate(a.createdAt).getTime() - ensureDate(b.createdAt).getTime());

  if (autoSaveVersions.length <= maxAutoSaveVersions) {
    return versions;
  }

  const removeIds = new Set(
    autoSaveVersions
      .slice(0, autoSaveVersions.length - maxAutoSaveVersions)
      .map((v) => v.id)
  );

  return versions.filter((v) => !removeIds.has(v.id));
}

const INITIAL_ARTIFACT_WORKSPACE: ArtifactWorkspaceState = {
  scope: 'session',
  sessionId: null,
  searchQuery: '',
  typeFilter: 'all',
  runtimeFilter: 'all',
  recentArtifactIds: [],
  returnContext: null,
};

function applyArtifactWorkspaceFilters(
  artifacts: Artifact[],
  workspace: ArtifactWorkspaceState,
  sessionId?: string | null
): Artifact[] {
  const activeSessionId =
    workspace.scope === 'session' ? sessionId ?? workspace.sessionId ?? null : null;
  const lowerQuery = workspace.searchQuery.trim().toLowerCase();

  return artifacts.filter((artifact) => {
    if (activeSessionId && artifact.sessionId !== activeSessionId) {
      return false;
    }

    if (workspace.typeFilter !== 'all' && artifact.type !== workspace.typeFilter) {
      return false;
    }

    if (
      workspace.runtimeFilter !== 'all' &&
      (artifact.metadata?.runtimeHealth ?? 'ready') !== workspace.runtimeFilter
    ) {
      return false;
    }

    if (!lowerQuery) {
      return true;
    }

    return (
      artifact.title.toLowerCase().includes(lowerQuery) ||
      artifact.type.toLowerCase().includes(lowerQuery) ||
      (artifact.language && artifact.language.toLowerCase().includes(lowerQuery))
    );
  });
}

function updateRecentArtifactIds(
  recentArtifactIds: string[],
  artifactId: string,
  limit = 20
): string[] {
  return [artifactId, ...recentArtifactIds.filter((id) => id !== artifactId)].slice(0, limit);
}

interface ArtifactState {
  // Artifacts
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  artifactVersions: Record<string, ArtifactVersion[]>;
  artifactWorkspace: ArtifactWorkspaceState;

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
    metadata?: ArtifactMetadata;
  }) => Artifact;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  deleteArtifact: (id: string) => void;
  getArtifact: (id: string) => Artifact | undefined;
  getSessionArtifacts: (sessionId: string) => Artifact[];
  setActiveArtifact: (id: string | null) => void;
  setArtifactWorkspaceFilters: (filters: {
    searchQuery?: string;
    typeFilter?: ArtifactType | 'all';
    runtimeFilter?: ArtifactRuntimeHealth | 'all';
  }) => void;
  setArtifactWorkspaceScope: (
    scope: ArtifactWorkspaceScope,
    sessionId?: string | null
  ) => void;
  setArtifactWorkspaceReturnContext: (
    context: ArtifactWorkspaceReturnContext | null
  ) => void;
  getArtifactsForWorkspace: (options?: { sessionId?: string | null; limit?: number }) => Artifact[];

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
  artifactWorkspace: INITIAL_ARTIFACT_WORKSPACE,
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
      createArtifact: ({ sessionId, messageId, type, title, content, language, metadata }) => {
        const artifact: Artifact = {
          id: nanoid(),
          sessionId,
          messageId,
          type,
          title,
          content,
          language,
          metadata,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          artifacts: { ...state.artifacts, [artifact.id]: artifact },
          activeArtifactId: artifact.id,
          artifactWorkspace: {
            ...state.artifactWorkspace,
            sessionId,
            recentArtifactIds: updateRecentArtifactIds(
              state.artifactWorkspace.recentArtifactIds,
              artifact.id
            ),
          },
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
        set((state) => {
          if (!id) {
            return { activeArtifactId: null };
          }

          const artifact = state.artifacts[id];
          if (!artifact) {
            return { activeArtifactId: id };
          }

          return {
            activeArtifactId: id,
            artifacts: {
              ...state.artifacts,
              [id]: {
                ...artifact,
                metadata: {
                  ...artifact.metadata,
                  lastAccessedAt: new Date(),
                },
              },
            },
            artifactWorkspace: {
              ...state.artifactWorkspace,
              sessionId: artifact.sessionId,
              recentArtifactIds: updateRecentArtifactIds(
                state.artifactWorkspace.recentArtifactIds,
                id
              ),
            },
          };
        });
        if (id) {
          set({ panelOpen: true, panelView: 'artifact' });
          getPluginEventHooks().dispatchArtifactOpen(id);
        } else if (previousId) {
          getPluginEventHooks().dispatchArtifactClose();
        }
      },

      setArtifactWorkspaceFilters: (filters) => {
        set((state) => ({
          artifactWorkspace: {
            ...state.artifactWorkspace,
            ...filters,
          },
        }));
      },

      setArtifactWorkspaceScope: (scope, sessionId = null) => {
        set((state) => ({
          artifactWorkspace: {
            ...state.artifactWorkspace,
            scope,
            sessionId,
          },
        }));
      },

      setArtifactWorkspaceReturnContext: (context) => {
        set((state) => ({
          artifactWorkspace: {
            ...state.artifactWorkspace,
            returnContext: context,
          },
        }));
      },

      getArtifactsForWorkspace: ({ sessionId = null, limit } = {}) => {
        const state = get();
        const sorted = Object.values(state.artifacts)
          .map(rehydrateArtifact)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        let scoped =
          state.artifactWorkspace.scope === 'recent'
            ? sorted.filter((artifact) =>
                state.artifactWorkspace.recentArtifactIds.includes(artifact.id)
              )
            : sorted;

        scoped = applyArtifactWorkspaceFilters(scoped, state.artifactWorkspace, sessionId);

        return typeof limit === 'number' ? scoped.slice(0, limit) : scoped;
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
          const metadata = buildArtifactSourceMetadata({
            sessionId,
            messageId,
            type: item.type,
            content: item.content,
            language: item.language,
            sourceOrigin: 'auto',
            userInitiated: false,
            sourceRange: {
              startIndex: item.startIndex,
              endIndex: item.endIndex,
            },
          });

          if (
            isDuplicateArtifactSource({
              artifacts: get().artifacts,
              sessionId,
              messageId,
              type: item.type,
              sourceFingerprint: metadata.sourceFingerprint || '',
            })
          ) {
            continue;
          }

          const artifact: Artifact = {
            id: nanoid(),
            sessionId,
            messageId,
            type: item.type,
            title: item.title,
            content: item.content,
            language: item.language,
            metadata,
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
            artifactWorkspace: {
              ...get().artifactWorkspace,
              sessionId,
              recentArtifactIds: updateRecentArtifactIds(
                get().artifactWorkspace.recentArtifactIds,
                createdArtifacts[0].id
              ),
            },
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
        const createdAt = new Date();
        const doc: CanvasDocument = {
          id: nanoid(),
          sessionId: sessionId || 'standalone',
          title,
          content,
          language,
          type,
          createdAt,
          updatedAt: createdAt,
          editorContext: {
            saveState: 'saved',
          },
          aiWorkbench: createInitialCanvasAIWorkbenchState(),
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

          const contentChanged =
            'content' in updates && updates.content !== undefined && updates.content !== doc.content;
          const nonContextUpdateKeys = Object.keys(updates).filter(
            (key) => key !== 'editorContext' && key !== 'aiWorkbench'
          );
          const mergedEditorContext =
            'editorContext' in updates
              ? mergeCanvasEditorContext(doc.editorContext, updates.editorContext)
              : doc.editorContext;
          const mergedAIWorkbench =
            'aiWorkbench' in updates
              ? mergeCanvasAIWorkbench(doc.aiWorkbench, updates.aiWorkbench)
              : rehydrateCanvasAIWorkbench(doc.aiWorkbench);

          const updated = {
            ...doc,
            ...updates,
            editorContext: contentChanged
              ? mergeCanvasEditorContext(mergedEditorContext, { saveState: 'dirty' })
              : mergedEditorContext,
            aiWorkbench: mergedAIWorkbench,
            updatedAt: nonContextUpdateKeys.length === 0 ? doc.updatedAt : new Date(),
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
              editorContext: mergeCanvasEditorContext(doc.editorContext, {
                lastSavedAt: version.createdAt,
                saveState: isAutoSave ? 'autosaved' : 'saved',
              }),
              versions: applyCanvasVersionRetention([...(doc.versions || []), version]),
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
                editorContext: mergeCanvasEditorContext(doc.editorContext, {
                  lastRestoredAt: new Date(),
                  saveState: 'saved',
                }),
                versions: applyCanvasVersionRetention([...doc.versions, currentVersion]),
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
        const rehydrated = rehydrateCanvasDocument(doc);
        return [...(rehydrated.versions || [])]
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
      openPanel: (view = 'artifact') => {
        set({ panelOpen: true, panelView: view });
        getPluginEventHooks().dispatchPanelOpen(view);
      },
      closePanel: () => {
        set({ panelOpen: false });
        getPluginEventHooks().dispatchPanelClose('artifact');
      },
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
            artifactWorkspace: {
              ...state.artifactWorkspace,
              recentArtifactIds: state.artifactWorkspace.recentArtifactIds.filter(
                (artifactId) => !ids.includes(artifactId)
              ),
            },
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
          artifactWorkspace: {
            ...state.artifactWorkspace,
            sessionId: duplicated.sessionId,
            recentArtifactIds: updateRecentArtifactIds(
              state.artifactWorkspace.recentArtifactIds,
              duplicated.id
            ),
          },
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
            // Search title, type, and language only (skip content for performance)
            return (
              a.title.toLowerCase().includes(lowerQuery) ||
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
            artifactWorkspace: {
              ...state.artifactWorkspace,
              recentArtifactIds: state.artifactWorkspace.recentArtifactIds.filter(
                (artifactId) => artifacts[artifactId]
              ),
              sessionId:
                state.artifactWorkspace.sessionId === sessionId
                  ? null
                  : state.artifactWorkspace.sessionId,
            },
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
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // v0 -> v1: Ensure newer fields exist
          if (!state.canvasDocuments || typeof state.canvasDocuments !== 'object') {
            state.canvasDocuments = {};
          }
          if (!state.artifactVersions || typeof state.artifactVersions !== 'object') {
            state.artifactVersions = {};
          }
          if (!state.analysisResults || typeof state.analysisResults !== 'object') {
            state.analysisResults = {};
          }
        }
        if (!state.artifactWorkspace || typeof state.artifactWorkspace !== 'object') {
          state.artifactWorkspace = INITIAL_ARTIFACT_WORKSPACE;
        } else {
          state.artifactWorkspace = {
            ...INITIAL_ARTIFACT_WORKSPACE,
            ...(state.artifactWorkspace as Record<string, unknown>),
          };
        }
        return state;
      },
      partialize: (state) => {
        // LRU eviction: keep only the most recently updated artifacts
        const sortedArtifacts = Object.values(state.artifacts)
          .sort((a, b) => {
            const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
            const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
            return dateB - dateA;
          })
          .slice(0, MAX_PERSISTED_ARTIFACTS);

        // Truncate oversized content to prevent localStorage overflow
        const artifacts: Record<string, Artifact> = {};
        for (const artifact of sortedArtifacts) {
          artifacts[artifact.id] = artifact.content.length > MAX_PERSISTED_CONTENT_SIZE
            ? { ...artifact, content: artifact.content.slice(0, MAX_PERSISTED_CONTENT_SIZE) }
            : artifact;
        }

        // Only keep versions for artifacts that are being persisted
        const artifactVersions: Record<string, ArtifactVersion[]> = {};
        for (const [id, versions] of Object.entries(state.artifactVersions)) {
          if (artifacts[id]) {
            artifactVersions[id] = versions;
          }
        }

        return {
          artifacts,
          artifactVersions,
          artifactWorkspace: state.artifactWorkspace,
          canvasDocuments: state.canvasDocuments,
          analysisResults: state.analysisResults,
        };
      },
    }
  )
);

export default useArtifactStore;
