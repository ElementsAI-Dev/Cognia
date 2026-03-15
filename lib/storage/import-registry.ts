/**
 * Unified Import Registry
 * Central registry for all chat import formats
 */

import type { Session, UIMessage } from '@/types/core';
import type { PersistedChatMessage } from './persistence/types';
import type {
  ChatImporter,
  ChatImportDetection,
  ChatImportFormat,
  ChatImportOptions,
  ChatImportParseResult,
  ChatImportPreviewResult,
  ChatImportResult,
  ChatImportError,
  ChatImportWarning,
  ProviderInfo,
} from '@/types/import/base';
import { ClaudeImporter, isClaudeFormat } from './claude-import';
import { GeminiImporter, isGeminiFormat } from './gemini-import';
import {
  convertConversationToParsedConversation,
  isChatGPTFormat,
} from './chatgpt-import';
import {
  CSVTranscriptImporter,
  JSONTranscriptImporter,
  MarkdownTranscriptImporter,
} from './transcript-importers';
import { PortableChatArchiveImporter } from './portable-import';

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
    if (!isChatGPTFormat(data)) {
      return {
        conversations: [],
        errors: [{ message: 'Not a valid ChatGPT export format' }],
      };
    }

    const conversations: Array<{
      session: Session;
      messages: UIMessage[];
      metadata?: Record<string, unknown>;
    }> = [];
    const errors: ChatImportError[] = [];

    for (const conversation of data) {
      try {
        conversations.push(convertConversationToParsedConversation(conversation, options));
      } catch (error) {
        errors.push({
          conversationId: conversation.id,
          conversationTitle: conversation.title,
          message: error instanceof Error ? error.message : 'Failed to convert conversation',
        });
      }
    }

    return { conversations, errors };
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
    const { conversations, errors } = await this.parse(data, options);

    return {
      conversations: conversations.map(({ session, messages, metadata }) => ({
        id: session.id,
        title: session.title,
        messageCount: messages.length,
        createdAt: session.createdAt,
        preview: messages[0]?.content.slice(0, 100) || '',
        compatibility: metadata?.compatibility,
        warnings: metadata?.warnings,
      })),
      totalMessages: conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
      errors,
    };
  }
}

/**
 * Registered importers grouped by detection strategy.
 * Official platform importers are evaluated before generic transcript adapters.
 */
const officialImporters: ChatImporter<unknown>[] = [
  new ChatGPTImporterWrapper(),
  new ClaudeImporter(),
  new GeminiImporter(),
];

const portableImporters: ChatImporter<unknown>[] = [new PortableChatArchiveImporter()];

const genericTranscriptImporters: ChatImporter<unknown>[] = [
  new MarkdownTranscriptImporter(),
  new CSVTranscriptImporter(),
  new JSONTranscriptImporter(),
];

const importers: ChatImporter<unknown>[] = [
  ...officialImporters,
  ...portableImporters,
  ...genericTranscriptImporters,
];

/**
 * Platform display information
 */
export const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  chatgpt: { name: 'ChatGPT', icon: 'openai', color: '#10a37f' },
  claude: { name: 'Claude', icon: 'anthropic', color: '#d4a574' },
  gemini: { name: 'Gemini', icon: 'google', color: '#4285f4' },
  portable: { name: 'Portable Archive', icon: 'archive', color: '#2563eb' },
  'markdown-transcript': { name: 'Markdown Transcript', icon: 'file-text', color: '#64748b' },
  'csv-transcript': { name: 'CSV Transcript', icon: 'table', color: '#0f766e' },
  'json-transcript': { name: 'JSON Transcript', icon: 'file-json', color: '#6d28d9' },
  cognia: { name: 'Cognia', icon: 'cognia', color: '#8b5cf6' },
};

function createDetection(format: ChatImportFormat, provider?: string): ChatImportDetection {
  switch (format) {
    case 'chatgpt':
    case 'claude':
    case 'gemini':
      return {
        format,
        sourceType: 'official',
        compatibility: 'official',
        provider,
        confidence: 'high',
      };
    case 'portable':
      return {
        format,
        sourceType: 'portable',
        compatibility: 'official',
        provider,
        confidence: 'high',
      };
    case 'markdown-transcript':
    case 'csv-transcript':
    case 'json-transcript':
      return {
        format,
        sourceType: 'generic',
        compatibility: 'adapted',
        provider,
        confidence: 'medium',
      };
    case 'cognia':
      return {
        format,
        sourceType: 'backup',
        compatibility: 'unsupported',
        provider,
        confidence: 'high',
      };
    default:
      return {
        format: 'unknown',
        sourceType: 'unsupported',
        compatibility: 'unsupported',
        confidence: 'low',
      };
  }
}

function collectWarningDetails(
  conversations: Array<{ metadata?: { warnings?: ChatImportWarning[] } }>
): ChatImportWarning[] {
  return conversations.flatMap((conversation) => conversation.metadata?.warnings ?? []);
}

function toStructuredWarning(message: string): ChatImportWarning {
  return {
    code: 'partial_import',
    message,
    severity: 'warning',
  };
}

export function detectImportSource(data: unknown): ChatImportDetection {
  if (typeof data === 'string') {
    for (const importer of importers) {
      if (importer.detect(data)) {
        const providerInfo = importer.getProviderInfo();
        return createDetection(importer.getFormat(), providerInfo.name);
      }
    }
    return createDetection('unknown');
  }

  if (!data || typeof data !== 'object') {
    return createDetection('unknown');
  }

  for (const importer of importers) {
    if (importer.detect(data)) {
      const providerInfo = importer.getProviderInfo();
      return createDetection(importer.getFormat(), providerInfo.name);
    }
  }

  if (
    'version' in (data as Record<string, unknown>) &&
    'exportedAt' in (data as Record<string, unknown>)
  ) {
    return createDetection('cognia');
  }

  return createDetection('unknown');
}

/**
 * Detect import format from parsed JSON data
 */
export function detectImportFormat(data: unknown): ChatImportFormat {
  return detectImportSource(data).format;
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
): Promise<ChatImportParseResult> {
  let data: unknown = fileContent;
  let parsedJson = false;

  try {
    data = JSON.parse(fileContent);
    parsedJson = true;
  } catch {
    data = fileContent;
  }

  const detection = detectImportSource(data);
  const format = detection.format;

  if (format === 'unknown') {
    return {
      format,
      detection,
      conversations: [],
      errors: [{ message: parsedJson ? 'Unsupported import format' : 'Invalid JSON format' }],
      warningDetails: [],
    };
  }

  if (format === 'cognia') {
    return {
      format,
      detection,
      conversations: [],
      errors: [{ message: 'Use Cognia restore function for Cognia exports' }],
      warningDetails: [],
    };
  }

  const importer = getImporter(format);
  if (!importer) {
    return {
      format,
      detection,
      conversations: [],
      errors: [{ message: `No importer available for format: ${format}` }],
      warningDetails: [],
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
  const warningDetails = collectWarningDetails(result.conversations);

  return {
    format,
    detection,
    conversations: result.conversations.map((c) => ({
      session: c.session,
      messages: c.messages,
    })),
    errors: result.errors,
    warningDetails,
  };
}

/**
 * Preview any supported format
 */
export async function previewImport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<ChatImportPreviewResult> {
  const parsed = await parseImport(fileContent, options);
  const conversations = parsed.conversations.map(({ session, messages }) => ({
    id: session.id,
    title: session.title,
    messageCount: messages.length,
    createdAt: session.createdAt,
    preview: messages[0]?.content.slice(0, 100) || '',
    compatibility: parsed.detection.compatibility,
    warnings: [],
  }));

  return {
    format: parsed.format,
    detection: parsed.detection,
    conversations,
    totalMessages: parsed.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
    errors: parsed.errors,
    warningDetails: parsed.warningDetails,
  };
}

/**
 * Import conversations from any supported format
 */
export async function importConversations(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<ChatImportResult> {
  const resolvedOptions: ChatImportOptions = {
    mergeStrategy: options.mergeStrategy || 'merge',
    generateNewIds: options.generateNewIds ?? true,
    preserveTimestamps: options.preserveTimestamps ?? true,
    defaultProvider: options.defaultProvider,
    defaultModel: options.defaultModel,
    defaultMode: options.defaultMode,
  };

  const {
    conversations,
    errors: parseErrors,
    warningDetails: parseWarningDetails,
    detection,
  } = await parseImport(fileContent, options);

  if (conversations.length === 0) {
    return {
      success: false,
      imported: { sessions: 0, messages: 0 },
      errors: parseErrors,
      warnings: [],
      warningDetails: parseWarningDetails,
      detection,
    };
  }

  // Dynamic imports to avoid circular dependencies
  const { useSessionStore } = await import('@/stores');
  const { unifiedPersistenceService } = await import('@/lib/storage/persistence/unified-persistence-service');
  const { nanoid } = await import('nanoid');

  const warnings: string[] = [];
  const errors: ChatImportError[] = [...parseErrors];
  let importedSessions = 0;
  let importedMessages = 0;

  const existingSessions = new Set(
    (await unifiedPersistenceService.sessions.list()).map((session) => session.id)
  );
  const existingMessageIds = new Set(
    (await unifiedPersistenceService.messages.listAll()).map((message) => message.id)
  );

  const persistedSessions: Session[] = [];
  const persistedMessages: PersistedChatMessage[] = [];
  const replacedSessionIds = new Set<string>();

  for (const { session, messages } of conversations) {
    try {
      let targetSessionId = session.id;
      const sessionExists = existingSessions.has(targetSessionId);

      if (sessionExists && resolvedOptions.mergeStrategy === 'skip') {
        warnings.push(`Skipped existing session: ${session.title}`);
        continue;
      }

      if (sessionExists && resolvedOptions.mergeStrategy === 'merge') {
        targetSessionId = `${session.id}-import-${nanoid(6)}`;
      }

      if (sessionExists && resolvedOptions.mergeStrategy === 'replace') {
        replacedSessionIds.add(session.id);
        await unifiedPersistenceService.messages.removeBySession(session.id);
        await unifiedPersistenceService.summaries.removeBySession(session.id);
        await unifiedPersistenceService.sessions.remove(session.id);
      }

      const now = new Date();
      const normalizedSession: Session = {
        ...session,
        id: targetSessionId,
        title:
          targetSessionId !== session.id
            ? `${session.title} (imported)`
            : session.title,
        createdAt: resolvedOptions.preserveTimestamps === false ? now : session.createdAt,
        updatedAt: resolvedOptions.preserveTimestamps === false ? now : session.updatedAt,
        messageCount: messages.length,
        lastMessagePreview:
          messages[messages.length - 1]?.content?.slice(0, 100) ||
          session.lastMessagePreview,
      };
      persistedSessions.push(normalizedSession);
      existingSessions.add(targetSessionId);

      if (messages.length > 0) {
        const normalizedMessages = messages.map((message) => {
          const preferredId = resolvedOptions.generateNewIds ? nanoid() : message.id;
          const messageId = existingMessageIds.has(preferredId) ? nanoid() : preferredId;
          existingMessageIds.add(messageId);

          return {
            ...message,
            id: messageId,
            sessionId: targetSessionId,
            createdAt: resolvedOptions.preserveTimestamps === false ? now : message.createdAt,
          } as PersistedChatMessage;
        });
        persistedMessages.push(...normalizedMessages);
        importedMessages += normalizedMessages.length;
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

  if (persistedSessions.length > 0) {
    await unifiedPersistenceService.sessions.bulkUpsert(persistedSessions);
  }
  if (persistedMessages.length > 0) {
    await unifiedPersistenceService.messages.upsertBatch(persistedMessages);
  }

  if (persistedSessions.length > 0 || replacedSessionIds.size > 0) {
    useSessionStore.setState((state) => {
      const existing = state.sessions.filter((session) => !replacedSessionIds.has(session.id));
      return {
        ...state,
        sessions: [...persistedSessions, ...existing],
      };
    });
  }

  return {
    success: errors.length === 0,
    imported: {
      sessions: importedSessions,
      messages: importedMessages,
    },
    errors,
    warnings,
    warningDetails: [
      ...parseWarningDetails,
      ...warnings.map((warning) => toStructuredWarning(warning)),
    ],
    detection,
  };
}

// Re-export format detection functions for convenience
export { isChatGPTFormat, isClaudeFormat, isGeminiFormat };
