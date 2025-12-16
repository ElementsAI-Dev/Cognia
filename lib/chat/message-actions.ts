/**
 * Message Actions - utilities for message editing, bookmarking, reactions, etc.
 */

import type { UIMessage, MessageReaction, MessageEdit } from '@/types';

/**
 * Edit a message and preserve edit history
 */
export function editMessage(
  message: UIMessage,
  newContent: string
): UIMessage {
  const editHistory: MessageEdit[] = message.editHistory || [];
  
  // Add current content to history before editing
  editHistory.push({
    content: message.content,
    editedAt: new Date(),
  });

  return {
    ...message,
    content: newContent,
    isEdited: true,
    editHistory,
    originalContent: message.originalContent || message.content,
  };
}

/**
 * Toggle bookmark on a message
 */
export function toggleBookmark(message: UIMessage): UIMessage {
  return {
    ...message,
    isBookmarked: !message.isBookmarked,
    bookmarkedAt: message.isBookmarked ? undefined : new Date(),
  };
}

/**
 * Set reaction on a message
 */
export function setReaction(
  message: UIMessage,
  reaction: MessageReaction | null
): UIMessage {
  return {
    ...message,
    reaction: reaction || undefined,
  };
}

/**
 * Set translation on a message
 */
export function setTranslation(
  message: UIMessage,
  translatedContent: string,
  targetLanguage: string
): UIMessage {
  return {
    ...message,
    translatedContent,
    translatedTo: targetLanguage,
  };
}

/**
 * Clear translation from a message
 */
export function clearTranslation(message: UIMessage): UIMessage {
  return {
    ...message,
    translatedContent: undefined,
    translatedTo: undefined,
  };
}

/**
 * Create a branch from a message
 */
export function createBranchFromMessage(
  message: UIMessage,
  branchId: string
): UIMessage {
  return {
    ...message,
    branchId,
    parentMessageId: message.id,
  };
}

/**
 * Get all bookmarked messages from a list
 */
export function getBookmarkedMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter((m) => m.isBookmarked);
}

/**
 * Search messages by content
 */
export function searchMessages(
  messages: UIMessage[],
  query: string
): UIMessage[] {
  const lowerQuery = query.toLowerCase();
  return messages.filter(
    (m) =>
      m.content.toLowerCase().includes(lowerQuery) ||
      m.translatedContent?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get message statistics
 */
export function getMessageStats(messages: UIMessage[]): {
  total: number;
  userMessages: number;
  assistantMessages: number;
  bookmarked: number;
  edited: number;
  withReactions: number;
} {
  return {
    total: messages.length,
    userMessages: messages.filter((m) => m.role === 'user').length,
    assistantMessages: messages.filter((m) => m.role === 'assistant').length,
    bookmarked: messages.filter((m) => m.isBookmarked).length,
    edited: messages.filter((m) => m.isEdited).length,
    withReactions: messages.filter((m) => m.reaction).length,
  };
}

/**
 * Copy message content to clipboard
 */
export async function copyMessageToClipboard(message: UIMessage): Promise<void> {
  await navigator.clipboard.writeText(message.content);
}

/**
 * Format message for sharing
 */
export function formatMessageForSharing(message: UIMessage): string {
  const role = message.role === 'user' ? 'You' : 'Assistant';
  const timestamp = message.createdAt.toLocaleString();
  return `[${role}] (${timestamp})\n${message.content}`;
}
