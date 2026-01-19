/**
 * Learning Mode Components
 * 
 * Components for the Socratic Method-based learning mode.
 */

export { LearningModePanel } from './learning-mode-panel';
export { LearningStartDialog } from './learning-start-dialog';

// Learning content components (moved from ai-elements)
export * from './flashcard';
export * from './quiz';
export * from './review-session';
export * from './video';

// Interactive animation components
export * from '@/types/learning/animation-types';
export { InteractiveAnimation, useAnimation } from './interactive-animation';
export { StepGuide } from './step-guide';
export type { GuideStep, StepGuideProps } from './step-guide';
export { ConceptVisualizer } from './concept-visualizer';
export type { ConceptNode, ConceptData, ConceptVisualizerProps } from './concept-visualizer';
export { TransformerDiagram } from './transformer-diagram';
export type { TransformerDiagramProps } from './transformer-diagram';

// PPT components have been moved to @/components/ppt
// Import from '@/components/ppt' instead
