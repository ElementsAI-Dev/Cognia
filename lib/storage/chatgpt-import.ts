/**
 * ChatGPT Import Utilities
 * Parse and convert ChatGPT export format to Cognia format
 */

import { nanoid } from 'nanoid';
import type { Session, UIMessage, MessageRole } from '@/types/core';
import type {
  ChatGPTConversation,
  ChatGPTNode,
  ChatGPTMessage,
  ChatImportFormat,
  ChatImportOptions,
  ChatImportResult,
  ChatImportError,
} from '@/types/import';

const DEFAULT_IMPORT_OPTIONS: ChatImportOptions = {
  mergeStrategy: 'merge',
  generateNewIds: true,
  preserveTimestamps: true,
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  defaultMode: 'chat',
};

/**
 * Detect if a parsed JSON is ChatGPT export format
 */
export function isChatGPTFormat(data: unknown): data is ChatGPTConversation[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;

  const first = data[0];
  if (typeof first !== 'object' || first === null) return false;

  // ChatGPT format has: mapping, current_node, create_time
  return (
    'mapping' in first &&
    typeof first.mapping === 'object' &&
    'current_node' in first &&
    'create_time' in first
  );
}

/**
 * Detect import format from parsed JSON
 */
export function detectImportFormat(data: unknown): ChatImportFormat {
  if (!data || typeof data !== 'object') return 'unknown';

  // Check for ChatGPT format (array of conversations with mapping)
  if (isChatGPTFormat(data)) {
    return 'chatgpt';
  }

  // Check for Cognia format (has version, exportedAt, sessions)
  if (
    'version' in (data as Record<string, unknown>) &&
    'exportedAt' in (data as Record<string, unknown>)
  ) {
    return 'cognia';
  }

  return 'unknown';
}

/**
 * Extract messages from ChatGPT conversation tree structure
 * Follows the main conversation path from root to current_node
 */
function extractMessagesFromMapping(
  mapping: Record<string, ChatGPTNode>,
  currentNodeId: string
): ChatGPTMessage[] {
  const messages: ChatGPTMessage[] = [];

  // Build path from root to current node by traversing backwards
  const path: string[] = [];
  let nodeId: string | null = currentNodeId;

  while (nodeId) {
    path.unshift(nodeId);
    const node: ChatGPTNode | undefined = mapping[nodeId];
    nodeId = node?.parent ?? null;
  }

  // Extract messages along the path
  for (const id of path) {
    const node = mapping[id];
    if (node?.message && node.message.content) {
      // Skip system messages with empty content
      const contentText = extractTextContent(node.message.content);
      if (contentText || node.message.author.role !== 'system') {
        messages.push(node.message);
      }
    }
  }

  return messages;
}

/**
 * Extract text content from ChatGPT content structure
 */
function extractTextContent(content: ChatGPTMessage['content']): string {
  if (!content || !content.parts) return '';

  return content.parts
    .map((part) => {
      if (typeof part === 'string') return part;
      // Handle image/file parts - return placeholder
      if (typeof part === 'object' && part.content_type) {
        if (part.content_type === 'image_asset_pointer') {
          return '[Image]';
        }
        return `[${part.content_type}]`;
      }
      return '';
    })
    .join('\n')
    .trim();
}

/**
 * Map ChatGPT role to Cognia MessageRole
 */
function mapRole(role: string): MessageRole {
  switch (role) {
    case 'user':
      return 'user';
    case 'assistant':
      return 'assistant';
    case 'system':
      return 'system';
    case 'tool':
      return 'assistant'; // Map tool responses to assistant
    default:
      return 'user';
  }
}

/**
 * Convert a single ChatGPT conversation to Cognia Session and Messages
 */
export function convertConversation(
  conversation: ChatGPTConversation,
  options: ChatImportOptions = DEFAULT_IMPORT_OPTIONS
): { session: Session; messages: UIMessage[] } {
  const now = new Date();
  const createdAt = options.preserveTimestamps
    ? new Date(conversation.create_time * 1000)
    : now;
  const updatedAt = options.preserveTimestamps
    ? new Date(conversation.update_time * 1000)
    : now;

  // Extract messages from the tree structure
  const chatGPTMessages = extractMessagesFromMapping(
    conversation.mapping,
    conversation.current_node
  );

  // Convert messages
  const messages: UIMessage[] = chatGPTMessages.map((msg) => {
    const msgCreatedAt = options.preserveTimestamps && msg.create_time
      ? new Date(msg.create_time * 1000)
      : now;

    return {
      id: options.generateNewIds ? nanoid() : msg.id,
      role: mapRole(msg.author.role),
      content: extractTextContent(msg.content),
      createdAt: msgCreatedAt,
      model: msg.metadata?.model_slug || options.defaultModel,
      provider: options.defaultProvider,
    };
  });

  // Filter out empty messages
  const validMessages = messages.filter((m) => m.content.trim().length > 0);

  // Create session
  const session: Session = {
    id: options.generateNewIds ? nanoid() : conversation.id,
    title: conversation.title || 'Imported Chat',
    createdAt,
    updatedAt,
    provider: options.defaultProvider as Session['provider'],
    model: options.defaultModel || 'gpt-4',
    mode: options.defaultMode || 'chat',
    messageCount: validMessages.length,
    lastMessagePreview: validMessages[validMessages.length - 1]?.content.slice(0, 100),
  };

  return { session, messages: validMessages };
}

/**
 * Parse and convert ChatGPT export file
 */
export async function parseChatGPTExport(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<{
  conversations: Array<{ session: Session; messages: UIMessage[] }>;
  errors: ChatImportError[];
}> {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const errors: ChatImportError[] = [];
  const conversations: Array<{ session: Session; messages: UIMessage[] }> = [];

  let data: unknown;
  try {
    data = JSON.parse(fileContent);
  } catch {
    errors.push({ message: 'Invalid JSON format' });
    return { conversations, errors };
  }

  if (!isChatGPTFormat(data)) {
    errors.push({ message: 'Not a valid ChatGPT export format' });
    return { conversations, errors };
  }

  for (const conversation of data) {
    try {
      const result = convertConversation(conversation, opts);
      conversations.push(result);
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

/**
 * Import ChatGPT conversations into Cognia
 */
export async function importChatGPTConversations(
  fileContent: string,
  options: Partial<ChatImportOptions> = {}
): Promise<ChatImportResult> {
  const { conversations, errors } = await parseChatGPTExport(fileContent, options);

  if (conversations.length === 0) {
    return {
      success: false,
      imported: { sessions: 0, messages: 0 },
      errors,
      warnings: [],
    };
  }

  // Dynamic imports to avoid circular dependencies
  const { useSessionStore } = await import('@/stores');
  const { db } = await import('@/lib/db');
  const { messageRepository } = await import('@/lib/db/repositories/message-repository');

  const warnings: string[] = [];
  let importedSessions = 0;
  let importedMessages = 0;

  const store = useSessionStore.getState();

  for (const { session, messages } of conversations) {
    try {
      // Check for existing session
      const existingSession = store.sessions.find((s) => s.id === session.id);

      if (existingSession && options.mergeStrategy === 'skip') {
        warnings.push(`Skipped existing session: ${session.title}`);
        continue;
      }

      // Add session to Zustand store and get the created session
      const newSession = store.createSession({
        title: session.title,
        provider: session.provider,
        model: session.model,
        mode: session.mode,
      });

      // Note: Timestamps are preserved in the IndexedDB entry below
      // The Zustand store's updateSession doesn't support updating createdAt/updatedAt directly

      // Persist session to IndexedDB
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

      // Add messages to IndexedDB
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

/**
 * Preview ChatGPT import without persisting
 */
export async function previewChatGPTImport(
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
  const { conversations, errors } = await parseChatGPTExport(fileContent, options);

  const preview = conversations.map(({ session, messages }) => ({
    id: session.id,
    title: session.title,
    messageCount: messages.length,
    createdAt: session.createdAt,
    preview: messages[0]?.content.slice(0, 100) || '',
  }));

  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);

  return {
    conversations: preview,
    totalMessages,
    errors,
  };
}
