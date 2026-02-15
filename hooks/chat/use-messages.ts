/**
 * useMessages hook - manages message state with IndexedDB persistence
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { messageRepository } from '@/lib/db';
import type { UIMessage, MessageRole } from '@/types';
import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';
import { getPluginLifecycleHooks } from '@/lib/plugin';

const log = loggers.chat;

interface UseMessagesOptions {
  sessionId: string | null;
  branchId?: string | null; // null/undefined for main branch
  onError?: (error: Error) => void;
}

interface UseMessagesReturn {
  messages: UIMessage[];
  isLoading: boolean;
  isInitialized: boolean;

  // History paging
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  loadOlderMessages: () => Promise<void>;

  // Message operations
  addMessage: (message: Omit<UIMessage, 'id' | 'createdAt'>) => Promise<UIMessage>;
  updateMessage: (id: string, updates: Partial<UIMessage>) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  deleteMessagesAfter: (messageId: string) => Promise<void>;
  clearMessages: () => Promise<void>;

  // Streaming support
  appendToMessage: (id: string, chunk: string) => void;
  createStreamingMessage: (role: MessageRole) => UIMessage;

  // Bulk operations
  reloadMessages: () => Promise<void>;

  // Branch operations
  copyMessagesForBranch: (
    branchPointMessageId: string,
    newBranchId: string
  ) => Promise<UIMessage[]>;

  // Emergency save
  flushPendingSaves: () => Promise<void>;
}

const INITIAL_PAGE_SIZE = 100;
const OLDER_PAGE_SIZE = 80;

export function useMessages({
  sessionId,
  branchId,
  onError,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const oldestMessageCreatedAtRef = useRef<Date | null>(null);

  // Track pending saves to prevent race conditions
  const pendingSaves = useRef<Map<string, UIMessage>>(new Map());
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Use ref for onError to avoid it being a dependency in useEffect
  const onErrorRef = useRef(onError);
  useLayoutEffect(() => {
    onErrorRef.current = onError;
  });

  // Load messages when sessionId or branchId changes
  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!sessionId) {
        setMessages([]);
        setHasOlderMessages(false);
        oldestMessageCreatedAtRef.current = null;
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      try {
        const loadedMessages = await messageRepository.getPageBySessionIdAndBranch(
          sessionId,
          branchId,
          { limit: INITIAL_PAGE_SIZE }
        );

        const totalCount = await messageRepository.getCountBySessionIdAndBranch(
          sessionId,
          branchId
        );

        if (!cancelled) {
          setMessages(loadedMessages);
          const oldest = loadedMessages[0]?.createdAt;
          oldestMessageCreatedAtRef.current = oldest ?? null;
          setHasOlderMessages(totalCount > loadedMessages.length);
          setIsInitialized(true);
        }
      } catch (err) {
        log.error('Failed to load messages', err as Error);
        onErrorRef.current?.(err instanceof Error ? err : new Error('Failed to load messages'));
        // Still set initialized even on error to prevent infinite loading
        if (!cancelled) {
          setIsInitialized(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    setIsInitialized(false);
    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [sessionId, branchId]);

  // Reload messages manually
  const reloadMessages = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const loadedMessages = await messageRepository.getPageBySessionIdAndBranch(
        sessionId,
        branchId,
        { limit: INITIAL_PAGE_SIZE }
      );

      const totalCount = await messageRepository.getCountBySessionIdAndBranch(sessionId, branchId);

      setMessages(loadedMessages);
      const oldest = loadedMessages[0]?.createdAt;
      oldestMessageCreatedAtRef.current = oldest ?? null;
      setHasOlderMessages(totalCount > loadedMessages.length);
    } catch (err) {
      log.error('Failed to reload messages', err as Error);
      onErrorRef.current?.(err instanceof Error ? err : new Error('Failed to reload messages'));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, branchId]);

  const loadOlderMessages = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    if (isLoadingOlder) return;
    if (!hasOlderMessages) return;

    const oldestCreatedAt = oldestMessageCreatedAtRef.current;
    if (!oldestCreatedAt) return;

    setIsLoadingOlder(true);
    try {
      const older = await messageRepository.getPageBySessionIdAndBranch(sessionId, branchId, {
        limit: OLDER_PAGE_SIZE,
        before: oldestCreatedAt,
      });

      if (older.length === 0) {
        setHasOlderMessages(false);
        return;
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const dedupedOlder = older.filter((m) => !existingIds.has(m.id));
        return [...dedupedOlder, ...prev];
      });

      oldestMessageCreatedAtRef.current = older[0]?.createdAt ?? oldestCreatedAt;

      const totalCount = await messageRepository.getCountBySessionIdAndBranch(sessionId, branchId);

      setHasOlderMessages(totalCount > messages.length + older.length);
    } catch (err) {
      log.error('Failed to load older messages', err as Error);
      onErrorRef.current?.(err instanceof Error ? err : new Error('Failed to load older messages'));
    } finally {
      setIsLoadingOlder(false);
    }
  }, [sessionId, branchId, isLoadingOlder, hasOlderMessages, messages.length]);

  // Add a new message
  const addMessage = useCallback(
    async (message: Omit<UIMessage, 'id' | 'createdAt'>): Promise<UIMessage> => {
      if (!sessionId) {
        throw new Error('No session ID provided');
      }

      const newMessage: UIMessage = {
        ...message,
        id: nanoid(),
        branchId: branchId ?? undefined,
        createdAt: new Date(),
      };

      // Update local state immediately
      setMessages((prev) => [...prev, newMessage]);

      // Persist to database with branch support
      try {
        await messageRepository.createWithBranch(sessionId, branchId ?? undefined, newMessage);
      } catch (err) {
        log.error('Failed to save message', err as Error);
        // Revert on error
        setMessages((prev) => prev.filter((m) => m.id !== newMessage.id));
        throw err;
      }

      return newMessage;
    },
    [sessionId, branchId]
  );

  // Update an existing message
  const updateMessage = useCallback(
    async (id: string, updates: Partial<UIMessage>): Promise<void> => {
      // Update local state immediately
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));

      // Persist to database
      try {
        await messageRepository.update(id, updates);
      } catch (err) {
        log.error('Failed to update message', err as Error);
        throw err;
      }
    },
    []
  );

  // Delete a message
  const deleteMessage = useCallback(async (id: string): Promise<void> => {
    // Update local state immediately
    setMessages((prev) => prev.filter((m) => m.id !== id));

    // Persist to database
    try {
      await messageRepository.delete(id);
      getPluginLifecycleHooks().dispatchOnMessageDelete(id, sessionId || '');
    } catch (err) {
      log.error('Failed to delete message', err as Error);
      throw err;
    }
  }, [sessionId]);

  // Delete all messages after a specific message (for edit/retry)
  const deleteMessagesAfter = useCallback(
    async (messageId: string): Promise<void> => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const messagesToDelete = messages.slice(messageIndex + 1);

      // Update local state immediately
      setMessages((prev) => prev.slice(0, messageIndex + 1));

      // Delete from database using optimized batch operation
      try {
        if (sessionId) {
          await messageRepository.deleteMessagesAfterOptimized(sessionId, messageId, branchId);
        } else {
          // Fallback: delete individually if no sessionId
          await Promise.all(messagesToDelete.map((m) => messageRepository.delete(m.id)));
        }
        for (const m of messagesToDelete) {
          getPluginLifecycleHooks().dispatchOnMessageDelete(m.id, sessionId || '');
        }
      } catch (err) {
        log.error('Failed to delete messages', err as Error);
        throw err;
      }
    },
    [messages, sessionId, branchId]
  );

  // Clear all messages for the session
  const clearMessages = useCallback(async (): Promise<void> => {
    if (!sessionId) return;

    // Update local state immediately
    setMessages([]);

    // Delete from database
    try {
      await messageRepository.deleteBySessionId(sessionId);
    } catch (err) {
      log.error('Failed to clear messages', err as Error);
      throw err;
    }
  }, [sessionId]);

  // Append chunk to a message (for streaming) - optimistic local update only
  const appendToMessage = useCallback((id: string, chunk: string) => {
    // Track for debounced save based on the latest content we know about.
    const previousPending = pendingSaves.current.get(id);

    setMessages((prev) => {
      const next = prev.map((m) => {
        if (m.id !== id) return m;

        const nextContent = m.content + chunk;
        pendingSaves.current.set(id, {
          ...m,
          content: nextContent,
        });

        return { ...m, content: nextContent };
      });

      // If the message wasn't in state (rare), still keep pending content growing.
      if (!previousPending && !next.some((m) => m.id === id)) {
        const existingPending = pendingSaves.current.get(id);
        if (existingPending) {
          pendingSaves.current.set(id, {
            ...existingPending,
            content: existingPending.content + chunk,
          });
        }
      }

      return next;
    });

    const messageToSave = pendingSaves.current.get(id);
    if (messageToSave) {
      // Debounce save to database
      const existingTimeout = saveTimeouts.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(async () => {
        const messageToSaveInner = pendingSaves.current.get(id);
        if (messageToSaveInner) {
          try {
            await messageRepository.update(id, { content: messageToSaveInner.content });
          } catch (err) {
            log.error('Failed to save streaming message', err as Error);
          }
          pendingSaves.current.delete(id);
        }
        saveTimeouts.current.delete(id);
      }, 200);

      saveTimeouts.current.set(id, timeout);
    }
  }, []);

  // Create a new message for streaming (not saved until content is added)
  const createStreamingMessage = useCallback(
    (role: MessageRole): UIMessage => {
      const newMessage: UIMessage = {
        id: nanoid(),
        role,
        content: '',
        branchId: branchId ?? undefined,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);

      return newMessage;
    },
    [branchId]
  );

  // Copy messages up to a branch point for creating a new branch
  const copyMessagesForBranch = useCallback(
    async (branchPointMessageId: string, newBranchId: string): Promise<UIMessage[]> => {
      if (!sessionId) {
        throw new Error('No session ID provided');
      }

      try {
        const copiedMessages = await messageRepository.copyMessagesForBranch(
          sessionId,
          branchPointMessageId,
          newBranchId,
          branchId // Current branch as source
        );
        return copiedMessages;
      } catch (err) {
        log.error('Failed to copy messages for branch', err as Error);
        throw err;
      }
    },
    [sessionId, branchId]
  );

  // Flush all pending saves immediately (for emergency scenarios)
  const flushPendingSaves = useCallback(async () => {
    const pending = Array.from(pendingSaves.current.entries());
    if (pending.length === 0) return;

    // Clear all debounce timeouts first
    saveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    saveTimeouts.current.clear();

    // Save all pending messages
    await Promise.all(
      pending.map(async ([id, msg]) => {
        try {
          await messageRepository.update(id, { content: msg.content });
        } catch (err) {
          log.error('Failed to flush pending message', err as Error);
        }
      })
    );
    pendingSaves.current.clear();
  }, []);

  // Emergency save on page visibility change or beforeunload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden - flush saves immediately
        // visibilitychange fires reliably before unload and allows async work
        flushPendingSaves();
      }
    };

    const handleBeforeUnload = () => {
      // Best-effort: clear debounce timers and fire async saves.
      // visibilitychange (above) is the primary save path since it fires first
      // and browsers allow async work during that event.
      const pending = Array.from(pendingSaves.current.entries());
      if (pending.length > 0) {
        saveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
        saveTimeouts.current.clear();
        pending.forEach(([id, msg]) => {
          messageRepository.update(id, { content: msg.content }).catch(() => {
            // Best effort - can't do much if it fails during unload
          });
        });
        pendingSaves.current.clear();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushPendingSaves]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = saveTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      // Also flush pending saves on unmount
      flushPendingSaves();
    };
  }, [flushPendingSaves]);

  return {
    messages,
    isLoading,
    isInitialized,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    deleteMessagesAfter,
    clearMessages,
    appendToMessage,
    createStreamingMessage,
    reloadMessages,
    copyMessagesForBranch,
    flushPendingSaves,
  };
}

export default useMessages;
