'use client';

/**
 * Feature Routing Hook
 *
 * Provides feature intent detection and navigation capabilities for chat input.
 * Integrates with the feature router to detect user intent and navigate to feature pages.
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  detectFeatureIntent,
  detectFeatureIntentRuleBased,
  mightTriggerFeatureRouting,
  buildFeatureNavigationUrl,
  type FeatureRoute,
  type FeatureRouteResult,
  type FeatureRoutingSettings,
  DEFAULT_FEATURE_ROUTING_SETTINGS,
} from '@/lib/ai/routing';
import { useSettingsStore } from '@/stores';
import { detectSpeedLearningMode } from '@/lib/learning/speedpass';

function resolveSpeedPassTargetScore(mode: 'extreme' | 'speed' | 'comprehensive'): number {
  switch (mode) {
    case 'extreme':
      return 60;
    case 'speed':
      return 75;
    case 'comprehensive':
      return 85;
  }
}

export interface UseFeatureRoutingOptions {
  /** Override settings from store */
  settings?: Partial<FeatureRoutingSettings>;
  /** Callback when navigation is triggered */
  onNavigate?: (feature: FeatureRoute, url: string) => void;
  /** Callback when feature intent is detected */
  onIntentDetected?: (result: FeatureRouteResult) => void;
}

export interface UseFeatureRoutingReturn {
  /** Current detection result */
  detectionResult: FeatureRouteResult | null;
  /** Whether a navigation suggestion is pending */
  hasPendingSuggestion: boolean;
  /** The pending feature to navigate to */
  pendingFeature: FeatureRoute | null;
  /** Original message that triggered detection */
  pendingMessage: string;
  /** Number of suggestions shown this session */
  suggestionCount: number;
  /** Check message for feature intent */
  checkFeatureIntent: (message: string) => Promise<FeatureRouteResult>;
  /** Navigate to the pending feature */
  confirmNavigation: () => void;
  /** Continue in chat instead of navigating */
  continueInChat: () => void;
  /** Dismiss suggestion and don't show for this feature again */
  dismissSuggestion: () => void;
  /** Reset routing state */
  resetState: () => void;
  /** Check if feature routing is enabled */
  isEnabled: boolean;
  /** Current routing settings */
  routingSettings: FeatureRoutingSettings;
}

/**
 * Hook for feature intent detection and navigation
 */
export function useFeatureRouting(options: UseFeatureRoutingOptions = {}): UseFeatureRoutingReturn {
  const router = useRouter();

  // Get settings from store
  const storeSettings = useSettingsStore((state) => state.featureRoutingSettings);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Merge settings
  const routingSettings = useMemo<FeatureRoutingSettings>(
    () => ({
      ...DEFAULT_FEATURE_ROUTING_SETTINGS,
      ...storeSettings,
      ...options.settings,
    }),
    [storeSettings, options.settings]
  );

  // State
  const [detectionResult, setDetectionResult] = useState<FeatureRouteResult | null>(null);
  const [hasPendingSuggestion, setHasPendingSuggestion] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<FeatureRoute | null>(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [dismissedFeatures, setDismissedFeatures] = useState<Set<string>>(new Set());

  const buildNavigationContext = useCallback(
    (feature: FeatureRoute, message: string): Record<string, unknown> => {
      if (feature.id !== 'speedpass') {
        return { message };
      }

      const modeDetection = detectSpeedLearningMode(message);
      const detectedExamDate =
        typeof modeDetection.detectedUrgencyDays === 'number'
          ? new Date(Date.now() + modeDetection.detectedUrgencyDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;
      const speedpassContext = {
        availableTimeMinutes: modeDetection.detectedTime,
        targetScore: resolveSpeedPassTargetScore(modeDetection.recommendedMode),
        examDate: detectedExamDate,
        recommendedMode: modeDetection.recommendedMode,
      };

      return {
        message,
        speedpassContext,
        availableTimeMinutes: speedpassContext.availableTimeMinutes,
        targetScore: speedpassContext.targetScore,
        examDate: speedpassContext.examDate,
        recommendedMode: speedpassContext.recommendedMode,
      };
    },
    []
  );

  // Get API key for LLM routing
  const getLLMConfig = useCallback(() => {
    if (routingSettings.routingMode === 'rule-based') {
      return undefined;
    }

    const provider = defaultProvider || 'openai';
    const settings = providerSettings[provider];
    const apiKey = settings?.apiKey;

    if (!apiKey) return undefined;

    return {
      apiKey,
      provider: provider as 'openai' | 'anthropic' | 'google',
      baseURL: settings?.baseURL,
    };
  }, [routingSettings.routingMode, defaultProvider, providerSettings]);

  // Check message for feature intent
  const checkFeatureIntent = useCallback(
    async (message: string): Promise<FeatureRouteResult> => {
      // Quick check to avoid unnecessary processing
      if (!routingSettings.enabled || !mightTriggerFeatureRouting(message)) {
        const noResult: FeatureRouteResult = {
          detected: false,
          feature: null,
          confidence: 0,
          matchedPatterns: [],
          reason: '',
          reasonZh: '',
          alternatives: [],
        };
        return noResult;
      }

      // Check if we've exceeded max suggestions
      if (suggestionCount >= routingSettings.maxSuggestionsPerSession) {
        return detectFeatureIntentRuleBased(message, { ...routingSettings, enabled: false });
      }

      // Detect intent
      const llmConfig = getLLMConfig();
      const result = await detectFeatureIntent(message, routingSettings, llmConfig);

      setDetectionResult(result);

      // Check if we should show suggestion
      if (
        result.detected &&
        result.feature &&
        result.confidence >= routingSettings.confidenceThreshold &&
        !dismissedFeatures.has(result.feature.id)
      ) {
        const navigationContext = buildNavigationContext(result.feature, message);
        const shouldForceAutoNavigate = result.feature.id === 'speedpass';

        // Auto-navigate if enabled and high confidence
        if (
          shouldForceAutoNavigate ||
          (routingSettings.autoNavigateEnabled &&
            result.confidence >= routingSettings.autoNavigateThreshold)
        ) {
          const url = buildFeatureNavigationUrl(result.feature, navigationContext);
          options.onNavigate?.(result.feature, url);
          router.push(url);
          return result;
        }

        // Show suggestion
        setPendingFeature(result.feature);
        setPendingMessage(message);
        setHasPendingSuggestion(true);
        setSuggestionCount((prev) => prev + 1);
        options.onIntentDetected?.(result);
      }

      return result;
    },
    [
      routingSettings,
      suggestionCount,
      dismissedFeatures,
      getLLMConfig,
      options,
      router,
      buildNavigationContext,
    ]
  );

  // Navigate to pending feature
  const confirmNavigation = useCallback(() => {
    if (pendingFeature) {
      const url = buildFeatureNavigationUrl(
        pendingFeature,
        buildNavigationContext(pendingFeature, pendingMessage)
      );
      options.onNavigate?.(pendingFeature, url);
      router.push(url);
    }
    setHasPendingSuggestion(false);
    setPendingFeature(null);
    setPendingMessage('');
  }, [pendingFeature, pendingMessage, options, router, buildNavigationContext]);

  // Continue in chat
  const continueInChat = useCallback(() => {
    setHasPendingSuggestion(false);
    setPendingFeature(null);
    // Don't clear pendingMessage - might be needed for chat processing
  }, []);

  // Dismiss suggestion for this feature
  const dismissSuggestion = useCallback(() => {
    if (pendingFeature) {
      setDismissedFeatures((prev) => new Set(prev).add(pendingFeature.id));
    }
    setHasPendingSuggestion(false);
    setPendingFeature(null);
    setPendingMessage('');
  }, [pendingFeature]);

  // Reset state
  const resetState = useCallback(() => {
    setDetectionResult(null);
    setHasPendingSuggestion(false);
    setPendingFeature(null);
    setPendingMessage('');
    setSuggestionCount(0);
    setDismissedFeatures(new Set());
  }, []);

  return {
    detectionResult,
    hasPendingSuggestion,
    pendingFeature,
    pendingMessage,
    suggestionCount,
    checkFeatureIntent,
    confirmNavigation,
    continueInChat,
    dismissSuggestion,
    resetState,
    isEnabled: routingSettings.enabled,
    routingSettings,
  };
}

export default useFeatureRouting;
