'use client';

/**
 * A2UI Animation Component
 *
 * Provides animation capabilities within the A2UI system.
 * Supports predefined animations and custom animation configurations.
 */

import React, { memo, useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';
import type { A2UIComponentProps, A2UIBaseComponent } from '@/types/artifact/a2ui';

/**
 * Animation types supported by A2UI
 */
export type A2UIAnimationType =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideIn'
  | 'slideOut'
  | 'scale'
  | 'bounce'
  | 'pulse'
  | 'shake'
  | 'highlight'
  | 'none';

/**
 * Animation direction for slide animations
 */
export type AnimationDirection = 'up' | 'down' | 'left' | 'right';

/**
 * A2UI Animation component interface
 */
export interface A2UIAnimationComponentDef extends A2UIBaseComponent {
  component: 'Animation';
  type: A2UIAnimationType;
  direction?: AnimationDirection;
  duration?: number; // Duration in seconds
  delay?: number; // Delay before animation starts
  repeat?: number | 'infinite';
  children?: string[]; // Child component IDs to animate
  customAnimation?: {
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    transition?: Record<string, unknown>;
  };
}

/**
 * Predefined animation variants
 */
const ANIMATION_VARIANTS: Record<A2UIAnimationType, (direction?: AnimationDirection) => Variants> =
  {
    fadeIn: () => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    }),
    fadeOut: () => ({
      initial: { opacity: 1 },
      animate: { opacity: 0 },
      exit: { opacity: 0 },
    }),
    slideIn: (direction = 'up') => {
      const offsets = {
        up: { y: 30 },
        down: { y: -30 },
        left: { x: 30 },
        right: { x: -30 },
      };
      return {
        initial: { opacity: 0, ...offsets[direction] },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, ...offsets[direction] },
      };
    },
    slideOut: (direction = 'up') => {
      const offsets = {
        up: { y: -30 },
        down: { y: 30 },
        left: { x: -30 },
        right: { x: 30 },
      };
      return {
        initial: { opacity: 1, x: 0, y: 0 },
        animate: { opacity: 0, ...offsets[direction] },
        exit: { opacity: 0, ...offsets[direction] },
      };
    },
    scale: () => ({
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0, opacity: 0 },
    }),
    bounce: () => ({
      initial: { y: 0 },
      animate: {
        y: [0, -10, 0, -5, 0],
        transition: { duration: 0.6, ease: 'easeOut' },
      },
    }),
    pulse: () => ({
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.05, 1],
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      },
    }),
    shake: () => ({
      initial: { x: 0 },
      animate: {
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    }),
    highlight: () => ({
      initial: { backgroundColor: 'transparent' },
      animate: {
        backgroundColor: ['transparent', 'rgba(255, 215, 0, 0.3)', 'transparent'],
        transition: { duration: 1, repeat: 2 },
      },
    }),
    none: () => ({
      initial: {},
      animate: {},
      exit: {},
    }),
  };

/**
 * Get animation variants based on type and options
 */
function getAnimationVariants(
  type: A2UIAnimationType,
  direction?: AnimationDirection,
  customAnimation?: A2UIAnimationComponentDef['customAnimation']
): Variants {
  if (type === 'none') {
    return ANIMATION_VARIANTS.none();
  }

  if (customAnimation) {
    return {
      initial: (customAnimation.initial || {}) as Variants['initial'],
      animate: (customAnimation.animate || {}) as Variants['animate'],
      exit: (customAnimation.exit || {}) as Variants['exit'],
    };
  }

  const variantFn = ANIMATION_VARIANTS[type] || ANIMATION_VARIANTS.fadeIn;
  return variantFn(direction);
}

/**
 * Get transition configuration
 */
function getTransitionConfig(
  duration: number = 0.5,
  delay: number = 0,
  repeat?: number | 'infinite',
  customTransition?: Record<string, unknown>
): Record<string, unknown> {
  const base = {
    duration,
    delay,
    ease: 'easeOut',
    ...customTransition,
  };

  if (repeat !== undefined) {
    return {
      ...base,
      repeat: repeat === 'infinite' ? Infinity : repeat,
    };
  }

  return base;
}

/**
 * A2UI Animation Component
 */
export const A2UIAnimation = memo(function A2UIAnimation({
  component,
  renderChild,
}: A2UIComponentProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationComponent = component as A2UIAnimationComponentDef;
  const {
    type = 'fadeIn',
    direction,
    duration = 0.5,
    delay = 0,
    repeat,
    children,
    customAnimation,
    className,
  } = animationComponent;

  // Get animation configuration
  const variants = useMemo(
    () => getAnimationVariants(type, direction, customAnimation),
    [type, direction, customAnimation]
  );

  const transition = useMemo(
    () =>
      getTransitionConfig(
        duration,
        delay,
        repeat,
        customAnimation?.transition as Record<string, unknown>
      ),
    [duration, delay, repeat, customAnimation?.transition]
  );

  // If user prefers reduced motion, skip animations
  const effectiveVariants = prefersReducedMotion
    ? { initial: variants.animate, animate: variants.animate, exit: variants.animate }
    : variants;

  return (
    <motion.div
      className={cn('a2ui-animation', className)}
      variants={effectiveVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
    >
      {children?.map((childId) => (
        <React.Fragment key={childId}>{renderChild(childId)}</React.Fragment>
      ))}
    </motion.div>
  );
});

