'use client';

/**
 * Transformer Architecture Diagram
 *
 * An interactive visualization of the Transformer architecture
 * for educational purposes, with animated data flow and
 * clickable components for detailed explanations.
 */

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Layers,
  Zap,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Transformer component types
 */
type TransformerComponent =
  | 'input-embedding'
  | 'positional-encoding'
  | 'multi-head-attention'
  | 'add-norm-1'
  | 'feed-forward'
  | 'add-norm-2'
  | 'encoder'
  | 'decoder'
  | 'output-linear'
  | 'softmax';

/**
 * Component information for tooltips/details
 */
interface ComponentInfo {
  id: TransformerComponent;
  name: string;
  shortName: string;
  description: string;
  details: string;
  formula?: string;
  color: string;
}

/**
 * Props for TransformerDiagram
 */
export interface TransformerDiagramProps {
  // Animation options
  autoPlay?: boolean;
  animationDuration?: number;

  // UI options
  showFormulas?: boolean;
  showDetails?: boolean;
  interactive?: boolean;
  compact?: boolean;

  // Callbacks
  onStepChange?: (step: number) => void;
  onComponentClick?: (component: TransformerComponent) => void;

  // Styling
  className?: string;
}

/**
 * Component block in the diagram
 */
interface ComponentBlockProps {
  info: ComponentInfo;
  isActive: boolean;
  onClick: () => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  prefersReducedMotion: boolean;
}

const ComponentBlock = memo(function ComponentBlock({
  info,
  isActive,
  onClick,
  showLabel = true,
  size = 'md',
  prefersReducedMotion,
}: ComponentBlockProps) {
  const sizeClasses = {
    sm: 'w-16 h-8 text-xs',
    md: 'w-24 h-12 text-sm',
    lg: 'w-32 h-16 text-base',
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'rounded-lg border-2 flex items-center justify-center font-medium transition-all',
        sizeClasses[size],
        isActive
          ? `${info.color} text-white border-transparent shadow-lg scale-105`
          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary',
        !prefersReducedMotion && 'transition-transform duration-300'
      )}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      animate={
        prefersReducedMotion
          ? undefined
          : isActive
            ? { y: [0, -3, 0], transition: { repeat: Infinity, duration: 1 } }
            : {}
      }
    >
      {showLabel ? info.shortName : <Eye className="h-4 w-4" />}
    </motion.button>
  );
});

/**
 * Arrow connector between components
 */
interface ArrowConnectorProps {
  direction?: 'down' | 'right';
  animated?: boolean;
  prefersReducedMotion: boolean;
}

const ArrowConnector = memo(function ArrowConnector({
  direction = 'down',
  animated = false,
  prefersReducedMotion,
}: ArrowConnectorProps) {
  const isVertical = direction === 'down';

  return (
    <motion.div
      className={cn('flex items-center justify-center', isVertical ? 'h-6' : 'w-6')}
      initial={prefersReducedMotion || !animated ? undefined : { opacity: 0.3 }}
      animate={prefersReducedMotion || !animated ? undefined : { opacity: 1 }}
    >
      <ArrowRight
        className={cn(
          'h-4 w-4 text-muted-foreground',
          isVertical && 'rotate-90',
          animated && !prefersReducedMotion && 'text-primary'
        )}
      />
    </motion.div>
  );
});

/**
 * Attention visualization
 */
const AttentionVisualization = memo(function AttentionVisualization({
  isActive,
  prefersReducedMotion,
}: {
  isActive: boolean;
  prefersReducedMotion: boolean;
}) {
  const t = useTranslations('learning.transformer');
  const tokens = ['The', 'cat', 'sat', 'on', 'mat'];

  if (!isActive) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
      className="p-4 bg-muted/30 rounded-lg"
    >
      <p className="text-xs text-muted-foreground mb-2">{t('attentionWeights')}</p>
      <div className="flex gap-2">
        {tokens.map((token, i) => (
          <motion.div
            key={token}
            className="flex flex-col items-center gap-1"
            initial={prefersReducedMotion ? {} : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="px-2 py-1 bg-primary/10 rounded text-xs font-mono">{token}</div>
            <div className="flex gap-0.5">
              {tokens.map((_, j) => (
                <motion.div
                  key={j}
                  className="w-2 h-2 rounded-full bg-primary"
                  style={{ opacity: 0.2 + Math.random() * 0.8 }}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          opacity: [0.2, 0.8, 0.2],
                          transition: { repeat: Infinity, duration: 2, delay: (i + j) * 0.1 },
                        }
                  }
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/**
 * Main TransformerDiagram Component
 */
export const TransformerDiagram = memo(function TransformerDiagram({
  autoPlay = false,
  animationDuration = 3000,
  showFormulas = true,
  showDetails = true,
  interactive = true,
  compact = false,
  onStepChange,
  onComponentClick,
  className,
}: TransformerDiagramProps) {
  const t = useTranslations('learning.transformer');
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Component Definitions with i18n
  const components: ComponentInfo[] = useMemo(
    () => [
      {
        id: 'input-embedding',
        name: t('components.inputEmbedding.name'),
        shortName: t('components.inputEmbedding.shortName'),
        description: t('components.inputEmbedding.description'),
        details: t('components.inputEmbedding.details'),
        formula: 'E(x) = W_E · one_hot(x)',
        color: 'bg-green-500',
      },
      {
        id: 'positional-encoding',
        name: t('components.positionalEncoding.name'),
        shortName: t('components.positionalEncoding.shortName'),
        description: t('components.positionalEncoding.description'),
        details: t('components.positionalEncoding.details'),
        formula: 'PE(pos, 2i) = sin(pos/10000^(2i/d))\nPE(pos, 2i+1) = cos(pos/10000^(2i/d))',
        color: 'bg-blue-500',
      },
      {
        id: 'multi-head-attention',
        name: t('components.multiHeadAttention.name'),
        shortName: t('components.multiHeadAttention.shortName'),
        description: t('components.multiHeadAttention.description'),
        details: t('components.multiHeadAttention.details'),
        formula: 'Attention(Q,K,V) = softmax(QK^T/√d_k)V',
        color: 'bg-purple-500',
      },
      {
        id: 'add-norm-1',
        name: t('components.addNorm.name'),
        shortName: t('components.addNorm.shortName'),
        description: t('components.addNorm.description'),
        details: t('components.addNorm.details'),
        formula: 'LayerNorm(x + Sublayer(x))',
        color: 'bg-gray-500',
      },
      {
        id: 'feed-forward',
        name: t('components.feedForward.name'),
        shortName: t('components.feedForward.shortName'),
        description: t('components.feedForward.description'),
        details: t('components.feedForward.details'),
        formula: 'FFN(x) = max(0, xW_1 + b_1)W_2 + b_2',
        color: 'bg-orange-500',
      },
      {
        id: 'add-norm-2',
        name: t('components.addNorm.name'),
        shortName: t('components.addNorm.shortName'),
        description: t('components.addNorm.description'), // Generic description
        details: t('components.addNorm.details'),
        formula: 'LayerNorm(x + FFN(x))',
        color: 'bg-gray-500',
      },
      {
        id: 'encoder',
        name: t('components.encoder.name'),
        shortName: t('components.encoder.shortName'),
        description: t('components.encoder.description'),
        details: t('components.encoder.details'),
        color: 'bg-indigo-500',
      },
      {
        id: 'decoder',
        name: t('components.decoder.name'),
        shortName: t('components.decoder.shortName'),
        description: t('components.decoder.description'),
        details: t('components.decoder.details'),
        color: 'bg-pink-500',
      },
      {
        id: 'output-linear',
        name: t('components.outputLinear.name'),
        shortName: t('components.outputLinear.shortName'),
        description: t('components.outputLinear.description'),
        details: t('components.outputLinear.details'),
        formula: 'logits = x · W_out + b_out',
        color: 'bg-teal-500',
      },
      {
        id: 'softmax',
        name: t('components.softmax.name'),
        shortName: t('components.softmax.shortName'),
        description: t('components.softmax.description'),
        details: t('components.softmax.details'),
        formula: 'P(y_i) = exp(z_i) / Σ exp(z_j)',
        color: 'bg-red-500',
      },
    ],
    [t]
  );

  // Steps Definition with i18n
  interface DataFlowStep {
    id: number;
    title: string;
    description: string;
    activeComponents: TransformerComponent[];
    highlight?: string;
  }

  const steps: DataFlowStep[] = useMemo(
    () => [
      {
        id: 0,
        title: t('steps.inputProcessing.title'),
        description: t('steps.inputProcessing.description'),
        activeComponents: ['input-embedding', 'positional-encoding'],
        highlight: t('steps.inputProcessing.highlight'),
      },
      {
        id: 1,
        title: t('steps.selfAttention.title'),
        description: t('steps.selfAttention.description'),
        activeComponents: ['multi-head-attention'],
        highlight: t('steps.selfAttention.highlight'),
      },
      {
        id: 2,
        title: t('steps.residualNorm1.title'),
        description: t('steps.residualNorm1.description'),
        activeComponents: ['add-norm-1'],
      },
      {
        id: 3,
        title: t('steps.feedForward.title'),
        description: t('steps.feedForward.description'),
        activeComponents: ['feed-forward'],
        highlight: t('steps.feedForward.highlight'),
      },
      {
        id: 4,
        title: t('steps.residualNorm2.title'),
        description: t('steps.residualNorm2.description'),
        activeComponents: ['add-norm-2'],
      },
      {
        id: 5,
        title: t('steps.fullEncoder.title'),
        description: t('steps.fullEncoder.description'),
        activeComponents: ['encoder'],
        highlight: t('steps.fullEncoder.highlight'),
      },
      {
        id: 6,
        title: t('steps.decoderProcessing.title'),
        description: t('steps.decoderProcessing.description'),
        activeComponents: ['decoder'],
        highlight: t('steps.decoderProcessing.highlight'),
      },
      {
        id: 7,
        title: t('steps.outputGeneration.title'),
        description: t('steps.outputGeneration.description'),
        activeComponents: ['output-linear', 'softmax'],
        highlight: t('steps.outputGeneration.highlight'),
      },
    ],
    [t]
  );

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);

  // Get current step data
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Check if component is active
  const isComponentActive = useCallback(
    (componentId: TransformerComponent) => {
      return step.activeComponents.includes(componentId);
    },
    [step]
  );

  // Get component info
  const getComponentInfo = useCallback(
    (id: TransformerComponent) => {
      return components.find((c) => c.id === id);
    },
    [components]
  );

  // Handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep, steps.length]);

  const handleComponentClick = useCallback(
    (id: TransformerComponent) => {
      const info = getComponentInfo(id);
      if (info) {
        setSelectedComponent(info);
        onComponentClick?.(id);
      }
    },
    [getComponentInfo, onComponentClick]
  );

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
        onStepChange?.(currentStep + 1);
      } else {
        setIsPlaying(false);
      }
    }, animationDuration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, animationDuration, onStepChange, steps.length]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(compact && 'py-3')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center gap-2', compact ? 'text-base' : 'text-lg')}>
            <Layers className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
          <Badge variant="outline">{t('interactive')}</Badge>
        </div>
        {!compact && <CardDescription>{t('description')}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Diagram */}
        <div className="relative p-4 bg-muted/20 rounded-lg border overflow-x-auto">
          <div className="flex flex-col items-center gap-2 min-w-75">
            {/* Input Section */}
            <div className="flex items-center gap-4">
              <ComponentBlock
                info={getComponentInfo('input-embedding')!}
                isActive={isComponentActive('input-embedding')}
                onClick={() => handleComponentClick('input-embedding')}
                size={compact ? 'sm' : 'md'}
                prefersReducedMotion={prefersReducedMotion}
              />
              <ArrowConnector
                direction="right"
                animated={isComponentActive('input-embedding')}
                prefersReducedMotion={prefersReducedMotion}
              />
              <ComponentBlock
                info={getComponentInfo('positional-encoding')!}
                isActive={isComponentActive('positional-encoding')}
                onClick={() => handleComponentClick('positional-encoding')}
                size={compact ? 'sm' : 'md'}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>

            <ArrowConnector
              animated={isComponentActive('positional-encoding')}
              prefersReducedMotion={prefersReducedMotion}
            />

            {/* Encoder Block */}
            <div className="p-3 border-2 border-dashed rounded-lg bg-indigo-50 dark:bg-indigo-900/10">
              <p className="text-xs text-center text-muted-foreground mb-2">{t('encoderLayer')}</p>
              <div className="flex flex-col items-center gap-2">
                <ComponentBlock
                  info={getComponentInfo('multi-head-attention')!}
                  isActive={isComponentActive('multi-head-attention')}
                  onClick={() => handleComponentClick('multi-head-attention')}
                  size={compact ? 'sm' : 'md'}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <ArrowConnector
                  animated={isComponentActive('multi-head-attention')}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <ComponentBlock
                  info={getComponentInfo('add-norm-1')!}
                  isActive={isComponentActive('add-norm-1')}
                  onClick={() => handleComponentClick('add-norm-1')}
                  size={compact ? 'sm' : 'md'}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <ArrowConnector
                  animated={isComponentActive('add-norm-1')}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <ComponentBlock
                  info={getComponentInfo('feed-forward')!}
                  isActive={isComponentActive('feed-forward')}
                  onClick={() => handleComponentClick('feed-forward')}
                  size={compact ? 'sm' : 'md'}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <ArrowConnector
                  animated={isComponentActive('feed-forward')}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <ComponentBlock
                  info={getComponentInfo('add-norm-2')!}
                  isActive={isComponentActive('add-norm-2')}
                  onClick={() => handleComponentClick('add-norm-2')}
                  size={compact ? 'sm' : 'md'}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
            </div>

            <ArrowConnector
              animated={isComponentActive('encoder')}
              prefersReducedMotion={prefersReducedMotion}
            />

            {/* Output Section */}
            <div className="flex items-center gap-4">
              <ComponentBlock
                info={getComponentInfo('output-linear')!}
                isActive={isComponentActive('output-linear')}
                onClick={() => handleComponentClick('output-linear')}
                size={compact ? 'sm' : 'md'}
                prefersReducedMotion={prefersReducedMotion}
              />
              <ArrowConnector
                direction="right"
                animated={isComponentActive('output-linear')}
                prefersReducedMotion={prefersReducedMotion}
              />
              <ComponentBlock
                info={getComponentInfo('softmax')!}
                isActive={isComponentActive('softmax')}
                onClick={() => handleComponentClick('softmax')}
                size={compact ? 'sm' : 'md'}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          </div>

          {/* Attention visualization when active */}
          <AnimatePresence>
            {isComponentActive('multi-head-attention') && (
              <div className="mt-4">
                <AttentionVisualization
                  isActive={true}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Current step info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {t('stepOf', { current: currentStep + 1, total: steps.length })}
            </Badge>
            <span className="text-sm font-medium">{step.title}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-sm text-muted-foreground">{step.description}</p>
          {step.highlight && (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20">
              <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{step.highlight}</p>
            </div>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={isPlaying ? handlePause : handlePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Component detail dialog */}
        {interactive && selectedComponent && (
          <Dialog open={!!selectedComponent} onOpenChange={() => setSelectedComponent(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded', selectedComponent.color)} />
                  {selectedComponent.name}
                </DialogTitle>
                <DialogDescription>{selectedComponent.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {showDetails && <p className="text-sm">{selectedComponent.details}</p>}
                {showFormulas && selectedComponent.formula && (
                  <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                    <p className="text-xs text-muted-foreground mb-1">{t('formula')}:</p>
                    <pre className="whitespace-pre-wrap">{selectedComponent.formula}</pre>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
});

export default TransformerDiagram;
