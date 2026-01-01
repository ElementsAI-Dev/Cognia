'use client';

/**
 * Locale Initializer
 * Automatically detects and sets locale on app startup based on geolocation
 */

import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores';
import { autoDetectLocale, getSystemTimezone } from '@/lib/i18n';
import type { Language } from '@/stores/settings-store';

export function LocaleInitializer() {
  const initializedRef = useRef(false);
  
  const {
    language,
    autoDetectLocale: autoDetectEnabled,
    hasCompletedOnboarding,
    setLanguage,
    setLocaleDetectionResult,
    setDetectedTimezone,
  } = useSettingsStore();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initLocale = async () => {
      // Always detect timezone
      const timezone = getSystemTimezone();
      setDetectedTimezone(timezone);

      // Only auto-detect locale if enabled and user hasn't completed onboarding
      // (meaning they haven't manually set a language yet)
      if (!autoDetectEnabled) return;
      
      // Skip if language was manually set (not during first run)
      if (hasCompletedOnboarding && language !== 'en') return;

      try {
        const result = await autoDetectLocale();
        setLocaleDetectionResult(result);

        // Only auto-apply if confidence is high enough and it's different from current
        if (result.confidence !== 'low' && result.locale !== language) {
          // Only apply on first run or if user has auto-detect enabled
          if (!hasCompletedOnboarding || autoDetectEnabled) {
            setLanguage(result.locale as Language);
          }
        }
      } catch (error) {
        console.warn('Failed to auto-detect locale:', error);
      }
    };

    // Run with a small delay to ensure hydration is complete
    const timer = setTimeout(initLocale, 100);
    return () => clearTimeout(timer);
  }, [autoDetectEnabled, hasCompletedOnboarding, language, setLanguage, setLocaleDetectionResult, setDetectedTimezone]);

  return null;
}

export default LocaleInitializer;
