/**
 * useDesignerSession - unified state/actions bridge for Designer UIs
 * Consolidates code sync, parse strategy, history restore, and AI edits.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDesignerStore } from '@/stores/designer';
import { executeDesignerAIEdit, type FrameworkType, type DesignerTemplate } from '@/lib/designer';
import type { DesignerHistoryEntry } from '@/types/designer';
import { useDebouncedCallback } from '@/hooks/utils/use-debounce';
import { useDesignerAIConfig } from './use-designer-ai-config';

export type DesignerCodeParseMode = 'immediate' | 'debounced' | 'none';

export interface UpdateDesignerCodeOptions {
  addToHistory?: boolean;
  parseMode?: DesignerCodeParseMode;
}

export interface UseDesignerSessionOptions {
  initialCode?: string;
  framework?: FrameworkType;
  onCodeChange?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
}

export interface UseDesignerSessionReturn {
  code: string;
  framework: FrameworkType;
  history: DesignerHistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  isAIProcessing: boolean;
  aiError: string | null;
  updateCode: (code: string, options?: UpdateDesignerCodeOptions) => void;
  applyTemplate: (template: DesignerTemplate) => void;
  restoreHistoryEntry: (entry: DesignerHistoryEntry) => void;
  executeAIEdit: (prompt: string) => Promise<string | null>;
  clearAIError: () => void;
  setFramework: (framework: FrameworkType) => void;
  undo: () => void;
  redo: () => void;
}

export function useDesignerSession(options: UseDesignerSessionOptions = {}): UseDesignerSessionReturn {
  const { initialCode, framework: initialFramework, onCodeChange, onAIRequest } = options;
  const initializedRef = useRef(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const { getConfig } = useDesignerAIConfig();

  const code = useDesignerStore((state) => state.code);
  const framework = useDesignerStore((state) => state.framework);
  const setFramework = useDesignerStore((state) => state.setFramework);
  const setCode = useDesignerStore((state) => state.setCode);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);
  const restoreCodeAndParse = useDesignerStore((state) => state.restoreCodeAndParse);
  const history = useDesignerStore((state) => state.history);
  const historyIndex = useDesignerStore((state) => state.historyIndex);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);

  useEffect(() => {
    if (initialFramework) {
      setFramework(initialFramework);
    }
  }, [initialFramework, setFramework]);

  useEffect(() => {
    if (!initializedRef.current && typeof initialCode === 'string' && initialCode.length > 0) {
      initializedRef.current = true;
      void restoreCodeAndParse(initialCode);
      onCodeChange?.(initialCode);
    }
  }, [initialCode, onCodeChange, restoreCodeAndParse]);

  const debouncedParseCode = useDebouncedCallback((nextCode: unknown) => {
    if (typeof nextCode === 'string') {
      void parseCodeToElements(nextCode);
    }
  }, 300);

  const updateCode = useCallback(
    (nextCode: string, updateOptions?: UpdateDesignerCodeOptions) => {
      const addToHistory = updateOptions?.addToHistory ?? true;
      const parseMode = updateOptions?.parseMode ?? 'debounced';
      setCode(nextCode, addToHistory);
      onCodeChange?.(nextCode);

      if (parseMode === 'immediate') {
        void parseCodeToElements(nextCode);
      } else if (parseMode === 'debounced') {
        debouncedParseCode(nextCode);
      }
    },
    [setCode, onCodeChange, parseCodeToElements, debouncedParseCode]
  );

  const applyTemplate = useCallback(
    (template: DesignerTemplate) => {
      updateCode(template.code, { addToHistory: true, parseMode: 'immediate' });
    },
    [updateCode]
  );

  const restoreHistoryEntry = useCallback(
    (entry: DesignerHistoryEntry) => {
      void restoreCodeAndParse(entry.newCode);
      onCodeChange?.(entry.newCode);
    },
    [restoreCodeAndParse, onCodeChange]
  );

  const executeAIEdit = useCallback(
    async (prompt: string): Promise<string | null> => {
      if (!prompt.trim()) return null;

      setIsAIProcessing(true);
      setAIError(null);

      try {
        const nextCode = onAIRequest
          ? await onAIRequest(prompt, code)
          : await (async () => {
              const result = await executeDesignerAIEdit(prompt, code, getConfig());
              if (result.success && result.code) {
                return result.code;
              }
              throw new Error(result.error || 'AI edit failed');
            })();

        updateCode(nextCode, { addToHistory: true, parseMode: 'immediate' });
        return nextCode;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI edit failed';
        setAIError(message);
        return null;
      } finally {
        setIsAIProcessing(false);
      }
    },
    [onAIRequest, code, getConfig, updateCode]
  );

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return useMemo(
    () => ({
      code,
      framework,
      history,
      historyIndex,
      canUndo,
      canRedo,
      isAIProcessing,
      aiError,
      updateCode,
      applyTemplate,
      restoreHistoryEntry,
      executeAIEdit,
      clearAIError: () => setAIError(null),
      setFramework,
      undo,
      redo,
    }),
    [
      code,
      framework,
      history,
      historyIndex,
      canUndo,
      canRedo,
      isAIProcessing,
      aiError,
      updateCode,
      applyTemplate,
      restoreHistoryEntry,
      executeAIEdit,
      setFramework,
      undo,
      redo,
    ]
  );
}

export default useDesignerSession;
