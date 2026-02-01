/**
 * Claude (Anthropic) Export Format Types
 * Based on Claude's data export functionality
 */

/**
 * Root structure of Claude export
 */
export interface ClaudeExport {
  meta: ClaudeMeta;
  chats: ClaudeChat[];
}

/**
 * Export metadata
 */
export interface ClaudeMeta {
  exported_at: string;
  title: string;
  conversation_id?: string;
  account_id?: string;
}

/**
 * Single chat turn (prompt or response)
 */
export interface ClaudeChat {
  index: number;
  type: 'prompt' | 'response';
  message: ClaudeMessagePart[];
  timestamp?: string;
}

/**
 * Content part within a message
 */
export interface ClaudeMessagePart {
  type: ClaudeContentType;
  data: string;
  language?: string;
  items?: string[];
  rows?: string[][];
}

/**
 * Supported content types in Claude export
 */
export type ClaudeContentType =
  | 'p'           // Paragraph
  | 'pre'         // Preformatted/code block
  | 'code'        // Inline code
  | 'list'        // Generic list
  | 'ul'          // Unordered list
  | 'ol'          // Ordered list
  | 'table'       // Table
  | 'blockquote'  // Quote
  | 'heading'     // Heading
  | 'hr'          // Horizontal rule
  | 'image'       // Image reference
  | 'artifact';   // Claude artifact reference

/**
 * Alternative Claude export format (from browser extensions)
 * Some extensions export in a simpler format
 */
export interface ClaudeSimpleExport {
  title?: string;
  url?: string;
  timestamp?: string;
  messages: ClaudeSimpleMessage[];
}

export interface ClaudeSimpleMessage {
  role: 'human' | 'assistant';
  content: string;
  timestamp?: string;
}

/**
 * Claude artifact (code, documents, etc.)
 */
export interface ClaudeArtifact {
  id: string;
  type: 'code' | 'document' | 'react' | 'html' | 'svg' | 'mermaid';
  title: string;
  content: string;
  language?: string;
}
