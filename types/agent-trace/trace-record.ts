import type { Contributor } from './contributor';

export interface AgentTraceVcsInfo {
  type: 'git' | 'jj' | 'hg' | 'svn';
  revision: string;
}

export interface AgentTraceToolInfo {
  name: string;
  version?: string;
}

export interface RelatedResource {
  type: string;
  url: string;
}

export interface TraceRange {
  start_line: number;
  end_line: number;
  content_hash?: string;
  contributor?: Contributor;
}

export interface TraceConversation {
  url?: string;
  contributor?: Contributor;
  ranges: TraceRange[];
  related?: RelatedResource[];
}

export interface TraceFile {
  path: string;
  conversations: TraceConversation[];
}

export type AgentTraceEventType =
  | 'tool_call_request'
  | 'tool_call_result'
  | 'step_start'
  | 'step_finish'
  | 'planning'
  | 'response';

export interface AgentTraceRecord {
  version: string;
  id: string;
  timestamp: string;
  vcs?: AgentTraceVcsInfo;
  tool?: AgentTraceToolInfo;
  files: TraceFile[];
  /** Optional event classification for non-file trace records */
  eventType?: AgentTraceEventType;
  /** OpenTelemetry trace correlation */
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  /** Logical turn/step identifiers for agent execution */
  turnId?: string;
  stepId?: string;
  metadata?: Record<string, unknown>;
}
