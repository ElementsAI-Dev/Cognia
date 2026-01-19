'use client';

/**
 * Interactive Animation Types
 * 
 * Shared type definitions for interactive animation components
 * used in the learning mode.
 */

import type { MotionProps } from 'motion/react';

/**
 * Animation speed presets
 */
export type AnimationSpeed = 0.5 | 0.75 | 1 | 1.5 | 2;

/**
 * Animation playback state
 */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'complete';

/**
 * Element types for animation scenes
 */
export type AnimationElementType = 
  | 'shape'      // Geometric shapes (rect, circle, etc.)
  | 'text'       // Text labels
  | 'arrow'      // Directional arrows
  | 'highlight'  // Highlight overlays
  | 'image'      // Image elements
  | 'group';     // Container for other elements

/**
 * Shape types for 'shape' elements
 */
export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'line' | 'path' | 'polygon';

/**
 * An animated element within a step
 */
export interface AnimationElement {
  id: string;
  type: AnimationElementType;
  
  // Position and size
  x: number;
  y: number;
  width?: number;
  height?: number;
  
  // Content
  content?: string;           // For text elements
  shapeType?: ShapeType;      // For shape elements
  src?: string;               // For image elements
  points?: [number, number][]; // For arrow/polygon elements
  children?: AnimationElement[]; // For group elements
  
  // Styling
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontWeight?: string | number;
  className?: string;
  
  // Animation
  initial?: MotionProps['initial'];
  animate?: MotionProps['animate'];
  exit?: MotionProps['exit'];
  transition?: MotionProps['transition'];
  
  // Interaction
  interactive?: boolean;
  onClick?: string;           // Action identifier
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A single step in the animation sequence
 */
export interface AnimationStep {
  id: string;
  title: string;
  description?: string;
  duration: number;           // Duration in milliseconds
  
  // Elements to show in this step
  elements: AnimationElement[];
  
  // Optional narration
  narration?: string;
  
  // Audio cue (optional)
  audioUrl?: string;
}

/**
 * Complete animation scene configuration
 */
export interface AnimationScene {
  id: string;
  name: string;
  description?: string;
  
  // Canvas dimensions
  width: number;
  height: number;
  
  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  
  // Steps
  steps: AnimationStep[];
  
  // Metadata
  category?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Animation playback controls state
 */
export interface PlaybackControls {
  state: PlaybackState;
  currentStep: number;
  totalSteps: number;
  speed: AnimationSpeed;
  progress: number;           // 0-100 percent
  elapsedTime: number;        // Milliseconds
  isLooping: boolean;
}

/**
 * Animation context for child components
 */
export interface AnimationContextValue {
  scene: AnimationScene | null;
  controls: PlaybackControls;
  
  // Control methods
  play: () => void;
  pause: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStep: (stepIndex: number) => void;
  setSpeed: (speed: AnimationSpeed) => void;
  setLooping: (loop: boolean) => void;
  
  // Element interaction
  onElementClick: (elementId: string, action?: string) => void;
  
  // Reduced motion preference
  prefersReducedMotion: boolean;
}

/**
 * Props for InteractiveAnimation component
 */
export interface InteractiveAnimationProps {
  scene: AnimationScene;
  
  // Playback options
  autoPlay?: boolean;
  loop?: boolean;
  initialSpeed?: AnimationSpeed;
  
  // UI options
  showControls?: boolean;
  showProgress?: boolean;
  showStepInfo?: boolean;
  compact?: boolean;
  
  // Callbacks
  onStepChange?: (step: number, stepData: AnimationStep) => void;
  onComplete?: () => void;
  onElementClick?: (elementId: string, action?: string) => void;
  
  // Styling
  className?: string;
}

/**
 * Preset animation configurations for common use cases
 */
export const ANIMATION_PRESETS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  },
  slideInLeft: {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.5 },
  },
  slideInRight: {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.5 },
  },
  slideInUp: {
    initial: { y: 30, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.5 },
  },
  scaleIn: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.4, type: 'spring' },
  },
  highlight: {
    initial: { backgroundColor: 'transparent' },
    animate: { backgroundColor: 'rgba(255, 215, 0, 0.3)' },
    transition: { duration: 0.3, repeat: 2, repeatType: 'reverse' as const },
  },
  pulse: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1, repeat: Infinity },
  },
  flow: {
    animate: { x: [0, 20, 0] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
} as const;

/**
 * Helper to create animation element
 */
export function createAnimationElement(
  partial: Partial<AnimationElement> & { id: string; type: AnimationElementType }
): AnimationElement {
  return {
    x: 0,
    y: 0,
    ...partial,
  };
}

/**
 * Helper to create animation step
 */
export function createAnimationStep(
  partial: Partial<AnimationStep> & { id: string; title: string; elements: AnimationElement[] }
): AnimationStep {
  return {
    duration: 2000,
    ...partial,
  };
}

/**
 * Helper to create animation scene
 */
export function createAnimationScene(
  partial: Partial<AnimationScene> & { id: string; name: string; steps: AnimationStep[] }
): AnimationScene {
  return {
    width: 800,
    height: 450,
    ...partial,
  };
}
