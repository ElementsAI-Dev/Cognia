/**
 * Google Gemini Import Utilities
 * Parse and convert Gemini export format to Cognia format
 */

import { nanoid } from 'nanoid';
import type { Session, UIMessage, MessageRole } from '@/types/core';
import type {
  ChatImporter,
  ChatImportOptions,
  ChatImportError,
  ChatImportWarning,
  ParsedConversation,
  ProviderInfo,
} from '@/types/import/base';
import type {
  GeminiTakeoutExport,
  GeminiConversation,
  GeminiMessage,
  GeminiSimpleExport,
  GeminiSimpleMessage,
  GeminiAIStudioExport,
} from '@/types/import/gemini';
import { buildPortableConversation, createImportWarning } from './import-portable';

type GeminiData = GeminiTakeoutExport | GeminiSimpleExport | GeminiAIStudioExport;

const DEFAULT_IMPORT_OPTIONS: ChatImportOptions = {
  mergeStrategy: 'merge',
  generateNewIds: true,
  preserveTimestamps: true,
  defaultProvider: 'google',
  defaultModel: 'gemini-pro',
  defaultMode: 'chat',
};

/**
 * Check if data is Google Takeout format
 */
function isTakeoutFormat(data: unknown): data is GeminiTakeoutExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!('conversations' in obj) || !Array.isArray(obj.conversations)) return false;
  if (obj.conversations.length === 0) return true;

  const first = obj.conversations[0] as Record<string, unknown>;
  if (
    !('id' in first) ||
    !('create_time' in first) ||
    !('update_time' in first) ||
    !('messages' in first) ||
    !Array.isArray(first.messages)
  ) {
    return false;
  }

  if (first.messages.length === 0) return true;

  const firstMessage = first.messages[0] as Record<string, unknown>;
  return 'role' in firstMessage && 'content' in firstMessage;
}

/**
 * Check if data is simple extension format
 */
function isSimpleFormat(data: unknown): data is GeminiSimpleExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!('messages' in obj) || !Array.isArray(obj.messages)) return false;
  if (obj.messages.length === 0) return true;

  const first = obj.messages[0] as Record<string, unknown>;
  return (
    'role' in first &&
    (first.role === 'user' || first.role === 'model') &&
    'content' in first &&
    Array.isArray(first.content)
  );
}

/**
 * Check if data is AI Studio format
 */
function isAIStudioFormat(data: unknown): data is GeminiAIStudioExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!('messages' in obj) || !Array.isArray(obj.messages)) return false;
  if (!('model' in obj)) return false;

  if (obj.messages.length === 0) return true;

  const first = obj.messages[0] as Record<string, unknown>;
  return 'parts' in first && Array.isArray(first.parts);
}

/**
 * Map Gemini role to Cognia MessageRole
 */
function mapGeminiRole(role: string): MessageRole {
  switch (role) {
    case 'user':
      return 'user';
    case 'model':
    case 'assistant':
      return 'assistant';
    default:
      return 'user';
  }
}

function extractSimplePayload(
  message: GeminiSimpleMessage
): {
  content: string;
  attachments?: UIMessage['attachments'];
  warnings: ChatImportWarning[];
} {
  const warnings: ChatImportWarning[] = [];
  const attachments: NonNullable<UIMessage['attachments']> = [];

  const content = message.content
    .map((part) => {
      if (part.type === 'text' && part.text) {
        return part.text;
      }
      if (part.type === 'code' && part.text) {
        const lang = part.language || '';
        return `\`\`\`${lang}\n${part.text}\n\`\`\``;
      }
      if (part.type === 'image') {
        attachments.push({
          id: nanoid(),
          name: 'Gemini image',
          type: 'image',
          url: part.data || `import://gemini/image/${nanoid()}`,
          size: 0,
          mimeType: 'image/*',
        });
        warnings.push(
          createImportWarning(
            'attachment_summary_only',
            'Gemini image parts are imported as attachment summaries only.'
          )
        );
        return '[Image]';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return {
    content,
    attachments: attachments.length > 0 ? attachments : undefined,
    warnings,
  };
}

/**
 * Convert Takeout conversation to Cognia format
 */
function convertTakeoutConversation(
  conversation: GeminiConversation,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[]; warnings: ChatImportWarning[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps && conversation.create_time
    ? new Date(conversation.create_time)
    : now;
  const updatedAt = options.preserveTimestamps && conversation.update_time
    ? new Date(conversation.update_time)
    : now;
  const warnings: ChatImportWarning[] = [];

  const messages: UIMessage[] = conversation.messages.map((msg: GeminiMessage, index: number) => {
    const msgCreatedAt = options.preserveTimestamps && msg.timestamp
      ? new Date(msg.timestamp)
      : now;
    const attachments = msg.metadata?.attachments?.map((attachment) => ({
      id: nanoid(),
      name: attachment.name,
      type: attachment.type === 'code'
        ? 'document'
        : attachment.type === 'file'
          ? 'file'
          : attachment.type,
      url: attachment.content || `import://gemini/${attachment.type}/${encodeURIComponent(attachment.name)}`,
      size: attachment.size_bytes || 0,
      mimeType: attachment.mime_type || 'application/octet-stream',
    })) as UIMessage['attachments'] | undefined;
    const sources = msg.metadata?.citations?.map((citation, citationIndex) => ({
      id: `${conversation.id}-citation-${citationIndex}`,
      title: citation.title,
      url: citation.url || '',
      snippet: citation.snippet || '',
      relevance: 1,
    }));

    if (attachments && attachments.length > 0) {
      warnings.push(
        createImportWarning(
          'attachment_summary_only',
          'Gemini attachments are imported as portable summaries.',
          { conversationId: conversation.id }
        )
      );
    }

    return {
      id: options.generateNewIds ? nanoid() : `gemini-${conversation.id}-${index}`,
      role: mapGeminiRole(msg.role),
      content: msg.content,
      createdAt: msgCreatedAt,
      model: msg.metadata?.model_version || options.defaultModel,
      provider: options.defaultProvider,
      attachments,
      sources,
    };
  });

  const validMessages = messages.filter((m) => m.content.trim().length > 0);

  const session: Session = {
    id: options.generateNewIds ? nanoid() : conversation.id,
    title: conversation.title || 'Imported Gemini Chat',
    createdAt,
    updatedAt,
    provider: options.defaultProvider as Session['provider'],
    model: options.defaultModel || 'gemini-pro',
    mode: options.defaultMode || 'chat',
    messageCount: validMessages.length,
    lastMessagePreview: validMessages[validMessages.length - 1]?.content.slice(0, 100),
  };

  return { session, messages: validMessages, warnings };
}

/**
 * Convert simple export to Cognia format
 */
function convertSimpleExport(
  data: GeminiSimpleExport,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[]; warnings: ChatImportWarning[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps && data.exported_at
    ? new Date(data.exported_at)
    : now;
  const warnings: ChatImportWarning[] = [];

  const messages: UIMessage[] = data.messages.map((msg, index) => {
    const payload = extractSimplePayload(msg);
    warnings.push(...payload.warnings);

    return {
      id: options.generateNewIds ? nanoid() : `gemini-simple-${index}`,
      role: mapGeminiRole(msg.role),
      content: payload.content,
      createdAt: now,
      model: options.defaultModel,
      provider: options.defaultProvider,
      attachments: payload.attachments,
    };
  });

  const validMessages = messages.filter((m) => m.content.trim().length > 0);

  const session: Session = {
    id: options.generateNewIds ? nanoid() : nanoid(),
    title: data.title || 'Imported Gemini Chat',
    createdAt,
    updatedAt: now,
    provider: options.defaultProvider as Session['provider'],
    model: options.defaultModel || 'gemini-pro',
    mode: options.defaultMode || 'chat',
    messageCount: validMessages.length,
    lastMessagePreview: validMessages[validMessages.length - 1]?.content.slice(0, 100),
  };

  return { session, messages: validMessages, warnings };
}

/**
 * Convert AI Studio export to Cognia format
 */
function convertAIStudioExport(
  data: GeminiAIStudioExport,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[]; warnings: ChatImportWarning[] } {
  const now = new Date();
  const model = data.model || options.defaultModel || 'gemini-pro';
  const warnings: ChatImportWarning[] = [];

  const messages: UIMessage[] = data.messages.map((msg, index) => {
    const attachments: NonNullable<UIMessage['attachments']> = [];
    const content = msg.parts
      .map((part) => {
        if (part.text) return part.text;
        if (part.inlineData) {
          attachments.push({
            id: nanoid(),
            name: part.inlineData.mimeType,
            type: 'file',
            url: `import://gemini/inline/${nanoid()}`,
            size: 0,
            mimeType: part.inlineData.mimeType,
          });
          warnings.push(
            createImportWarning(
              'attachment_summary_only',
              'Gemini AI Studio inline data is imported as an attachment summary only.'
            )
          );
          return `[${part.inlineData.mimeType}]`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    return {
      id: options.generateNewIds ? nanoid() : `gemini-studio-${index}`,
      role: mapGeminiRole(msg.role),
      content,
      createdAt: now,
      model,
      provider: options.defaultProvider,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  });

  const validMessages = messages.filter((m) => m.content.trim().length > 0);

  const session: Session = {
    id: options.generateNewIds ? nanoid() : nanoid(),
    title: 'Imported AI Studio Chat',
    createdAt: now,
    updatedAt: now,
    provider: options.defaultProvider as Session['provider'],
    model,
    mode: options.defaultMode || 'chat',
    messageCount: validMessages.length,
    lastMessagePreview: validMessages[validMessages.length - 1]?.content.slice(0, 100),
  };

  return { session, messages: validMessages, warnings };
}

/**
 * Gemini Importer Class
 */
export class GeminiImporter implements ChatImporter<GeminiData> {
  getFormat() {
    return 'gemini' as const;
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'google',
      defaultModel: 'gemini-pro',
      icon: 'google',
    };
  }

  detect(data: unknown): data is GeminiData {
    return isTakeoutFormat(data) || isSimpleFormat(data) || isAIStudioFormat(data);
  }

  async parse(
    data: GeminiData,
    options: ChatImportOptions = DEFAULT_IMPORT_OPTIONS
  ): Promise<{
    conversations: ParsedConversation[];
    errors: ChatImportError[];
  }> {
    const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    const errors: ChatImportError[] = [];
    const conversations: ParsedConversation[] = [];

    try {
      if (isTakeoutFormat(data)) {
        for (const conversation of data.conversations) {
          try {
            const result = convertTakeoutConversation(conversation, opts);
            const compatibility = result.warnings.length > 0 ? 'partial' : 'official';
            conversations.push({
              session: result.session,
              messages: result.messages,
              metadata: {
                sourceFormat: 'gemini',
                originalId: conversation.id,
                sourceType: 'official',
                compatibility,
                warnings: result.warnings,
                portableConversation: buildPortableConversation({
                  session: result.session,
                  messages: result.messages,
                  sourceFormat: 'gemini',
                  sourceType: 'official',
                  compatibility,
                  warnings: result.warnings,
                }),
              },
            });
          } catch (error) {
            errors.push({
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              message: error instanceof Error ? error.message : 'Failed to convert conversation',
            });
          }
        }
      } else if (isSimpleFormat(data)) {
        const result = convertSimpleExport(data, opts);
        const compatibility = result.warnings.length > 0 ? 'partial' : 'adapted';
        conversations.push({
          session: result.session,
          messages: result.messages,
          metadata: {
            sourceFormat: 'gemini',
            sourceType: 'official',
            compatibility,
            warnings: result.warnings,
            portableConversation: buildPortableConversation({
              session: result.session,
              messages: result.messages,
              sourceFormat: 'gemini',
              sourceType: 'official',
              compatibility,
              warnings: result.warnings,
            }),
          },
        });
      } else if (isAIStudioFormat(data)) {
        const result = convertAIStudioExport(data, opts);
        const compatibility = result.warnings.length > 0 ? 'partial' : 'official';
        conversations.push({
          session: result.session,
          messages: result.messages,
          metadata: {
            sourceFormat: 'gemini',
            modelInfo: data.model,
            sourceType: 'official',
            compatibility,
            warnings: result.warnings,
            portableConversation: buildPortableConversation({
              session: result.session,
              messages: result.messages,
              sourceFormat: 'gemini',
              sourceType: 'official',
              compatibility,
              warnings: result.warnings,
              metadata: {
                modelInfo: data.model,
              },
            }),
          },
        });
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Failed to parse Gemini export',
      });
    }

    return { conversations, errors };
  }

  async preview(
    data: GeminiData,
    options: ChatImportOptions = DEFAULT_IMPORT_OPTIONS
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

    const preview = conversations.map(({ session, messages }) => ({
      id: session.id,
      title: session.title,
      messageCount: messages.length,
      createdAt: session.createdAt,
      preview: messages[0]?.content.slice(0, 100) || '',
    }));

    const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);

    return { conversations: preview, totalMessages, errors };
  }
}

/**
 * Detect if data is Gemini format
 */
export function isGeminiFormat(data: unknown): data is GeminiData {
  return isTakeoutFormat(data) || isSimpleFormat(data) || isAIStudioFormat(data);
}

/**
 * Parse Gemini export file content
 */
export async function parseGeminiExport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<{
  conversations: Array<{ session: Session; messages: UIMessage[] }>;
  errors: ChatImportError[];
}> {
  const importer = new GeminiImporter();
  let data: unknown;

  try {
    data = JSON.parse(fileContent);
  } catch {
    return {
      conversations: [],
      errors: [{ message: 'Invalid JSON format' }],
    };
  }

  if (!importer.detect(data)) {
    return {
      conversations: [],
      errors: [{ message: 'Not a valid Gemini export format' }],
    };
  }

  const result = await importer.parse(data, { ...DEFAULT_IMPORT_OPTIONS, ...options });

  return {
    conversations: result.conversations.map((c) => ({
      session: c.session,
      messages: c.messages,
    })),
    errors: result.errors,
  };
}

/**
 * Preview Gemini import without persisting
 */
export async function previewGeminiImport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
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
  const importer = new GeminiImporter();
  let data: unknown;

  try {
    data = JSON.parse(fileContent);
  } catch {
    return {
      conversations: [],
      totalMessages: 0,
      errors: [{ message: 'Invalid JSON format' }],
    };
  }

  if (!importer.detect(data)) {
    return {
      conversations: [],
      totalMessages: 0,
      errors: [{ message: 'Not a valid Gemini export format' }],
    };
  }

  return importer.preview(data, { ...DEFAULT_IMPORT_OPTIONS, ...options });
}

export default GeminiImporter;
