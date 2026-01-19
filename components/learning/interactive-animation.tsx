'use client';

/**
 * Interactive Animation Component
 *
 * A comprehensive animation player for educational visualizations
 * with playback controls, step-by-step navigation, and interactive elements.
 */

import {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
  createContext,
  useContext,
  useRef,
} from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Info,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type {
  AnimationScene,
  AnimationStep,
  AnimationElement,
  AnimationSpeed,
  PlaybackState,
  PlaybackControls,
  AnimationContextValue,
  InteractiveAnimationProps,
} from '@/types/learning/animation-types';

// =============================================================================
// Animation Context
// =============================================================================

const AnimationContext = createContext<AnimationContextValue | null>(null);

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within InteractiveAnimation');
  }
  return context;
};

// =============================================================================
// Animation Element Renderer
// =============================================================================

interface AnimationElementRendererProps {
  element: AnimationElement;
  isActive: boolean;
  prefersReducedMotion: boolean;
  onElementClick: (elementId: string, action?: string) => void;
}

const AnimationElementRenderer = memo(function AnimationElementRenderer({
  element,
  isActive,
  prefersReducedMotion,
  onElementClick,
}: AnimationElementRendererProps) {
  const handleClick = useCallback(() => {
    if (element.interactive && element.onClick) {
      onElementClick(element.id, element.onClick);
    }
  }, [element.id, element.interactive, element.onClick, onElementClick]);

  const content = useMemo(() => {
    const motionProps = prefersReducedMotion
      ? { initial: element.animate } // Skip animation, show final state
      : {
          initial: element.initial || { opacity: 0 },
          animate: isActive ? element.animate || { opacity: 1 } : element.initial || { opacity: 0 },
          exit: element.exit || { opacity: 0 },
          transition: element.transition || { duration: 0.5 },
        };

    const baseStyle = {
      position: 'absolute' as const,
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      fill: element.fill,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      opacity: element.opacity,
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
    };

    switch (element.type) {
      case 'text':
        return (
          <motion.div
            {...motionProps}
            style={baseStyle}
            className={cn(
              'pointer-events-none select-none',
              element.interactive && 'pointer-events-auto cursor-pointer',
              element.className
            )}
            onClick={handleClick}
          >
            {element.content}
          </motion.div>
        );

      case 'shape':
        if (element.shapeType === 'rect') {
          return (
            <motion.div
              {...motionProps}
              style={{
                ...baseStyle,
                backgroundColor: element.fill,
                borderColor: element.stroke,
                borderWidth: element.strokeWidth,
                borderStyle: element.stroke ? 'solid' : 'none',
                borderRadius: 4,
              }}
              className={cn(
                element.interactive && 'cursor-pointer hover:ring-2 ring-primary/50',
                element.className
              )}
              onClick={handleClick}
            />
          );
        }
        if (element.shapeType === 'circle') {
          return (
            <motion.div
              {...motionProps}
              style={{
                ...baseStyle,
                backgroundColor: element.fill,
                borderColor: element.stroke,
                borderWidth: element.strokeWidth,
                borderStyle: element.stroke ? 'solid' : 'none',
                borderRadius: '50%',
              }}
              className={cn(
                element.interactive && 'cursor-pointer hover:ring-2 ring-primary/50',
                element.className
              )}
              onClick={handleClick}
            />
          );
        }
        return null;

      case 'arrow':
        return (
          <motion.svg
            {...motionProps}
            style={{ ...baseStyle, overflow: 'visible' }}
            className={element.className}
          >
            <defs>
              <marker
                id={`arrowhead-${element.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={element.stroke || 'currentColor'} />
              </marker>
            </defs>
            {element.points && element.points.length >= 2 && (
              <line
                x1={element.points[0][0]}
                y1={element.points[0][1]}
                x2={element.points[1][0]}
                y2={element.points[1][1]}
                stroke={element.stroke || 'currentColor'}
                strokeWidth={element.strokeWidth || 2}
                markerEnd={`url(#arrowhead-${element.id})`}
              />
            )}
          </motion.svg>
        );

      case 'highlight':
        return (
          <motion.div
            {...motionProps}
            style={{
              ...baseStyle,
              backgroundColor: element.fill || 'rgba(255, 215, 0, 0.3)',
              borderRadius: 4,
            }}
            className={cn('pointer-events-none', element.className)}
          />
        );

      case 'group':
        return (
          <motion.div {...motionProps} style={baseStyle} className={element.className}>
            {element.children?.map((child) => (
              <AnimationElementRenderer
                key={child.id}
                element={child}
                isActive={isActive}
                prefersReducedMotion={prefersReducedMotion}
                onElementClick={onElementClick}
              />
            ))}
          </motion.div>
        );

      default:
        return null;
    }
  }, [element, handleClick, isActive, prefersReducedMotion, onElementClick]);

  if (element.tooltip && element.interactive) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side={element.tooltipPosition || 'top'}>{element.tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
});

// =============================================================================
// Animation Canvas
// =============================================================================

interface AnimationCanvasProps {
  scene: AnimationScene;
  currentStep: AnimationStep;
  prefersReducedMotion: boolean;
  onElementClick: (elementId: string, action?: string) => void;
}

const AnimationCanvas = memo(function AnimationCanvas({
  scene,
  currentStep,
  prefersReducedMotion,
  onElementClick,
}: AnimationCanvasProps) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-muted/30"
      style={{
        width: '100%',
        aspectRatio: `${scene.width}/${scene.height}`,
        maxHeight: scene.height,
        backgroundColor: scene.backgroundColor,
        backgroundImage: scene.backgroundImage ? `url(${scene.backgroundImage})` : undefined,
        backgroundSize: 'cover',
      }}
    >
      <TooltipProvider>
        <AnimatePresence mode="wait">
          {currentStep.elements.map((element) => (
            <AnimationElementRenderer
              key={element.id}
              element={element}
              isActive={true}
              prefersReducedMotion={prefersReducedMotion}
              onElementClick={onElementClick}
            />
          ))}
        </AnimatePresence>
      </TooltipProvider>
    </div>
  );
});

// =============================================================================
// Playback Controls Component
// =============================================================================

interface PlaybackControlsBarProps {
  controls: PlaybackControls;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: AnimationSpeed) => void;
  onLoopToggle: () => void;
  compact?: boolean;
}

const PlaybackControlsBar = memo(function PlaybackControlsBar({
  controls,
  onPlay,
  onPause,
  onReset,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  onLoopToggle,
  compact = false,
}: PlaybackControlsBarProps) {
  const t = useTranslations('learning.animation');
  const speeds: AnimationSpeed[] = [0.5, 0.75, 1, 1.5, 2];

  return (
    <div className={cn('flex items-center gap-2', compact ? 'flex-wrap' : '')}>
      {/* Step back */}
      <Button
        variant="ghost"
        size={compact ? 'sm' : 'icon'}
        onClick={onStepBackward}
        disabled={controls.currentStep === 0}
        title={t('stepBackward')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Play/Pause */}
      <Button
        variant="outline"
        size={compact ? 'sm' : 'icon'}
        onClick={controls.state === 'playing' ? onPause : onPlay}
        title={controls.state === 'playing' ? t('pause') : t('play')}
      >
        {controls.state === 'playing' ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Step forward */}
      <Button
        variant="ghost"
        size={compact ? 'sm' : 'icon'}
        onClick={onStepForward}
        disabled={controls.currentStep >= controls.totalSteps - 1}
        title={t('stepForward')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Reset */}
      <Button variant="ghost" size={compact ? 'sm' : 'icon'} onClick={onReset} title={t('reset')}>
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Separator */}
      <div className="h-6 w-px bg-border mx-1" />

      {/* Speed control */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={compact ? 'sm' : 'default'} className="gap-1">
            <Gauge className="h-4 w-4" />
            <span className="text-sm">{controls.speed}x</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {speeds.map((speed) => (
            <DropdownMenuItem
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={cn(controls.speed === speed && 'bg-accent')}
            >
              {speed}x {speed === 1 && `(${t('speedNormal')})`}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loop toggle */}
      <Button
        variant={controls.isLooping ? 'secondary' : 'ghost'}
        size={compact ? 'sm' : 'icon'}
        onClick={onLoopToggle}
        title={controls.isLooping ? t('loopEnabled') : t('enableLoop')}
      >
        <Repeat className={cn('h-4 w-4', controls.isLooping && 'text-primary')} />
      </Button>

      {/* Step indicator */}
      <Badge variant="outline" className="ml-auto">
        {t('currentStep', { current: controls.currentStep + 1, total: controls.totalSteps })}
      </Badge>
    </div>
  );
});

// =============================================================================
// Main Interactive Animation Component
// =============================================================================

export const InteractiveAnimation = memo(function InteractiveAnimation({
  scene,
  autoPlay = false,
  loop = false,
  initialSpeed = 1,
  showControls = true,
  showProgress = true,
  showStepInfo = true,
  compact = false,
  onStepChange,
  onComplete,
  onElementClick,
  className,
}: InteractiveAnimationProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>(autoPlay ? 'playing' : 'idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [speed, setSpeed] = useState<AnimationSpeed>(initialSpeed);
  const [isLooping, setIsLooping] = useState(loop);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer ref for playback
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Current step
  const currentStep = scene.steps[currentStepIndex];
  const totalSteps = scene.steps.length;

  // Calculate progress
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  // Controls object
  const controls: PlaybackControls = useMemo(
    () => ({
      state: playbackState,
      currentStep: currentStepIndex,
      totalSteps,
      speed,
      progress,
      elapsedTime,
      isLooping,
    }),
    [playbackState, currentStepIndex, totalSteps, speed, progress, elapsedTime, isLooping]
  );

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle playback
  useEffect(() => {
    if (playbackState !== 'playing') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const stepDuration = currentStep.duration / speed;
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      if (currentStepIndex < totalSteps - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        if (isLooping) {
          setCurrentStepIndex(0);
        } else {
          setPlaybackState('complete');
          onComplete?.();
        }
      }
    }, stepDuration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    playbackState,
    currentStepIndex,
    currentStep.duration,
    speed,
    totalSteps,
    isLooping,
    onComplete,
  ]);

  // Notify step change
  useEffect(() => {
    onStepChange?.(currentStepIndex, currentStep);
  }, [currentStepIndex, currentStep, onStepChange]);

  // Control handlers
  const play = useCallback(() => {
    setPlaybackState('playing');
  }, []);

  const pause = useCallback(() => {
    setPlaybackState('paused');
    setElapsedTime((prev) => prev + (Date.now() - startTimeRef.current));
  }, []);

  const reset = useCallback(() => {
    setPlaybackState('idle');
    setCurrentStepIndex(0);
    setElapsedTime(0);
  }, []);

  const stepForward = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setPlaybackState('paused');
    }
  }, [currentStepIndex, totalSteps]);

  const stepBackward = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setPlaybackState('paused');
    }
  }, [currentStepIndex]);

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < totalSteps) {
        setCurrentStepIndex(stepIndex);
        setPlaybackState('paused');
      }
    },
    [totalSteps]
  );

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleLoopToggle = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const handleElementClick = useCallback(
    (elementId: string, action?: string) => {
      onElementClick?.(elementId, action);
    },
    [onElementClick]
  );

  // Context value
  const contextValue: AnimationContextValue = useMemo(
    () => ({
      scene,
      controls,
      play,
      pause,
      reset,
      stepForward,
      stepBackward,
      goToStep,
      setSpeed: handleSpeedChange,
      setLooping: setIsLooping,
      onElementClick: handleElementClick,
      prefersReducedMotion,
    }),
    [
      scene,
      controls,
      play,
      pause,
      reset,
      stepForward,
      stepBackward,
      goToStep,
      handleSpeedChange,
      handleElementClick,
      prefersReducedMotion,
    ]
  );

  return (
    <AnimationContext.Provider value={contextValue}>
      <Card className={cn('overflow-hidden', className)}>
        {/* Header */}
        <CardHeader className={cn('pb-2', compact && 'py-3')}>
          <div className="flex items-center justify-between">
            <CardTitle className={cn(compact ? 'text-base' : 'text-lg')}>{scene.name}</CardTitle>
            {scene.difficulty && (
              <Badge
                variant="outline"
                className={cn(
                  scene.difficulty === 'beginner' && 'text-green-600 border-green-300',
                  scene.difficulty === 'intermediate' && 'text-yellow-600 border-yellow-300',
                  scene.difficulty === 'advanced' && 'text-red-600 border-red-300'
                )}
              >
                {scene.difficulty}
              </Badge>
            )}
          </div>
          {scene.description && !compact && (
            <p className="text-sm text-muted-foreground">{scene.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Animation Canvas */}
          <AnimationCanvas
            scene={scene}
            currentStep={currentStep}
            prefersReducedMotion={prefersReducedMotion}
            onElementClick={handleElementClick}
          />

          {/* Progress bar */}
          {showProgress && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentStep.title}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {/* Step info */}
          {showStepInfo && currentStep.description && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{currentStep.title}</p>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            </div>
          )}

          {/* Playback controls */}
          {showControls && (
            <PlaybackControlsBar
              controls={controls}
              onPlay={play}
              onPause={pause}
              onReset={reset}
              onStepForward={stepForward}
              onStepBackward={stepBackward}
              onSpeedChange={handleSpeedChange}
              onLoopToggle={handleLoopToggle}
              compact={compact}
            />
          )}

          {/* Step timeline (non-compact mode) */}
          {!compact && totalSteps > 1 && (
            <div className="pt-2">
              <Slider
                value={[currentStepIndex]}
                min={0}
                max={totalSteps - 1}
                step={1}
                onValueChange={(value) => goToStep(value[0])}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                {scene.steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={cn(
                      'text-xs px-1 py-0.5 rounded transition-colors',
                      index === currentStepIndex
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AnimationContext.Provider>
  );
});

export default InteractiveAnimation;
