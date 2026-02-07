/**
 * Session Repository - data access layer for sessions
 */

import { db, type DBSession } from '../schema';
import { withRetry } from '../utils';
import type { Session, CreateSessionInput, UpdateSessionInput } from '@/types';
import { nanoid } from 'nanoid';
import { messageRepository } from './message-repository';

// Convert DBSession to Session
function toSession(dbSession: DBSession): Session {
  return {
    id: dbSession.id,
    title: dbSession.title,
    provider: dbSession.provider as Session['provider'],
    model: dbSession.model,
    mode: dbSession.mode as Session['mode'],
    systemPrompt: dbSession.systemPrompt,
    temperature: dbSession.temperature,
    maxTokens: dbSession.maxTokens,
    enableTools: dbSession.enableTools,
    enableResearch: dbSession.enableResearch,
    messageCount: dbSession.messageCount,
    lastMessagePreview: dbSession.lastMessagePreview,
    createdAt: dbSession.createdAt,
    updatedAt: dbSession.updatedAt,
  };
}

// Convert Session to DBSession
function toDBSession(session: Session): DBSession {
  return {
    id: session.id,
    title: session.title,
    provider: session.provider,
    model: session.model,
    mode: session.mode,
    systemPrompt: session.systemPrompt,
    temperature: session.temperature,
    maxTokens: session.maxTokens,
    enableTools: session.enableTools,
    enableResearch: session.enableResearch,
    messageCount: session.messageCount || 0,
    lastMessagePreview: session.lastMessagePreview,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export const sessionRepository = {
  /**
   * Get all sessions, sorted by updatedAt descending
   */
  async getAll(): Promise<Session[]> {
    const sessions = await db.sessions
      .orderBy('updatedAt')
      .reverse()
      .toArray();

    return sessions.map(toSession);
  },

  /**
   * Get a single session by ID
   */
  async getById(id: string): Promise<Session | undefined> {
    const session = await db.sessions.get(id);
    return session ? toSession(session) : undefined;
  },

  /**
   * Create a new session
   */
  async create(input: CreateSessionInput = {}): Promise<Session> {
    const now = new Date();
    const session: Session = {
      id: nanoid(),
      title: input.title || 'New Chat',
      provider: input.provider || 'openai',
      model: input.model || 'gpt-4o',
      mode: input.mode || 'chat',
      systemPrompt: input.systemPrompt,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await withRetry(async () => {
      await db.sessions.add(toDBSession(session));
    }, 'sessionRepository.create');
    return session;
  },

  /**
   * Update an existing session
   */
  async update(id: string, updates: UpdateSessionInput): Promise<Session | undefined> {
    const existing = await db.sessions.get(id);
    if (!existing) return undefined;

    const updateData: Partial<DBSession> = {
      ...updates,
      updatedAt: new Date(),
    };

    await withRetry(async () => {
      await db.sessions.update(id, updateData);
    }, 'sessionRepository.update');

    const updated = await db.sessions.get(id);
    return updated ? toSession(updated) : undefined;
  },

  /**
   * Delete a session and all its messages
   */
  async delete(id: string): Promise<void> {
    await withRetry(async () => {
      await messageRepository.deleteBySessionId(id);
      await db.sessions.delete(id);
    }, 'sessionRepository.delete');
  },

  /**
   * Delete all sessions and messages
   */
  async deleteAll(): Promise<void> {
    await withRetry(async () => {
      await db.messages.clear();
      await db.sessions.clear();
    }, 'sessionRepository.deleteAll');
  },

  /**
   * Duplicate a session (without messages)
   */
  async duplicate(id: string): Promise<Session | undefined> {
    const original = await db.sessions.get(id);
    if (!original) return undefined;

    const now = new Date();
    const duplicate: Session = {
      ...toSession(original),
      id: nanoid(),
      title: `${original.title} (copy)`,
      messageCount: 0,
      lastMessagePreview: undefined,
      createdAt: now,
      updatedAt: now,
    };

    await withRetry(async () => {
      await db.sessions.add(toDBSession(duplicate));
    }, 'sessionRepository.duplicate');
    return duplicate;
  },

  /**
   * Search sessions by title
   */
  async searchByTitle(query: string): Promise<Session[]> {
    const lowerQuery = query.toLowerCase();
    const sessions = await db.sessions
      .filter((session) => session.title.toLowerCase().includes(lowerQuery))
      .toArray();

    return sessions.map(toSession);
  },

  /**
   * Get session count
   */
  async getCount(): Promise<number> {
    return db.sessions.count();
  },

  /**
   * Export all sessions for backup
   */
  async exportAll(): Promise<{ sessions: Session[]; messages: unknown[] }> {
    const sessions = await this.getAll();
    const allMessages = await db.messages.toArray();

    return {
      sessions,
      messages: allMessages,
    };
  },

  /**
   * Import sessions from backup (legacy - no validation)
   */
  async importAll(data: { sessions: Session[]; messages: unknown[] }): Promise<void> {
    await withRetry(async () => {
      // Import sessions
      const dbSessions = data.sessions.map(toDBSession);
      await db.sessions.bulkAdd(dbSessions);

      // Import messages
      if (data.messages && Array.isArray(data.messages)) {
        await db.messages.bulkAdd(data.messages as never[]);
      }
    }, 'sessionRepository.importAll');
  },

  /**
   * Import sessions with validation, conflict handling, and progress reporting
   */
  async importWithValidation(
    data: { sessions: Session[]; messages: unknown[] },
    options: {
      conflictStrategy: 'skip' | 'replace' | 'rename';
      validateData?: boolean;
      onProgress?: (progress: { current: number; total: number; phase: string }) => void;
    }
  ): Promise<{
    imported: number;
    skipped: number;
    replaced: number;
    errors: Array<{ index: number; id?: string; error: string }>;
  }> {
    const result = { imported: 0, skipped: 0, replaced: 0, errors: [] as Array<{ index: number; id?: string; error: string }> };
    const total = data.sessions.length + (Array.isArray(data.messages) ? data.messages.length : 0);
    let current = 0;

    // Phase 1: Validate and import sessions
    for (let i = 0; i < data.sessions.length; i++) {
      const session = data.sessions[i];
      current++;
      options.onProgress?.({ current, total, phase: 'sessions' });

      // Validate session data
      if (options.validateData !== false) {
        if (!session.id || typeof session.id !== 'string') {
          result.errors.push({ index: i, error: 'Missing or invalid session ID' });
          continue;
        }
        if (!session.title || typeof session.title !== 'string') {
          result.errors.push({ index: i, id: session.id, error: 'Missing or invalid title' });
          continue;
        }
      }

      try {
        const existing = await db.sessions.get(session.id);

        if (existing) {
          switch (options.conflictStrategy) {
            case 'skip':
              result.skipped++;
              continue;
            case 'replace':
              await db.sessions.put(toDBSession(session));
              result.replaced++;
              continue;
            case 'rename': {
              const renamedSession = {
                ...session,
                id: nanoid(),
                title: `${session.title} (imported)`,
              };
              await db.sessions.add(toDBSession(renamedSession));
              result.imported++;
              continue;
            }
          }
        }

        await db.sessions.add(toDBSession(session));
        result.imported++;
      } catch (error) {
        result.errors.push({
          index: i,
          id: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Phase 2: Import messages
    if (data.messages && Array.isArray(data.messages)) {
      const batchSize = 100;
      for (let i = 0; i < data.messages.length; i += batchSize) {
        const batch = data.messages.slice(i, i + batchSize);
        current += batch.length;
        options.onProgress?.({ current, total, phase: 'messages' });

        try {
          await db.messages.bulkPut(batch as never[]);
        } catch (error) {
          result.errors.push({
            index: i,
            error: `Message batch ${i}-${i + batch.length}: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }

    options.onProgress?.({ current: total, total, phase: 'complete' });
    return result;
  },
};

export default sessionRepository;
