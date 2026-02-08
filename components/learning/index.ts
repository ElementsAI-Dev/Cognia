/**
 * Learning Mode Components
 *
 * Components for the Socratic Method-based learning mode.
 */

// Session management components
export { LearningModePanel } from './session/learning-mode-panel';
export { LearningStartDialog } from './session/learning-start-dialog';
export { LearningHistoryPanel } from './session/learning-history-panel';
export { LearningNotesPanel } from './session/learning-notes-panel';
export { LearningStatisticsPanel } from './session/learning-statistics-panel';
export { LearningPathDashboard } from './session/learning-path-dashboard';

// Learning content components
export * from './content/flashcard';
export * from './content/quiz';
export * from './content/review-session';
export * from './content/video';

// Interactive visualization components
export * from '@/types/learning/animation-types';
export { InteractiveAnimation, useAnimation } from './visualization/interactive-animation';
export { StepGuide } from './visualization/step-guide';
export type { GuideStep, StepGuideProps } from './visualization/step-guide';
export { ConceptVisualizer } from './visualization/concept-visualizer';
export type { ConceptNode, ConceptData, ConceptVisualizerProps } from './visualization/concept-visualizer';
export { TransformerDiagram } from './visualization/transformer-diagram';
export type { TransformerDiagramProps } from './visualization/transformer-diagram';

// PPT components have been moved to @/components/ppt
// Import from '@/components/ppt' instead
