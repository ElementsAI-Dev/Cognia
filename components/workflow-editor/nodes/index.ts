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

import { StartNode } from './start-node';
import { EndNode } from './end-node';
import { AINode } from './ai-node';
import { ToolNode } from './tool-node';
import { ConditionalNode } from './conditional-node';
import { ParallelNode } from './parallel-node';
import { HumanNode } from './human-node';
import { LoopNode } from './loop-node';
import { CodeNode } from './code-node';
import { BaseNode } from './base-node';

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
  subworkflow: BaseNode,
  loop: LoopNode,
  delay: BaseNode,
  webhook: BaseNode,
  code: CodeNode,
  transform: BaseNode,
  merge: BaseNode,
};
