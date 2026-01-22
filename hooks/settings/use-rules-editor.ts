'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/stores';
import { optimizeRules } from '@/lib/ai/generation/rules-optimizer';
import type { ProviderName } from '@/types';
import type { EditorTheme, RulesEditorProps, UseRulesEditorReturn } from '@/types/settings/rules';
import {
  RULE_TARGETS,
  RULE_TEMPLATES,
  MAX_HISTORY_SIZE,
} from '@/components/settings/rules/constants';

export function useRulesEditor({
  onSave,
  initialContent,
}: Pick<RulesEditorProps, 'onSave' | 'initialContent'>): UseRulesEditorReturn {
  const t = useTranslations('rules');
  const tCommon = useTranslations('common');
  const settings = useSettingsStore();

  // Tab state
  const [activeTab, setActiveTab] = useState(RULE_TARGETS[0].id);

  // Content state
  const [contents, setContents] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    RULE_TARGETS.forEach((target) => {
      defaults[target.id] = initialContent?.[target.id] ?? RULE_TEMPLATES.general.base.content;
    });
    return defaults;
  });
  const [originalContents, setOriginalContents] = useState<Record<string, string>>(contents);

  // Editor settings
  const [showPreview, setShowPreview] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [theme, setTheme] = useState<EditorTheme>('vs-dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loading states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // History for undo/redo per tab
  const [history, setHistory] = useState<Record<string, string[]>>(() => {
    const h: Record<string, string[]> = {};
    RULE_TARGETS.forEach((target) => {
      h[target.id] = [contents[target.id]];
    });
    return h;
  });
  const [historyIndex, setHistoryIndex] = useState<Record<string, number>>(() => {
    const idx: Record<string, number> = {};
    RULE_TARGETS.forEach((target) => {
      idx[target.id] = 0;
    });
    return idx;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with initialContent
  useEffect(() => {
    if (initialContent) {
      const newContents = { ...contents };
      let hasChanges = false;
      for (const target of RULE_TARGETS) {
        if (
          initialContent[target.id] !== undefined &&
          initialContent[target.id] !== contents[target.id]
        ) {
          newContents[target.id] = initialContent[target.id];
          hasChanges = true;
        }
      }
      if (hasChanges) {
        setContents(newContents);
        setOriginalContents(newContents);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  // Computed values
  const activeContent = contents[activeTab] || '';
  const isDirty = activeContent !== originalContents[activeTab];
  const canUndo = historyIndex[activeTab] > 0;
  const canRedo = historyIndex[activeTab] < (history[activeTab]?.length || 1) - 1;
  const charCount = activeContent.length;
  const wordCount = activeContent.split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.ceil(charCount / 4);

  // History management
  const pushToHistory = useCallback(
    (tabId: string, content: string) => {
      setHistory((prev) => {
        const tabHistory = prev[tabId] || [];
        const currentIndex = historyIndex[tabId] || 0;
        // Truncate any future history if we're not at the end
        const newHistory = [...tabHistory.slice(0, currentIndex + 1), content];
        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        return { ...prev, [tabId]: newHistory };
      });
      setHistoryIndex((prev) => {
        const currentIndex = prev[tabId] || 0;
        const newIndex = Math.min(currentIndex + 1, MAX_HISTORY_SIZE - 1);
        return { ...prev, [tabId]: newIndex };
      });
    },
    [historyIndex]
  );

  // Content handlers
  const handleContentChange = useCallback(
    (val: string | undefined) => {
      const newValue = val || '';
      setContents((prev) => ({ ...prev, [activeTab]: newValue }));
      pushToHistory(activeTab, newValue);
    },
    [activeTab, pushToHistory]
  );

  const handleApplyTemplate = useCallback(
    (category: string, templateKey: string) => {
      const template = RULE_TEMPLATES[category]?.[templateKey];
      if (template) {
        setContents((prev) => ({ ...prev, [activeTab]: template.content }));
        pushToHistory(activeTab, template.content);
        toast.success(`Applied template: ${template.label}`);
      }
    },
    [activeTab, pushToHistory]
  );

  const handleInsertVariable = useCallback(
    (variable: string) => {
      const newContent = activeContent + (activeContent.endsWith('\n') ? '' : '\n') + variable;
      setContents((prev) => ({ ...prev, [activeTab]: newContent }));
      pushToHistory(activeTab, newContent);
    },
    [activeTab, activeContent, pushToHistory]
  );

  // History actions
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex[activeTab] - 1;
    setHistoryIndex((prev) => ({ ...prev, [activeTab]: newIndex }));
    const content = history[activeTab][newIndex];
    setContents((prev) => ({ ...prev, [activeTab]: content }));
  }, [activeTab, canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex[activeTab] + 1;
    setHistoryIndex((prev) => ({ ...prev, [activeTab]: newIndex }));
    const content = history[activeTab][newIndex];
    setContents((prev) => ({ ...prev, [activeTab]: content }));
  }, [activeTab, canRedo, history, historyIndex]);

  // File operations
  const handleSave = useCallback(async () => {
    const target = RULE_TARGETS.find((t) => t.id === activeTab);
    if (!target) return;
    try {
      await onSave?.(target.path, activeContent);
      setOriginalContents((prev) => ({ ...prev, [activeTab]: activeContent }));
      toast.success(tCommon('success'));
    } catch (error) {
      console.error(error);
      toast.error(tCommon('error'));
    }
  }, [activeTab, activeContent, onSave, tCommon]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(activeContent);
    toast.success(tCommon('copied'));
  }, [activeContent, tCommon]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setContents((prev) => ({ ...prev, [activeTab]: content }));
        pushToHistory(activeTab, content);
        toast.success(t('imported'));
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
    },
    [activeTab, pushToHistory, t]
  );

  const handleExport = useCallback(() => {
    const target = RULE_TARGETS.find((t) => t.id === activeTab);
    if (!target) return;

    const blob = new Blob([activeContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = target.path.replace(/^\./, '').replace(/\//g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('exported'));
  }, [activeTab, activeContent, t]);

  const handleReset = useCallback(() => {
    const defaultContent = RULE_TEMPLATES.general.base.content;
    setContents((prev) => ({ ...prev, [activeTab]: defaultContent }));
    pushToHistory(activeTab, defaultContent);
    setShowResetDialog(false);
    toast.success(t('reset'));
  }, [activeTab, pushToHistory, t]);

  // AI optimization
  const handleOptimize = useCallback(async () => {
    const target = RULE_TARGETS.find((t) => t.id === activeTab);
    if (!target) return;

    setIsOptimizing(true);
    try {
      const providerConfig = settings.providerSettings[settings.defaultProvider];
      const config = {
        provider: settings.defaultProvider as ProviderName,
        model: providerConfig?.defaultModel || 'gpt-4o',
        apiKey: providerConfig?.apiKey || '',
        baseUrl: providerConfig?.baseURL,
      };

      const result = await optimizeRules(
        {
          content: activeContent,
          target: target.path,
          context: 'Tech stack: Next.js, Tailwind CSS, TypeScript, Tauri',
        },
        config
      );

      setContents((prev) => ({ ...prev, [activeTab]: result.optimizedContent }));
      pushToHistory(activeTab, result.optimizedContent);

      if (result.changes.length > 0) {
        toast.success(`Optimized! ${result.changes.length} changes suggested.`);
      } else {
        toast.success('Rules are already highly optimized.');
      }
    } catch (error) {
      console.error(error);
      toast.error('AI Optimization failed. Please check your API settings.');
    } finally {
      setIsOptimizing(false);
    }
  }, [activeTab, activeContent, pushToHistory, settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, handleSave, handleUndo, handleRedo]);

  return {
    // State
    activeTab,
    contents,
    activeContent,
    originalContents,
    isDirty,
    showPreview,
    wordWrap,
    theme,
    mobileMenuOpen,
    canUndo,
    canRedo,
    isOptimizing,
    showResetDialog,
    charCount,
    wordCount,
    tokenEstimate,

    // Actions
    setActiveTab,
    handleContentChange,
    handleApplyTemplate,
    handleInsertVariable,
    handleUndo,
    handleRedo,
    handleSave,
    handleCopy,
    handleImport,
    handleExport,
    handleReset,
    handleFileChange,
    handleOptimize,
    setShowPreview,
    setWordWrap,
    setTheme,
    setMobileMenuOpen,
    setShowResetDialog,

    // Refs
    fileInputRef,
  };
}
