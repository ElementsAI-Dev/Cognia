'use client';

/**
 * Tour Tooltip Component
 * A beautiful, animated tooltip for the onboarding tour
 * Features glass-morphism effect and responsive design
 */

import { forwardRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface TourTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  position: TooltipPosition;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
  isFirst: boolean;
  isLast: boolean;
  nextLabel?: string;
  previousLabel?: string;
  skipLabel?: string;
  completeLabel?: string;
  stepLabel?: string;
  icon?: React.ReactNode;
  isMobile?: boolean;
}

const TOOLTIP_OFFSET = 16;
const ARROW_SIZE = 12;

export const TourTooltip = forwardRef<HTMLDivElement, TourTooltipProps>(
  (
    {
      title,
      description,
      currentStep,
      totalSteps,
      position,
      targetRect,
      onNext,
      onPrevious,
      onSkip,
      onClose,
      isFirst,
      isLast,
      nextLabel = 'Next',
      previousLabel = 'Previous',
      skipLabel = 'Skip tour',
      completeLabel = 'Complete',
      stepLabel = 'Step',
      icon,
      isMobile = false,
    },
    ref
  ) => {
    const progress = ((currentStep + 1) / totalSteps) * 100;

    // Calculate tooltip position based on target element
    const tooltipStyle = useMemo(() => {
      if (isMobile || !targetRect || position === 'center') {
        return {
          position: 'fixed' as const,
          bottom: isMobile ? 0 : '50%',
          left: isMobile ? 0 : '50%',
          right: isMobile ? 0 : 'auto',
          transform: isMobile ? 'none' : 'translate(-50%, 50%)',
          maxWidth: isMobile ? '100%' : '400px',
          width: isMobile ? '100%' : 'auto',
        };
      }

      const padding = TOOLTIP_OFFSET;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let style: React.CSSProperties = {
        position: 'fixed',
        maxWidth: Math.min(380, viewportWidth - 32),
      };

      switch (position) {
        case 'top':
          style = {
            ...style,
            bottom: viewportHeight - targetRect.top + padding,
            left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2, viewportWidth - 200)),
            transform: 'translateX(-50%)',
          };
          break;
        case 'bottom':
          style = {
            ...style,
            top: targetRect.bottom + padding,
            left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2, viewportWidth - 200)),
            transform: 'translateX(-50%)',
          };
          break;
        case 'left':
          style = {
            ...style,
            top: Math.max(16, Math.min(targetRect.top + targetRect.height / 2, viewportHeight - 200)),
            right: viewportWidth - targetRect.left + padding,
            transform: 'translateY(-50%)',
          };
          break;
        case 'right':
          style = {
            ...style,
            top: Math.max(16, Math.min(targetRect.top + targetRect.height / 2, viewportHeight - 200)),
            left: targetRect.right + padding,
            transform: 'translateY(-50%)',
          };
          break;
      }

      return style;
    }, [targetRect, position, isMobile]);

    // Arrow direction based on position
    const arrowClass = useMemo(() => {
      if (isMobile || position === 'center' || !targetRect) return null;

      const baseClass = 'absolute w-0 h-0 border-solid';
      switch (position) {
        case 'top':
          return {
            className: cn(baseClass, 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full'),
            style: {
              borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
              borderColor: 'hsl(var(--card)) transparent transparent transparent',
            },
          };
        case 'bottom':
          return {
            className: cn(baseClass, 'top-0 left-1/2 -translate-x-1/2 -translate-y-full'),
            style: {
              borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
              borderColor: 'transparent transparent hsl(var(--card)) transparent',
            },
          };
        case 'left':
          return {
            className: cn(baseClass, 'right-0 top-1/2 -translate-y-1/2 translate-x-full'),
            style: {
              borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
              borderColor: 'transparent transparent transparent hsl(var(--card))',
            },
          };
        case 'right':
          return {
            className: cn(baseClass, 'left-0 top-1/2 -translate-y-1/2 -translate-x-full'),
            style: {
              borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
              borderColor: 'transparent hsl(var(--card)) transparent transparent',
            },
          };
        default:
          return null;
      }
    }, [position, isMobile, targetRect]);

    return (
      <motion.div
        ref={ref}
        className={cn(
          'z-[102] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl',
          isMobile
            ? 'rounded-t-2xl p-5 pb-8'
            : 'rounded-2xl p-5'
        )}
        style={tooltipStyle}
        initial={{ opacity: 0, scale: 0.9, y: position === 'bottom' ? -10 : 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
      >
        {/* Arrow */}
        {arrowClass && (
          <div className={arrowClass.className} style={arrowClass.style} />
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 rounded-full hover:bg-muted"
          onClick={onClose}
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {stepLabel} {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-5">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex-shrink-0 p-2 rounded-xl bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3
                id="tour-title"
                className="text-lg font-semibold mb-1.5 pr-6"
              >
                {title}
              </h3>
              <p
                id="tour-description"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Step indicators (dots) */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === currentStep
                  ? 'w-6 bg-primary'
                  : index < currentStep
                  ? 'w-1.5 bg-primary/60'
                  : 'w-1.5 bg-muted-foreground/30'
              )}
              initial={false}
              animate={{
                scale: index === currentStep ? 1 : 0.9,
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={isFirst}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{previousLabel}</span>
          </Button>

          <Button
            size="sm"
            onClick={onNext}
            className="gap-1 min-w-[100px]"
          >
            {isLast ? (
              <>
                <Check className="h-4 w-4" />
                {completeLabel}
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip option */}
        <button
          className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          onClick={onSkip}
        >
          {skipLabel}
        </button>

        {/* Mobile drag indicator */}
        {isMobile && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30" />
        )}
      </motion.div>
    );
  }
);

TourTooltip.displayName = 'TourTooltip';

export default TourTooltip;
