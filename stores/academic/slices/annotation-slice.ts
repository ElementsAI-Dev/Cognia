/**
 * Academic Store - Annotation Slice
 * Paper annotations and citation/reference lookups
 */

import { academicRuntimeInvoke } from '@/lib/native/academic-runtime';
import type {
  Paper,
  PaperAnnotation,
  AcademicProviderType,
} from '@/types/academic';
import type { AcademicSliceCreator } from '../types';

// ============================================================================
// Annotation Actions Type
// ============================================================================

export interface AnnotationActions {
  addAnnotation: (
    paperId: string,
    annotation: Omit<PaperAnnotation, 'id' | 'paperId' | 'createdAt' | 'updatedAt'>
  ) => Promise<PaperAnnotation>;
  updateAnnotation: (annotationId: string, updates: Partial<PaperAnnotation>) => Promise<void>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  getAnnotations: (paperId: string) => Promise<PaperAnnotation[]>;
  getCitations: (paperId: string, provider: AcademicProviderType) => Promise<Paper[]>;
  getReferences: (paperId: string, provider: AcademicProviderType) => Promise<Paper[]>;
}

// ============================================================================
// Annotation Slice Creator
// ============================================================================

export const createAnnotationSlice: AcademicSliceCreator<AnnotationActions> = (set, _get) => ({
    addAnnotation: async (paperId, annotation) => {
      try {
        const result = await academicRuntimeInvoke<PaperAnnotation>('academic_add_annotation', {
          paperId,
          annotation: {
            type: annotation.type,
            content: annotation.content,
            pageNumber: annotation.pageNumber,
            position: annotation.position,
            color: annotation.color,
          },
        });
        return result;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    updateAnnotation: async (annotationId, updates) => {
      try {
        await academicRuntimeInvoke('academic_update_annotation', {
          annotationId,
          updates: {
            content: updates.content,
            color: updates.color,
          },
        });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    deleteAnnotation: async (annotationId) => {
      try {
        await academicRuntimeInvoke('academic_delete_annotation', { annotationId });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    getAnnotations: async (paperId) => {
      try {
        const annotations = await academicRuntimeInvoke<PaperAnnotation[]>('academic_get_annotations', {
          paperId,
        });
        return annotations;
      } catch {
        return [];
      }
    },

    getCitations: async (paperId, provider) => {
      try {
        const citations = await academicRuntimeInvoke<Paper[]>('academic_get_citations', {
          providerId: provider,
          paperId,
          limit: 50,
          offset: 0,
        });
        return citations;
      } catch {
        return [];
      }
    },

    getReferences: async (paperId, provider) => {
      try {
        const references = await academicRuntimeInvoke<Paper[]>('academic_get_references', {
          providerId: provider,
          paperId,
          limit: 50,
          offset: 0,
        });
        return references;
      } catch {
        return [];
      }
    },
});
