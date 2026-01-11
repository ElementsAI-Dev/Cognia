'use client';

/**
 * Hook for prompt self-optimization with AI
 * Provides analysis, optimization, feedback collection, and A/B testing capabilities
 */

import { useState, useCallback, useMemo } from 'react';
import { useSettingsStore, useSessionStore } from '@/stores';
import { usePromptTemplateStore } from '@/stores/prompt/prompt-template-store';
import {
  analyzePrompt,
  optimizePromptFromAnalysis,
  analyzeUserFeedback,
  autoOptimize,
  type SelfOptimizationConfig,
  type SelfOptimizationResult,
  type OptimizationSuggestion,
} from '@/lib/ai/generation/prompt-self-optimizer';
import type { PromptTemplate, PromptFeedback, PromptABTest } from '@/types/content/prompt-template';
import type { ProviderName } from '@/lib/ai/core/client';

export interface UsePromptOptimizerOptions {
  templateId?: string;
  autoAnalyze?: boolean;
}

export interface UsePromptOptimizerReturn {
  // State
  isAnalyzing: boolean;
  isOptimizing: boolean;
  analysisResult: SelfOptimizationResult | null;
  suggestions: OptimizationSuggestion[];
  error: string | null;
  
  // Template info
  template: PromptTemplate | undefined;
  feedback: PromptFeedback[];
  activeABTest: PromptABTest | null;
  
  // Actions
  analyze: (template?: PromptTemplate) => Promise<SelfOptimizationResult | null>;
  optimize: (selectedSuggestions?: OptimizationSuggestion[]) => Promise<SelfOptimizationResult | null>;
  applyOptimization: (optimizedContent: string) => void;
  runAutoOptimize: () => Promise<SelfOptimizationResult | null>;
  
  // Feedback
  submitFeedback: (feedback: Omit<PromptFeedback, 'id' | 'templateId' | 'createdAt'>) => void;
  
  // A/B Testing
  startABTest: (variantContent: string, hypothesis: string) => PromptABTest | null;
  recordABTestResult: (variant: 'A' | 'B', success: boolean, rating?: number) => void;
  completeABTest: () => PromptABTest | null;
  
  // Utils
  reset: () => void;
  getConfig: () => SelfOptimizationConfig | null;
}

export function usePromptOptimizer(
  options: UsePromptOptimizerOptions = {}
): UsePromptOptimizerReturn {
  const { templateId } = options;
  
  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SelfOptimizationResult | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Store access
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);
  const session = getActiveSession();
  
  const getTemplate = usePromptTemplateStore((state) => state.getTemplate);
  const getFeedback = usePromptTemplateStore((state) => state.getFeedback);
  const getActiveABTest = usePromptTemplateStore((state) => state.getActiveABTest);
  const recordFeedback = usePromptTemplateStore((state) => state.recordFeedback);
  const startABTestAction = usePromptTemplateStore((state) => state.startABTest);
  const recordABTestResultAction = usePromptTemplateStore((state) => state.recordABTestResult);
  const completeABTestAction = usePromptTemplateStore((state) => state.completeABTest);
  const markAsOptimized = usePromptTemplateStore((state) => state.markAsOptimized);
  
  // Derived state
  const template = useMemo(() => 
    templateId ? getTemplate(templateId) : undefined,
    [templateId, getTemplate]
  );
  
  const feedback = useMemo(() => 
    templateId ? getFeedback(templateId) : [],
    [templateId, getFeedback]
  );
  
  const activeABTest = useMemo(() => 
    templateId ? getActiveABTest(templateId) : null,
    [templateId, getActiveABTest]
  );
  
  // Get optimization config from current session/settings
  const getConfig = useCallback((): SelfOptimizationConfig | null => {
    const provider = (session?.provider || 'openai') as ProviderName;
    const model = session?.model || 'gpt-4o-mini';
    const settings = providerSettings[provider];
    
    if (!settings?.apiKey) {
      return null;
    }
    
    return {
      provider,
      model,
      apiKey: settings.apiKey,
      baseURL: settings.baseURL,
      minFeedbackCount: 5,
      targetSuccessRate: 0.8,
      maxIterations: 3,
    };
  }, [session, providerSettings]);
  
  // Analyze a prompt template
  const analyze = useCallback(async (
    targetTemplate?: PromptTemplate
  ): Promise<SelfOptimizationResult | null> => {
    const templateToAnalyze = targetTemplate || template;
    if (!templateToAnalyze) {
      setError('No template provided for analysis');
      return null;
    }
    
    const config = getConfig();
    if (!config) {
      setError('No API key configured for the current provider');
      return null;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzePrompt(templateToAnalyze, config);
      setAnalysisResult(result);
      setSuggestions(result.suggestions);
      
      if (!result.success) {
        setError(result.error || 'Analysis failed');
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [template, getConfig]);
  
  // Optimize based on suggestions
  const optimize = useCallback(async (
    selectedSuggestions?: OptimizationSuggestion[]
  ): Promise<SelfOptimizationResult | null> => {
    if (!template) {
      setError('No template selected for optimization');
      return null;
    }
    
    const config = getConfig();
    if (!config) {
      setError('No API key configured for the current provider');
      return null;
    }
    
    const toApply = selectedSuggestions || suggestions;
    if (toApply.length === 0) {
      setError('No suggestions to apply');
      return null;
    }
    
    setIsOptimizing(true);
    setError(null);
    
    try {
      const result = await optimizePromptFromAnalysis(template, toApply, config);
      setAnalysisResult(result);
      
      if (!result.success) {
        setError(result.error || 'Optimization failed');
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Optimization failed';
      setError(message);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, [template, suggestions, getConfig]);
  
  // Apply optimization to the template
  const applyOptimization = useCallback((optimizedContent: string) => {
    if (!templateId) {
      setError('No template ID to apply optimization');
      return;
    }
    
    const suggestionDescriptions = suggestions.map(s => s.description);
    markAsOptimized(templateId, optimizedContent, suggestionDescriptions);
  }, [templateId, suggestions, markAsOptimized]);
  
  // Run auto-optimization based on feedback
  const runAutoOptimize = useCallback(async (): Promise<SelfOptimizationResult | null> => {
    if (!template) {
      setError('No template selected for auto-optimization');
      return null;
    }
    
    const config = getConfig();
    if (!config) {
      setError('No API key configured for the current provider');
      return null;
    }
    
    setIsOptimizing(true);
    setError(null);
    
    try {
      // Get feedback-based suggestions first
      const feedbackSuggestions = await analyzeUserFeedback(template, feedback, config);
      
      // Run auto-optimize
      const result = await autoOptimize(template, feedback, config);
      
      if (result) {
        setAnalysisResult(result);
        setSuggestions([...result.suggestions, ...feedbackSuggestions]);
        
        if (!result.success) {
          setError(result.error || 'Auto-optimization failed');
        }
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-optimization failed';
      setError(message);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, [template, feedback, getConfig]);
  
  // Submit feedback for a template
  const submitFeedback = useCallback((
    feedbackData: Omit<PromptFeedback, 'id' | 'templateId' | 'createdAt'>
  ) => {
    if (!templateId) {
      setError('No template ID to submit feedback');
      return;
    }
    
    recordFeedback(templateId, feedbackData);
  }, [templateId, recordFeedback]);
  
  // Start an A/B test
  const startABTest = useCallback((
    variantContent: string,
    hypothesis: string
  ): PromptABTest | null => {
    if (!templateId) {
      setError('No template ID to start A/B test');
      return null;
    }
    
    return startABTestAction(templateId, variantContent, hypothesis);
  }, [templateId, startABTestAction]);
  
  // Record A/B test result
  const recordABTestResult = useCallback((
    variant: 'A' | 'B',
    success: boolean,
    rating?: number
  ) => {
    if (!templateId) return;
    recordABTestResultAction(templateId, variant, success, rating);
  }, [templateId, recordABTestResultAction]);
  
  // Complete A/B test
  const completeABTest = useCallback((): PromptABTest | null => {
    if (!templateId) return null;
    return completeABTestAction(templateId);
  }, [templateId, completeABTestAction]);
  
  // Reset state
  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setIsOptimizing(false);
    setAnalysisResult(null);
    setSuggestions([]);
    setError(null);
  }, []);
  
  return {
    // State
    isAnalyzing,
    isOptimizing,
    analysisResult,
    suggestions,
    error,
    
    // Template info
    template,
    feedback,
    activeABTest,
    
    // Actions
    analyze,
    optimize,
    applyOptimization,
    runAutoOptimize,
    
    // Feedback
    submitFeedback,
    
    // A/B Testing
    startABTest,
    recordABTestResult,
    completeABTest,
    
    // Utils
    reset,
    getConfig,
  };
}

export default usePromptOptimizer;
