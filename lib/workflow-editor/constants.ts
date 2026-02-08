/**
 * Workflow Editor Constants
 * Shared constants for workflow editor components
 */

import {
  Play,
  Square,
  Sparkles,
  Wrench,
  GitBranch,
  GitFork,
  User,
  Workflow,
  Repeat,
  Clock,
  Globe,
  Code,
  Shuffle,
  GitMerge,
  Group,
  StickyNote,
  // Dify-inspired icons
  BookOpen,
  ListChecks,
  Combine,
  MessageSquare,
  FileCode,
  // Chart icons
  BarChart3,
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Radar,
} from 'lucide-react';
import type { WorkflowNodeType } from '@/types/workflow/workflow-editor';

/**
 * Node type icons mapping
 * Used across NodePalette, BaseNode, NodeSearchPanel, etc.
 */
export const NODE_ICONS: Record<WorkflowNodeType, React.ComponentType<{ className?: string }>> = {
  start: Play,
  end: Square,
  ai: Sparkles,
  tool: Wrench,
  conditional: GitBranch,
  parallel: GitFork,
  human: User,
  subworkflow: Workflow,
  loop: Repeat,
  delay: Clock,
  webhook: Globe,
  code: Code,
  transform: Shuffle,
  merge: GitMerge,
  group: Group,
  annotation: StickyNote,
  // Dify-inspired types
  knowledgeRetrieval: BookOpen,
  parameterExtractor: ListChecks,
  variableAggregator: Combine,
  questionClassifier: MessageSquare,
  templateTransform: FileCode,
  // Chart types
  chart: BarChart3,
  lineChart: LineChart,
  barChart: BarChart,
  pieChart: PieChart,
  areaChart: AreaChart,
  scatterChart: ScatterChart,
  radarChart: Radar,
};

/**
 * Node tags for filtering in NodePalette
 */
export const NODE_TAGS = [
  { id: 'ai', label: 'AI', color: 'bg-purple-500/20 text-purple-600' },
  { id: 'data', label: 'Data', color: 'bg-blue-500/20 text-blue-600' },
  { id: 'flow', label: 'Flow', color: 'bg-green-500/20 text-green-600' },
  { id: 'integration', label: 'Integration', color: 'bg-orange-500/20 text-orange-600' },
  { id: 'utility', label: 'Utility', color: 'bg-gray-500/20 text-gray-600' },
  { id: 'visualization', label: 'Charts', color: 'bg-emerald-500/20 text-emerald-600' },
] as const;

/**
 * Map node types to tags for filtering
 */
export const NODE_TYPE_TAGS: Record<WorkflowNodeType, string[]> = {
  start: ['flow'],
  end: ['flow'],
  ai: ['ai', 'data'],
  tool: ['integration', 'utility'],
  conditional: ['flow'],
  parallel: ['flow'],
  human: ['utility'],
  subworkflow: ['flow', 'integration'],
  loop: ['flow', 'data'],
  delay: ['utility', 'flow'],
  webhook: ['integration'],
  code: ['data', 'utility'],
  transform: ['data'],
  merge: ['flow', 'data'],
  group: ['flow', 'utility'],
  annotation: ['utility'],
  // Dify-inspired tags
  knowledgeRetrieval: ['ai', 'data'],
  parameterExtractor: ['ai', 'data'],
  variableAggregator: ['data', 'flow'],
  questionClassifier: ['ai', 'flow'],
  templateTransform: ['data', 'utility'],
  // Chart tags
  chart: ['visualization', 'data'],
  lineChart: ['visualization', 'data'],
  barChart: ['visualization', 'data'],
  pieChart: ['visualization', 'data'],
  areaChart: ['visualization', 'data'],
  scatterChart: ['visualization', 'data'],
  radarChart: ['visualization', 'data'],
};

/**
 * Default ReactFlow configuration options
 * Shared between mobile and desktop layouts
 */
export const DEFAULT_REACTFLOW_OPTIONS = {
  fitView: true,
  fitViewOptions: { padding: 0.2 },
  deleteKeyCode: ['Backspace', 'Delete'] as string[],
  multiSelectionKeyCode: ['Shift', 'Meta', 'Control'] as string[],
  selectionOnDrag: true,
  panOnScroll: true,
  zoomOnPinch: true,
  selectNodesOnDrag: false,
  proOptions: { hideAttribution: true },
} as const;
