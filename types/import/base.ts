/**
 * Base Chat Import Types
 * Unified interface for multi-platform chat import
 */

import type { Session, UIMessage } from '@/types/core';

/**
 * Supported import formats
 */
export type ChatImportFormat =
  | 'cognia'
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'portable'
  | 'markdown-transcript'
  | 'csv-transcript'
  | 'json-transcript'
  | 'unknown';

export type ChatImportSourceType = 'official' | 'generic' | 'portable' | 'backup' | 'unsupported';

export type ChatImportCompatibility = 'official' | 'adapted' | 'partial' | 'unsupported';

export type ChatImportWarningCode =
  | 'non_text_downgraded'
  | 'attachment_summary_only'
  | 'citation_summary_only'
  | 'metadata_skipped'
  | 'partial_import'
  | 'unsupported_input'
  | 'ambiguous_transcript'
  | 'legacy_variant';

/**
 * Import options shared across all formats
 */
export interface ChatImportOptions {
  mergeStrategy: 'replace' | 'merge' | 'skip';
  generateNewIds: boolean;
  preserveTimestamps: boolean;
  defaultProvider?: string;
  defaultModel?: string;
  defaultMode?: 'chat' | 'agent' | 'research' | 'learning';
}

/**
 * Import error details
 */
export interface ChatImportError {
  conversationId?: string;
  conversationTitle?: string;
  message: string;
}

export interface ChatImportWarning {
  code: ChatImportWarningCode;
  message: string;
  severity: 'info' | 'warning';
  conversationId?: string;
  conversationTitle?: string;
  field?: string;
}

export interface ChatImportDetection {
  format: ChatImportFormat;
  sourceType: ChatImportSourceType;
  compatibility: ChatImportCompatibility;
  provider?: string;
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Import result summary
 */
export interface ChatImportResult {
  success: boolean;
  imported: {
    sessions: number;
    messages: number;
  };
  errors: ChatImportError[];
  warnings: string[];
  warningDetails?: ChatImportWarning[];
  detection?: ChatImportDetection;
}

/**
 * Parsed conversation ready for import
 */
export interface ParsedConversation {
  session: Session;
  messages: UIMessage[];
  metadata?: {
    originalId?: string;
    sourceFormat?: ChatImportFormat;
    modelInfo?: string;
    sourceType?: ChatImportSourceType;
    compatibility?: ChatImportCompatibility;
    warnings?: ChatImportWarning[];
    portableConversation?: PortableConversation;
    [key: string]: unknown;
  };
}

export interface ChatImportPreviewConversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  preview: string;
  compatibility?: ChatImportCompatibility;
  warnings?: ChatImportWarning[];
}

export interface ChatImportParseResult {
  format: ChatImportFormat;
  detection: ChatImportDetection;
  conversations: Array<{ session: Session; messages: UIMessage[] }>;
  errors: ChatImportError[];
  warningDetails: ChatImportWarning[];
}

export interface ChatImportPreviewResult {
  format: ChatImportFormat;
  detection: ChatImportDetection;
  conversations: ChatImportPreviewConversation[];
  totalMessages: number;
  errors: ChatImportError[];
  warningDetails: ChatImportWarning[];
}

/**
 * Provider information for imported conversations
 */
export interface ProviderInfo {
  name: string;
  defaultModel: string;
  icon?: string;
}

/**
 * Base interface for all chat importers
 */
export interface ChatImporter<T = unknown> {
  /**
   * Get the format this importer handles
   */
  getFormat(): ChatImportFormat;

  /**
   * Get provider information for this format
   */
  getProviderInfo(): ProviderInfo;

  /**
   * Detect if data matches this importer's format
   */
  detect(data: unknown): data is T;

  /**
   * Parse and convert data to Cognia format
   */
  parse(
    data: T,
    options: ChatImportOptions
  ): Promise<{
    conversations: ParsedConversation[];
    errors: ChatImportError[];
  }>;

  /**
   * Generate a preview without persisting
   */
  preview(
    data: T,
    options: ChatImportOptions
  ): Promise<{
    conversations: Array<{
      id: string;
      title: string;
      messageCount: number;
      createdAt: Date;
      preview: string;
      compatibility?: ChatImportCompatibility;
      warnings?: ChatImportWarning[];
    }>;
    totalMessages: number;
    errors: ChatImportError[];
  }>;
}

export interface PortableAttachmentSummary {
  id?: string;
  name: string;
  kind: 'image' | 'file' | 'audio' | 'video' | 'artifact' | 'citation' | 'unknown';
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  summary?: string;
}

export interface PortableCitationSummary {
  title: string;
  url?: string;
  snippet?: string;
}

export interface PortableMessagePartSummary {
  kind: 'text' | 'image' | 'file' | 'citation' | 'tool' | 'reasoning' | 'unknown';
  text?: string;
  summary?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface PortableMessage {
  id: string;
  role: UIMessage['role'];
  content: string;
  createdAt: string;
  provider?: string;
  model?: string;
  parts?: PortableMessagePartSummary[];
  attachments?: PortableAttachmentSummary[];
  citations?: PortableCitationSummary[];
  warnings?: ChatImportWarning[];
  metadata?: Record<string, unknown>;
}

export interface PortableConversation {
  id: string;
  title: string;
  sourceFormat: ChatImportFormat;
  sourceType: ChatImportSourceType;
  compatibility: ChatImportCompatibility;
  createdAt: string;
  updatedAt: string;
  messages: PortableMessage[];
  warnings?: ChatImportWarning[];
  metadata?: Record<string, unknown>;
}

export interface PortableConversationSessionSnapshot {
  provider?: Session['provider'];
  model?: string;
  mode?: Session['mode'];
  systemPrompt?: Session['systemPrompt'];
  temperature?: Session['temperature'];
  maxTokens?: Session['maxTokens'];
  topP?: Session['topP'];
  frequencyPenalty?: Session['frequencyPenalty'];
  presencePenalty?: Session['presencePenalty'];
}

export interface PortableChatArchive {
  version: '1.0';
  exportedAt: string;
  source: {
    app: 'cognia';
    format: 'portable';
  };
  conversations: PortableConversation[];
}
