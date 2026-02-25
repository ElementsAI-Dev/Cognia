/**
 * Message Repository - data access layer for messages
 */

import Dexie from 'dexie';
import { db, type DBMessage } from '../schema';
import { withRetry } from '../utils';
import type { UIMessage } from '@/types';
import { nanoid } from 'nanoid';

// Convert DBMessage to UIMessage
export function toUIMessage(dbMessage: DBMessage): UIMessage {
  return {
    id: dbMessage.id,
    sessionId: dbMessage.sessionId,
    branchId: dbMessage.branchId,
    role: dbMessage.role as UIMessage['role'],
    content: dbMessage.content,
    parts: dbMessage.parts ? JSON.parse(dbMessage.parts) : undefined,
    model: dbMessage.model,
    provider: dbMessage.provider,
    tokens: dbMessage.tokens ? JSON.parse(dbMessage.tokens) : undefined,
    attachments: dbMessage.attachments ? JSON.parse(dbMessage.attachments) : undefined,
    sources: dbMessage.sources ? JSON.parse(dbMessage.sources) : undefined,
    error: dbMessage.error,
    createdAt: dbMessage.createdAt,
    isEdited: dbMessage.isEdited,
    editHistory: dbMessage.editHistory ? JSON.parse(dbMessage.editHistory) : undefined,
    originalContent: dbMessage.originalContent,
    isBookmarked: dbMessage.isBookmarked,
    bookmarkedAt: dbMessage.bookmarkedAt,
    reaction: dbMessage.reaction as UIMessage['reaction'],
    reactions: dbMessage.reactions ? JSON.parse(dbMessage.reactions) : undefined,
  } as UIMessage;
}

// Convert UIMessage to DBMessage
export function toDBMessage(message: UIMessage, sessionId: string, branchId?: string): DBMessage {
  return {
    id: message.id,
    sessionId,
    branchId: branchId ?? message.branchId,
    role: message.role,
    content: message.content,
    parts: message.parts ? JSON.stringify(message.parts) : undefined,
    model: message.model,
    provider: message.provider,
    tokens: message.tokens ? JSON.stringify(message.tokens) : undefined,
    attachments: message.attachments ? JSON.stringify(message.attachments) : undefined,
    sources: message.sources ? JSON.stringify(message.sources) : undefined,
    error: message.error,
    createdAt: message.createdAt,
    isEdited: message.isEdited,
    editHistory: message.editHistory ? JSON.stringify(message.editHistory) : undefined,
    originalContent: message.originalContent,
    isBookmarked: message.isBookmarked,
    bookmarkedAt: message.bookmarkedAt,
    reaction: message.reaction,
    reactions: message.reactions ? JSON.stringify(message.reactions) : undefined,
  };
}

export const messageRepository = {
  /**
   * Get all messages for a session
   */
  async getBySessionId(sessionId: string): Promise<UIMessage[]> {
    const messages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');

    return messages.map(toUIMessage);
  },

  /**
   * Get a single message by ID
   */
  async getById(id: string): Promise<UIMessage | undefined> {
    const message = await db.messages.get(id);
    return message ? toUIMessage(message) : undefined;
  },

  /**
   * Create a new message
   */
  async create(
    sessionId: string,
    input: Omit<UIMessage, 'id' | 'createdAt'>
  ): Promise<UIMessage> {
    const inputWithOptionalIds = input as unknown as Partial<Pick<UIMessage, 'id' | 'createdAt'>>;
    const message: UIMessage = {
      ...input,
      id: inputWithOptionalIds.id ?? nanoid(),
      createdAt: inputWithOptionalIds.createdAt ?? new Date(),
    };

    return withRetry(async () => {
      await db.transaction('rw', [db.messages, db.sessions], async () => {
        await db.messages.add(toDBMessage(message, sessionId));

        // Update session message count
        const session = await db.sessions.get(sessionId);
        if (session) {
          await db.sessions.update(sessionId, {
            messageCount: (session.messageCount || 0) + 1,
            lastMessagePreview: message.content.slice(0, 100),
            updatedAt: new Date(),
          });
        }
      });

      return message;
    }, 'messageRepository.create');
  },

  /**
   * Update an existing message
   */
  async update(id: string, updates: Partial<UIMessage>): Promise<void> {
    const existing = await db.messages.get(id);
    if (!existing) return;

    const updateData: Partial<DBMessage> = {};

    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.parts !== undefined) updateData.parts = JSON.stringify(updates.parts);
    if (updates.tokens !== undefined) updateData.tokens = JSON.stringify(updates.tokens);
    if (updates.error !== undefined) updateData.error = updates.error;
    if (updates.isEdited !== undefined) updateData.isEdited = updates.isEdited;
    if (updates.editHistory !== undefined) updateData.editHistory = JSON.stringify(updates.editHistory);
    if (updates.originalContent !== undefined) updateData.originalContent = updates.originalContent;
    if (updates.isBookmarked !== undefined) updateData.isBookmarked = updates.isBookmarked;
    if (updates.bookmarkedAt !== undefined) updateData.bookmarkedAt = updates.bookmarkedAt;
    if (updates.reaction !== undefined) updateData.reaction = updates.reaction;
    if (updates.reactions !== undefined) updateData.reactions = JSON.stringify(updates.reactions);

    await withRetry(async () => {
      await db.messages.update(id, updateData);
    }, 'messageRepository.update');
  },

  /**
   * Delete a message
   */
  async delete(id: string): Promise<void> {
    const message = await db.messages.get(id);
    if (!message) return;

    await withRetry(async () => {
      await db.transaction('rw', [db.messages, db.sessions], async () => {
        await db.messages.delete(id);

        // Update session message count
        const session = await db.sessions.get(message.sessionId);
        if (session && session.messageCount > 0) {
          await db.sessions.update(message.sessionId, {
            messageCount: session.messageCount - 1,
            updatedAt: new Date(),
          });
        }
      });
    }, 'messageRepository.delete');
  },

  /**
   * Delete all messages for a session
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await withRetry(async () => {
      await db.messages.where('sessionId').equals(sessionId).delete();
    }, 'messageRepository.deleteBySessionId');
  },

  /**
   * Bulk create messages
   */
  async bulkCreate(sessionId: string, messages: UIMessage[]): Promise<void> {
    await withRetry(async () => {
      await db.transaction('rw', [db.messages, db.sessions], async () => {
        const dbMessages = messages.map((m) => toDBMessage(m, sessionId));
        await db.messages.bulkAdd(dbMessages);

        // Update session
        const session = await db.sessions.get(sessionId);
        if (session) {
          const lastMessage = messages[messages.length - 1];
          await db.sessions.update(sessionId, {
            messageCount: (session.messageCount || 0) + messages.length,
            lastMessagePreview: lastMessage?.content.slice(0, 100),
            updatedAt: new Date(),
          });
        }
      });
    }, 'messageRepository.bulkCreate');
  },

  /**
   * Get message count for a session
   */
  async getCountBySessionId(sessionId: string): Promise<number> {
    return db.messages.where('sessionId').equals(sessionId).count();
  },

  /**
   * Get messages for a session filtered by branch
   * @param sessionId - The session ID
   * @param branchId - The branch ID (null/undefined for main branch)
   */
  async getBySessionIdAndBranch(
    sessionId: string,
    branchId?: string | null
  ): Promise<UIMessage[]> {
    const effectiveBranchId = branchId ?? undefined;

    const messages = await db.messages
      .where('[sessionId+branchId+createdAt]')
      .between(
        [sessionId, effectiveBranchId, Dexie.minKey],
        [sessionId, effectiveBranchId, Dexie.maxKey]
      )
      .toArray();

    // Dexie returns in index order (createdAt ascending) for forward ranges
    return messages.map(toUIMessage);
  },

  /**
   * Get messages for a session+branch in pages (newest-first window).
   *
   * @param before - Only return messages with createdAt < before (exclusive)
   */
  async getPageBySessionIdAndBranch(
    sessionId: string,
    branchId: string | null | undefined,
    options: { limit: number; before?: Date }
  ): Promise<UIMessage[]> {
    // Convert undefined to empty string for valid IndexedDB key
    // Messages with undefined branchId will be matched by empty string in the index
    const effectiveBranchId = branchId ?? '';
    const upper = options.before ?? Dexie.maxKey;

    const page = await db.messages
      .where('[sessionId+branchId+createdAt]')
      .between(
        [sessionId, effectiveBranchId, Dexie.minKey],
        [sessionId, effectiveBranchId, upper],
        true,
        false
      )
      .reverse()
      .limit(options.limit)
      .toArray();

    // Normalize to chronological order for UI
    return page.reverse().map(toUIMessage);
  },

  async getCountBySessionIdAndBranch(
    sessionId: string,
    branchId: string | null | undefined
  ): Promise<number> {
    // Convert undefined to empty string for valid IndexedDB key
    const effectiveBranchId = branchId ?? '';
    return db.messages
      .where('[sessionId+branchId+createdAt]')
      .between(
        [sessionId, effectiveBranchId, Dexie.minKey],
        [sessionId, effectiveBranchId, Dexie.maxKey]
      )
      .count();
  },

  /**
   * Copy messages up to a branch point for creating a new branch
   * @param sessionId - The session ID
   * @param branchPointMessageId - The message ID where branch is created
   * @param newBranchId - The new branch ID
   * @param sourceBranchId - The source branch ID (null for main branch)
   */
  async copyMessagesForBranch(
    sessionId: string,
    branchPointMessageId: string,
    newBranchId: string,
    sourceBranchId?: string | null
  ): Promise<UIMessage[]> {
    // Get all messages from source branch
    const sourceMessages = await this.getBySessionIdAndBranch(sessionId, sourceBranchId);

    // Find the branch point message index
    const branchPointIndex = sourceMessages.findIndex(
      (m) => m.id === branchPointMessageId
    );

    if (branchPointIndex === -1) {
      return [];
    }

    // Copy messages up to and including the branch point
    const messagesToCopy = sourceMessages.slice(0, branchPointIndex + 1);

    // Create new messages with new IDs and the new branchId
    const copiedMessages: UIMessage[] = messagesToCopy.map((m) => ({
      ...m,
      id: nanoid(),
      branchId: newBranchId,
      createdAt: new Date(m.createdAt), // Preserve original timestamp order
    }));

    // Bulk insert the copied messages
    if (copiedMessages.length > 0) {
      await withRetry(async () => {
        const dbMessages = copiedMessages.map((m) => toDBMessage(m, sessionId, newBranchId));
        await db.messages.bulkAdd(dbMessages);
      }, 'messageRepository.copyMessagesForBranch');
    }

    return copiedMessages;
  },

  /**
   * Delete all messages for a specific branch
   */
  async deleteByBranchId(sessionId: string, branchId: string): Promise<void> {
    const messages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .filter((m) => m.branchId === branchId)
      .toArray();

    const ids = messages.map((m) => m.id);
    await withRetry(async () => {
      await db.messages.bulkDelete(ids);
    }, 'messageRepository.deleteByBranchId');
  },

  /**
   * Create a message with branch support
   */
  async createWithBranch(
    sessionId: string,
    branchId: string | undefined,
    input: Omit<UIMessage, 'id' | 'createdAt'>
  ): Promise<UIMessage> {
    const inputWithOptionalIds = input as unknown as Partial<Pick<UIMessage, 'id' | 'createdAt'>>;
    const message: UIMessage = {
      ...input,
      id: inputWithOptionalIds.id ?? nanoid(),
      branchId,
      createdAt: inputWithOptionalIds.createdAt ?? new Date(),
    };

    return withRetry(async () => {
      await db.transaction('rw', [db.messages, db.sessions], async () => {
        await db.messages.add(toDBMessage(message, sessionId, branchId));

        // Update session message count
        const session = await db.sessions.get(sessionId);
        if (session) {
          await db.sessions.update(sessionId, {
            messageCount: (session.messageCount || 0) + 1,
            lastMessagePreview: message.content.slice(0, 100),
            updatedAt: new Date(),
          });
        }
      });
      return message;
    }, 'messageRepository.createWithBranch');
  },

  /**
   * Search messages across all sessions or specific sessions
   * Returns matching messages with session context
   */
  async searchMessages(
    query: string,
    options?: {
      sessionIds?: string[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      roles?: Array<'user' | 'assistant' | 'system'>;
    }
  ): Promise<Array<{
    message: UIMessage;
    sessionId: string;
    matchContext: string;
  }>> {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const limit = options?.limit ?? 50;
    const results: Array<{
      message: UIMessage;
      sessionId: string;
      matchContext: string;
    }> = [];

    // Build base query
    let messagesQuery = db.messages.orderBy('createdAt').reverse();

    // Apply session filter if provided
    if (options?.sessionIds?.length) {
      const sessionSet = new Set(options.sessionIds);
      messagesQuery = messagesQuery.filter((m) => sessionSet.has(m.sessionId));
    }

    // Apply date range filter
    if (options?.dateRange) {
      const { start, end } = options.dateRange;
      messagesQuery = messagesQuery.filter(
        (m) => m.createdAt >= start && m.createdAt <= end
      );
    }

    // Apply role filter
    if (options?.roles?.length) {
      const roleSet = new Set(options.roles);
      messagesQuery = messagesQuery.filter((m) => roleSet.has(m.role as 'user' | 'assistant' | 'system'));
    }

    // Search through messages - use .until() for early cursor termination
    await messagesQuery.until(() => results.length >= limit).each((dbMessage) => {

      const contentLower = dbMessage.content.toLowerCase();
      const matchIndex = contentLower.indexOf(lowerQuery);

      if (matchIndex !== -1) {
        // Extract context around the match (50 chars before and after)
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(dbMessage.content.length, matchIndex + query.length + 50);
        let matchContext = dbMessage.content.slice(contextStart, contextEnd);

        // Add ellipsis if truncated
        if (contextStart > 0) matchContext = '...' + matchContext;
        if (contextEnd < dbMessage.content.length) matchContext = matchContext + '...';

        results.push({
          message: toUIMessage(dbMessage),
          sessionId: dbMessage.sessionId,
          matchContext,
        });
      }
    });

    return results;
  },

  /**
   * Bulk delete messages by IDs (optimized)
   */
  async bulkDelete(messageIds: string[]): Promise<number> {
    if (messageIds.length === 0) return 0;

    return withRetry(async () => {
      await db.messages.bulkDelete(messageIds);
      return messageIds.length;
    }, 'messageRepository.bulkDelete');
  },

  /**
   * Get storage statistics for messages
   */
  async getStorageStats(): Promise<{
    totalMessages: number;
    totalSessions: number;
    messageCounts: Array<{ sessionId: string; count: number }>;
    oldestMessage: Date | null;
    newestMessage: Date | null;
  }> {
    const totalMessages = await db.messages.count();

    // Single-query aggregation: get all sessionId keys (sorted by index) and count in one pass
    const allSessionKeys = await db.messages.orderBy('sessionId').keys();
    const messageCounts: Array<{ sessionId: string; count: number }> = [];
    let currentId = '';
    let currentCount = 0;
    for (const key of allSessionKeys) {
      const id = key as string;
      if (id !== currentId) {
        if (currentId) messageCounts.push({ sessionId: currentId, count: currentCount });
        currentId = id;
        currentCount = 0;
      }
      currentCount++;
    }
    if (currentId) messageCounts.push({ sessionId: currentId, count: currentCount });
    messageCounts.sort((a, b) => b.count - a.count);

    const totalSessions = messageCounts.length;

    let oldestMessage: Date | null = null;
    let newestMessage: Date | null = null;
    const oldest = await db.messages.orderBy('createdAt').first();
    const newest = await db.messages.orderBy('createdAt').last();
    if (oldest) oldestMessage = oldest.createdAt;
    if (newest) newestMessage = newest.createdAt;

    return { totalMessages, totalSessions, messageCounts, oldestMessage, newestMessage };
  },

  /**
   * Delete orphaned messages (messages whose sessionId doesn't exist in sessions table)
   */
  async deleteOrphanedMessages(): Promise<number> {
    const sessionIds = new Set(
      (await db.sessions.toCollection().primaryKeys()) as string[]
    );

    const orphanedIds: string[] = [];
    await db.messages.each((msg) => {
      if (!sessionIds.has(msg.sessionId)) {
        orphanedIds.push(msg.id);
      }
    });

    if (orphanedIds.length === 0) return 0;

    return withRetry(async () => {
      await db.messages.bulkDelete(orphanedIds);
      return orphanedIds.length;
    }, 'messageRepository.deleteOrphanedMessages');
  },

  /**
   * Delete messages older than a given date
   */
  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    // Use indexed query for Date-stored values, with string fallback for environments
    // where structuredClone converts Dates to ISO strings (e.g. test polyfill)
    let oldMessages = await db.messages
      .where('createdAt')
      .below(cutoffDate)
      .primaryKeys();

    if (oldMessages.length === 0) {
      oldMessages = await db.messages
        .where('createdAt')
        .below(cutoffDate.toISOString())
        .primaryKeys();
    }

    if (oldMessages.length === 0) return 0;

    return withRetry(async () => {
      await db.messages.bulkDelete(oldMessages);
      return oldMessages.length;
    }, 'messageRepository.deleteOlderThan');
  },

  /**
   * Delete all messages after a specific message (optimized using bulk delete)
   */
  async deleteMessagesAfterOptimized(
    sessionId: string,
    messageId: string,
    branchId?: string | null
  ): Promise<number> {
    // Get the target message to find its createdAt
    const targetMessage = await db.messages.get(messageId);
    if (!targetMessage) return 0;

    const effectiveBranchId = branchId ?? '';

    // Find all messages after the target in the same session/branch
    const messagesToDelete = await db.messages
      .where('[sessionId+branchId+createdAt]')
      .between(
        [sessionId, effectiveBranchId, targetMessage.createdAt],
        [sessionId, effectiveBranchId, Dexie.maxKey],
        false, // exclude lower bound (the target message itself)
        true   // include upper bound
      )
      .primaryKeys();

    if (messagesToDelete.length === 0) return 0;

    return withRetry(async () => {
      await db.transaction('rw', [db.messages, db.sessions], async () => {
        await db.messages.bulkDelete(messagesToDelete);

        // Update session message count
        const session = await db.sessions.get(sessionId);
        if (session) {
          const newCount = Math.max(0, (session.messageCount || 0) - messagesToDelete.length);
          await db.sessions.update(sessionId, {
            messageCount: newCount,
            updatedAt: new Date(),
          });
        }
      });

      return messagesToDelete.length;
    }, 'messageRepository.deleteMessagesAfterOptimized');
  },
};

export default messageRepository;
