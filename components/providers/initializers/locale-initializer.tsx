'use client';

/**
 * Locale Initializer
 * Automatically detects and sets locale on app startup based on geolocation
 */

import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores';
import { autoDetectLocale, getSystemTimezone } from '@/lib/i18n';
import type { Language } from '@/stores/settings';

export function LocaleInitializer() {
  const initializedRef = useRef(false);

  const language = useSettingsStore((state) => state.language);
  const autoDetectEnabled = useSettingsStore((state) => state.autoDetectLocale);
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setLocaleDetectionResult = useSettingsStore((state) => state.setLocaleDetectionResult);
  const setDetectedTimezone = useSettingsStore((state) => state.setDetectedTimezone);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initLocale = async () => {
      // Always detect timezone
      const timezone = getSystemTimezone();
      setDetectedTimezone(timezone);

      // Only auto-detect locale if enabled
      if (!autoDetectEnabled) return;

      // Skip if user has completed onboarding (they've already chosen their language preference)
      // Only auto-detect for first-time users
      if (hasCompletedOnboarding) return;

      try {
        const result = await autoDetectLocale();
        setLocaleDetectionResult(result);

        // Only auto-apply if confidence is high enough and it's different from current
        if (result.confidence !== 'low' && result.locale !== language) {
          setLanguage(result.locale as Language);
        }
      } catch (error) {
        console.warn('Failed to auto-detect locale:', error);
      }
    };

    // Run with a small delay to ensure hydration is complete
    const timer = setTimeout(initLocale, 100);
    return () => clearTimeout(timer);
  }, [
    autoDetectEnabled,
    hasCompletedOnboarding,
    language,
    setLanguage,
    setLocaleDetectionResult,
    setDetectedTimezone,
  ]);

  return null;
}

export default LocaleInitializer;
