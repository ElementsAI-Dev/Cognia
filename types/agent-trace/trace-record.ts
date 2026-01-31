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

export interface AgentTraceRecord {
  version: string;
  id: string;
  timestamp: string;
  vcs?: AgentTraceVcsInfo;
  tool?: AgentTraceToolInfo;
  files: TraceFile[];
  metadata?: Record<string, unknown>;
}
