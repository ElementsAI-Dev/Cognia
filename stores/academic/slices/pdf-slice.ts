/**
 * Academic Store - PDF Slice
 * PDF download, path management, and deletion
 */

import { academicRuntimeInvoke } from '@/lib/native/academic-runtime';
import type { AcademicSliceCreator } from '../types';

// ============================================================================
// PDF Actions Type
// ============================================================================

export interface PdfActions {
  downloadPdf: (paperId: string, pdfUrl: string) => Promise<string>;
  getPdfPath: (paperId: string) => Promise<string | null>;
  deletePdf: (paperId: string) => Promise<void>;
}

// ============================================================================
// PDF Slice Creator
// ============================================================================

export const createPdfSlice: AcademicSliceCreator<PdfActions> = (set, get) => ({
    downloadPdf: async (paperId, pdfUrl) => {
      set({ isLoading: true, error: null });
      try {
        const path = await academicRuntimeInvoke<string>('academic_download_pdf', { paperId, pdfUrl });
        set({ isLoading: false });
        await get().refreshLibrary();
        return path;
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    getPdfPath: async (paperId) => {
      try {
        const path = await academicRuntimeInvoke<string | null>('academic_get_pdf_path', {
          paperId,
        });
        return path;
      } catch {
        return null;
      }
    },

    deletePdf: async (paperId) => {
      try {
        await academicRuntimeInvoke('academic_delete_pdf', { paperId });
        await get().refreshLibrary();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
});
