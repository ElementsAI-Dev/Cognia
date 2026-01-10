/**
 * Onboarding components index
 */

export {
  OnboardingTour,
  mainTourSteps,
  resetOnboardingTour,
  isOnboardingCompleted,
  type TourStep,
} from './onboarding-tour';

export { SpotlightOverlay } from './spotlight-overlay';
export { TourTooltip, type TooltipPosition } from './tour-tooltip';
export { Confetti, ConfettiBurst } from './confetti';
export { useTourKeyboard } from './use-tour-keyboard';
export { TourManager, useTourManager } from './tour-manager';
export {
  chatTourSteps,
  settingsTourSteps,
  projectsTourSteps,
  designerTourSteps,
  academicTourSteps,
  tourConfigs,
  getTourSteps,
  getTourIdForPath,
  type TourId,
} from './tour-configs';
