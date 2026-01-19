/**
 * Workflow Editor Components
 *
 * Organized by functional responsibility:
 * - core/: Core editor components (editor panel, toolbar, palette)
 * - edges/: Edge and connection line components
 * - debug/: Debugging tools and panels
 * - execution/: Execution monitoring and history
 * - panels/: Configuration and management panels
 * - search/: Search and navigation components
 * - utils/: Utility components (tooltips, quick config)
 * - nodes/: Node type components
 */

// Core components
export { WorkflowEditorPanel, WorkflowToolbar, NodePalette } from './core';

// Edge components
export { CustomEdge, type CustomEdgeData, CustomConnectionLine } from './edges';

// Debug components
export { DebugPanel, DebugToolbar } from './debug';

// Execution components
export {
  ExecutionPanel,
  ExecutionStatisticsPanel,
  WorkflowExecutionHistoryPanel,
} from './execution';

// Panel components
export {
  NodeConfigPanel,
  VariableManagerPanel,
  WorkflowSettingsPanel,
  KeyboardShortcutsPanel,
  VersionHistoryPanel,
  WorkflowTriggerPanel,
  type TriggerType,
  type WorkflowTrigger,
  type TriggerConfig,
  WorkflowInputTestPanel,
} from './panels';

// Search components
export { NodeSearchCommand, NodeSearchPanel } from './search';

// Utility components
export { NodePreviewTooltip, NodeQuickConfig, NodeTemplatePanel } from './utils';

// Node components
export { nodeTypes } from './nodes';
export * from './nodes';
