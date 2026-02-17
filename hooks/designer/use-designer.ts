/**
 * useDesigner - compatibility adapter for legacy consumers.
 * Internally proxies to the unified useDesignerSession hook.
 */

import { useCallback, useMemo, useState } from 'react';
import { useDesignerStore } from '@/stores';
import {
  generateDesignerComponent,
  getDefaultTemplate,
  type DesignerAIResult,
} from '@/lib/designer';
import { useDesignerAIConfig } from './use-designer-ai-config';
import { useDesignerSession } from './use-designer-session';

export interface UseDesignerOptions {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
}

export interface UseDesignerReturn {
  // Code state
  code: string;
  setCode: (code: string) => void;
  isDirty: boolean;

  // History
  history: string[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addToHistory: (code: string) => void;

  // AI editing
  isAIProcessing: boolean;
  aiError: string | null;
  aiPrompt: string;
  setAIPrompt: (prompt: string) => void;
  executeAIEdit: () => Promise<DesignerAIResult>;
  generateFromPrompt: (description: string) => Promise<DesignerAIResult>;
  clearAIError: () => void;

  // Store state (from useDesignerStore)
  mode: 'preview' | 'code' | 'design';
  setMode: (mode: 'preview' | 'code' | 'design') => void;
  viewport: 'mobile' | 'tablet' | 'desktop' | 'full';
  setViewport: (viewport: 'mobile' | 'tablet' | 'desktop' | 'full') => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  showElementTree: boolean;
  toggleElementTree: () => void;
  showStylePanel: boolean;
  toggleStylePanel: () => void;
}

export function useDesigner(options: UseDesignerOptions = {}): UseDesignerReturn {
  const { initialCode, onCodeChange } = options;
  const [aiPrompt, setAIPrompt] = useState('');

  const mode = useDesignerStore((state) => state.mode);
  const setMode = useDesignerStore((state) => state.setMode);
  const viewport = useDesignerStore((state) => state.viewport);
  const setViewport = useDesignerStore((state) => state.setViewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const setZoom = useDesignerStore((state) => state.setZoom);
  const showElementTree = useDesignerStore((state) => state.showElementTree);
  const toggleElementTree = useDesignerStore((state) => state.toggleElementTree);
  const showStylePanel = useDesignerStore((state) => state.showStylePanel);
  const toggleStylePanel = useDesignerStore((state) => state.toggleStylePanel);
  const isDirty = useDesignerStore((state) => state.isDirty);

  const {
    code,
    history,
    historyIndex,
    canUndo,
    canRedo,
    isAIProcessing,
    aiError,
    updateCode,
    executeAIEdit,
    clearAIError,
    undo,
    redo,
  } = useDesignerSession({
    initialCode: initialCode ?? getDefaultTemplate().code,
    onCodeChange,
  });

  const { getConfig } = useDesignerAIConfig();

  // Legacy API expects history as snapshots, not entries.
  const legacyHistory = useMemo(() => {
    if (history.length === 0) {
      return [code];
    }
    const snapshots: string[] = [history[0]?.previousCode || code];
    for (const entry of history) {
      snapshots.push(entry.newCode);
    }
    return snapshots;
  }, [history, code]);

  const legacyHistoryIndex = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.max(0, historyIndex + 1);
  }, [history.length, historyIndex]);

  const setCode = useCallback(
    (newCode: string) => {
      updateCode(newCode, { addToHistory: true, parseMode: 'debounced' });
    },
    [updateCode]
  );

  const addToHistory = useCallback(
    (newCode: string) => {
      updateCode(newCode, { addToHistory: true, parseMode: 'none' });
    },
    [updateCode]
  );

  const executeAIEditCompat = useCallback(async (): Promise<DesignerAIResult> => {
    if (!aiPrompt.trim()) {
      return { success: false, error: 'No prompt provided' };
    }

    const nextCode = await executeAIEdit(aiPrompt);
    if (nextCode) {
      setAIPrompt('');
      return { success: true, code: nextCode };
    }

    return { success: false, error: aiError || 'AI edit failed' };
  }, [aiPrompt, executeAIEdit, aiError]);

  const generateFromPrompt = useCallback(
    async (description: string): Promise<DesignerAIResult> => {
      try {
        const result = await generateDesignerComponent(description, getConfig());
        if (result.success && result.code) {
          updateCode(result.code, { addToHistory: true, parseMode: 'immediate' });
        }
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        };
      }
    },
    [getConfig, updateCode]
  );

  return {
    // Code state
    code,
    setCode,
    isDirty,

    // History
    history: legacyHistory,
    historyIndex: legacyHistoryIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    addToHistory,

    // AI editing
    isAIProcessing,
    aiError,
    aiPrompt,
    setAIPrompt,
    executeAIEdit: executeAIEditCompat,
    generateFromPrompt,
    clearAIError,

    // Store state
    mode,
    setMode,
    viewport,
    setViewport,
    zoom,
    setZoom,
    showElementTree,
    toggleElementTree,
    showStylePanel,
    toggleStylePanel,
  };
}

export default useDesigner;
