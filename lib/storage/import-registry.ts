/**
 * Unified Import Registry
 * Central registry for all chat import formats
 */

import type { Session, UIMessage } from '@/types/core';
import type {
  ChatImporter,
  ChatImportFormat,
  ChatImportOptions,
  ChatImportResult,
  ChatImportError,
  ProviderInfo,
} from '@/types/import/base';
import { ClaudeImporter, isClaudeFormat } from './claude-import';
import { GeminiImporter, isGeminiFormat } from './gemini-import';
import {
  isChatGPTFormat,
  parseChatGPTExport,
  previewChatGPTImport,
} from './chatgpt-import';

/**
 * ChatGPT Importer wrapper (maintains backward compatibility)
 */
class ChatGPTImporterWrapper implements ChatImporter<unknown> {
  getFormat(): ChatImportFormat {
    return 'chatgpt';
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'openai',
      defaultModel: 'gpt-4',
      icon: 'openai',
    };
  }

  detect(data: unknown): data is unknown {
    return isChatGPTFormat(data);
  }

  async parse(
    data: unknown,
    options: ChatImportOptions
  ): Promise<{
    conversations: Array<{ session: Session; messages: UIMessage[]; metadata?: Record<string, unknown> }>;
    errors: ChatImportError[];
  }> {
    const result = await parseChatGPTExport(JSON.stringify(data), options);
    return {
      conversations: result.conversations.map((c) => ({
        ...c,
        metadata: { sourceFormat: 'chatgpt' as const },
      })),
      errors: result.errors,
    };
  }

  async preview(
    data: unknown,
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
  }> {
    return previewChatGPTImport(JSON.stringify(data), options);
  }
}

/**
 * All registered importers
 */
const importers: ChatImporter<unknown>[] = [
  new ChatGPTImporterWrapper(),
  new ClaudeImporter(),
  new GeminiImporter(),
];

/**
 * Platform display information
 */
export const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  chatgpt: { name: 'ChatGPT', icon: 'openai', color: '#10a37f' },
  claude: { name: 'Claude', icon: 'anthropic', color: '#d4a574' },
  gemini: { name: 'Gemini', icon: 'google', color: '#4285f4' },
  cognia: { name: 'Cognia', icon: 'cognia', color: '#8b5cf6' },
};

/**
 * Detect import format from parsed JSON data
 */
export function detectImportFormat(data: unknown): ChatImportFormat {
  if (!data || typeof data !== 'object') return 'unknown';

  // Check for Cognia native format first
  if (
    'version' in (data as Record<string, unknown>) &&
    'exportedAt' in (data as Record<string, unknown>)
  ) {
    return 'cognia';
  }

  // Try each importer
  for (const importer of importers) {
    if (importer.detect(data)) {
      return importer.getFormat();
    }
  }

  return 'unknown';
}

/**
 * Get importer for a specific format
 */
export function getImporter(format: ChatImportFormat): ChatImporter<unknown> | null {
  return importers.find((i) => i.getFormat() === format) || null;
}

/**
 * Get provider info for a format
 */
export function getProviderInfo(format: ChatImportFormat): ProviderInfo | null {
  const importer = getImporter(format);
  return importer?.getProviderInfo() || null;
}

/**
 * Get all supported formats
 */
export function getSupportedFormats(): ChatImportFormat[] {
  return importers.map((i) => i.getFormat());
}

/**
 * Parse any supported format
 */
export async function parseImport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<{
  format: ChatImportFormat;
  conversations: Array<{ session: Session; messages: UIMessage[] }>;
  errors: ChatImportError[];
}> {
  let data: unknown;

  try {
    data = JSON.parse(fileContent);
  } catch {
    return {
      format: 'unknown',
      conversations: [],
      errors: [{ message: 'Invalid JSON format' }],
    };
  }

  const format = detectImportFormat(data);

  if (format === 'unknown') {
    return {
      format,
      conversations: [],
      errors: [{ message: 'Unsupported import format' }],
    };
  }

  if (format === 'cognia') {
    return {
      format,
      conversations: [],
      errors: [{ message: 'Use Cognia restore function for Cognia exports' }],
    };
  }

  const importer = getImporter(format);
  if (!importer) {
    return {
      format,
      conversations: [],
      errors: [{ message: `No importer available for format: ${format}` }],
    };
  }

  const defaultOptions: ChatImportOptions = {
    mergeStrategy: 'merge',
    generateNewIds: true,
    preserveTimestamps: true,
    defaultProvider: importer.getProviderInfo().name,
    defaultModel: importer.getProviderInfo().defaultModel,
    defaultMode: 'chat',
  };

  const result = await importer.parse(data, { ...defaultOptions, ...options });

  return {
    format,
    conversations: result.conversations.map((c) => ({
      session: c.session,
      messages: c.messages,
    })),
    errors: result.errors,
  };
}

/**
 * Preview any supported format
 */
export async function previewImport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<{
  format: ChatImportFormat;
  conversations: Array<{
    id: string;
    title: string;
    messageCount: number;
    createdAt: Date;
    preview: string;
  }>;
  totalMessages: number;
  errors: ChatImportError[];
}> {
  let data: unknown;

  try {
    data = JSON.parse(fileContent);
  } catch {
    return {
      format: 'unknown',
      conversations: [],
      totalMessages: 0,
      errors: [{ message: 'Invalid JSON format' }],
    };
  }

  const format = detectImportFormat(data);

  if (format === 'unknown' || format === 'cognia') {
    return {
      format,
      conversations: [],
      totalMessages: 0,
      errors: [{ message: format === 'cognia' ? 'Use Cognia restore function' : 'Unsupported format' }],
    };
  }

  const importer = getImporter(format);
  if (!importer) {
    return {
      format,
      conversations: [],
      totalMessages: 0,
      errors: [{ message: `No importer for format: ${format}` }],
    };
  }

  const defaultOptions: ChatImportOptions = {
    mergeStrategy: 'merge',
    generateNewIds: true,
    preserveTimestamps: true,
    defaultProvider: importer.getProviderInfo().name,
    defaultModel: importer.getProviderInfo().defaultModel,
    defaultMode: 'chat',
  };

  const result = await importer.preview(data, { ...defaultOptions, ...options });

  return {
    format,
    ...result,
  };
}

/**
 * Import conversations from any supported format
 */
export async function importConversations(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<ChatImportResult> {
  const { conversations, errors: parseErrors } = await parseImport(fileContent, options);

  if (conversations.length === 0) {
    return {
      success: false,
      imported: { sessions: 0, messages: 0 },
      errors: parseErrors,
      warnings: [],
    };
  }

  // Dynamic imports to avoid circular dependencies
  const { useSessionStore } = await import('@/stores');
  const { db } = await import('@/lib/db');
  const { messageRepository } = await import('@/lib/db/repositories/message-repository');

  const warnings: string[] = [];
  const errors: ChatImportError[] = [...parseErrors];
  let importedSessions = 0;
  let importedMessages = 0;

  const store = useSessionStore.getState();

  for (const { session, messages } of conversations) {
    try {
      const existingSession = store.sessions.find((s) => s.id === session.id);

      if (existingSession && options.mergeStrategy === 'skip') {
        warnings.push(`Skipped existing session: ${session.title}`);
        continue;
      }

      const newSession = store.createSession({
        title: session.title,
        provider: session.provider,
        model: session.model,
        mode: session.mode,
      });

      await db.sessions.put({
        id: newSession.id,
        title: session.title,
        provider: session.provider,
        model: session.model,
        mode: session.mode,
        messageCount: messages.length,
        lastMessagePreview: session.lastMessagePreview,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });

      if (messages.length > 0) {
        await messageRepository.bulkCreate(newSession.id, messages);
        importedMessages += messages.length;
      }

      importedSessions++;
    } catch (error) {
      errors.push({
        conversationId: session.id,
        conversationTitle: session.title,
        message: error instanceof Error ? error.message : 'Failed to import conversation',
      });
    }
  }

  return {
    success: errors.length === 0,
    imported: {
      sessions: importedSessions,
      messages: importedMessages,
    },
    errors,
    warnings,
  };
}

// Re-export format detection functions for convenience
export { isChatGPTFormat, isClaudeFormat, isGeminiFormat };
