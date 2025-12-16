/**
 * Artifact type definitions
 * Similar to Claude Artifacts - supports code, documents, and interactive content
 */

export type ArtifactType =
  | 'code'           // Code snippets (React, HTML, CSS, JS, Python, etc.)
  | 'document'       // Markdown documents
  | 'svg'            // SVG graphics
  | 'html'           // Full HTML pages
  | 'react'          // React components (for live preview)
  | 'mermaid'        // Mermaid diagrams
  | 'chart'          // Data visualizations
  | 'math';          // LaTeX math expressions

export type ArtifactLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'jsx'
  | 'tsx'
  | 'sql'
  | 'bash'
  | 'yaml'
  | 'xml'
  | 'svg'
  | 'mermaid'
  | 'latex';

export interface Artifact {
  id: string;
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: ArtifactLanguage;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ArtifactMetadata;
}

export interface ArtifactMetadata {
  // For code artifacts
  runnable?: boolean;
  dependencies?: string[];

  // For documents
  wordCount?: number;

  // For charts
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  dataSource?: string;

  // For HTML/React previews
  previewable?: boolean;
  sandboxed?: boolean;
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  content: string;
  version: number;
  createdAt: Date;
  changeDescription?: string;
}

// Canvas-specific types (OpenAI-style editing)
export interface CanvasDocument {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  language: ArtifactLanguage;
  type: 'code' | 'text';
  createdAt: Date;
  updatedAt: Date;
  aiSuggestions?: CanvasSuggestion[];
  versions?: CanvasDocumentVersion[];
  currentVersionId?: string;
}

export interface CanvasDocumentVersion {
  id: string;
  content: string;
  title: string;
  createdAt: Date;
  description?: string;
  isAutoSave?: boolean;
}

export interface CanvasSuggestion {
  id: string;
  type: 'edit' | 'comment' | 'fix' | 'improve';
  range: {
    startLine: number;
    endLine: number;
    startColumn?: number;
    endColumn?: number;
  };
  originalText: string;
  suggestedText: string;
  explanation: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface CanvasAction {
  type:
    | 'review'       // Review code/text
    | 'fix'          // Fix issues
    | 'explain'      // Explain selection
    | 'improve'      // Improve quality
    | 'translate'    // Translate to another language
    | 'simplify'     // Simplify content
    | 'expand'       // Expand/elaborate
    | 'format'       // Format/beautify
    | 'run';         // Execute code (Python)
  label: string;
  icon: string;
  shortcut?: string;
}

// Analysis tool types
export interface AnalysisResult {
  id: string;
  sessionId: string;
  messageId: string;
  type: 'math' | 'chart' | 'data';
  content: string;
  output?: AnalysisOutput;
  createdAt: Date;
}

export interface AnalysisOutput {
  // Math results
  latex?: string;
  result?: string | number;

  // Chart data
  chartConfig?: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar';
    data: ChartDataPoint[];
    options?: Record<string, unknown>;
  };

  // Data analysis
  summary?: string;
  statistics?: Record<string, number>;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}
