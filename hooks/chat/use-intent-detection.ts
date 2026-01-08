'use client';

/**
 * Hook for detecting user intent and suggesting mode switches
 * Supports bidirectional suggestions: to specialized modes and back to chat
 */

import { useState, useCallback } from 'react';
import { 
  getEnhancedModeSuggestion,
  type IntentDetectionResult 
} from '@/lib/ai/tools/intent-detection';
import type { ChatMode } from '@/types/session';

interface UseIntentDetectionOptions {
  currentMode: ChatMode;
  enabled?: boolean;
  maxSuggestionsPerSession?: number;
  onModeSwitch?: (mode: ChatMode) => void;
}

interface EnhancedDetectionResult extends IntentDetectionResult {
  direction?: 'specialize' | 'generalize' | null;
}

interface UseIntentDetectionReturn {
  /** Current detection result */
  detectionResult: EnhancedDetectionResult | null;
  /** Whether a suggestion is currently showing */
  showSuggestion: boolean;
  /** Check message for intent and potentially show suggestion */
  checkIntent: (message: string) => EnhancedDetectionResult;
  /** Accept the suggested mode switch */
  acceptSuggestion: () => void;
  /** Dismiss the suggestion (can show again later) */
  dismissSuggestion: () => void;
  /** Keep current mode (won't suggest same mode again this session) */
  keepCurrentMode: () => void;
  /** Reset suggestion state */
  resetSuggestion: () => void;
  /** Number of suggestions shown this session */
  suggestionCount: number;
}

export function useIntentDetection({
  currentMode,
  enabled = true,
  maxSuggestionsPerSession = 3,
  onModeSwitch,
}: UseIntentDetectionOptions): UseIntentDetectionReturn {
  const [detectionResult, setDetectionResult] = useState<EnhancedDetectionResult | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [dismissedModes, setDismissedModes] = useState<Set<ChatMode>>(new Set());
  const [keepCurrent, setKeepCurrent] = useState(false);
  const [lastMode, setLastMode] = useState(currentMode);

  // Reset state when mode changes
  if (lastMode !== currentMode) {
    setLastMode(currentMode);
    setDismissedModes(new Set());
    setKeepCurrent(false);
    setShowSuggestion(false);
    setDetectionResult(null);
  }

  const checkIntent = useCallback((message: string): EnhancedDetectionResult => {
    if (!enabled) {
      return {
        hasIntent: false,
        intentType: null,
        suggestedMode: null,
        confidence: 0,
        reason: '',
        matchedKeywords: [],
        direction: null,
      };
    }

    // Use enhanced suggestion that works for all modes
    const enhancedResult = getEnhancedModeSuggestion(message, currentMode, suggestionCount);
    
    // Convert to IntentDetectionResult format
    const result: EnhancedDetectionResult = {
      hasIntent: enhancedResult.shouldSuggest,
      intentType: enhancedResult.suggestedMode === 'learning' ? 'learning' 
        : enhancedResult.suggestedMode === 'research' ? 'research'
        : enhancedResult.suggestedMode === 'agent' ? 'agent'
        : null,
      suggestedMode: enhancedResult.suggestedMode,
      confidence: enhancedResult.confidence,
      reason: enhancedResult.reason,
      matchedKeywords: [],
      direction: enhancedResult.direction,
    };
    
    // Check if we should show the suggestion
    const shouldShow = 
      enhancedResult.shouldSuggest &&
      enhancedResult.suggestedMode !== null &&
      !dismissedModes.has(enhancedResult.suggestedMode) &&
      !keepCurrent &&
      suggestionCount < maxSuggestionsPerSession;

    if (shouldShow) {
      setDetectionResult(result);
      setShowSuggestion(true);
      setSuggestionCount(prev => prev + 1);
    }

    return result;
  }, [enabled, currentMode, suggestionCount, maxSuggestionsPerSession, dismissedModes, keepCurrent]);

  const acceptSuggestion = useCallback(() => {
    if (detectionResult?.suggestedMode && onModeSwitch) {
      onModeSwitch(detectionResult.suggestedMode);
    }
    setShowSuggestion(false);
    setDetectionResult(null);
  }, [detectionResult, onModeSwitch]);

  const dismissSuggestion = useCallback(() => {
    if (detectionResult?.suggestedMode) {
      setDismissedModes(prev => new Set(prev).add(detectionResult.suggestedMode!));
    }
    setShowSuggestion(false);
    setDetectionResult(null);
  }, [detectionResult]);

  const keepCurrentMode = useCallback(() => {
    setKeepCurrent(true);
    setShowSuggestion(false);
    setDetectionResult(null);
  }, []);

  const resetSuggestion = useCallback(() => {
    setShowSuggestion(false);
    setDetectionResult(null);
    setSuggestionCount(0);
    setDismissedModes(new Set());
    setKeepCurrent(false);
  }, []);

  return {
    detectionResult,
    showSuggestion,
    checkIntent,
    acceptSuggestion,
    dismissSuggestion,
    keepCurrentMode,
    resetSuggestion,
    suggestionCount,
  };
}

export default useIntentDetection;
