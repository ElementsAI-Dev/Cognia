/**
 * Flow Chat Types - Types for the flow-based chat canvas view
 * Similar to Flowith's infinite canvas concept
 */

import type { Node, Edge, Viewport } from '@xyflow/react';
import type { UIMessage, MessageRole } from '../core/message';
import type { ConversationBranch } from '../core/session';

/**
 * Chat view mode - list (traditional) or flow (canvas)
 */
export type ChatViewMode = 'list' | 'flow';

/**
 * Node type identifiers for ReactFlow
 */
export type FlowChatNodeType = 
  | 'user'        // User message node
  | 'assistant'   // Assistant response node
  | 'system'      // System message node
  | 'branch'      // Branch point indicator
  | 'reference'   // Reference/citation node
  | 'parallel';   // Parallel generation group

/**
 * Edge type identifiers for ReactFlow
 */
export type FlowChatEdgeType = 
  | 'conversation'  // Normal conversation flow
  | 'branch'        // Branch connection
  | 'reference'     // Reference connection
  | 'parallel';     // Parallel generation connection

/**
 * Node collapse state
 */
export type NodeCollapseState = 'expanded' | 'collapsed' | 'preview';

/**
 * Media attachment in a flow node
 */
export interface FlowNodeAttachment {
  /** Unique ID */
  id: string;
  /** Attachment type */
  type: 'image' | 'video' | 'audio' | 'file';
  /** Display name */
  name: string;
  /** Full URL */
  url: string;
  /** Thumbnail URL for preview */
  thumbnailUrl?: string;
  /** File size in bytes */
  size?: number;
  /** MIME type */
  mimeType?: string;
  /** Width for images/videos */
  width?: number;
  /** Height for images/videos */
  height?: number;
  /** Duration in seconds for audio/video */
  duration?: number;
}

/**
 * Node tag for categorization
 */
export interface FlowNodeTag {
  /** Unique ID */
  id: string;
  /** Tag label */
  label: string;
  /** Tag color (hex or tailwind class) */
  color: string;
}

/**
 * Linked artifact reference
 */
export interface FlowNodeArtifact {
  /** Artifact ID */
  id: string;
  /** Artifact type */
  type: 'code' | 'document' | 'html' | 'react' | 'svg' | 'mermaid' | 'chart' | 'math' | 'jupyter';
  /** Artifact title */
  title: string;
  /** Preview content (truncated) */
  previewContent?: string;
  /** Language for code artifacts */
  language?: string;
}

/**
 * Data stored in each flow chat node
 */
export interface FlowChatNodeData {
  /** Index signature for ReactFlow compatibility */
  [key: string]: unknown;
  /** The underlying message */
  message: UIMessage;
  /** Message role for styling */
  role: MessageRole;
  /** Branch this node belongs to */
  branchId?: string;
  /** Whether this is a branch point */
  isBranchPoint: boolean;
  /** Child branch IDs if this is a branch point */
  childBranchIds?: string[];
  /** Collapse state */
  collapseState: NodeCollapseState;
  /** Referenced node IDs (for @ref feature) */
  referencedNodeIds?: string[];
  /** Parallel node IDs (same prompt, different models) */
  parallelGroupId?: string;
  /** Model used for this response */
  model?: string;
  /** Provider used for this response */
  provider?: string;
  /** Whether this node is currently selected */
  isSelected?: boolean;
  /** Whether this node is being hovered */
  isHovered?: boolean;
  /** Whether content is being streamed */
  isStreaming?: boolean;
  /** Token count for this message */
  tokenCount?: number;
  /** Generation timestamp */
  generatedAt?: Date;
  /** Regeneration count */
  regenerateCount?: number;
  /** Media attachments (images, videos, files) */
  attachments?: FlowNodeAttachment[];
  /** Whether the node has media content */
  hasMedia?: boolean;
  /** Node tags for categorization */
  tags?: FlowNodeTag[];
  /** Linked artifacts */
  linkedArtifacts?: FlowNodeArtifact[];
  /** Whether this node is bookmarked */
  isBookmarked?: boolean;
  /** Node group ID if part of a group */
  groupId?: string;
  /** Quality rating (1-5) */
  rating?: number;
  /** User notes/annotations */
  notes?: string;
}

/**
 * Flow chat node type for ReactFlow
 * Using intersection with index signature for ReactFlow compatibility
 */
export type FlowChatNode = Node<FlowChatNodeData & Record<string, unknown>, FlowChatNodeType>;

/**
 * Data stored in each flow chat edge
 */
export interface FlowChatEdgeData {
  /** Edge type for styling */
  edgeType: FlowChatEdgeType;
  /** Branch ID if this is a branch edge */
  branchId?: string;
  /** Whether this edge is animated */
  animated?: boolean;
  /** Label to show on the edge */
  label?: string;
  /** Index signature for ReactFlow compatibility */
  [key: string]: unknown;
}

/**
 * Flow chat edge type for ReactFlow
 */
export type FlowChatEdge = Edge<FlowChatEdgeData>;

/**
 * Layout direction for auto-layout
 */
export type FlowLayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * Layout algorithm type
 */
export type FlowLayoutAlgorithm = 'dagre' | 'tree' | 'force' | 'manual';

/**
 * Node position stored for persistence
 */
export interface NodePosition {
  messageId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Node group for organizing related nodes
 */
export interface FlowNodeGroup {
  /** Unique group ID */
  id: string;
  /** Group name */
  name: string;
  /** Node IDs in this group */
  nodeIds: string[];
  /** Group color */
  color?: string;
  /** Whether the group is collapsed */
  isCollapsed?: boolean;
  /** Group description */
  description?: string;
}

/**
 * Search/filter state for the canvas
 */
export interface FlowCanvasSearchState {
  /** Search query */
  query: string;
  /** Filter by role */
  roleFilter?: MessageRole[];
  /** Filter by tags */
  tagFilter?: string[];
  /** Filter by date range */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Only show bookmarked nodes */
  bookmarkedOnly?: boolean;
  /** Only show nodes with attachments */
  hasMediaOnly?: boolean;
  /** Highlighted node IDs (from search results) */
  highlightedNodeIds: string[];
}

/**
 * Canvas state for persistence
 */
export interface FlowChatCanvasState {
  /** Current view mode */
  viewMode: ChatViewMode;
  /** Stored node positions (for manual layout) */
  nodePositions: Record<string, NodePosition>;
  /** Viewport state */
  viewport: Viewport;
  /** Selected node IDs */
  selectedNodeIds: string[];
  /** Collapsed node IDs */
  collapsedNodeIds: string[];
  /** Layout direction */
  layoutDirection: FlowLayoutDirection;
  /** Layout algorithm */
  layoutAlgorithm: FlowLayoutAlgorithm;
  /** Show minimap */
  showMinimap: boolean;
  /** Show grid */
  showGrid: boolean;
  /** Snap to grid */
  snapToGrid: boolean;
  /** Grid size */
  gridSize: number;
  /** Node groups */
  nodeGroups: FlowNodeGroup[];
  /** Bookmarked node IDs */
  bookmarkedNodeIds: string[];
  /** Node tags (global tag definitions) */
  tagDefinitions: FlowNodeTag[];
  /** Node-specific tags mapping */
  nodeTags: Record<string, string[]>;
  /** Search/filter state */
  searchState?: FlowCanvasSearchState;
  /** Nodes in comparison mode */
  comparisonNodeIds: string[];
  /** Show thumbnail strip in nodes */
  showThumbnails: boolean;
  /** Show node statistics */
  showNodeStats: boolean;
}

/**
 * Default canvas state
 */
export const DEFAULT_FLOW_CANVAS_STATE: FlowChatCanvasState = {
  viewMode: 'list',
  nodePositions: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  collapsedNodeIds: [],
  layoutDirection: 'TB',
  layoutAlgorithm: 'dagre',
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  nodeGroups: [],
  bookmarkedNodeIds: [],
  tagDefinitions: [],
  nodeTags: {},
  comparisonNodeIds: [],
  showThumbnails: true,
  showNodeStats: true,
};

/**
 * Node action types
 */
export type NodeAction = 
  | 'follow-up'      // Continue conversation from this node
  | 'regenerate'     // Regenerate AI response
  | 'branch'         // Create a new branch from this node
  | 'copy'           // Copy node content
  | 'delete'         // Delete node and subsequent
  | 'reference'      // Reference this node in input
  | 'parallel'       // Generate parallel responses with different models
  | 'collapse'       // Collapse/expand node
  | 'edit'           // Edit message content
  | 'bookmark'       // Bookmark the message
  | 'add-tag'        // Add tag to node
  | 'remove-tag'     // Remove tag from node
  | 'add-to-group'   // Add node to a group
  | 'remove-from-group' // Remove node from group
  | 'add-to-compare' // Add node to comparison view
  | 'rate'           // Rate the response quality
  | 'add-note'       // Add annotation/note
  | 'view-media'     // View media in lightbox
  | 'download-media';// Download media attachment

/**
 * Node action handler parameters
 */
export interface NodeActionParams {
  action: NodeAction;
  nodeId: string;
  messageId: string;
  /** Additional data for specific actions */
  data?: {
    /** Models for parallel generation */
    models?: string[];
    /** New content for edit action */
    content?: string;
    /** Branch name */
    branchName?: string;
  };
}

/**
 * Parallel generation request
 */
export interface ParallelGenerationRequest {
  /** Source message ID to generate from */
  sourceMessageId: string;
  /** Models to use for parallel generation */
  models: Array<{
    provider: string;
    model: string;
  }>;
  /** Optional custom prompts per model */
  customPrompts?: Record<string, string>;
}

/**
 * Parallel generation result
 */
export interface ParallelGenerationResult {
  /** Group ID for this parallel set */
  groupId: string;
  /** Results per model */
  results: Array<{
    provider: string;
    model: string;
    messageId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Node reference for @ref feature
 */
export interface NodeReference {
  /** ID of the referenced node */
  nodeId: string;
  /** ID of the referenced message */
  messageId: string;
  /** Preview text of the referenced content */
  previewText: string;
  /** Start position in input */
  startIndex: number;
  /** End position in input */
  endIndex: number;
}

/**
 * Flow chat canvas props
 */
export interface FlowChatCanvasProps {
  /** Session ID */
  sessionId: string;
  /** Messages to display */
  messages: UIMessage[];
  /** Branches in the conversation */
  branches: ConversationBranch[];
  /** Active branch ID */
  activeBranchId?: string;
  /** Canvas state */
  canvasState: FlowChatCanvasState;
  /** Whether currently loading */
  isLoading?: boolean;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Streaming message ID */
  streamingMessageId?: string;
  /** Callback when node action is triggered */
  onNodeAction?: (params: NodeActionParams) => void;
  /** Callback when canvas state changes */
  onCanvasStateChange?: (state: Partial<FlowChatCanvasState>) => void;
  /** Callback when node is selected */
  onNodeSelect?: (nodeIds: string[]) => void;
  /** Callback when follow-up is requested */
  onFollowUp?: (messageId: string, content: string) => void;
  /** Callback when regenerate is requested */
  onRegenerate?: (messageId: string) => void;
  /** Callback when branch is created */
  onCreateBranch?: (messageId: string, name?: string) => void;
  /** Callback when parallel generation is requested */
  onParallelGenerate?: (request: ParallelGenerationRequest) => void;
  /** Callback when node is deleted */
  onDeleteNode?: (messageId: string, deleteSubsequent?: boolean) => void;
  /** Callback when input reference is added */
  onAddReference?: (reference: NodeReference) => void;
  /** Class name for styling */
  className?: string;
}

/**
 * Flow chat node props
 */
export interface FlowChatNodeProps {
  /** Node data */
  data: FlowChatNodeData;
  /** Node ID */
  id: string;
  /** Whether node is selected */
  selected?: boolean;
  /** Callback for node actions */
  onAction?: (action: NodeAction, data?: Record<string, unknown>) => void;
}

/**
 * Convert messages to flow nodes
 */
export interface MessagesToNodesOptions {
  messages: UIMessage[];
  branches: ConversationBranch[];
  activeBranchId?: string;
  canvasState: FlowChatCanvasState;
  streamingMessageId?: string;
}

/**
 * Flow layout options
 */
export interface FlowLayoutOptions {
  direction: FlowLayoutDirection;
  algorithm: FlowLayoutAlgorithm;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  branchSpacing: number;
}

/**
 * Default layout options
 */
export const DEFAULT_LAYOUT_OPTIONS: FlowLayoutOptions = {
  direction: 'TB',
  algorithm: 'dagre',
  nodeWidth: 400,
  nodeHeight: 150,
  horizontalSpacing: 100,
  verticalSpacing: 80,
  branchSpacing: 150,
};

/**
 * Export types for canvas state management
 */
export interface FlowChatExportOptions {
  /** Export format */
  format: 'png' | 'svg' | 'json';
  /** Include node content */
  includeContent?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Scale factor for image export */
  scale?: number;
}
