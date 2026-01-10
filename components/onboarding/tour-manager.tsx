'use client';

/**
 * Tour Manager Component
 * Manages multiple page-specific onboarding tours
 */

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { OnboardingTour } from './onboarding-tour';
import { getTourIdForPath, getTourSteps, type TourId } from './tour-configs';
import { isOnboardingCompleted, resetOnboardingTour } from './onboarding-tour';

interface TourManagerProps {
  /** Override the automatic tour detection */
  forceTourId?: TourId;
  /** Called when any tour is completed */
  onTourComplete?: (tourId: TourId) => void;
  /** Called when any tour is skipped */
  onTourSkip?: (tourId: TourId) => void;
  /** Whether to show tours automatically based on path */
  autoDetect?: boolean;
  /** Delay before showing the tour (ms) */
  showDelay?: number;
}

export function TourManager({
  forceTourId,
  onTourComplete,
  onTourSkip,
  autoDetect = true,
  showDelay = 800,
}: TourManagerProps) {
  const pathname = usePathname();
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Determine which tour to show
  useEffect(() => {
    if (forceTourId) {
      // Check if forced tour is completed
      if (!isOnboardingCompleted(forceTourId)) {
        const timer = setTimeout(() => {
          setActiveTourId(forceTourId);
          setIsReady(true);
        }, showDelay);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (!autoDetect) return;

    // Auto-detect tour based on path
    const tourId = getTourIdForPath(pathname);
    if (tourId && !isOnboardingCompleted(tourId)) {
      const timer = setTimeout(() => {
        setActiveTourId(tourId);
        setIsReady(true);
      }, showDelay);
      return () => clearTimeout(timer);
    }
  }, [pathname, forceTourId, autoDetect, showDelay]);

  const handleComplete = useCallback(() => {
    if (activeTourId) {
      onTourComplete?.(activeTourId);
    }
    setActiveTourId(null);
    setIsReady(false);
  }, [activeTourId, onTourComplete]);

  const handleSkip = useCallback(() => {
    if (activeTourId) {
      onTourSkip?.(activeTourId);
    }
    setActiveTourId(null);
    setIsReady(false);
  }, [activeTourId, onTourSkip]);

  if (!isReady || !activeTourId) {
    return null;
  }

  const steps = getTourSteps(activeTourId);
  if (steps.length === 0) {
    return null;
  }

  return (
    <OnboardingTour
      steps={steps}
      onComplete={handleComplete}
      onSkip={handleSkip}
      storageKey={activeTourId}
      showConfetti={true}
    />
  );
}

/**
 * Hook to manage tour state
 */
export function useTourManager() {
  const [currentTour, setCurrentTour] = useState<TourId | null>(null);

  const startTour = useCallback((tourId: TourId) => {
    resetOnboardingTour(tourId);
    setCurrentTour(tourId);
  }, []);

  const endTour = useCallback(() => {
    setCurrentTour(null);
  }, []);

  const isTourCompleted = useCallback((tourId: TourId) => {
    return isOnboardingCompleted(tourId);
  }, []);

  const resetTour = useCallback((tourId: TourId) => {
    resetOnboardingTour(tourId);
  }, []);

  const resetAllTours = useCallback(() => {
    const tourIds: TourId[] = ['feature-tour', 'settings-tour', 'projects-tour', 'designer-tour', 'academic-tour'];
    tourIds.forEach(resetOnboardingTour);
  }, []);

  return {
    currentTour,
    startTour,
    endTour,
    isTourCompleted,
    resetTour,
    resetAllTours,
  };
}

export default TourManager;
