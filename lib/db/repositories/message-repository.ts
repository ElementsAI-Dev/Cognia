/**
 * Message Repository - data access layer for messages
 */

import { db, type DBMessage } from '../schema';
import type { UIMessage } from '@/types';
import { nanoid } from 'nanoid';

// Convert DBMessage to UIMessage
function toUIMessage(dbMessage: DBMessage): UIMessage {
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
  } as UIMessage;
}

// Convert UIMessage to DBMessage
function toDBMessage(message: UIMessage, sessionId: string, branchId?: string): DBMessage {
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
    const message: UIMessage = {
      ...input,
      id: nanoid(),
      createdAt: new Date(),
    };

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

    return message;
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

    await db.messages.update(id, updateData);
  },

  /**
   * Delete a message
   */
  async delete(id: string): Promise<void> {
    const message = await db.messages.get(id);
    if (!message) return;

    await db.messages.delete(id);

    // Update session message count
    const session = await db.sessions.get(message.sessionId);
    if (session && session.messageCount > 0) {
      await db.sessions.update(message.sessionId, {
        messageCount: session.messageCount - 1,
        updatedAt: new Date(),
      });
    }
  },

  /**
   * Delete all messages for a session
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await db.messages.where('sessionId').equals(sessionId).delete();
  },

  /**
   * Bulk create messages
   */
  async bulkCreate(sessionId: string, messages: UIMessage[]): Promise<void> {
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
    const allMessages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');

    // Filter by branchId - undefined/null means main branch
    const filtered = allMessages.filter((m) => {
      if (branchId) {
        return m.branchId === branchId;
      }
      // Main branch: messages without branchId
      return !m.branchId;
    });

    return filtered.map(toUIMessage);
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
      const dbMessages = copiedMessages.map((m) => toDBMessage(m, sessionId, newBranchId));
      await db.messages.bulkAdd(dbMessages);
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
    await db.messages.bulkDelete(ids);
  },

  /**
   * Create a message with branch support
   */
  async createWithBranch(
    sessionId: string,
    branchId: string | undefined,
    input: Omit<UIMessage, 'id' | 'createdAt'>
  ): Promise<UIMessage> {
    const message: UIMessage = {
      ...input,
      id: nanoid(),
      branchId,
      createdAt: new Date(),
    };

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

    return message;
  },
};

export default messageRepository;
