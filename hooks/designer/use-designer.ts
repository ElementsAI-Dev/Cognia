/**
 * useDesigner - Unified hook for designer functionality
 * Combines designer store with AI editing capabilities
 */

import { useState, useCallback } from 'react';
import { useDesignerStore, useSettingsStore } from '@/stores';
import {
  executeDesignerAIEdit,
  generateDesignerComponent,
  getDesignerAIConfig,
  getDefaultTemplate,
  type DesignerAIResult,
} from '@/lib/designer';

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
  
  // Local state for code and history
  const [code, setCodeState] = useState(initialCode || getDefaultTemplate().code);
  const [history, setHistory] = useState<string[]>([initialCode || getDefaultTemplate().code]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  
  // AI state
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [aiPrompt, setAIPrompt] = useState('');
  
  // Settings for AI
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  
  // Designer store state
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
  
  // Set code with optional history tracking
  const setCode = useCallback((newCode: string, addHistory = true) => {
    setCodeState(newCode);
    setIsDirty(true);
    onCodeChange?.(newCode);
    
    if (addHistory) {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newCode);
        return newHistory.slice(-50); // Keep last 50 entries
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }
  }, [historyIndex, onCodeChange]);
  
  // Add to history explicitly
  const addToHistory = useCallback((newCode: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      return newHistory.slice(-50);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);
  
  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCodeState(history[newIndex]);
      onCodeChange?.(history[newIndex]);
    }
  }, [history, historyIndex, onCodeChange]);
  
  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCodeState(history[newIndex]);
      onCodeChange?.(history[newIndex]);
    }
  }, [history, historyIndex, onCodeChange]);
  
  // Clear AI error
  const clearAIError = useCallback(() => {
    setAIError(null);
  }, []);
  
  // Execute AI edit
  const executeAIEdit = useCallback(async (): Promise<DesignerAIResult> => {
    if (!aiPrompt.trim()) {
      return { success: false, error: 'No prompt provided' };
    }
    
    setIsAIProcessing(true);
    setAIError(null);
    
    try {
      const config = getDesignerAIConfig(defaultProvider, providerSettings);
      const result = await executeDesignerAIEdit(aiPrompt, code, config);
      
      if (result.success && result.code) {
        setCode(result.code);
        setAIPrompt('');
      } else if (result.error) {
        setAIError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'AI edit failed';
      setAIError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, defaultProvider, providerSettings, setCode]);
  
  // Generate component from description
  const generateFromPrompt = useCallback(async (description: string): Promise<DesignerAIResult> => {
    setIsAIProcessing(true);
    setAIError(null);
    
    try {
      const config = getDesignerAIConfig(defaultProvider, providerSettings);
      const result = await generateDesignerComponent(description, config);
      
      if (result.success && result.code) {
        setCode(result.code);
      } else if (result.error) {
        setAIError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Generation failed';
      setAIError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsAIProcessing(false);
    }
  }, [defaultProvider, providerSettings, setCode]);
  
  return {
    // Code state
    code,
    setCode,
    isDirty,
    
    // History
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    addToHistory,
    
    // AI editing
    isAIProcessing,
    aiError,
    aiPrompt,
    setAIPrompt,
    executeAIEdit,
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
