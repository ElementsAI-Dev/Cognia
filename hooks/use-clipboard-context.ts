/**
 * Clipboard Context Awareness Hook
 *
 * Provides convenient access to clipboard context awareness functionality
 * including smart paste, content transformations, and context-aware suggestions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useClipboardContextStore,
  type ClipboardAnalysis,
  type ContentCategory,
  type DetectedLanguage,
  type ExtractedEntity,
  type SuggestedAction,
  type ContentStats,
  type TransformAction,
  type ClipboardTemplate,
} from '@/stores/clipboard-context-store';

export type {
  ClipboardAnalysis,
  ContentCategory,
  DetectedLanguage,
  ExtractedEntity,
  SuggestedAction,
  ContentStats,
  TransformAction,
  ClipboardTemplate,
};

/** Transform action with metadata */
export interface TransformActionInfo {
  id: TransformAction;
  label: string;
  description: string;
  icon: string;
  category: 'format' | 'extract' | 'case' | 'lines' | 'encode';
}

/** Available transform actions */
export const TRANSFORM_ACTIONS: TransformActionInfo[] = [
  { id: 'format_json', label: 'Format JSON', description: 'Pretty print JSON', icon: 'braces', category: 'format' },
  { id: 'minify_json', label: 'Minify JSON', description: 'Compress JSON', icon: 'minimize', category: 'format' },
  { id: 'extract_urls', label: 'Extract URLs', description: 'Get all URLs', icon: 'link', category: 'extract' },
  { id: 'extract_emails', label: 'Extract Emails', description: 'Get all emails', icon: 'mail', category: 'extract' },
  { id: 'trim_whitespace', label: 'Trim Whitespace', description: 'Remove leading/trailing spaces', icon: 'text-cursor-input', category: 'format' },
  { id: 'to_uppercase', label: 'To Uppercase', description: 'Convert to uppercase', icon: 'arrow-up', category: 'case' },
  { id: 'to_lowercase', label: 'To Lowercase', description: 'Convert to lowercase', icon: 'arrow-down', category: 'case' },
  { id: 'remove_empty_lines', label: 'Remove Empty Lines', description: 'Remove blank lines', icon: 'minus', category: 'lines' },
  { id: 'sort_lines', label: 'Sort Lines', description: 'Alphabetically sort lines', icon: 'arrow-up-down', category: 'lines' },
  { id: 'unique_lines', label: 'Unique Lines', description: 'Remove duplicate lines', icon: 'filter', category: 'lines' },
  { id: 'escape_html', label: 'Escape HTML', description: 'Encode HTML entities', icon: 'code', category: 'encode' },
  { id: 'unescape_html', label: 'Unescape HTML', description: 'Decode HTML entities', icon: 'file-code', category: 'encode' },
];

/** Category display information */
export const CATEGORY_INFO: Record<ContentCategory, { label: string; icon: string; color: string }> = {
  PlainText: { label: 'Plain Text', icon: 'file-text', color: 'gray' },
  Url: { label: 'URL', icon: 'link', color: 'blue' },
  Email: { label: 'Email', icon: 'mail', color: 'green' },
  PhoneNumber: { label: 'Phone', icon: 'phone', color: 'purple' },
  FilePath: { label: 'File Path', icon: 'folder', color: 'yellow' },
  Code: { label: 'Code', icon: 'code', color: 'cyan' },
  Json: { label: 'JSON', icon: 'braces', color: 'orange' },
  Markup: { label: 'HTML/XML', icon: 'code-xml', color: 'red' },
  Markdown: { label: 'Markdown', icon: 'file-text', color: 'indigo' },
  Math: { label: 'Math', icon: 'calculator', color: 'pink' },
  Color: { label: 'Color', icon: 'palette', color: 'rainbow' },
  DateTime: { label: 'Date/Time', icon: 'calendar', color: 'teal' },
  Uuid: { label: 'UUID', icon: 'fingerprint', color: 'slate' },
  IpAddress: { label: 'IP Address', icon: 'globe', color: 'emerald' },
  SensitiveData: { label: 'Sensitive', icon: 'shield-alert', color: 'red' },
  Command: { label: 'Command', icon: 'terminal', color: 'stone' },
  Sql: { label: 'SQL', icon: 'database', color: 'amber' },
  RegexPattern: { label: 'Regex', icon: 'regex', color: 'violet' },
  StructuredData: { label: 'Structured Data', icon: 'table', color: 'lime' },
  NaturalText: { label: 'Natural Text', icon: 'text', color: 'neutral' },
  Unknown: { label: 'Unknown', icon: 'help-circle', color: 'gray' },
};

/** Language display information */
export const LANGUAGE_INFO: Record<DetectedLanguage, { label: string; icon: string }> = {
  JavaScript: { label: 'JavaScript', icon: 'file-code' },
  TypeScript: { label: 'TypeScript', icon: 'file-code' },
  Python: { label: 'Python', icon: 'file-code' },
  Rust: { label: 'Rust', icon: 'file-code' },
  Go: { label: 'Go', icon: 'file-code' },
  Java: { label: 'Java', icon: 'file-code' },
  CSharp: { label: 'C#', icon: 'file-code' },
  Cpp: { label: 'C++', icon: 'file-code' },
  Ruby: { label: 'Ruby', icon: 'file-code' },
  Php: { label: 'PHP', icon: 'file-code' },
  Swift: { label: 'Swift', icon: 'file-code' },
  Kotlin: { label: 'Kotlin', icon: 'file-code' },
  Sql: { label: 'SQL', icon: 'database' },
  Html: { label: 'HTML', icon: 'code-xml' },
  Css: { label: 'CSS', icon: 'palette' },
  Json: { label: 'JSON', icon: 'braces' },
  Yaml: { label: 'YAML', icon: 'file-code' },
  Toml: { label: 'TOML', icon: 'file-code' },
  Markdown: { label: 'Markdown', icon: 'file-text' },
  Shell: { label: 'Shell', icon: 'terminal' },
  PowerShell: { label: 'PowerShell', icon: 'terminal' },
  Unknown: { label: 'Unknown', icon: 'file' },
};

interface UseClipboardContextOptions {
  autoMonitor?: boolean;
  monitorInterval?: number;
}

export function useClipboardContext(options: UseClipboardContextOptions = {}) {
  const { autoMonitor = false, monitorInterval = 2000 } = options;

  const store = useClipboardContextStore();
  const [isLoading, setIsLoading] = useState(false);

  // Auto-start monitoring if requested
  useEffect(() => {
    if (autoMonitor && !store.isMonitoring) {
      store.setMonitoringInterval(monitorInterval);
      store.startMonitoring();
    }

    return () => {
      if (autoMonitor && store.isMonitoring) {
        store.stopMonitoring();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMonitor, monitorInterval]);

  // Read and analyze clipboard content
  const readAndAnalyze = useCallback(async () => {
    setIsLoading(true);
    try {
      await store.getCurrentWithAnalysis();
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Smart paste - analyze and potentially transform content before pasting
  const smartPaste = useCallback(async (targetContext?: 'code' | 'text' | 'json' | 'markdown') => {
    const result = await store.getCurrentWithAnalysis();
    if (!result) return null;

    const { content, analysis } = result;

    // Apply automatic transformations based on target context
    if (targetContext) {
      switch (targetContext) {
        case 'json':
          if (analysis.category === 'Json') {
            const formatted = await store.transformContent(content, 'format_json');
            return formatted || content;
          }
          break;
        case 'code':
          // Escape if pasting into code strings
          if (analysis.category === 'Markup') {
            const escaped = await store.transformContent(content, 'escape_html');
            return escaped || content;
          }
          break;
        case 'markdown':
          // Convert HTML to escaped version for markdown
          if (analysis.category === 'Markup') {
            const escaped = await store.transformContent(content, 'escape_html');
            return escaped || content;
          }
          break;
      }
    }

    return content;
  }, [store]);

  // Quick transform and copy
  const quickTransform = useCallback(async (action: TransformAction) => {
    const content = store.currentContent;
    if (!content) return null;

    await store.transformAndWrite(content, action);
    return store.currentContent;
  }, [store]);

  // Get applicable transform actions based on content category
  const getApplicableTransforms = useCallback((category?: ContentCategory): TransformActionInfo[] => {
    const cat = category || store.currentAnalysis?.category;
    if (!cat) return TRANSFORM_ACTIONS;

    switch (cat) {
      case 'Json':
        return TRANSFORM_ACTIONS.filter(a => 
          ['format_json', 'minify_json', 'to_lowercase', 'to_uppercase'].includes(a.id)
        );
      case 'Code':
      case 'Sql':
        return TRANSFORM_ACTIONS.filter(a => 
          ['trim_whitespace', 'remove_empty_lines', 'sort_lines'].includes(a.id)
        );
      case 'Url':
        return TRANSFORM_ACTIONS.filter(a => 
          ['extract_urls', 'to_lowercase'].includes(a.id)
        );
      case 'Email':
        return TRANSFORM_ACTIONS.filter(a => 
          ['extract_emails', 'to_lowercase'].includes(a.id)
        );
      case 'Markup':
        return TRANSFORM_ACTIONS.filter(a => 
          ['escape_html', 'unescape_html', 'trim_whitespace'].includes(a.id)
        );
      case 'NaturalText':
      case 'PlainText':
        return TRANSFORM_ACTIONS.filter(a => 
          ['to_uppercase', 'to_lowercase', 'trim_whitespace', 'remove_empty_lines', 'sort_lines', 'unique_lines'].includes(a.id)
        );
      default:
        return TRANSFORM_ACTIONS;
    }
  }, [store.currentAnalysis?.category]);

  // Get category display info
  const getCategoryInfo = useCallback((category?: ContentCategory) => {
    const cat = category || store.currentAnalysis?.category;
    return cat ? CATEGORY_INFO[cat] : null;
  }, [store.currentAnalysis?.category]);

  // Get language display info
  const getLanguageInfo = useCallback((language?: DetectedLanguage) => {
    const lang = language || store.currentAnalysis?.language;
    return lang ? LANGUAGE_INFO[lang] : null;
  }, [store.currentAnalysis?.language]);

  // Execute suggested action
  const executeAction = useCallback(async (actionId: string) => {
    const content = store.currentContent;
    if (!content) return;

    switch (actionId) {
      case 'copy':
        await store.writeText(content);
        break;
      case 'format_json':
      case 'minify_json':
      case 'extract_urls':
      case 'extract_emails':
      case 'trim_whitespace':
      case 'to_uppercase':
      case 'to_lowercase':
      case 'remove_empty_lines':
      case 'sort_lines':
      case 'unique_lines':
      case 'escape_html':
      case 'unescape_html':
        await quickTransform(actionId as TransformAction);
        break;
      case 'open_url':
        const urls = store.currentAnalysis?.entities.filter(e => e.entity_type === 'url');
        if (urls && urls.length > 0) {
          window.open(urls[0].value, '_blank');
        }
        break;
      case 'compose_email':
        const emails = store.currentAnalysis?.entities.filter(e => e.entity_type === 'email');
        if (emails && emails.length > 0) {
          window.open(`mailto:${emails[0].value}`, '_blank');
        }
        break;
      default:
        console.log('Action not implemented:', actionId);
    }
  }, [store, quickTransform]);

  // Computed properties
  const hasSensitiveContent = useMemo(() => 
    store.currentAnalysis?.is_sensitive ?? false,
    [store.currentAnalysis?.is_sensitive]
  );

  const contentPreview = useMemo(() => {
    const content = store.currentContent;
    if (!content) return null;

    const maxLength = store.currentAnalysis?.formatting.max_preview_lines ?? 5;
    const lines = content.split('\n').slice(0, maxLength);
    return lines.join('\n') + (content.split('\n').length > maxLength ? '\n...' : '');
  }, [store.currentContent, store.currentAnalysis?.formatting.max_preview_lines]);

  return {
    // State
    content: store.currentContent,
    analysis: store.currentAnalysis,
    isAnalyzing: store.isAnalyzing,
    isLoading,
    isMonitoring: store.isMonitoring,
    error: store.error,

    // Computed
    hasSensitiveContent,
    contentPreview,
    category: store.currentAnalysis?.category,
    language: store.currentAnalysis?.language,
    entities: store.currentAnalysis?.entities ?? [],
    suggestedActions: store.currentAnalysis?.suggested_actions ?? [],
    stats: store.currentAnalysis?.stats,
    formatting: store.currentAnalysis?.formatting,

    // Actions
    readAndAnalyze,
    smartPaste,
    quickTransform,
    executeAction,

    // Transforms
    getApplicableTransforms,
    transformContent: store.transformContent,
    transformAndWrite: store.transformAndWrite,

    // Analysis
    analyzeContent: store.analyzeContent,
    extractEntities: store.extractEntities,
    getSuggestedActions: store.getSuggestedActions,
    detectCategory: store.detectCategory,
    detectLanguage: store.detectLanguage,
    checkSensitive: store.checkSensitive,
    getStats: store.getStats,

    // Clipboard operations
    readClipboard: store.readClipboard,
    writeText: store.writeText,
    writeHtml: store.writeHtml,
    clearClipboard: store.clearClipboard,

    // Display helpers
    getCategoryInfo,
    getLanguageInfo,
    CATEGORY_INFO,
    LANGUAGE_INFO,
    TRANSFORM_ACTIONS,

    // Monitoring
    startMonitoring: store.startMonitoring,
    stopMonitoring: store.stopMonitoring,

    // Templates
    templates: store.templates,
    addTemplate: store.addTemplate,
    removeTemplate: store.removeTemplate,
    updateTemplate: store.updateTemplate,
    applyTemplate: store.applyTemplate,
    searchTemplates: store.searchTemplates,

    // Settings
    setAutoAnalyze: store.setAutoAnalyze,
    setMonitoringInterval: store.setMonitoringInterval,

    // Utilities
    clearError: store.clearError,
    reset: store.reset,
  };
}

export default useClipboardContext;
