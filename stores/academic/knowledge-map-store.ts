/**
 * Knowledge Map Store - Zustand state management for knowledge maps
 *
 * Manages knowledge maps, mind maps, annotations, and navigation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { nanoid } from 'nanoid';
import type {
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapLocation,
  KnowledgeAnnotation,
  KnowledgeMapNavigationHistory,
  KnowledgeMapNavigationTarget,
  KnowledgeMapGenerationRequest,
  MindMapData,
  MindMapGenerationRequest,
  PDFConversionOptions,
  PDFConversionResult,
} from '@/types/learning/knowledge-map';
import {
  isValidCodemapFile,
  convertCodemapToKnowledgeMap,
  convertKnowledgeMapToCodemap,
} from '@/types/learning/knowledge-map';
import { extractPDFContent } from '@/lib/academic/pdf-to-markdown';

interface KnowledgeMapState {
  knowledgeMaps: Record<string, KnowledgeMap>;
  activeKnowledgeMapId: string | null;
  annotations: Record<string, KnowledgeAnnotation[]>;
  navigationHistory: KnowledgeMapNavigationHistory;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;

  // Knowledge Map CRUD
  createKnowledgeMap: (request: KnowledgeMapGenerationRequest) => Promise<KnowledgeMap>;
  updateKnowledgeMap: (id: string, updates: Partial<KnowledgeMap>) => void;
  deleteKnowledgeMap: (id: string) => void;
  getKnowledgeMap: (id: string) => KnowledgeMap | null;
  setActiveKnowledgeMap: (id: string | null) => void;

  // PDF Conversion
  convertPDFToKnowledgeMap: (
    pdfPath: string,
    options?: Partial<PDFConversionOptions>
  ) => Promise<PDFConversionResult>;

  // Content-based Generation
  generateFromContent: (content: string, title?: string) => Promise<KnowledgeMap>;

  // Mind Map Generation
  generateMindMap: (request: MindMapGenerationRequest) => Promise<MindMapData | null>;
  updateMindMap: (knowledgeMapId: string, mindMap: MindMapData) => void;

  // Annotation Management
  addAnnotation: (
    annotation: Omit<KnowledgeAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => KnowledgeAnnotation;
  updateAnnotation: (id: string, updates: Partial<KnowledgeAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsForKnowledgeMap: (knowledgeMapId: string) => KnowledgeAnnotation[];

  // Navigation
  navigateTo: (target: KnowledgeMapNavigationTarget) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  canNavigateBack: () => boolean;
  canNavigateForward: () => boolean;

  // Import/Export
  importFromCodemap: (data: string) => Promise<KnowledgeMap | null>;
  exportToCodemap: (id: string) => string | null;
  importFromFile: (file: File) => Promise<KnowledgeMap | null>;
  exportToFile: (id: string, filename?: string) => void;

  // Trace Management
  addTrace: (knowledgeMapId: string, trace: Omit<KnowledgeMapTrace, 'id'>) => void;
  updateTrace: (
    knowledgeMapId: string,
    traceId: string,
    updates: Partial<KnowledgeMapTrace>
  ) => void;
  deleteTrace: (knowledgeMapId: string, traceId: string) => void;

  // Location Management
  addLocation: (
    knowledgeMapId: string,
    traceId: string,
    location: Omit<KnowledgeMapLocation, 'id'>
  ) => void;
  updateLocation: (
    knowledgeMapId: string,
    traceId: string,
    locationId: string,
    updates: Partial<KnowledgeMapLocation>
  ) => void;
  deleteLocation: (knowledgeMapId: string, traceId: string, locationId: string) => void;

  // State Management
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialNavigationHistory: KnowledgeMapNavigationHistory = {
  entries: [],
  currentIndex: -1,
};

const initialState = {
  knowledgeMaps: {} as Record<string, KnowledgeMap>,
  activeKnowledgeMapId: null as string | null,
  annotations: {} as Record<string, KnowledgeAnnotation[]>,
  navigationHistory: initialNavigationHistory,
  isGenerating: false,
  generationProgress: 0,
  error: null as string | null,
};

export const useKnowledgeMapStore = create<KnowledgeMapState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Knowledge Map CRUD
      createKnowledgeMap: async (request) => {
        set({ isGenerating: true, generationProgress: 0, error: null });

        try {
          let knowledgeMap: KnowledgeMap;

          if (request.pdfPath) {
            set({ generationProgress: 20 });
            const result = await extractPDFContent(request.pdfPath, {
              generateKnowledgeMap: true,
              generateMindMap: request.options?.generateMindMap ?? true,
            });

            if (!result.success || !result.knowledgeMap) {
              throw new Error(result.errors?.join(', ') || 'Failed to extract PDF content');
            }

            knowledgeMap = {
              ...result.knowledgeMap,
              title: request.title || result.knowledgeMap.title,
              metadata: {
                ...result.knowledgeMap.metadata,
                paperId: request.paperId,
                pdfPath: request.pdfPath,
              },
              mindMapData: result.mindMap,
            };
          } else if (request.content) {
            set({ generationProgress: 30 });

            const result = await invoke<KnowledgeMap>('academic_generate_knowledge_map', {
              content: request.content,
              title: request.title,
              mode: request.mode,
              options: request.options,
            });

            knowledgeMap = result;
          } else {
            knowledgeMap = {
              schemaVersion: 1,
              id: `km_${Date.now()}`,
              stableId: nanoid(),
              metadata: {
                generationSource: 'manual',
                generationTimestamp: new Date().toISOString(),
                mode: request.mode,
                paperId: request.paperId,
              },
              title: request.title,
              description: '',
              traces: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }

          set({ generationProgress: 100 });

          set((state) => ({
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMap.id]: knowledgeMap,
            },
            activeKnowledgeMapId: knowledgeMap.id,
            isGenerating: false,
            generationProgress: 0,
          }));

          return knowledgeMap;
        } catch (error) {
          set({
            isGenerating: false,
            generationProgress: 0,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      updateKnowledgeMap: (id, updates) => {
        set((state) => {
          const existing = state.knowledgeMaps[id];
          if (!existing) return state;

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteKnowledgeMap: (id) => {
        set((state) => {
          const { [id]: _deleted, ...rest } = state.knowledgeMaps;
          const { [id]: _deletedAnnotations, ...restAnnotations } = state.annotations;

          return {
            knowledgeMaps: rest,
            annotations: restAnnotations,
            activeKnowledgeMapId:
              state.activeKnowledgeMapId === id ? null : state.activeKnowledgeMapId,
          };
        });
      },

      getKnowledgeMap: (id) => {
        return get().knowledgeMaps[id] || null;
      },

      setActiveKnowledgeMap: (id) => {
        set({ activeKnowledgeMapId: id });
      },

      // PDF Conversion
      convertPDFToKnowledgeMap: async (pdfPath, options) => {
        set({ isGenerating: true, generationProgress: 0, error: null });

        try {
          set({ generationProgress: 10 });
          const result = await extractPDFContent(pdfPath, {
            ...options,
            generateKnowledgeMap: true,
            generateMindMap: true,
          });

          set({ generationProgress: 80 });

          if (result.success && result.knowledgeMap) {
            set((state) => ({
              knowledgeMaps: {
                ...state.knowledgeMaps,
                [result.knowledgeMap!.id]: result.knowledgeMap!,
              },
              activeKnowledgeMapId: result.knowledgeMap!.id,
            }));
          }

          set({ isGenerating: false, generationProgress: 0 });
          return result;
        } catch (error) {
          set({
            isGenerating: false,
            generationProgress: 0,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      // Content-based Generation
      generateFromContent: async (content, title) => {
        set({ isGenerating: true, generationProgress: 0, error: null });

        try {
          set({ generationProgress: 20 });

          const knowledgeMap = await invoke<KnowledgeMap>(
            'academic_generate_knowledge_map_from_content',
            {
              content,
              title: title || 'Knowledge Map from Selection',
            }
          );

          set({ generationProgress: 100 });

          set((state) => ({
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMap.id]: knowledgeMap,
            },
            activeKnowledgeMapId: knowledgeMap.id,
            isGenerating: false,
            generationProgress: 0,
          }));

          return knowledgeMap;
        } catch (error) {
          set({
            isGenerating: false,
            generationProgress: 0,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      // Mind Map Generation
      generateMindMap: async (request) => {
        set({ isGenerating: true, error: null });

        try {
          if (request.knowledgeMapId) {
            const knowledgeMap = get().knowledgeMaps[request.knowledgeMapId];
            if (!knowledgeMap) {
              throw new Error('Knowledge map not found');
            }

            const mindMap = await invoke<MindMapData>('academic_generate_mind_map', {
              knowledgeMap,
              layout: request.layout,
              maxDepth: request.maxDepth,
              theme: request.theme,
            });

            set((state) => ({
              knowledgeMaps: {
                ...state.knowledgeMaps,
                [request.knowledgeMapId!]: {
                  ...knowledgeMap,
                  mindMapData: mindMap,
                  updatedAt: new Date().toISOString(),
                },
              },
              isGenerating: false,
            }));

            return mindMap;
          }

          if (request.content) {
            const mindMap = await invoke<MindMapData>('academic_generate_mind_map_from_content', {
              content: request.content,
              title: request.title,
              layout: request.layout,
              maxDepth: request.maxDepth,
              theme: request.theme,
            });

            set({ isGenerating: false });
            return mindMap;
          }

          set({ isGenerating: false });
          return null;
        } catch (error) {
          set({
            isGenerating: false,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      },

      updateMindMap: (knowledgeMapId, mindMap) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                mindMapData: mindMap,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      // Annotation Management
      addAnnotation: (annotation) => {
        const newAnnotation: KnowledgeAnnotation = {
          ...annotation,
          id: nanoid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          const existing = state.annotations[annotation.knowledgeMapId] || [];
          return {
            annotations: {
              ...state.annotations,
              [annotation.knowledgeMapId]: [...existing, newAnnotation],
            },
          };
        });

        return newAnnotation;
      },

      updateAnnotation: (id, updates) => {
        set((state) => {
          const newAnnotations = { ...state.annotations };

          for (const [knowledgeMapId, annotations] of Object.entries(newAnnotations)) {
            const index = annotations.findIndex((a) => a.id === id);
            if (index !== -1) {
              newAnnotations[knowledgeMapId] = [
                ...annotations.slice(0, index),
                {
                  ...annotations[index],
                  ...updates,
                  updatedAt: new Date().toISOString(),
                },
                ...annotations.slice(index + 1),
              ];
              break;
            }
          }

          return { annotations: newAnnotations };
        });
      },

      deleteAnnotation: (id) => {
        set((state) => {
          const newAnnotations = { ...state.annotations };

          for (const [knowledgeMapId, annotations] of Object.entries(newAnnotations)) {
            const index = annotations.findIndex((a) => a.id === id);
            if (index !== -1) {
              newAnnotations[knowledgeMapId] = [
                ...annotations.slice(0, index),
                ...annotations.slice(index + 1),
              ];
              break;
            }
          }

          return { annotations: newAnnotations };
        });
      },

      getAnnotationsForKnowledgeMap: (knowledgeMapId) => {
        return get().annotations[knowledgeMapId] || [];
      },

      // Navigation
      navigateTo: (target) => {
        set((state) => {
          const newEntries = [
            ...state.navigationHistory.entries.slice(0, state.navigationHistory.currentIndex + 1),
            target,
          ];

          return {
            navigationHistory: {
              entries: newEntries,
              currentIndex: newEntries.length - 1,
            },
            activeKnowledgeMapId: target.knowledgeMapId,
          };
        });
      },

      navigateBack: () => {
        set((state) => {
          if (state.navigationHistory.currentIndex <= 0) return state;

          const newIndex = state.navigationHistory.currentIndex - 1;
          const target = state.navigationHistory.entries[newIndex];

          return {
            navigationHistory: {
              ...state.navigationHistory,
              currentIndex: newIndex,
            },
            activeKnowledgeMapId: target?.knowledgeMapId || state.activeKnowledgeMapId,
          };
        });
      },

      navigateForward: () => {
        set((state) => {
          if (state.navigationHistory.currentIndex >= state.navigationHistory.entries.length - 1) {
            return state;
          }

          const newIndex = state.navigationHistory.currentIndex + 1;
          const target = state.navigationHistory.entries[newIndex];

          return {
            navigationHistory: {
              ...state.navigationHistory,
              currentIndex: newIndex,
            },
            activeKnowledgeMapId: target?.knowledgeMapId || state.activeKnowledgeMapId,
          };
        });
      },

      canNavigateBack: () => {
        return get().navigationHistory.currentIndex > 0;
      },

      canNavigateForward: () => {
        const { navigationHistory } = get();
        return navigationHistory.currentIndex < navigationHistory.entries.length - 1;
      },

      // Import/Export
      importFromCodemap: async (data) => {
        try {
          const parsed = JSON.parse(data);

          if (!isValidCodemapFile(parsed)) {
            throw new Error('Invalid codemap file format');
          }

          const knowledgeMap = convertCodemapToKnowledgeMap(parsed);

          set((state) => ({
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMap.id]: knowledgeMap,
            },
            activeKnowledgeMapId: knowledgeMap.id,
          }));

          return knowledgeMap;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      },

      exportToCodemap: (id) => {
        const knowledgeMap = get().knowledgeMaps[id];
        if (!knowledgeMap) return null;

        const codemap = convertKnowledgeMapToCodemap(knowledgeMap);
        return JSON.stringify(codemap, null, 2);
      },

      importFromFile: async (file) => {
        try {
          const content = await file.text();
          return await get().importFromCodemap(content);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      },

      exportToFile: (id, filename) => {
        const data = get().exportToCodemap(id);
        if (!data) return;

        const knowledgeMap = get().knowledgeMaps[id];
        const defaultFilename = `${knowledgeMap?.title.replace(/[^a-zA-Z0-9]/g, '_') || 'knowledge_map'}.codemap`;

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || defaultFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },

      // Trace Management
      addTrace: (knowledgeMapId, trace) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          const newTrace: KnowledgeMapTrace = {
            ...trace,
            id: `trace_${Date.now()}`,
          };

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                traces: [...existing.traces, newTrace],
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateTrace: (knowledgeMapId, traceId, updates) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                traces: existing.traces.map((t) => (t.id === traceId ? { ...t, ...updates } : t)),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteTrace: (knowledgeMapId, traceId) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                traces: existing.traces.filter((t) => t.id !== traceId),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      // Location Management
      addLocation: (knowledgeMapId, traceId, location) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          const newLocation: KnowledgeMapLocation = {
            ...location,
            id: `loc_${Date.now()}`,
          };

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                traces: existing.traces.map((t) =>
                  t.id === traceId ? { ...t, locations: [...t.locations, newLocation] } : t
                ),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateLocation: (knowledgeMapId, traceId, locationId, updates) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                traces: existing.traces.map((t) =>
                  t.id === traceId
                    ? {
                        ...t,
                        locations: t.locations.map((l) =>
                          l.id === locationId ? { ...l, ...updates } : l
                        ),
                      }
                    : t
                ),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteLocation: (knowledgeMapId, traceId, locationId) => {
        set((state) => {
          const existing = state.knowledgeMaps[knowledgeMapId];
          if (!existing) return state;

          return {
            knowledgeMaps: {
              ...state.knowledgeMaps,
              [knowledgeMapId]: {
                ...existing,
                traces: existing.traces.map((t) =>
                  t.id === traceId
                    ? {
                        ...t,
                        locations: t.locations.filter((l) => l.id !== locationId),
                      }
                    : t
                ),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      // State Management
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'knowledge-map-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        knowledgeMaps: state.knowledgeMaps,
        annotations: state.annotations,
      }),
    }
  )
);

export default useKnowledgeMapStore;
