/**
 * Summary and Diagram Generation Type Definitions
 * 
 * Types for summarizing chat conversations and agent executions,
 * and generating Mermaid diagrams for visualization.
 */

import type { UIMessage } from './message';
import type { BackgroundAgent, BackgroundAgentStep } from './background-agent';
import type { SubAgent } from './sub-agent';

/**
 * Summary scope - what to summarize
 */
export type SummaryScope = 'all' | 'selected' | 'range';

/**
 * Diagram type for visualization
 */
export type DiagramType = 
  | 'flowchart'      // General flow diagram
  | 'sequence'       // Sequence diagram for conversations
  | 'timeline'       // Gantt-style timeline
  | 'mindmap'        // Mind map of topics
  | 'stateDiagram';  // State transitions

/**
 * Summary format options
 */
export type SummaryFormat = 
  | 'brief'          // Short summary (1-2 paragraphs)
  | 'detailed'       // Detailed summary with sections
  | 'bullets'        // Bullet point list
  | 'structured';    // Structured with key topics

/**
 * Message range for selective summarization
 */
export interface MessageRange {
  startMessageId?: string;
  endMessageId?: string;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Chat summary options
 */
export interface ChatSummaryOptions {
  /** Scope of messages to summarize */
  scope: SummaryScope;
  /** Message range (for 'range' scope) */
  range?: MessageRange;
  /** Selected message IDs (for 'selected' scope) */
  selectedIds?: string[];
  /** Summary format */
  format: SummaryFormat;
  /** Include code snippets in summary */
  includeCode?: boolean;
  /** Include tool calls in summary */
  includeToolCalls?: boolean;
  /** Maximum summary length (characters) */
  maxLength?: number;
  /** Language for summary */
  language?: string;
}

/**
 * Agent summary options
 */
export interface AgentSummaryOptions {
  /** Include sub-agent details */
  includeSubAgents?: boolean;
  /** Include tool call details */
  includeToolCalls?: boolean;
  /** Include execution logs */
  includeLogs?: boolean;
  /** Include timing information */
  includeTiming?: boolean;
  /** Summary format */
  format: SummaryFormat;
  /** Maximum summary length (characters) */
  maxLength?: number;
  /** Language for summary */
  language?: string;
}

/**
 * Diagram generation options
 */
export interface DiagramOptions {
  /** Type of diagram to generate */
  type: DiagramType;
  /** Diagram direction (for flowchart) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Include timestamps */
  showTimestamps?: boolean;
  /** Include token counts */
  showTokens?: boolean;
  /** Collapse long content */
  collapseContent?: boolean;
  /** Maximum node label length */
  maxLabelLength?: number;
  /** Theme for the diagram */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** Show tool calls as separate nodes */
  expandToolCalls?: boolean;
  /** Group messages by topic */
  groupByTopic?: boolean;
}

/**
 * Key point extracted from conversation
 */
export interface KeyPoint {
  /** Unique identifier */
  id: string;
  /** The key point content */
  content: string;
  /** Source message ID */
  sourceMessageId: string;
  /** Category/topic */
  category?: string;
  /** Importance score (0-1) */
  importance?: number;
}

/**
 * Topic identified in conversation
 */
export interface ConversationTopic {
  /** Topic name */
  name: string;
  /** Message IDs related to this topic */
  messageIds: string[];
  /** Brief description */
  description?: string;
  /** Keywords associated */
  keywords?: string[];
}

/**
 * Chat summary result
 */
export interface ChatSummaryResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated summary text */
  summary: string;
  /** Key points extracted */
  keyPoints: KeyPoint[];
  /** Topics identified */
  topics: ConversationTopic[];
  /** Number of messages summarized */
  messageCount: number;
  /** Total tokens in source messages */
  sourceTokens: number;
  /** Tokens in summary */
  summaryTokens: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Generation timestamp */
  generatedAt: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Agent step summary
 */
export interface AgentStepSummary {
  /** Step number */
  stepNumber: number;
  /** Step type */
  type: BackgroundAgentStep['type'];
  /** Brief description */
  description: string;
  /** Duration in ms */
  duration?: number;
  /** Status */
  status: BackgroundAgentStep['status'];
  /** Tool names used */
  toolsUsed?: string[];
  /** Sub-agent names */
  subAgentNames?: string[];
}

/**
 * Agent summary result
 */
export interface AgentSummaryResult {
  /** Whether generation was successful */
  success: boolean;
  /** Agent name */
  agentName: string;
  /** Task description */
  task: string;
  /** Overall summary */
  summary: string;
  /** Final outcome/result */
  outcome: string;
  /** Step summaries */
  steps: AgentStepSummary[];
  /** Sub-agent summaries */
  subAgentSummaries?: Array<{
    name: string;
    task: string;
    status: SubAgent['status'];
    result?: string;
  }>;
  /** Total duration */
  totalDuration: number;
  /** Total steps executed */
  totalSteps: number;
  /** Success rate of sub-agents */
  subAgentSuccessRate?: number;
  /** Tools used */
  toolsUsed: string[];
  /** Generation timestamp */
  generatedAt: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Diagram node for visualization
 */
export interface DiagramNode {
  /** Unique node ID */
  id: string;
  /** Node label */
  label: string;
  /** Node type */
  type: 'user' | 'assistant' | 'system' | 'tool' | 'agent' | 'subagent' | 'start' | 'end';
  /** Additional data */
  data?: Record<string, unknown>;
  /** Node style */
  style?: 'default' | 'rounded' | 'stadium' | 'subroutine' | 'cylinder' | 'circle' | 'diamond';
}

/**
 * Diagram edge/connection
 */
export interface DiagramEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Edge label */
  label?: string;
  /** Edge style */
  style?: 'solid' | 'dotted' | 'thick';
  /** Arrow style */
  arrow?: 'normal' | 'none' | 'circle' | 'cross';
}

/**
 * Diagram generation result
 */
export interface DiagramResult {
  /** Whether generation was successful */
  success: boolean;
  /** Mermaid diagram code */
  mermaidCode: string;
  /** Diagram type */
  type: DiagramType;
  /** Nodes in the diagram */
  nodes: DiagramNode[];
  /** Edges in the diagram */
  edges: DiagramEdge[];
  /** Generation timestamp */
  generatedAt: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Combined summary with diagram
 */
export interface SummaryWithDiagram {
  /** Text summary */
  summary: ChatSummaryResult | AgentSummaryResult;
  /** Generated diagram */
  diagram: DiagramResult;
}

/**
 * Summary generation progress
 */
export interface SummaryProgress {
  /** Current stage */
  stage: 'analyzing' | 'extracting' | 'summarizing' | 'generating-diagram' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current status message */
  message: string;
}

/**
 * Summary export options
 */
export interface SummaryExportOptions {
  /** Export format */
  format: 'markdown' | 'html' | 'json' | 'pdf';
  /** Include diagram in export */
  includeDiagram: boolean;
  /** Diagram format if included */
  diagramFormat?: 'svg' | 'png';
  /** File name (without extension) */
  filename?: string;
}

/**
 * Input for generating chat summary
 */
export interface GenerateChatSummaryInput {
  /** Messages to summarize */
  messages: UIMessage[];
  /** Session title for context */
  sessionTitle?: string;
  /** Summary options */
  options: ChatSummaryOptions;
  /** Progress callback */
  onProgress?: (progress: SummaryProgress) => void;
}

/**
 * Input for generating agent summary
 */
export interface GenerateAgentSummaryInput {
  /** Agent to summarize */
  agent: BackgroundAgent;
  /** Summary options */
  options: AgentSummaryOptions;
  /** Progress callback */
  onProgress?: (progress: SummaryProgress) => void;
}

/**
 * Input for generating diagram
 */
export interface GenerateDiagramInput {
  /** Messages for chat diagram */
  messages?: UIMessage[];
  /** Agent for agent diagram */
  agent?: BackgroundAgent;
  /** Diagram options */
  options: DiagramOptions;
}

/**
 * Default summary options
 */
export const DEFAULT_CHAT_SUMMARY_OPTIONS: ChatSummaryOptions = {
  scope: 'all',
  format: 'detailed',
  includeCode: true,
  includeToolCalls: true,
  maxLength: 2000,
};

export const DEFAULT_AGENT_SUMMARY_OPTIONS: AgentSummaryOptions = {
  includeSubAgents: true,
  includeToolCalls: true,
  includeLogs: false,
  includeTiming: true,
  format: 'detailed',
  maxLength: 2000,
};

export const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
  type: 'flowchart',
  direction: 'TB',
  showTimestamps: false,
  showTokens: false,
  collapseContent: true,
  maxLabelLength: 50,
  theme: 'default',
  expandToolCalls: true,
  groupByTopic: false,
};
