/**
 * Plugin Session API Implementation
 * 
 * Provides session management capabilities to plugins.
 */

import { useSessionStore } from '@/stores/chat/session-store';
import { messageRepository } from '@/lib/db';
import type {
  PluginSessionAPI,
  SessionFilter,
  MessageQueryOptions,
  SendMessageOptions,
} from '@/types/plugin-extended';
import type { Session, UIMessage } from '@/types';
import { nanoid } from 'nanoid';

/**
 * Create the Session API for a plugin
 */
export function createSessionAPI(pluginId: string): PluginSessionAPI {
  // Store unsubscribe functions for cleanup
  const subscriptions = new Map<string, () => void>();

  return {
    getCurrentSession: () => {
      const store = useSessionStore.getState();
      if (!store.activeSessionId) return null;
      return store.sessions.find(s => s.id === store.activeSessionId) || null;
    },

    getCurrentSessionId: () => {
      return useSessionStore.getState().activeSessionId;
    },

    getSession: async (id: string) => {
      const store = useSessionStore.getState();
      return store.sessions.find(s => s.id === id) || null;
    },

    createSession: async (options = {}) => {
      const store = useSessionStore.getState();
      const session = store.createSession(options);
      console.log(`[Plugin:${pluginId}] Created session: ${session.id}`);
      return session;
    },

    updateSession: async (id: string, updates) => {
      const store = useSessionStore.getState();
      store.updateSession(id, updates);
      console.log(`[Plugin:${pluginId}] Updated session: ${id}`);
    },

    switchSession: async (id: string) => {
      const store = useSessionStore.getState();
      store.setActiveSession(id);
      console.log(`[Plugin:${pluginId}] Switched to session: ${id}`);
    },

    deleteSession: async (id: string) => {
      const store = useSessionStore.getState();
      store.deleteSession(id);
      // Also delete messages from database
      try {
        await messageRepository.deleteBySessionId(id);
      } catch (error) {
        console.error(`[Plugin:${pluginId}] Failed to delete messages for session ${id}:`, error);
      }
      console.log(`[Plugin:${pluginId}] Deleted session: ${id}`);
    },

    listSessions: async (filter?: SessionFilter) => {
      const store = useSessionStore.getState();
      let sessions = [...store.sessions];

      if (filter) {
        // Apply filters
        if (filter.projectId) {
          sessions = sessions.filter(s => s.projectId === filter.projectId);
        }
        if (filter.mode) {
          sessions = sessions.filter(s => s.mode === filter.mode);
        }
        if (filter.createdAfter) {
          sessions = sessions.filter(s => new Date(s.createdAt) > filter.createdAfter!);
        }
        if (filter.createdBefore) {
          sessions = sessions.filter(s => new Date(s.createdAt) < filter.createdBefore!);
        }

        // Sort
        if (filter.sortBy) {
          sessions.sort((a, b) => {
            const aVal = a[filter.sortBy!];
            const bVal = b[filter.sortBy!];
            if (aVal instanceof Date && bVal instanceof Date) {
              return filter.sortOrder === 'desc' 
                ? bVal.getTime() - aVal.getTime()
                : aVal.getTime() - bVal.getTime();
            }
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return filter.sortOrder === 'desc'
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
            }
            return 0;
          });
        }

        // Pagination
        if (filter.offset) {
          sessions = sessions.slice(filter.offset);
        }
        if (filter.limit) {
          sessions = sessions.slice(0, filter.limit);
        }
      }

      return sessions;
    },

    getMessages: async (sessionId: string, options?: MessageQueryOptions) => {
      try {
        let messages: UIMessage[];
        
        if (options?.branchId) {
          messages = await messageRepository.getByBranchId(sessionId, options.branchId);
        } else {
          messages = await messageRepository.getBySessionId(sessionId);
        }

        // Apply pagination
        if (options?.offset) {
          messages = messages.slice(options.offset);
        }
        if (options?.limit) {
          messages = messages.slice(0, options.limit);
        }

        return messages;
      } catch (error) {
        console.error(`[Plugin:${pluginId}] Failed to get messages:`, error);
        return [];
      }
    },

    addMessage: async (sessionId: string, content: string, options?: SendMessageOptions) => {
      const newMessage: UIMessage = {
        id: nanoid(),
        role: options?.role || 'user',
        content,
        createdAt: new Date(),
        experimental_attachments: options?.attachments?.map(a => ({
          name: a.name,
          contentType: a.mimeType || 'text/plain',
          url: a.url || '',
        })),
      };

      try {
        await messageRepository.create(sessionId, newMessage);
        
        // Update session message count
        const store = useSessionStore.getState();
        const session = store.sessions.find(s => s.id === sessionId);
        if (session) {
          store.updateSession(sessionId, {
            messageCount: (session.messageCount || 0) + 1,
          });
        }

        console.log(`[Plugin:${pluginId}] Added message to session: ${sessionId}`);
        return newMessage;
      } catch (error) {
        console.error(`[Plugin:${pluginId}] Failed to add message:`, error);
        throw error;
      }
    },

    updateMessage: async (sessionId: string, messageId: string, updates: Partial<UIMessage>) => {
      try {
        await messageRepository.update(messageId, updates);
        console.log(`[Plugin:${pluginId}] Updated message: ${messageId}`);
      } catch (error) {
        console.error(`[Plugin:${pluginId}] Failed to update message:`, error);
        throw error;
      }
    },

    deleteMessage: async (sessionId: string, messageId: string) => {
      try {
        await messageRepository.delete(messageId);
        
        // Update session message count
        const store = useSessionStore.getState();
        const session = store.sessions.find(s => s.id === sessionId);
        if (session && session.messageCount && session.messageCount > 0) {
          store.updateSession(sessionId, {
            messageCount: session.messageCount - 1,
          });
        }

        console.log(`[Plugin:${pluginId}] Deleted message: ${messageId}`);
      } catch (error) {
        console.error(`[Plugin:${pluginId}] Failed to delete message:`, error);
        throw error;
      }
    },

    onSessionChange: (handler: (session: Session | null) => void) => {
      const unsubscribe = useSessionStore.subscribe(
        (state) => {
          const session = state.activeSessionId 
            ? state.sessions.find(s => s.id === state.activeSessionId) || null
            : null;
          return session;
        },
        handler
      );
      
      const subId = nanoid();
      subscriptions.set(subId, unsubscribe);
      
      return () => {
        unsubscribe();
        subscriptions.delete(subId);
      };
    },

    onMessagesChange: (sessionId: string, handler: (messages: UIMessage[]) => void) => {
      // This would ideally use a database subscription
      // For now, we'll use polling as a fallback
      let active = true;
      let lastMessageCount = 0;

      const checkMessages = async () => {
        if (!active) return;
        
        try {
          const messages = await messageRepository.getBySessionId(sessionId);
          if (messages.length !== lastMessageCount) {
            lastMessageCount = messages.length;
            handler(messages);
          }
        } catch (error) {
          console.error(`[Plugin:${pluginId}] Error checking messages:`, error);
        }

        if (active) {
          setTimeout(checkMessages, 1000);
        }
      };

      checkMessages();

      return () => {
        active = false;
      };
    },

    getSessionStats: async (sessionId: string) => {
      try {
        const messages = await messageRepository.getBySessionId(sessionId);
        const store = useSessionStore.getState();
        const session = store.sessions.find(s => s.id === sessionId);

        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');
        
        let totalTokens = 0;
        const totalResponseTime = 0;
        const responseCount = 0;

        for (const msg of assistantMessages) {
          if (msg.usage) {
            totalTokens += msg.usage.totalTokens || 0;
          }
          // Response time would need to be tracked separately
        }

        const attachmentCount = messages.reduce((count, msg) => {
          return count + (msg.experimental_attachments?.length || 0);
        }, 0);

        return {
          messageCount: messages.length,
          userMessageCount: userMessages.length,
          assistantMessageCount: assistantMessages.length,
          totalTokens,
          averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
          branchCount: session?.branches?.length || 0,
          attachmentCount,
        };
      } catch (error) {
        console.error(`[Plugin:${pluginId}] Failed to get session stats:`, error);
        return {
          messageCount: 0,
          userMessageCount: 0,
          assistantMessageCount: 0,
          totalTokens: 0,
          averageResponseTime: 0,
          branchCount: 0,
          attachmentCount: 0,
        };
      }
    },
  };
}
