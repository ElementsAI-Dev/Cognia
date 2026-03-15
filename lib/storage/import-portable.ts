import type { Attachment, Source, Session, UIMessage } from '@/types/core';
import type {
  ChatImportCompatibility,
  ChatImportFormat,
  ChatImportSourceType,
  PortableConversationSessionSnapshot,
  ChatImportWarning,
  PortableAttachmentSummary,
  PortableChatArchive,
  PortableCitationSummary,
  PortableConversation,
  PortableMessage,
  PortableMessagePartSummary,
} from '@/types/import/base';

interface BuildPortableConversationOptions {
  session: Session;
  messages: UIMessage[];
  sourceFormat: ChatImportFormat;
  sourceType: ChatImportSourceType;
  compatibility: ChatImportCompatibility;
  warnings?: ChatImportWarning[];
  metadata?: Record<string, unknown>;
  messageDetails?: Record<string, Partial<PortableMessage>>;
}

function mapAttachmentKind(kind: Attachment['type']): PortableAttachmentSummary['kind'] {
  switch (kind) {
    case 'image':
      return 'image';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'document':
      return 'artifact';
    case 'archive':
      return 'file';
    default:
      return 'file';
  }
}

function mapAttachmentToPortableSummary(attachment: Attachment): PortableAttachmentSummary {
  return {
    id: attachment.id,
    name: attachment.name,
    kind: mapAttachmentKind(attachment.type),
    mimeType: attachment.mimeType,
    sizeBytes: attachment.size,
    url: attachment.url,
  };
}

function mapSourceToPortableCitation(source: Source): PortableCitationSummary {
  return {
    title: source.title,
    url: source.url,
    snippet: source.snippet,
  };
}

function buildDefaultParts(message: UIMessage): PortableMessagePartSummary[] {
  if (!message.content.trim()) {
    return [];
  }

  return [
    {
      kind: 'text',
      text: message.content,
    },
  ];
}

export function createImportWarning(
  code: ChatImportWarning['code'],
  message: string,
  overrides: Partial<ChatImportWarning> = {}
): ChatImportWarning {
  return {
    code,
    message,
    severity: 'warning',
    ...overrides,
  };
}

export function buildPortableConversation({
  session,
  messages,
  sourceFormat,
  sourceType,
  compatibility,
  warnings = [],
  metadata,
  messageDetails = {},
}: BuildPortableConversationOptions): PortableConversation {
  const existingSessionMetadata =
    metadata && typeof metadata === 'object' && 'session' in metadata && metadata.session
      ? (metadata.session as Record<string, unknown>)
      : {};
  const sessionSnapshot: PortableConversationSessionSnapshot = {
    provider: session.provider,
    model: session.model,
    mode: session.mode,
    systemPrompt: session.systemPrompt,
    temperature: session.temperature,
    maxTokens: session.maxTokens,
    topP: session.topP,
    frequencyPenalty: session.frequencyPenalty,
    presencePenalty: session.presencePenalty,
  };

  return {
    id: session.id,
    title: session.title,
    sourceFormat,
    sourceType,
    compatibility,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    warnings,
    metadata: {
      ...(metadata || {}),
      session: {
        ...existingSessionMetadata,
        ...sessionSnapshot,
      },
    },
    messages: messages.map((message) => {
      const detail = messageDetails[message.id] ?? {};
      const attachments = [
        ...(message.attachments?.map(mapAttachmentToPortableSummary) ?? []),
        ...(detail.attachments ?? []),
      ];
      const citations = [
        ...(message.sources?.map(mapSourceToPortableCitation) ?? []),
        ...(detail.citations ?? []),
      ];
      const parts = detail.parts ?? buildDefaultParts(message);

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        provider: message.provider,
        model: message.model,
        attachments: attachments.length > 0 ? attachments : undefined,
        citations: citations.length > 0 ? citations : undefined,
        parts: parts.length > 0 ? parts : undefined,
        warnings: detail.warnings,
        metadata: detail.metadata,
      };
    }),
  };
}

export function buildPortableArchive(
  conversations: PortableConversation[],
  exportedAt = new Date()
): PortableChatArchive {
  return {
    version: '1.0',
    exportedAt: exportedAt.toISOString(),
    source: {
      app: 'cognia',
      format: 'portable',
    },
    conversations,
  };
}
