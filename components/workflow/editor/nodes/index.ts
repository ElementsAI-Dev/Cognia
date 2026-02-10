/**
 * Workflow Editor Node Components
 */

export { BaseNode } from './base-node';
export { StartNode } from './start-node';
export { EndNode } from './end-node';
export { AINode } from './ai-node';
export { ToolNode } from './tool-node';
export { ConditionalNode } from './conditional-node';
export { ParallelNode } from './parallel-node';
export { HumanNode } from './human-node';
export { LoopNode } from './loop-node';
export { CodeNode } from './code-node';
export { SubworkflowNode } from './subworkflow-node';
export { DelayNode } from './delay-node';
export { WebhookNode } from './webhook-node';
export { TransformNode } from './transform-node';
export { MergeNode } from './merge-node';
export { GroupNode } from './group-node';
export { AnnotationNode } from './annotation-node';
export { KnowledgeRetrievalNode } from './knowledge-retrieval-node';
export { ParameterExtractorNode } from './parameter-extractor-node';
export { VariableAggregatorNode } from './variable-aggregator-node';
export { QuestionClassifierNode } from './question-classifier-node';
export { TemplateTransformNode } from './template-transform-node';
export { ChartNode } from './chart-node';

import { StartNode } from './start-node';
import { EndNode } from './end-node';
import { AINode } from './ai-node';
import { ToolNode } from './tool-node';
import { ConditionalNode } from './conditional-node';
import { ParallelNode } from './parallel-node';
import { HumanNode } from './human-node';
import { LoopNode } from './loop-node';
import { CodeNode } from './code-node';
import { SubworkflowNode } from './subworkflow-node';
import { DelayNode } from './delay-node';
import { WebhookNode } from './webhook-node';
import { TransformNode } from './transform-node';
import { MergeNode } from './merge-node';
import { GroupNode } from './group-node';
import { AnnotationNode } from './annotation-node';
import { KnowledgeRetrievalNode } from './knowledge-retrieval-node';
import { ParameterExtractorNode } from './parameter-extractor-node';
import { VariableAggregatorNode } from './variable-aggregator-node';
import { QuestionClassifierNode } from './question-classifier-node';
import { TemplateTransformNode } from './template-transform-node';
import { ChartNode } from './chart-node';

/**
 * Node type to component mapping for React Flow
 */
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  ai: AINode,
  tool: ToolNode,
  conditional: ConditionalNode,
  parallel: ParallelNode,
  human: HumanNode,
  subworkflow: SubworkflowNode,
  loop: LoopNode,
  delay: DelayNode,
  webhook: WebhookNode,
  code: CodeNode,
  transform: TransformNode,
  merge: MergeNode,
  group: GroupNode,
  annotation: AnnotationNode,
  knowledgeRetrieval: KnowledgeRetrievalNode,
  parameterExtractor: ParameterExtractorNode,
  variableAggregator: VariableAggregatorNode,
  questionClassifier: QuestionClassifierNode,
  templateTransform: TemplateTransformNode,
  // Chart nodes
  chart: ChartNode,
  lineChart: ChartNode,
  barChart: ChartNode,
  pieChart: ChartNode,
  areaChart: ChartNode,
  scatterChart: ChartNode,
  radarChart: ChartNode,
};
