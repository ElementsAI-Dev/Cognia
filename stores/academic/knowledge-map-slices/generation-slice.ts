/**
 * Knowledge Map Store - Generation Slice
 */

import { invoke } from '@tauri-apps/api/core';
import { extractPDFContent } from '@/lib/academic/pdf-to-markdown';
import type {
  KnowledgeMap,
  MindMapData,
  MindMapGenerationRequest,
  PDFConversionOptions,
} from '@/types/learning/knowledge-map';
import type {
  KnowledgeMapGenerationActions,
  KnowledgeMapSliceCreator,
} from '../knowledge-map-store-types';

export const createKnowledgeMapGenerationSlice: KnowledgeMapSliceCreator<
  KnowledgeMapGenerationActions
> = (set, get) => ({
  convertPDFToKnowledgeMap: async (pdfPath: string, options?: Partial<PDFConversionOptions>) => {
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

  generateFromContent: async (content: string, title?: string) => {
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

  generateMindMap: async (request: MindMapGenerationRequest): Promise<MindMapData | null> => {
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

  updateMindMap: (knowledgeMapId: string, mindMap: MindMapData) => {
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
});
