/**
 * Summary and Diagram Generation Type Definitions
 *
 * Types for summarizing chat conversations and agent executions,
 * and generating Mermaid diagrams for visualization.
 */

import type { UIMessage } from '../core/message';
import type { BackgroundAgent, BackgroundAgentStep } from '../agent/background-agent';
import type { SubAgent } from '../agent/sub-agent';

/**
 * Summary scope - what to summarize
 */
export type SummaryScope = 'all' | 'selected' | 'range';

/**
 * Summary style - tone and approach
 */
export type SummaryStyle =
  | 'professional' // Formal, business-appropriate
  | 'concise' // Brief, to-the-point
  | 'detailed' // Comprehensive with context
  | 'academic' // Scholarly, analytical
  | 'casual'; // Informal, conversational

/**
 * Key point category for classification
 */
export type KeyPointCategory =
  | 'question' // User questions
  | 'answer' // Assistant answers
  | 'decision' // Decisions made
  | 'action' // Action items
  | 'insight' // Key insights
  | 'code' // Code-related points
  | 'tool' // Tool usage
  | 'summary' // General summary point
  | 'issue' // Problems or issues
  | 'solution'; // Solutions provided

/**
 * Summary template type
 */
export type SummaryTemplate =
  | 'default'
  | 'meeting' // Meeting notes style
  | 'technical' // Technical discussion
  | 'learning' // Learning session
  | 'debugging'; // Debug session

/**
 * Diagram type for visualization
 */
export type DiagramType =
  | 'flowchart' // General flow diagram
  | 'sequence' // Sequence diagram for conversations
  | 'timeline' // Gantt-style timeline
  | 'mindmap' // Mind map of topics
  | 'stateDiagram'; // State transitions

/**
 * Summary format options
 */
export type SummaryFormat =
  | 'brief' // Short summary (1-2 paragraphs)
  | 'detailed' // Detailed summary with sections
  | 'bullets' // Bullet point list
  | 'structured'; // Structured with key topics

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
  /** Summary style/tone */
  style?: SummaryStyle;
  /** Summary template preset */
  template?: SummaryTemplate;
  /** Include code snippets in summary */
  includeCode?: boolean;
  /** Include tool calls in summary */
  includeToolCalls?: boolean;
  /** Maximum summary length (characters) */
  maxLength?: number;
  /** Language for summary (auto-detect if not specified) */
  language?: string;
  /** Auto-detect language from conversation */
  autoDetectLanguage?: boolean;
  /** Custom instructions for summarization */
  customInstructions?: string;
  /** Use AI for key point extraction */
  aiKeyPoints?: boolean;
  /** Use AI for topic identification */
  aiTopics?: boolean;
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
  category?: KeyPointCategory;
  /** Importance score (0-1) */
  importance?: number;
  /** Source role (user/assistant) */
  sourceRole?: 'user' | 'assistant' | 'system';
  /** Timestamp of the source message */
  timestamp?: Date;
}

/**
 * Topic identified in conversation
 */
export interface ConversationTopic {
  /** Topic name */
  name: string;
  /** Message IDs related to this topic */
  messageIds: string[];
  /** Coverage percentage (0-1) */
  coverage?: number;
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
  style: 'professional',
  includeCode: true,
  includeToolCalls: true,
  maxLength: 2000,
  autoDetectLanguage: true,
  aiKeyPoints: false,
  aiTopics: false,
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

/**
 * Stored summary - for persistence
 */
export interface StoredSummary {
  /** Unique identifier */
  id: string;
  /** Session ID this summary belongs to */
  sessionId: string;
  /** Summary type */
  type: 'chat' | 'agent' | 'incremental';
  /** Summary text */
  summary: string;
  /** Extracted key points */
  keyPoints: KeyPoint[];
  /** Identified topics */
  topics: ConversationTopic[];
  /** Mermaid diagram code */
  diagram?: string;
  /** Diagram type if present */
  diagramType?: DiagramType;
  /** Message range summarized */
  messageRange: {
    startMessageId?: string;
    endMessageId?: string;
    startIndex: number;
    endIndex: number;
  };
  /** Number of messages summarized */
  messageCount: number;
  /** Source tokens */
  sourceTokens: number;
  /** Summary tokens */
  summaryTokens: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Language of the summary */
  language?: string;
  /** Format used */
  format: SummaryFormat;
  /** Style used */
  style?: SummaryStyle;
  /** Template used */
  template?: SummaryTemplate;
  /** Whether AI was used */
  usedAI: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Conversation analysis result
 */
export interface ConversationAnalysis {
  /** Sentiment analysis */
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    userSentiment: 'positive' | 'neutral' | 'negative';
    assistantTone: 'helpful' | 'formal' | 'casual' | 'technical';
  };
  /** Quality metrics */
  quality: {
    clarity: number;
    completeness: number;
    helpfulness: number;
  };
  /** Conversation characteristics */
  characteristics: {
    isQA: boolean;
    isTechnical: boolean;
    isCreative: boolean;
    isDebugSession: boolean;
    hasCodingContent: boolean;
  };
  /** Improvement suggestions */
  suggestions: string[];
}

/**
 * Auto-summary suggestion config
 */
export interface AutoSummaryConfig {
  /** Enable auto-summary suggestions */
  enabled: boolean;
  /** Minimum messages before suggesting */
  minMessages: number;
  /** Minimum tokens before suggesting */
  minTokens: number;
  /** Auto-summarize on session end */
  autoOnSessionEnd: boolean;
  /** Default format for auto summaries */
  defaultFormat: SummaryFormat;
  /** Default style for auto summaries */
  defaultStyle: SummaryStyle;
}

/**
 * Default auto-summary config
 */
export const DEFAULT_AUTO_SUMMARY_CONFIG: AutoSummaryConfig = {
  enabled: true,
  minMessages: 20,
  minTokens: 5000,
  autoOnSessionEnd: false,
  defaultFormat: 'bullets',
  defaultStyle: 'concise',
};

/**
 * Summary statistics for a session
 */
export interface SummaryStats {
  /** Total summaries generated */
  totalSummaries: number;
  /** Last summary date */
  lastSummaryAt?: Date;
  /** Total messages summarized */
  totalMessagesSummarized: number;
  /** Average compression ratio */
  avgCompressionRatio: number;
}

/**
 * Input for incremental summary
 */
export interface IncrementalSummaryInput {
  /** Previous summary to build upon */
  previousSummary: StoredSummary;
  /** New messages since last summary */
  newMessages: UIMessage[];
  /** Summary options */
  options: ChatSummaryOptions;
  /** Progress callback */
  onProgress?: (progress: SummaryProgress) => void;
}
