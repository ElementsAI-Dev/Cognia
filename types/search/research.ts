/**
 * Deep Research type definitions
 */

export type SearchSource = 'google' | 'bing' | 'brave' | 'serper' | 'tavily';

export interface DocumentReference {
  id: string;
  name: string;
  type: 'pdf' | 'markdown' | 'text' | 'html' | 'docx';
  content?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// SearchResult is defined in search.ts - use a different name here
export interface ResearchSearchResult {
  source: SearchSource;
  title: string;
  url: string;
  snippet: string;
  timestamp?: Date;
}

export interface RAGResult {
  documentId: string;
  documentName: string;
  chunk: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface ResearchIteration {
  number: number;
  refinedQuery: string;
  searchResults: ResearchSearchResult[];
  ragResults: RAGResult[];
  findings: string;
  gaps: string[];
}

export interface ResearchQuery {
  query: string;
  sources: SearchSource[];
  documents: DocumentReference[];
  maxIterations: number;
}

export interface ResearchResult {
  id: string;
  query: string;
  iterations: ResearchIteration[];
  finalReport: string;
  sources: ResearchSearchResult[];
  createdAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export interface ResearchProgress {
  currentIteration: number;
  totalIterations: number;
  currentPhase: 'searching' | 'retrieving' | 'analyzing' | 'synthesizing';
  message: string;
}
