/**
 * useMessages hook - manages message state with IndexedDB persistence
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { messageRepository } from '@/lib/db';
import type { UIMessage, MessageRole } from '@/types';
import { nanoid } from 'nanoid';

interface UseMessagesOptions {
  sessionId: string | null;
  branchId?: string | null; // null/undefined for main branch
  onError?: (error: Error) => void;
}

interface UseMessagesReturn {
  messages: UIMessage[];
  isLoading: boolean;
  isInitialized: boolean;

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
  copyMessagesForBranch: (branchPointMessageId: string, newBranchId: string) => Promise<UIMessage[]>;
}

export function useMessages({
  sessionId,
  branchId,
  onError,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      try {
        // Load messages filtered by branch
        const loadedMessages = await messageRepository.getBySessionIdAndBranch(
          sessionId,
          branchId
        );
        if (!cancelled) {
          setMessages(loadedMessages);
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
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
      const loadedMessages = await messageRepository.getBySessionIdAndBranch(
        sessionId,
        branchId
      );
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to reload messages:', err);
      onErrorRef.current?.(err instanceof Error ? err : new Error('Failed to reload messages'));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, branchId]);

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
        await messageRepository.createWithBranch(
          sessionId,
          branchId ?? undefined,
          newMessage
        );
      } catch (err) {
        console.error('Failed to save message:', err);
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
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );

      // Persist to database
      try {
        await messageRepository.update(id, updates);
      } catch (err) {
        console.error('Failed to update message:', err);
        throw err;
      }
    },
    []
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (id: string): Promise<void> => {
      // Update local state immediately
      setMessages((prev) => prev.filter((m) => m.id !== id));

      // Persist to database
      try {
        await messageRepository.delete(id);
      } catch (err) {
        console.error('Failed to delete message:', err);
        throw err;
      }
    },
    []
  );

  // Delete all messages after a specific message (for edit/retry)
  const deleteMessagesAfter = useCallback(
    async (messageId: string): Promise<void> => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const messagesToDelete = messages.slice(messageIndex + 1);

      // Update local state immediately
      setMessages((prev) => prev.slice(0, messageIndex + 1));

      // Delete from database
      try {
        await Promise.all(
          messagesToDelete.map((m) => messageRepository.delete(m.id))
        );
      } catch (err) {
        console.error('Failed to delete messages:', err);
        throw err;
      }
    },
    [messages]
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
      console.error('Failed to clear messages:', err);
      throw err;
    }
  }, [sessionId]);

  // Append chunk to a message (for streaming) - optimistic local update only
  const appendToMessage = useCallback((id: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      )
    );

    // Track for debounced save
    const currentMessage = messages.find((m) => m.id === id);
    if (currentMessage) {
      pendingSaves.current.set(id, {
        ...currentMessage,
        content: currentMessage.content + chunk,
      });

      // Debounce save to database
      const existingTimeout = saveTimeouts.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(async () => {
        const messageToSave = pendingSaves.current.get(id);
        if (messageToSave) {
          try {
            await messageRepository.update(id, { content: messageToSave.content });
          } catch (err) {
            console.error('Failed to save streaming message:', err);
          }
          pendingSaves.current.delete(id);
        }
        saveTimeouts.current.delete(id);
      }, 500);

      saveTimeouts.current.set(id, timeout);
    }
  }, [messages]);

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
        console.error('Failed to copy messages for branch:', err);
        throw err;
      }
    },
    [sessionId, branchId]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = saveTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return {
    messages,
    isLoading,
    isInitialized,
    addMessage,
    updateMessage,
    deleteMessage,
    deleteMessagesAfter,
    clearMessages,
    appendToMessage,
    createStreamingMessage,
    reloadMessages,
    copyMessagesForBranch,
  };
}

export default useMessages;
