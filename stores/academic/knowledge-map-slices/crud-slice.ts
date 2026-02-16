/**
 * Knowledge Map Store - CRUD Slice
 */

import { invoke } from '@tauri-apps/api/core';
import { nanoid } from 'nanoid';
import { extractPDFContent } from '@/lib/academic/pdf-to-markdown';
import type {
  KnowledgeMap,
  KnowledgeMapGenerationRequest,
} from '@/types/learning/knowledge-map';
import type {
  KnowledgeMapCrudActions,
  KnowledgeMapSliceCreator,
} from '../knowledge-map-store-types';

export const createKnowledgeMapCrudSlice: KnowledgeMapSliceCreator<KnowledgeMapCrudActions> = (
  set,
  get
) => ({
  createKnowledgeMap: async (request: KnowledgeMapGenerationRequest) => {
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
        activeKnowledgeMapId: state.activeKnowledgeMapId === id ? null : state.activeKnowledgeMapId,
      };
    });
  },

  getKnowledgeMap: (id) => {
    return get().knowledgeMaps[id] || null;
  },

  setActiveKnowledgeMap: (id) => {
    set({ activeKnowledgeMapId: id });
  },
});
