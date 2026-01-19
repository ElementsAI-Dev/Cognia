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
};
