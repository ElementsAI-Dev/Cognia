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
  return 'messages' in first && Array.isArray(first.messages);
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

/**
 * Extract content from simple message format
 */
function extractSimpleContent(message: GeminiSimpleMessage): string {
  return message.content
    .map((part) => {
      if (part.type === 'text' && part.text) {
        return part.text;
      }
      if (part.type === 'code' && part.text) {
        const lang = part.language || '';
        return `\`\`\`${lang}\n${part.text}\n\`\`\``;
      }
      if (part.type === 'image') {
        return '[Image]';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Convert Takeout conversation to Cognia format
 */
function convertTakeoutConversation(
  conversation: GeminiConversation,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps && conversation.create_time
    ? new Date(conversation.create_time)
    : now;
  const updatedAt = options.preserveTimestamps && conversation.update_time
    ? new Date(conversation.update_time)
    : now;

  const messages: UIMessage[] = conversation.messages.map((msg: GeminiMessage, index: number) => {
    const msgCreatedAt = options.preserveTimestamps && msg.timestamp
      ? new Date(msg.timestamp)
      : now;

    return {
      id: options.generateNewIds ? nanoid() : `gemini-${conversation.id}-${index}`,
      role: mapGeminiRole(msg.role),
      content: msg.content,
      createdAt: msgCreatedAt,
      model: msg.metadata?.model_version || options.defaultModel,
      provider: options.defaultProvider,
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

  return { session, messages: validMessages };
}

/**
 * Convert simple export to Cognia format
 */
function convertSimpleExport(
  data: GeminiSimpleExport,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps && data.exported_at
    ? new Date(data.exported_at)
    : now;

  const messages: UIMessage[] = data.messages.map((msg, index) => ({
    id: options.generateNewIds ? nanoid() : `gemini-simple-${index}`,
    role: mapGeminiRole(msg.role),
    content: extractSimpleContent(msg),
    createdAt: now,
    model: options.defaultModel,
    provider: options.defaultProvider,
  }));

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

  return { session, messages: validMessages };
}

/**
 * Convert AI Studio export to Cognia format
 */
function convertAIStudioExport(
  data: GeminiAIStudioExport,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[] } {
  const now = new Date();
  const model = data.model || options.defaultModel || 'gemini-pro';

  const messages: UIMessage[] = data.messages.map((msg, index) => {
    const content = msg.parts
      .map((part) => {
        if (part.text) return part.text;
        if (part.inlineData) return `[${part.inlineData.mimeType}]`;
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

  return { session, messages: validMessages };
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
            conversations.push({
              session: result.session,
              messages: result.messages,
              metadata: {
                sourceFormat: 'gemini',
                originalId: conversation.id,
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
        conversations.push({
          session: result.session,
          messages: result.messages,
          metadata: {
            sourceFormat: 'gemini',
          },
        });
      } else if (isAIStudioFormat(data)) {
        const result = convertAIStudioExport(data, opts);
        conversations.push({
          session: result.session,
          messages: result.messages,
          metadata: {
            sourceFormat: 'gemini',
            modelInfo: data.model,
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
