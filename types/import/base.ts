/**
 * Base Chat Import Types
 * Unified interface for multi-platform chat import
 */

import type { Session, UIMessage } from '@/types/core';

/**
 * Supported import formats
 */
export type ChatImportFormat = 'cognia' | 'chatgpt' | 'claude' | 'gemini' | 'unknown';

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
    [key: string]: unknown;
  };
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
    }>;
    totalMessages: number;
    errors: ChatImportError[];
  }>;
}
