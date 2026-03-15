import { nanoid } from 'nanoid';
import type { Session, UIMessage } from '@/types/core';
import type {
  ChatImporter,
  ChatImportError,
  ChatImportOptions,
  ParsedConversation,
  PortableAttachmentSummary,
  PortableChatArchive,
  PortableConversation,
  PortableConversationSessionSnapshot,
  ProviderInfo,
} from '@/types/import/base';
import { buildPortableConversation } from './import-portable';

function isPortableConversation(data: unknown): data is PortableConversation {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    Array.isArray(record.messages)
  );
}

export function isPortableChatArchive(data: unknown): data is PortableChatArchive {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;

  return (
    record.version === '1.0' &&
    typeof record.exportedAt === 'string' &&
    typeof record.source === 'object' &&
    record.source !== null &&
    (record.source as Record<string, unknown>).format === 'portable' &&
    Array.isArray(record.conversations) &&
    record.conversations.every((conversation) => isPortableConversation(conversation))
  );
}

function mapAttachmentKind(
  kind: PortableAttachmentSummary['kind']
): NonNullable<UIMessage['attachments']>[number]['type'] {
  switch (kind) {
    case 'image':
      return 'image';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'artifact':
      return 'document';
    default:
      return 'file';
  }
}

function extractSessionSnapshot(
  metadata?: Record<string, unknown>
): PortableConversationSessionSnapshot | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const snapshot = metadata.session;
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return snapshot as PortableConversationSessionSnapshot;
}

function convertPortableConversation(
  conversation: PortableConversation,
  options: ChatImportOptions
): ParsedConversation {
  const sessionSnapshot = extractSessionSnapshot(conversation.metadata);
  const session: Session = {
    id: options.generateNewIds ? nanoid() : conversation.id,
    title: conversation.title,
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt),
    provider:
      sessionSnapshot?.provider ||
      ((options.defaultProvider || 'openai') as Session['provider']),
    model:
      sessionSnapshot?.model ||
      options.defaultModel ||
      'imported-portable-archive',
    mode: sessionSnapshot?.mode || options.defaultMode || 'chat',
    systemPrompt: sessionSnapshot?.systemPrompt,
    temperature: sessionSnapshot?.temperature,
    maxTokens: sessionSnapshot?.maxTokens,
    topP: sessionSnapshot?.topP,
    frequencyPenalty: sessionSnapshot?.frequencyPenalty,
    presencePenalty: sessionSnapshot?.presencePenalty,
    messageCount: conversation.messages.length,
    lastMessagePreview: conversation.messages[conversation.messages.length - 1]?.content.slice(0, 100),
  };

  const messages: UIMessage[] = conversation.messages.map((message) => ({
    id: options.generateNewIds ? nanoid() : message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date(message.createdAt),
    provider: message.provider || options.defaultProvider,
    model: message.model || options.defaultModel,
    attachments: message.attachments?.map((attachment) => ({
      id: attachment.id || nanoid(),
      name: attachment.name,
      type: mapAttachmentKind(attachment.kind),
      url: attachment.url || `import://portable/${attachment.kind}/${encodeURIComponent(attachment.name)}`,
      size: attachment.sizeBytes || 0,
      mimeType: attachment.mimeType || 'application/octet-stream',
    })),
    sources: message.citations?.map((citation, index) => ({
      id: `${message.id}-citation-${index}`,
      title: citation.title,
      url: citation.url || '',
      snippet: citation.snippet || '',
      relevance: 1,
    })),
  }));

  return {
    session,
    messages,
    metadata: {
      sourceFormat: 'portable',
      sourceType: 'portable',
      compatibility: 'official',
      portableConversation: buildPortableConversation({
        session,
        messages,
        sourceFormat: 'portable',
        sourceType: 'portable',
        compatibility: 'official',
      }),
    },
  };
}

export class PortableChatArchiveImporter implements ChatImporter<PortableChatArchive> {
  getFormat() {
    return 'portable' as const;
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'openai',
      defaultModel: 'imported-portable-archive',
      icon: 'archive',
    };
  }

  detect(data: unknown): data is PortableChatArchive {
    return isPortableChatArchive(data);
  }

  async parse(
    data: PortableChatArchive,
    options: ChatImportOptions
  ): Promise<{ conversations: ParsedConversation[]; errors: ChatImportError[] }> {
    return {
      conversations: data.conversations.map((conversation) =>
        convertPortableConversation(conversation, options)
      ),
      errors: [],
    };
  }

  async preview(data: PortableChatArchive, options: ChatImportOptions) {
    const parsed = await this.parse(data, options);

    return {
      conversations: parsed.conversations.map(({ session, messages, metadata }) => ({
        id: session.id,
        title: session.title,
        messageCount: messages.length,
        createdAt: session.createdAt,
        preview: messages[0]?.content.slice(0, 100) || '',
        compatibility: metadata?.compatibility,
        warnings: metadata?.warnings,
      })),
      totalMessages: parsed.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
      errors: parsed.errors,
    };
  }
}
