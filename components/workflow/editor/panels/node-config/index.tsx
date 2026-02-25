/**
 * Node Config Components Index
 * Re-exports all node config components with lazy loading support
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Types
export * from './types';

// IO Schema Editor (eagerly loaded - commonly used)
export { IOSchemaEditor } from './io-schema-editor';

// Variable Selector (eagerly loaded - commonly used)
export { VariableSelector, MultiVariableSelector } from './variable-selector';

// Error Config & Output Preview (eagerly loaded - commonly used)
export { NodeErrorConfigPanel } from './node-error-config';
export { NodeOutputPreview } from './node-output-preview';

// Lazy load heavy components
export const AINodeConfig = lazy(() => import('./ai-config'));
export const ToolNodeConfig = lazy(() => import('./tool-config'));
export const ConditionalNodeConfig = lazy(() => import('./conditional-config'));
export const CodeNodeConfig = lazy(() => import('./code-config'));
export const LoopNodeConfig = lazy(() => import('./loop-config'));
export const HumanNodeConfig = lazy(() => import('./human-config'));
export const StartNodeConfig = lazy(() => import('./start-config'));
export const EndNodeConfig = lazy(() => import('./end-config'));
export const ParallelNodeConfig = lazy(() => import('./parallel-config'));
export const DelayNodeConfig = lazy(() => import('./delay-config'));
export const SubworkflowNodeConfig = lazy(() => import('./subworkflow-config'));
export const WebhookNodeConfig = lazy(() => import('./webhook-config'));
export const TransformNodeConfig = lazy(() => import('./transform-config'));
export const MergeNodeConfig = lazy(() => import('./merge-config'));
export const GroupNodeConfig = lazy(() => import('./group-config'));
export const AnnotationNodeConfig = lazy(() => import('./annotation-config'));
// Dify-inspired node configs
export const KnowledgeRetrievalNodeConfig = lazy(() => import('./knowledge-retrieval-config'));
export const ParameterExtractorNodeConfig = lazy(() => import('./parameter-extractor-config'));
export const VariableAggregatorNodeConfig = lazy(() => import('./variable-aggregator-config'));
export const QuestionClassifierNodeConfig = lazy(() => import('./question-classifier-config'));
export const TemplateTransformNodeConfig = lazy(() => import('./template-transform-config'));
// Chart node config
export const ChartNodeConfig = lazy(() => import('./chart-config'));
// Integration node configs
export const HttpRequestNodeConfig = lazy(() => import('./http-request-config'));
// Variable node configs
export const VariableAssignerNodeConfig = lazy(() => import('./variable-assigner-config'));
// Chatflow node configs
export const AnswerNodeConfig = lazy(() => import('./answer-config'));

// Loading fallback component
export function ConfigLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// Suspense wrapper for lazy components
export function withSuspense<T extends object>(
  Component: ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function SuspenseWrapper(props: T) {
    return (
      <Suspense fallback={fallback || <ConfigLoadingFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Node type to config component mapping
export const NODE_CONFIG_COMPONENTS = {
  ai: AINodeConfig,
  tool: ToolNodeConfig,
  conditional: ConditionalNodeConfig,
  code: CodeNodeConfig,
  loop: LoopNodeConfig,
  human: HumanNodeConfig,
  start: StartNodeConfig,
  end: EndNodeConfig,
  parallel: ParallelNodeConfig,
  delay: DelayNodeConfig,
  subworkflow: SubworkflowNodeConfig,
  webhook: WebhookNodeConfig,
  transform: TransformNodeConfig,
  merge: MergeNodeConfig,
  group: GroupNodeConfig,
  annotation: AnnotationNodeConfig,
  knowledgeRetrieval: KnowledgeRetrievalNodeConfig,
  parameterExtractor: ParameterExtractorNodeConfig,
  variableAggregator: VariableAggregatorNodeConfig,
  questionClassifier: QuestionClassifierNodeConfig,
  templateTransform: TemplateTransformNodeConfig,
  // Chart nodes
  chart: ChartNodeConfig,
  lineChart: ChartNodeConfig,
  barChart: ChartNodeConfig,
  pieChart: ChartNodeConfig,
  areaChart: ChartNodeConfig,
  scatterChart: ChartNodeConfig,
  radarChart: ChartNodeConfig,
  // Integration nodes
  httpRequest: HttpRequestNodeConfig,
  // Variable nodes
  variableAssigner: VariableAssignerNodeConfig,
  // Chatflow nodes
  answer: AnswerNodeConfig,
} as const;

export type NodeConfigComponentType = keyof typeof NODE_CONFIG_COMPONENTS;
