/**
 * Academic Store - Provider Slice
 * Provider management, import/export, settings, and statistics
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  AcademicProviderType,
  AcademicProviderConfig,
  AcademicModeSettings,
  AcademicStatistics,
  ImportResult,
  AcademicExportResult,
} from '@/types/academic';
import type { AcademicState } from '../academic-store';

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

export function createProviderSlice(
  set: (updater: ((state: AcademicState) => Partial<AcademicState>) | Partial<AcademicState>) => void,
  get: () => AcademicState
): ProviderActions {
  return {
    getProviders: async () => {
      try {
        const providers = await invoke<AcademicProviderConfig[]>('academic_get_providers');
        return providers;
      } catch {
        return [];
      }
    },

    setProviderApiKey: async (providerId, apiKey) => {
      try {
        await invoke('academic_set_provider_api_key', { providerId, apiKey });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    setProviderEnabled: async (providerId, enabled) => {
      try {
        await invoke('academic_set_provider_enabled', { providerId, enabled });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    testProvider: async (providerId) => {
      try {
        const result = await invoke<boolean>('academic_test_provider', { providerId });
        return result;
      } catch {
        return false;
      }
    },

    importPapers: async (data, format, options) => {
      set({ isLoading: true, error: null });
      try {
        const result = await invoke<ImportResult>('academic_import_papers', {
          data,
          format,
          options: {
            merge_strategy: options?.mergeStrategy || 'skip',
            import_annotations: true,
            import_notes: true,
            target_collection: options?.targetCollection,
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
        const result = await invoke<AcademicExportResult>('academic_export_papers', {
          paperIds,
          collectionId,
          format,
          options: {
            include_annotations: true,
            include_notes: true,
            include_ai_analysis: true,
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
        const statistics = await invoke<AcademicStatistics>('academic_get_statistics');
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
  };
}
