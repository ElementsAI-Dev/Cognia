import type { StoreApi } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';
import type {
  ClipboardAnalysis,
  ClipboardContextStore,
  ContentCategory,
  ContentStats,
  DetectedLanguage,
  ExtractedEntity,
  SuggestedAction,
  TransformAction,
} from '../types';

const log = loggers.store;

type ClipboardStoreSet = StoreApi<ClipboardContextStore>['setState'];
type ClipboardStoreGet = StoreApi<ClipboardContextStore>['getState'];

type AnalysisSlice = Pick<
  ClipboardContextStore,
  | 'analyzeContent'
  | 'analyzeCurrentClipboard'
  | 'getCurrentWithAnalysis'
  | 'transformContent'
  | 'transformAndWrite'
  | 'extractEntities'
  | 'getSuggestedActions'
  | 'detectCategory'
  | 'detectLanguage'
  | 'checkSensitive'
  | 'getStats'
>;

export const createAnalysisSlice = (
  set: ClipboardStoreSet,
  get: ClipboardStoreGet
): AnalysisSlice => ({
  analyzeContent: async (content) => {
    if (!isTauri()) return null;

    set({ isAnalyzing: true, error: null });

    try {
      const analysis = await invoke<ClipboardAnalysis>('clipboard_analyze_content', { content });
      set({ currentAnalysis: analysis, isAnalyzing: false });
      return analysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isAnalyzing: false });
      return null;
    }
  },

  analyzeCurrentClipboard: async () => {
    const content = await get().readClipboard();
    if (content) {
      await get().analyzeContent(content);
    }
  },

  getCurrentWithAnalysis: async () => {
    if (!isTauri()) return null;

    try {
      const result = await invoke<[string, ClipboardAnalysis] | null>(
        'clipboard_get_current_with_analysis'
      );
      if (result) {
        const [content, analysis] = result;
        set({ currentContent: content, currentAnalysis: analysis, error: null });
        return { content, analysis };
      }
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return null;
    }
  },

  transformContent: async (content, action: TransformAction) => {
    if (!isTauri()) return null;

    try {
      const result = await invoke<string>('clipboard_transform_content', { content, action });
      set({ error: null });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return null;
    }
  },

  transformAndWrite: async (content, action) => {
    const transformed = await get().transformContent(content, action);
    if (transformed) {
      await get().writeText(transformed);
    }
  },

  extractEntities: async (content) => {
    if (!isTauri()) return [];

    try {
      const entities = await invoke<ExtractedEntity[]>('clipboard_extract_entities', { content });
      return entities;
    } catch (error) {
      log.error('Failed to extract entities', error as Error);
      return [];
    }
  },

  getSuggestedActions: async (content) => {
    if (!isTauri()) return [];

    try {
      const actions = await invoke<SuggestedAction[]>('clipboard_get_suggested_actions', {
        content,
      });
      return actions;
    } catch (error) {
      log.error('Failed to get suggested actions', error as Error);
      return [];
    }
  },

  detectCategory: async (content) => {
    if (!isTauri()) return null;

    try {
      const result = await invoke<[ContentCategory, ContentCategory[], number]>(
        'clipboard_detect_category',
        { content }
      );
      return { category: result[0], secondary: result[1], confidence: result[2] };
    } catch (error) {
      log.error('Failed to detect category', error as Error);
      return null;
    }
  },

  detectLanguage: async (content) => {
    if (!isTauri()) return null;

    try {
      const language = await invoke<DetectedLanguage | null>('clipboard_detect_language', {
        content,
      });
      return language;
    } catch (error) {
      log.error('Failed to detect language', error as Error);
      return null;
    }
  },

  checkSensitive: async (content) => {
    if (!isTauri()) return false;

    try {
      return await invoke<boolean>('clipboard_check_sensitive', { content });
    } catch (error) {
      log.error('Failed to check sensitive', error as Error);
      return false;
    }
  },

  getStats: async (content) => {
    if (!isTauri()) return null;

    try {
      return await invoke<ContentStats>('clipboard_get_stats', { content });
    } catch (error) {
      log.error('Failed to get stats', error as Error);
      return null;
    }
  },
});

