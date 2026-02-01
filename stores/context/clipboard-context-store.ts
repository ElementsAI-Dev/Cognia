/**
 * Clipboard Context Store
 *
 * Zustand store for clipboard context awareness functionality.
 * Provides state management for clipboard content analysis, transformations,
 * and intelligent suggestions.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';

const log = loggers.store;

/** Content category detected from clipboard */
export type ContentCategory =
  | 'PlainText'
  | 'Url'
  | 'Email'
  | 'PhoneNumber'
  | 'FilePath'
  | 'Code'
  | 'Json'
  | 'Markup'
  | 'Markdown'
  | 'Math'
  | 'Color'
  | 'DateTime'
  | 'Uuid'
  | 'IpAddress'
  | 'SensitiveData'
  | 'Command'
  | 'Sql'
  | 'RegexPattern'
  | 'StructuredData'
  | 'NaturalText'
  | 'Unknown';

/** Detected programming language */
export type DetectedLanguage =
  | 'JavaScript'
  | 'TypeScript'
  | 'Python'
  | 'Rust'
  | 'Go'
  | 'Java'
  | 'CSharp'
  | 'Cpp'
  | 'Ruby'
  | 'Php'
  | 'Swift'
  | 'Kotlin'
  | 'Sql'
  | 'Html'
  | 'Css'
  | 'Json'
  | 'Yaml'
  | 'Toml'
  | 'Markdown'
  | 'Shell'
  | 'PowerShell'
  | 'Unknown';

/** Extracted entity from content */
export interface ExtractedEntity {
  entity_type: string;
  value: string;
  start: number;
  end: number;
}

/** Suggested action for clipboard content */
export interface SuggestedAction {
  action_id: string;
  label: string;
  description: string;
  icon?: string;
  priority: number;
}

/** Content statistics */
export interface ContentStats {
  char_count: number;
  word_count: number;
  line_count: number;
  has_unicode: boolean;
  has_emoji: boolean;
  has_whitespace_only_lines: boolean;
}

/** Formatting hints for display */
export interface FormattingHints {
  syntax_highlight: boolean;
  language_hint?: string;
  preserve_whitespace: boolean;
  is_multiline: boolean;
  max_preview_lines: number;
}

/** Complete clipboard analysis result */
export interface ClipboardAnalysis {
  category: ContentCategory;
  secondary_categories: ContentCategory[];
  language?: DetectedLanguage;
  confidence: number;
  entities: ExtractedEntity[];
  suggested_actions: SuggestedAction[];
  stats: ContentStats;
  is_sensitive: boolean;
  formatting: FormattingHints;
}

/** Clipboard template */
export interface ClipboardTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  category?: string;
  tags: string[];
  createdAt: number;
  usageCount: number;
}

/** Transform action type */
export type TransformAction =
  | 'format_json'
  | 'minify_json'
  | 'extract_urls'
  | 'extract_emails'
  | 'trim_whitespace'
  | 'to_uppercase'
  | 'to_lowercase'
  | 'remove_empty_lines'
  | 'sort_lines'
  | 'unique_lines'
  | 'escape_html'
  | 'unescape_html';

interface ClipboardContextState {
  // Current clipboard state
  currentContent: string | null;
  currentAnalysis: ClipboardAnalysis | null;
  isAnalyzing: boolean;

  // Templates
  templates: ClipboardTemplate[];

  // Monitoring
  isMonitoring: boolean;
  lastUpdateTime: number | null;

  // Settings
  autoAnalyze: boolean;
  monitoringInterval: number;

  // Error state
  error: string | null;
}

interface ClipboardContextActions {
  // Content operations
  readClipboard: () => Promise<string | null>;
  writeText: (text: string) => Promise<void>;
  writeHtml: (html: string, altText?: string) => Promise<void>;
  clearClipboard: () => Promise<void>;

  // Analysis operations
  analyzeContent: (content: string) => Promise<ClipboardAnalysis | null>;
  analyzeCurrentClipboard: () => Promise<void>;
  getCurrentWithAnalysis: () => Promise<{ content: string; analysis: ClipboardAnalysis } | null>;

  // Transform operations
  transformContent: (content: string, action: TransformAction) => Promise<string | null>;
  transformAndWrite: (content: string, action: TransformAction) => Promise<void>;

  // Entity extraction
  extractEntities: (content: string) => Promise<ExtractedEntity[]>;
  getSuggestedActions: (content: string) => Promise<SuggestedAction[]>;

  // Detection
  detectCategory: (
    content: string
  ) => Promise<{
    category: ContentCategory;
    secondary: ContentCategory[];
    confidence: number;
  } | null>;
  detectLanguage: (content: string) => Promise<DetectedLanguage | null>;
  checkSensitive: (content: string) => Promise<boolean>;
  getStats: (content: string) => Promise<ContentStats | null>;

  // Template operations
  addTemplate: (template: Omit<ClipboardTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
  removeTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<ClipboardTemplate>) => void;
  applyTemplate: (id: string, variables?: Record<string, string>) => Promise<string | null>;
  searchTemplates: (query: string) => ClipboardTemplate[];

  // Monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // Settings
  setAutoAnalyze: (enabled: boolean) => void;
  setMonitoringInterval: (interval: number) => void;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

type ClipboardContextStore = ClipboardContextState & ClipboardContextActions;

const initialState: ClipboardContextState = {
  currentContent: null,
  currentAnalysis: null,
  isAnalyzing: false,
  templates: [],
  isMonitoring: false,
  lastUpdateTime: null,
  autoAnalyze: true,
  monitoringInterval: 2000,
  error: null,
};

let monitoringIntervalId: ReturnType<typeof setInterval> | null = null;
let eventUnlisten: UnlistenFn | null = null;

export const useClipboardContextStore = create<ClipboardContextStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    readClipboard: async () => {
      if (!isTauri()) return null;

      try {
        const text = await invoke<string>('clipboard_read_text');
        set({ currentContent: text, error: null });
        return text;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ error: message });
        return null;
      }
    },

    writeText: async (text: string) => {
      if (!isTauri()) return;

      try {
        await invoke('clipboard_write_text', { text });
        set({ currentContent: text, error: null });
        if (get().autoAnalyze) {
          await get().analyzeContent(text);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ error: message });
      }
    },

    writeHtml: async (html: string, altText?: string) => {
      if (!isTauri()) return;

      try {
        await invoke('clipboard_write_html', { html, altText });
        set({ error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ error: message });
      }
    },

    clearClipboard: async () => {
      if (!isTauri()) return;

      try {
        await invoke('clipboard_clear');
        set({ currentContent: null, currentAnalysis: null, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ error: message });
      }
    },

    analyzeContent: async (content: string) => {
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

    transformContent: async (content: string, action: TransformAction) => {
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

    transformAndWrite: async (content: string, action: TransformAction) => {
      const transformed = await get().transformContent(content, action);
      if (transformed) {
        await get().writeText(transformed);
      }
    },

    extractEntities: async (content: string) => {
      if (!isTauri()) return [];

      try {
        const entities = await invoke<ExtractedEntity[]>('clipboard_extract_entities', { content });
        return entities;
      } catch (error) {
        log.error('Failed to extract entities', error as Error);
        return [];
      }
    },

    getSuggestedActions: async (content: string) => {
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

    detectCategory: async (content: string) => {
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

    detectLanguage: async (content: string) => {
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

    checkSensitive: async (content: string) => {
      if (!isTauri()) return false;

      try {
        return await invoke<boolean>('clipboard_check_sensitive', { content });
      } catch (error) {
        log.error('Failed to check sensitive', error as Error);
        return false;
      }
    },

    getStats: async (content: string) => {
      if (!isTauri()) return null;

      try {
        return await invoke<ContentStats>('clipboard_get_stats', { content });
      } catch (error) {
        log.error('Failed to get stats', error as Error);
        return null;
      }
    },

    addTemplate: (template) => {
      const newTemplate: ClipboardTemplate = {
        ...template,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        usageCount: 0,
      };
      set((state) => ({
        templates: [...state.templates, newTemplate],
      }));
    },

    removeTemplate: (id: string) => {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      }));
    },

    updateTemplate: (id: string, updates: Partial<ClipboardTemplate>) => {
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    },

    applyTemplate: async (id: string, variables?: Record<string, string>) => {
      const template = get().templates.find((t) => t.id === id);
      if (!template) return null;

      let content = template.content;

      // Replace variables
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
      }

      // Update usage count
      get().updateTemplate(id, { usageCount: template.usageCount + 1 });

      // Write to clipboard
      await get().writeText(content);

      return content;
    },

    searchTemplates: (query: string) => {
      const lowerQuery = query.toLowerCase();
      return get().templates.filter(
        (t) =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description?.toLowerCase().includes(lowerQuery) ||
          t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    },

    startMonitoring: () => {
      if (get().isMonitoring) return;

      set({ isMonitoring: true });

      // Start polling interval
      monitoringIntervalId = setInterval(async () => {
        const result = await get().getCurrentWithAnalysis();
        if (result) {
          set({ lastUpdateTime: Date.now() });
        }
      }, get().monitoringInterval);

      // Listen for clipboard change events
      if (isTauri()) {
        listen('clipboard-changed', async () => {
          await get().getCurrentWithAnalysis();
          set({ lastUpdateTime: Date.now() });
        }).then((unlisten) => {
          eventUnlisten = unlisten;
        });
      }
    },

    stopMonitoring: () => {
      if (monitoringIntervalId) {
        clearInterval(monitoringIntervalId);
        monitoringIntervalId = null;
      }
      if (eventUnlisten) {
        eventUnlisten();
        eventUnlisten = null;
      }
      set({ isMonitoring: false });
    },

    setAutoAnalyze: (enabled: boolean) => {
      set({ autoAnalyze: enabled });
    },

    setMonitoringInterval: (interval: number) => {
      set({ monitoringInterval: interval });
      // Restart monitoring with new interval if currently monitoring
      if (get().isMonitoring) {
        get().stopMonitoring();
        get().startMonitoring();
      }
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      get().stopMonitoring();
      set(initialState);
    },
  }))
);

// Selector hooks for common use cases
export const useCurrentClipboardContent = () =>
  useClipboardContextStore((state) => state.currentContent);

export const useCurrentClipboardAnalysis = () =>
  useClipboardContextStore((state) => state.currentAnalysis);

export const useClipboardTemplates = () => useClipboardContextStore((state) => state.templates);

export const useIsClipboardMonitoring = () =>
  useClipboardContextStore((state) => state.isMonitoring);
