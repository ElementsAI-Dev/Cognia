import { nanoid } from 'nanoid';
import type { MessageRole, Session, UIMessage } from '@/types/core';
import type {
  ChatImporter,
  ChatImportError,
  ChatImportOptions,
  ChatImportWarning,
  ParsedConversation,
  ProviderInfo,
} from '@/types/import/base';
import { parseCSV } from '@/lib/document/parsers/csv-parser';
import { buildPortableConversation, createImportWarning } from './import-portable';

interface GenericTranscriptMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface GenericTranscriptExport {
  title?: string;
  provider?: string;
  model?: string;
  exportedAt?: string;
  messages: GenericTranscriptMessage[];
}

interface GenericTranscriptBatchExport {
  conversations: GenericTranscriptExport[];
}

function mapRole(role: string): MessageRole {
  switch (role.toLowerCase()) {
    case 'assistant':
    case 'model':
      return 'assistant';
    case 'system':
      return 'system';
    case 'tool':
      return 'tool';
    case 'human':
    case 'user':
    default:
      return 'user';
  }
}

function resolveProvider(provider: string | undefined, fallback = 'openai'): Session['provider'] {
  const normalized = provider?.toLowerCase();

  switch (normalized) {
    case 'openai':
    case 'chatgpt':
      return 'openai';
    case 'anthropic':
    case 'claude':
      return 'anthropic';
    case 'google':
    case 'gemini':
      return 'google';
    default:
      return fallback as Session['provider'];
  }
}

function createSessionFromTranscript(
  title: string,
  options: ChatImportOptions,
  provider?: string,
  model?: string,
  createdAt?: Date
): Session {
  const now = createdAt ?? new Date();

  return {
    id: nanoid(),
    title,
    createdAt: now,
    updatedAt: now,
    provider: resolveProvider(provider, options.defaultProvider || 'openai'),
    model: model || options.defaultModel || 'imported-transcript',
    mode: options.defaultMode || 'chat',
    messageCount: 0,
  };
}

function buildParsedConversation(
  session: Session,
  messages: UIMessage[],
  warnings: ChatImportWarning[],
  sourceFormat: 'markdown-transcript' | 'csv-transcript' | 'json-transcript'
): ParsedConversation {
  const compatibility = 'adapted' as const;
  const normalizedSession: Session = {
    ...session,
    messageCount: messages.length,
    lastMessagePreview: messages[messages.length - 1]?.content.slice(0, 100),
  };

  return {
    session: normalizedSession,
    messages,
    metadata: {
      sourceFormat,
      sourceType: 'generic',
      compatibility,
      warnings,
      portableConversation: buildPortableConversation({
        session: normalizedSession,
        messages,
        sourceFormat,
        sourceType: 'generic',
        compatibility,
        warnings,
      }),
    },
  };
}

function createPreviewFromParsed(conversations: ParsedConversation[]) {
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
  };
}

function extractMarkdownTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || 'Imported Markdown Transcript';
}

function parseMarkdownMessages(content: string): GenericTranscriptMessage[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const messages: GenericTranscriptMessage[] = [];
  let currentRole: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentRole) return;
    const text = buffer.join('\n').trim();
    if (!text) return;
    messages.push({
      role: currentRole,
      content: text,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^(?:#{1,6}\s+)(User|Assistant|System|Tool)\s*$/i);
    const boldMatch = line.match(/^\*\*(User|Assistant|System|Tool)\*\*:?\s*$/i);
    const labelMatch = line.match(/^(User|Assistant|System|Tool):\s*$/i);
    const role = headingMatch?.[1] || boldMatch?.[1] || labelMatch?.[1];

    if (role) {
      flush();
      currentRole = role.toLowerCase();
      buffer = [];
      continue;
    }

    if (currentRole) {
      buffer.push(rawLine);
    }
  }

  flush();
  return messages;
}

function hasRequiredCSVHeaders(headers: string[]): boolean {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const hasRole = normalized.includes('role');
  const hasContent = normalized.includes('content');
  const hasTimestamp = normalized.some((header) =>
    ['timestamp', 'time', 'created_at', 'createdat'].includes(header)
  );

  return hasRole && hasContent && hasTimestamp;
}

function parseCSVMessages(content: string): GenericTranscriptMessage[] {
  const result = parseCSV(content);
  const headerIndex = result.headers.reduce<Record<string, number>>((acc, header, index) => {
    acc[header.trim().toLowerCase()] = index;
    return acc;
  }, {});

  const timestampColumn = Object.keys(headerIndex).find((header) =>
    ['timestamp', 'time', 'created_at', 'createdat'].includes(header)
  );

  if (timestampColumn === undefined) {
    return [];
  }

  return result.data.map((row) => ({
    role: row[headerIndex.role] || 'user',
    content: row[headerIndex.content] || '',
    timestamp: row[headerIndex[timestampColumn]],
  }));
}

function isGenericTranscriptExport(data: unknown): data is GenericTranscriptExport | GenericTranscriptBatchExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if ('messages' in obj && Array.isArray(obj.messages)) {
    return obj.messages.every((message) => {
      if (!message || typeof message !== 'object') return false;
      const record = message as Record<string, unknown>;
      return 'role' in record && 'content' in record;
    });
  }

  if ('conversations' in obj && Array.isArray(obj.conversations)) {
    return obj.conversations.every((conversation) => {
      if (!conversation || typeof conversation !== 'object') return false;
      const record = conversation as Record<string, unknown>;
      return 'messages' in record && Array.isArray(record.messages);
    });
  }

  return false;
}

export class MarkdownTranscriptImporter implements ChatImporter<string> {
  getFormat() {
    return 'markdown-transcript' as const;
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'openai',
      defaultModel: 'imported-transcript',
      icon: 'file-text',
    };
  }

  detect(data: unknown): data is string {
    if (typeof data !== 'string') return false;
    return parseMarkdownMessages(data).length >= 2;
  }

  async parse(
    data: string,
    options: ChatImportOptions
  ): Promise<{ conversations: ParsedConversation[]; errors: ChatImportError[] }> {
    const messages = parseMarkdownMessages(data);
    const warnings: ChatImportWarning[] = [
      createImportWarning(
        'metadata_skipped',
        'Markdown transcript import preserves message order but does not include original timestamps.'
      ),
    ];
    const now = new Date();
    const uiMessages: UIMessage[] = messages.map((message, index) => ({
      id: nanoid(),
      role: mapRole(message.role),
      content: message.content,
      createdAt: new Date(now.getTime() + index),
      provider: options.defaultProvider,
      model: options.defaultModel,
    }));

    return {
      conversations: [
        buildParsedConversation(
          createSessionFromTranscript(extractMarkdownTitle(data), options, undefined, undefined, now),
          uiMessages,
          warnings,
          'markdown-transcript'
        ),
      ],
      errors: [],
    };
  }

  async preview(data: string, options: ChatImportOptions) {
    const parsed = await this.parse(data, options);
    return {
      ...createPreviewFromParsed(parsed.conversations),
      errors: parsed.errors,
    };
  }
}

export class CSVTranscriptImporter implements ChatImporter<string> {
  getFormat() {
    return 'csv-transcript' as const;
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'openai',
      defaultModel: 'imported-transcript',
      icon: 'table',
    };
  }

  detect(data: unknown): data is string {
    if (typeof data !== 'string') return false;
    const result = parseCSV(data);
    return result.headers.length > 0 && result.rowCount > 0 && hasRequiredCSVHeaders(result.headers);
  }

  async parse(
    data: string,
    options: ChatImportOptions
  ): Promise<{ conversations: ParsedConversation[]; errors: ChatImportError[] }> {
    const messages = parseCSVMessages(data);
    const warnings: ChatImportWarning[] = [];
    const uiMessages: UIMessage[] = messages.map((message, index) => ({
      id: nanoid(),
      role: mapRole(message.role),
      content: message.content,
      createdAt: message.timestamp ? new Date(message.timestamp) : new Date(Date.now() + index),
      provider: options.defaultProvider,
      model: options.defaultModel,
    }));

    return {
      conversations: [
        buildParsedConversation(
          createSessionFromTranscript('Imported CSV Transcript', options),
          uiMessages,
          warnings,
          'csv-transcript'
        ),
      ],
      errors: [],
    };
  }

  async preview(data: string, options: ChatImportOptions) {
    const parsed = await this.parse(data, options);
    return {
      ...createPreviewFromParsed(parsed.conversations),
      errors: parsed.errors,
    };
  }
}

export class JSONTranscriptImporter implements ChatImporter<GenericTranscriptExport | GenericTranscriptBatchExport> {
  getFormat() {
    return 'json-transcript' as const;
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'openai',
      defaultModel: 'imported-transcript',
      icon: 'file-json',
    };
  }

  detect(data: unknown): data is GenericTranscriptExport | GenericTranscriptBatchExport {
    return isGenericTranscriptExport(data);
  }

  async parse(
    data: GenericTranscriptExport | GenericTranscriptBatchExport,
    options: ChatImportOptions
  ): Promise<{ conversations: ParsedConversation[]; errors: ChatImportError[] }> {
    const transcriptConversations = 'conversations' in data ? data.conversations : [data];

    return {
      conversations: transcriptConversations.map((conversation) => {
        const uiMessages: UIMessage[] = conversation.messages.map((message, index) => ({
          id: nanoid(),
          role: mapRole(message.role),
          content: message.content,
          createdAt: message.timestamp ? new Date(message.timestamp) : new Date(Date.now() + index),
          provider: resolveProvider(conversation.provider, options.defaultProvider || 'openai'),
          model: conversation.model || options.defaultModel,
        }));

        return buildParsedConversation(
          createSessionFromTranscript(
            conversation.title || 'Imported JSON Transcript',
            options,
            conversation.provider,
            conversation.model
          ),
          uiMessages,
          [],
          'json-transcript'
        );
      }),
      errors: [],
    };
  }

  async preview(
    data: GenericTranscriptExport | GenericTranscriptBatchExport,
    options: ChatImportOptions
  ) {
    const parsed = await this.parse(data, options);
    return {
      ...createPreviewFromParsed(parsed.conversations),
      errors: parsed.errors,
    };
  }
}
