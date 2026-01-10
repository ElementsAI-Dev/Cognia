'use client';

/**
 * Enhanced Onboarding Tour Component
 * Features:
 * - Smooth framer-motion animations
 * - Responsive design (mobile drawer / desktop tooltip)
 * - Keyboard navigation support
 * - SVG spotlight overlay
 * - Completion celebration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Sparkles,
  FolderOpen,
  Send,
  Settings,
} from 'lucide-react';
import { SpotlightOverlay } from './spotlight-overlay';
import { TourTooltip, type TooltipPosition } from './tour-tooltip';
import { Confetti } from './confetti';
import { useTourKeyboard } from './use-tour-keyboard';

export interface TourStep {
  id: string;
  titleKey?: string;
  descriptionKey?: string;
  title?: string;
  description?: string;
  targetSelector?: string;
  position?: TooltipPosition;
  action?: () => void;
  highlight?: boolean;
  icon?: React.ReactNode;
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip?: () => void;
  storageKey?: string;
  showConfetti?: boolean;
}

const STORAGE_KEY_PREFIX = 'cognia:onboarding:';
const MOBILE_BREAKPOINT = 640;

export function OnboardingTour({
  steps,
  onComplete,
  onSkip,
  storageKey = 'main',
  showConfetti = true,
}: OnboardingTourProps) {
  const t = useTranslations('onboarding');
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if tour was already completed
  useEffect(() => {
    const timer = setTimeout(() => {
      const completed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storageKey}`);
      if (completed === 'true') {
        setIsVisible(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);

  // Update target element position
  useEffect(() => {
    if (!step?.targetSelector) {
      const timer = setTimeout(() => setTargetRect(null), 0);
      return () => clearTimeout(timer);
    }

    const updatePosition = () => {
      const target = document.querySelector(step.targetSelector!);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    updatePosition();
    
    // Use ResizeObserver for more accurate tracking
    const resizeObserver = new ResizeObserver(updatePosition);
    const target = document.querySelector(step.targetSelector!);
    if (target) {
      resizeObserver.observe(target);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [step?.targetSelector]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${storageKey}`, 'true');
    if (showConfetti) {
      setShowCelebration(true);
      // Delay hiding to show confetti
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 1500);
    } else {
      setIsVisible(false);
      onComplete();
    }
  }, [storageKey, onComplete, showConfetti]);

  const handleNext = useCallback(() => {
    if (step?.action) {
      step.action();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, step, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${storageKey}`, 'true');
    setIsVisible(false);
    onSkip?.();
  }, [storageKey, onSkip]);

  const handleClose = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  // Keyboard navigation
  useTourKeyboard({
    isActive: isVisible,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSkip: handleSkip,
    onClose: handleClose,
    isFirst,
    isLast,
  });

  // Get translated content
  const getTitle = () => {
    if (step?.titleKey) {
      try {
        return t(`tour.${step.titleKey}`);
      } catch {
        return step.title || '';
      }
    }
    return step?.title || '';
  };

  const getDescription = () => {
    if (step?.descriptionKey) {
      try {
        return t(`tour.${step.descriptionKey}`);
      } catch {
        return step.description || '';
      }
    }
    return step?.description || '';
  };

  if (!isVisible || !step) return null;

  return (
    <>
      {/* Confetti celebration */}
      <Confetti isActive={showCelebration} particleCount={80} />

      {/* Spotlight overlay */}
      <SpotlightOverlay
        targetRect={step.highlight !== false ? targetRect : null}
        isVisible={true}
        padding={8}
        borderRadius={12}
      />

      {/* Tour tooltip */}
      <AnimatePresence mode="wait">
        <TourTooltip
          key={step.id}
          ref={tooltipRef}
          title={getTitle()}
          description={getDescription()}
          currentStep={currentStep}
          totalSteps={steps.length}
          position={step.position || 'center'}
          targetRect={targetRect}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onClose={handleClose}
          isFirst={isFirst}
          isLast={isLast}
          nextLabel={t('next')}
          previousLabel={t('previous')}
          skipLabel={t('skipTour')}
          completeLabel={t('complete')}
          stepLabel={t('step')}
          icon={step.icon}
          isMobile={isMobile}
        />
      </AnimatePresence>
    </>
  );
}

// Predefined tour steps for different features
export const mainTourSteps: TourStep[] = [
  {
    id: 'welcome',
    titleKey: 'welcomeTitle',
    descriptionKey: 'welcomeDesc',
    title: 'Welcome to Cognia',
    description: 'Your AI-powered assistant for chat, code, research, and learning. Let me show you around!',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: 'modes',
    titleKey: 'modesTitle',
    descriptionKey: 'modesDesc',
    title: 'Multiple Modes',
    description: 'Switch between Chat, Agent, Research, and Learning modes depending on your task.',
    targetSelector: '[data-tour="mode-selector"]',
    position: 'bottom',
    highlight: true,
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: 'sidebar',
    titleKey: 'sidebarTitle',
    descriptionKey: 'sidebarDesc',
    title: 'Session Management',
    description: 'All your conversations are saved here. Search, organize, and pin your favorites.',
    targetSelector: '[data-tour="sidebar"]',
    position: 'right',
    highlight: true,
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    id: 'input',
    titleKey: 'inputTitle',
    descriptionKey: 'inputDesc',
    title: 'Start Chatting',
    description: 'Type your message, attach files, use voice input, or mention @tools for special actions.',
    targetSelector: '[data-tour="chat-input"]',
    position: 'top',
    highlight: true,
    icon: <Send className="h-5 w-5" />,
  },
  {
    id: 'complete',
    titleKey: 'completeTitle',
    descriptionKey: 'completeDesc',
    title: 'You\'re All Set!',
    description: 'Explore the settings for more customization options. Happy chatting!',
    icon: <Settings className="h-5 w-5" />,
  },
];

export function resetOnboardingTour(storageKey: string = 'main') {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${storageKey}`);
}

export function isOnboardingCompleted(storageKey: string = 'main'): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${storageKey}`) === 'true';
}

export default OnboardingTour;
