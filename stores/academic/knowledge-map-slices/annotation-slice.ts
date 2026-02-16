/**
 * Knowledge Map Store - Annotation Slice
 */

import { nanoid } from 'nanoid';
import type { KnowledgeAnnotation } from '@/types/learning/knowledge-map';
import type {
  KnowledgeMapAnnotationActions,
  KnowledgeMapSliceCreator,
} from '../knowledge-map-store-types';

export const createKnowledgeMapAnnotationSlice: KnowledgeMapSliceCreator<
  KnowledgeMapAnnotationActions
> = (set, get) => ({
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
});
