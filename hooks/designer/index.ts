/**
 * Designer/Workflow related hooks
 */

export { useDesigner, type UseDesignerOptions, type UseDesignerReturn } from './use-designer';
export {
  useDesignerDragDrop,
  type DragItemType,
  type DragData,
  type DropPosition,
  type UseDesignerDragDropReturn,
} from './use-designer-drag-drop';
export { useWorkflow, type UseWorkflowOptions, type UseWorkflowReturn } from './use-workflow';
export { useWorkflowEditor } from './use-workflow-editor';
export { useWorkflowExecution } from './use-workflow-execution';
export { useWorkflowKeyboardShortcuts } from './use-workflow-keyboard-shortcuts';
export {
  usePPTAI,
  type RegenerateSlideOptions,
  type OptimizeContentOptions,
  type GenerateSuggestionsOptions,
  type UsePPTAIReturn,
} from './use-ppt-ai';
export {
  useElementTreeVisibility,
  type VirtualElementTreeNode,
} from './use-element-tree-visibility';
export {
  useSandpackBundler,
  type BundlerProgress,
  type UseSandpackBundlerOptions,
  type UseSandpackBundlerReturn,
} from './use-sandpack-bundler';
export {
  useAIConversation,
  type UseAIConversationOptions,
  type UseAIConversationReturn,
} from './use-ai-conversation';
export {
  useDesignerAIConfig,
  type UseDesignerAIConfigReturn,
} from './use-designer-ai-config';
export {
  useAISuggestions,
  type SuggestionType,
  type UseAISuggestionsOptions,
  type UseAISuggestionsReturn,
} from './use-ai-suggestions';
