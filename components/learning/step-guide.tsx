'use client';

/**
 * Step Guide Component
 *
 * A step-by-step learning guide with interactive progression,
 * visual indicators, and integration with learning mode.
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Lightbulb,
  BookOpen,
  Target,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { DifficultyLevel } from '@/types/learning/learning';

/**
 * A single step in the guide
 */
export interface GuideStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;

  // Optional metadata
  difficulty?: DifficultyLevel;
  estimatedTimeMinutes?: number;

  // Tips and hints
  tips?: string[];
  hints?: string[];

  // Resources
  resources?: {
    title: string;
    url?: string;
    type: 'link' | 'video' | 'article' | 'exercise';
  }[];

  // Validation
  requiresConfirmation?: boolean;
  confirmationText?: string;

  // Custom actions
  onEnter?: () => void;
  onLeave?: () => void;
}

/**
 * Props for StepGuide component
 */
export interface StepGuideProps {
  title: string;
  description?: string;
  steps: GuideStep[];

  // Controlled mode
  currentStep?: number;
  onStepChange?: (step: number, stepData: GuideStep) => void;

  // Callbacks
  onComplete?: () => void;
  onSkip?: () => void;

  // UI options
  showProgress?: boolean;
  showStepList?: boolean;
  allowSkip?: boolean;
  allowNavigation?: boolean;
  compact?: boolean;

  // Styling
  className?: string;
}

/**
 * Step indicator component
 */
interface StepIndicatorProps {
  steps: GuideStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
  allowNavigation: boolean;
}

const StepIndicator = memo(function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(index);
        const isCurrent = index === currentStep;
        const isPast = index < currentStep;
        const isFuture = index > currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step dot */}
            <button
              onClick={() => allowNavigation && onStepClick?.(index)}
              disabled={!allowNavigation}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                isPast && !isCompleted && 'bg-muted-foreground/30 text-muted-foreground',
                isFuture && 'bg-muted text-muted-foreground',
                allowNavigation && 'cursor-pointer hover:ring-2 hover:ring-primary/20',
                !allowNavigation && 'cursor-default'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : isCurrent ? (
                <CircleDot className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 min-w-6 mx-2 transition-colors',
                  isPast || isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

/**
 * Step content area
 */
interface StepContentProps {
  step: GuideStep;
  prefersReducedMotion: boolean;
}

const StepContent = memo(function StepContent({ step, prefersReducedMotion }: StepContentProps) {
  const t = useTranslations('learning.guide');
  const [showHints, setShowHints] = useState(false);

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
        transition: { duration: 0.3 },
      };

  return (
    <motion.div {...animationProps} className="space-y-4">
      {/* Step header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{step.title}</h3>
          {step.difficulty && (
            <Badge
              variant="outline"
              className={cn(
                step.difficulty === 'beginner' && 'text-green-600 border-green-300',
                step.difficulty === 'intermediate' && 'text-yellow-600 border-yellow-300',
                step.difficulty === 'advanced' && 'text-orange-600 border-orange-300',
                step.difficulty === 'expert' && 'text-red-600 border-red-300'
              )}
            >
              {step.difficulty}
            </Badge>
          )}
          {step.estimatedTimeMinutes && (
            <Badge variant="secondary" className="text-xs">
              ~{step.estimatedTimeMinutes} min
            </Badge>
          )}
        </div>
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
      </div>

      {/* Main content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">{step.content}</div>

      {/* Tips */}
      {step.tips && step.tips.length > 0 && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{t('tips')}</p>
              <ul className="text-sm text-green-600 dark:text-green-400 list-disc list-inside mt-1 space-y-0.5">
                {step.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Hints (collapsible) */}
      {step.hints && step.hints.length > 0 && (
        <Collapsible open={showHints} onOpenChange={setShowHints}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              {showHints ? t('hideHints') : t('showHints', { count: step.hints.length })}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                {step.hints.map((hint, i) => (
                  <li key={i}>{hint}</li>
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Resources */}
      {step.resources && step.resources.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {t('relatedResources')}
          </p>
          <div className="flex flex-wrap gap-2">
            {step.resources.map((resource, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn('cursor-pointer hover:bg-accent', resource.url && 'underline')}
                onClick={() => resource.url && window.open(resource.url, '_blank')}
              >
                {resource.type === 'video' && '🎥'}
                {resource.type === 'article' && '📄'}
                {resource.type === 'exercise' && '✏️'}
                {resource.type === 'link' && '🔗'} {resource.title}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
});

/**
 * Main StepGuide Component
 */
export const StepGuide = memo(function StepGuide({
  title,
  description,
  steps,
  currentStep: controlledStep,
  onStepChange,
  onComplete,
  onSkip,
  showProgress = true,
  showStepList = true,
  allowSkip = true,
  allowNavigation = true,
  compact = false,
  className,
}: StepGuideProps) {
  const t = useTranslations('learning.guide');
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Internal state (for uncontrolled mode)
  const [internalStep, setInternalStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [confirmations, setConfirmations] = useState<Set<number>>(new Set());

  // Use controlled or internal state
  const currentStepIndex = controlledStep ?? internalStep;
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Progress calculation
  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.round(((currentStepIndex + 1) / steps.length) * 100);
  }, [currentStepIndex, steps.length]);

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    if (!currentStep.requiresConfirmation) return true;
    return confirmations.has(currentStepIndex);
  }, [currentStep, currentStepIndex, confirmations]);

  // Navigate to step
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= steps.length) return;

      // Call leave callback on current step
      currentStep.onLeave?.();

      // Update state
      if (controlledStep === undefined) {
        setInternalStep(stepIndex);
      }

      // Call onStepChange
      onStepChange?.(stepIndex, steps[stepIndex]);

      // Call enter callback on new step
      steps[stepIndex].onEnter?.();
    },
    [controlledStep, currentStep, steps, onStepChange]
  );

  // Handle next
  const handleNext = useCallback(() => {
    if (!canProceed) return;

    // Mark current step as completed
    setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));

    if (isLastStep) {
      onComplete?.();
    } else {
      goToStep(currentStepIndex + 1);
    }
  }, [canProceed, currentStepIndex, isLastStep, goToStep, onComplete]);

  // Handle previous
  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStepIndex - 1);
    }
  }, [isFirstStep, currentStepIndex, goToStep]);

  // Handle confirmation
  const handleConfirmation = useCallback(() => {
    setConfirmations((prev) => new Set(prev).add(currentStepIndex));
  }, [currentStepIndex]);

  // Handle skip
  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className={cn(compact && 'py-3')}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={cn(compact ? 'text-base' : 'text-lg')}>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {title}
              </div>
            </CardTitle>
            {description && !compact && <CardDescription>{description}</CardDescription>}
          </div>
          {allowSkip && (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              {t('skipGuide')}
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="space-y-2 mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {t('stepProgress', { current: currentStepIndex + 1, total: steps.length })}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Step indicator */}
        {showStepList && !compact && steps.length <= 6 && (
          <div className="mt-4">
            <StepIndicator
              steps={steps}
              currentStep={currentStepIndex}
              completedSteps={completedSteps}
              onStepClick={allowNavigation ? goToStep : undefined}
              allowNavigation={allowNavigation}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step content */}
        <AnimatePresence mode="wait">
          <StepContent
            key={currentStep.id}
            step={currentStep}
            prefersReducedMotion={prefersReducedMotion}
          />
        </AnimatePresence>

        {/* Confirmation checkbox (if required) */}
        {currentStep.requiresConfirmation && !confirmations.has(currentStepIndex) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Button variant="outline" size="sm" onClick={handleConfirmation} className="gap-2">
              <Circle className="h-4 w-4" />
              {currentStep.confirmationText || t('confirmUnderstanding')}
            </Button>
          </div>
        )}

        {confirmations.has(currentStepIndex) && currentStep.requiresConfirmation && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {t('confirmed')}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('previousStep')}
          </Button>

          <Button
            variant={isLastStep ? 'default' : 'outline'}
            size="sm"
            onClick={handleNext}
            disabled={!canProceed}
            className="gap-1"
          >
            {isLastStep ? (
              <>
                <Check className="h-4 w-4" />
                {t('complete')}
              </>
            ) : (
              <>
                {t('nextStep')}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default StepGuide;
