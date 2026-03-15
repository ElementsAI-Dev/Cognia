/**
 * Claude (Anthropic) Import Utilities
 * Parse and convert Claude export format to Cognia format
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
  ClaudeExport,
  ClaudeChat,
  ClaudeMessagePart,
  ClaudeSimpleExport,
} from '@/types/import/claude';
import { buildPortableConversation, createImportWarning } from './import-portable';

type ClaudeData = ClaudeExport | ClaudeSimpleExport;

const DEFAULT_IMPORT_OPTIONS: ChatImportOptions = {
  mergeStrategy: 'merge',
  generateNewIds: true,
  preserveTimestamps: true,
  defaultProvider: 'anthropic',
  defaultModel: 'claude-3-opus',
  defaultMode: 'chat',
};

/**
 * Check if data is the standard Claude export format
 */
function isClaudeStandardFormat(data: unknown): data is ClaudeExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return (
    'meta' in obj &&
    typeof obj.meta === 'object' &&
    obj.meta !== null &&
    'chats' in obj &&
    Array.isArray(obj.chats)
  );
}

/**
 * Check if data is the simple Claude export format (from extensions)
 */
function isClaudeSimpleFormat(data: unknown): data is ClaudeSimpleExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!('messages' in obj) || !Array.isArray(obj.messages)) return false;
  if (obj.messages.length === 0) return true;

  const first = obj.messages[0] as Record<string, unknown>;
  return (
    'role' in first &&
    (first.role === 'human' || first.role === 'assistant') &&
    'content' in first
  );
}

/**
 * Convert Claude message parts to plain text content
 */
function extractContentFromParts(parts: ClaudeMessagePart[]): string {
  return parts
    .map((part) => {
      switch (part.type) {
        case 'p':
        case 'blockquote':
        case 'heading':
          return part.data;

        case 'pre':
        case 'code':
          if (part.language) {
            return `\`\`\`${part.language}\n${part.data}\n\`\`\``;
          }
          return `\`\`\`\n${part.data}\n\`\`\``;

        case 'list':
        case 'ul':
          if (part.items) {
            return part.items.map((item) => `- ${item}`).join('\n');
          }
          return part.data
            .split('\n')
            .map((line) => `- ${line}`)
            .join('\n');

        case 'ol':
          if (part.items) {
            return part.items.map((item, i) => `${i + 1}. ${item}`).join('\n');
          }
          return part.data
            .split('\n')
            .map((line, i) => `${i + 1}. ${line}`)
            .join('\n');

        case 'table':
          if (part.rows) {
            return part.rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
          }
          return part.data;

        case 'hr':
          return '---';

        case 'image':
        case 'artifact':
          return `[${part.type}: ${part.data}]`;

        default:
          return part.data || '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

function extractPartsPayload(
  parts: ClaudeMessagePart[],
  conversationId?: string
): {
  content: string;
  attachments?: UIMessage['attachments'];
  warnings: ChatImportWarning[];
} {
  const warnings: ChatImportWarning[] = [];
  const attachments: NonNullable<UIMessage['attachments']> = [];

  const content = parts
    .map((part) => {
      switch (part.type) {
        case 'image':
          attachments.push({
            id: nanoid(),
            name: part.data || 'Claude image',
            type: 'image',
            url: `import://claude/image/${encodeURIComponent(part.data || nanoid())}`,
            size: 0,
            mimeType: 'image/*',
          });
          warnings.push(
            createImportWarning(
              'attachment_summary_only',
              'Claude image parts are imported as attachment summaries only.',
              { conversationId }
            )
          );
          return `[image: ${part.data}]`;
        case 'artifact':
          attachments.push({
            id: nanoid(),
            name: part.data || 'Claude artifact',
            type: 'document',
            url: `import://claude/artifact/${encodeURIComponent(part.data || nanoid())}`,
            size: 0,
            mimeType: 'text/plain',
          });
          warnings.push(
            createImportWarning(
              'attachment_summary_only',
              'Claude artifacts are imported as attachment summaries only.',
              { conversationId }
            )
          );
          return `[artifact: ${part.data}]`;
        default:
          return extractContentFromParts([part]);
      }
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
 * Map Claude role to Cognia MessageRole
 */
function mapClaudeRole(type: string): MessageRole {
  switch (type) {
    case 'prompt':
    case 'human':
      return 'user';
    case 'response':
    case 'assistant':
      return 'assistant';
    default:
      return 'user';
  }
}

/**
 * Convert standard Claude export to parsed conversations
 */
function convertStandardExport(
  data: ClaudeExport,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[]; warnings: ChatImportWarning[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps && data.meta.exported_at
    ? new Date(data.meta.exported_at)
    : now;
  const warnings: ChatImportWarning[] = [];

  const messages: UIMessage[] = data.chats.map((chat: ClaudeChat) => {
    const msgCreatedAt = options.preserveTimestamps && chat.timestamp
      ? new Date(chat.timestamp)
      : now;
    const payload = extractPartsPayload(chat.message, data.meta.conversation_id);
    warnings.push(...payload.warnings);

    return {
      id: options.generateNewIds ? nanoid() : `claude-${chat.index}`,
      role: mapClaudeRole(chat.type),
      content: payload.content,
      createdAt: msgCreatedAt,
      model: options.defaultModel,
      provider: options.defaultProvider,
      attachments: payload.attachments,
    };
  });

  const validMessages = messages.filter((m) => m.content.trim().length > 0);

  const session: Session = {
    id: options.generateNewIds ? nanoid() : data.meta.conversation_id || nanoid(),
    title: data.meta.title || 'Imported Claude Chat',
    createdAt,
    updatedAt: now,
    provider: options.defaultProvider as Session['provider'],
    model: options.defaultModel || 'claude-3-opus',
    mode: options.defaultMode || 'chat',
    messageCount: validMessages.length,
    lastMessagePreview: validMessages[validMessages.length - 1]?.content.slice(0, 100),
  };

  return { session, messages: validMessages, warnings };
}

/**
 * Convert simple Claude export to parsed conversations
 */
function convertSimpleExport(
  data: ClaudeSimpleExport,
  options: ChatImportOptions
): { session: Session; messages: UIMessage[]; warnings: ChatImportWarning[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps && data.timestamp
    ? new Date(data.timestamp)
    : now;

  const messages: UIMessage[] = data.messages.map((msg, index) => ({
    id: options.generateNewIds ? nanoid() : `claude-simple-${index}`,
    role: mapClaudeRole(msg.role),
    content: msg.content,
    createdAt: options.preserveTimestamps && msg.timestamp
      ? new Date(msg.timestamp)
      : now,
    model: options.defaultModel,
    provider: options.defaultProvider,
  }));

  const validMessages = messages.filter((m) => m.content.trim().length > 0);

  const session: Session = {
    id: options.generateNewIds ? nanoid() : nanoid(),
    title: data.title || 'Imported Claude Chat',
    createdAt,
    updatedAt: now,
    provider: options.defaultProvider as Session['provider'],
    model: options.defaultModel || 'claude-3-opus',
    mode: options.defaultMode || 'chat',
    messageCount: validMessages.length,
    lastMessagePreview: validMessages[validMessages.length - 1]?.content.slice(0, 100),
  };

  return { session, messages: validMessages, warnings: [] };
}

/**
 * Claude Importer Class
 */
export class ClaudeImporter implements ChatImporter<ClaudeData> {
  getFormat() {
    return 'claude' as const;
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'anthropic',
      defaultModel: 'claude-3-opus',
      icon: 'anthropic',
    };
  }

  detect(data: unknown): data is ClaudeData {
    return isClaudeStandardFormat(data) || isClaudeSimpleFormat(data);
  }

  async parse(
    data: ClaudeData,
    options: ChatImportOptions = DEFAULT_IMPORT_OPTIONS
  ): Promise<{
    conversations: ParsedConversation[];
    errors: ChatImportError[];
  }> {
    const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    const errors: ChatImportError[] = [];
    const conversations: ParsedConversation[] = [];

    try {
      let result: { session: Session; messages: UIMessage[]; warnings: ChatImportWarning[] };

      if (isClaudeStandardFormat(data)) {
        result = convertStandardExport(data, opts);
      } else {
        result = convertSimpleExport(data as ClaudeSimpleExport, opts);
      }

      const compatibility = result.warnings.length > 0 ? 'partial' : 'official';

      conversations.push({
        session: result.session,
        messages: result.messages,
        metadata: {
          sourceFormat: 'claude',
          originalId: result.session.id,
          sourceType: 'official',
          compatibility,
          warnings: result.warnings,
          portableConversation: buildPortableConversation({
            session: result.session,
            messages: result.messages,
            sourceFormat: 'claude',
            sourceType: 'official',
            compatibility,
            warnings: result.warnings,
          }),
        },
      });
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Failed to parse Claude export',
      });
    }

    return { conversations, errors };
  }

  async preview(
    data: ClaudeData,
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
 * Detect if data is Claude format
 */
export function isClaudeFormat(data: unknown): data is ClaudeData {
  return isClaudeStandardFormat(data) || isClaudeSimpleFormat(data);
}

/**
 * Parse Claude export file content
 */
export async function parseClaudeExport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<{
  conversations: Array<{ session: Session; messages: UIMessage[] }>;
  errors: ChatImportError[];
}> {
  const importer = new ClaudeImporter();
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
      errors: [{ message: 'Not a valid Claude export format' }],
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
 * Preview Claude import without persisting
 */
export async function previewClaudeImport(
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
  const importer = new ClaudeImporter();
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
      errors: [{ message: 'Not a valid Claude export format' }],
    };
  }

  return importer.preview(data, { ...DEFAULT_IMPORT_OPTIONS, ...options });
}

export default ClaudeImporter;
