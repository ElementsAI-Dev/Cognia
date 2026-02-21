/**
 * Academic Store - Provider Slice
 * Provider management, import/export, settings, and statistics
 */

import { academicRuntimeInvoke } from '@/lib/native/academic-runtime';
import type {
  AcademicProviderType,
  AcademicProviderConfig,
  AcademicModeSettings,
  AcademicStatistics,
  ImportResult,
  AcademicExportResult,
} from '@/types/academic';
import type { AcademicSliceCreator } from '../types';

// ============================================================================
// Provider & Settings Actions Type
// ============================================================================

export interface ProviderActions {
  getProviders: () => Promise<AcademicProviderConfig[]>;
  setProviderApiKey: (providerId: AcademicProviderType, apiKey: string | null) => Promise<void>;
  setProviderEnabled: (providerId: AcademicProviderType, enabled: boolean) => Promise<void>;
  testProvider: (providerId: AcademicProviderType) => Promise<boolean>;
  importPapers: (
    data: string,
    format: string,
    options?: { mergeStrategy?: string; targetCollection?: string }
  ) => Promise<ImportResult>;
  exportPapers: (
    paperIds?: string[],
    collectionId?: string,
    format?: string
  ) => Promise<AcademicExportResult>;
  refreshStatistics: () => Promise<void>;
  updateSettings: (settings: Partial<AcademicModeSettings>) => void;
}

// ============================================================================
// Provider Slice Creator
// ============================================================================

export const createProviderSlice: AcademicSliceCreator<ProviderActions> = (set, get) => ({
    getProviders: async () => {
      try {
        const providers = await academicRuntimeInvoke<AcademicProviderConfig[]>('academic_get_providers');
        return providers;
      } catch {
        return [];
      }
    },

    setProviderApiKey: async (providerId, apiKey) => {
      try {
        await academicRuntimeInvoke('academic_set_provider_api_key', { providerId, apiKey });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    setProviderEnabled: async (providerId, enabled) => {
      try {
        await academicRuntimeInvoke('academic_set_provider_enabled', { providerId, enabled });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    testProvider: async (providerId) => {
      try {
        const result = await academicRuntimeInvoke<boolean>('academic_test_provider', { providerId });
        return result;
      } catch {
        return false;
      }
    },

    importPapers: async (data, format, options) => {
      set({ isLoading: true, error: null });
      try {
        const result = await academicRuntimeInvoke<ImportResult>('academic_import_papers', {
          data,
          format,
          options: {
            mergeStrategy: options?.mergeStrategy || 'skip',
            importAnnotations: true,
            importNotes: true,
            targetCollection: options?.targetCollection,
          },
        });
        await get().refreshLibrary();
        set({ isLoading: false });
        return result;
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    exportPapers: async (paperIds, collectionId, format = 'bibtex') => {
      set({ isLoading: true, error: null });
      try {
        const result = await academicRuntimeInvoke<AcademicExportResult>('academic_export_papers', {
          paperIds,
          collectionId,
          format,
          options: {
            includeAnnotations: true,
            includeNotes: true,
            includeAiAnalysis: true,
          },
        });
        set({ isLoading: false });
        return result;
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    refreshStatistics: async () => {
      try {
        const statistics = await academicRuntimeInvoke<AcademicStatistics>('academic_get_statistics');
        set({ statistics });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    updateSettings: (settings) => {
      set((state) => ({
        settings: { ...state.settings, ...settings },
      }));
    },
});
