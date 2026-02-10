'use client';

/**
 * ChatBroadcastInitializer - Wires up cross-tab chat synchronization
 * Subscribes to chat store changes and broadcasts them via BroadcastChannel,
 * and listens for incoming broadcasts from other tabs to update local state.
 */

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat/chat-store';
import {
  getChatBroadcastChannel,
  closeChatBroadcastChannel,
} from '@/lib/sync/chat-broadcast';
import type {
  ChatSyncEvent,
  MessageAddedPayload,
  MessageUpdatedPayload,
  MessageDeletedPayload,
  MessagesClearedPayload,
} from '@/lib/sync/chat-broadcast';

export function ChatBroadcastInitializer() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const channel = getChatBroadcastChannel();
    if (!channel.isChannelSupported()) return;

    // Listen for events from other tabs
    const unsubMessageAdded = channel.on<MessageAddedPayload>(
      'message_added',
      (event: ChatSyncEvent<MessageAddedPayload>) => {
        const { messages, appendMessage } = useChatStore.getState();
        // Only append if message doesn't already exist
        if (!messages.find((m) => m.id === event.payload.messageId)) {
          appendMessage({
            id: event.payload.messageId,
            role: event.payload.role as 'user' | 'assistant',
            content: event.payload.content,
            parts: [{ type: 'text', content: event.payload.content }],
            createdAt: new Date(),
          });
        }
      }
    );

    const unsubMessageUpdated = channel.on<MessageUpdatedPayload>(
      'message_updated',
      (event: ChatSyncEvent<MessageUpdatedPayload>) => {
        const { updateMessage } = useChatStore.getState();
        updateMessage(event.payload.messageId, event.payload.updates as never);
      }
    );

    const unsubMessageDeleted = channel.on<MessageDeletedPayload>(
      'message_deleted',
      (event: ChatSyncEvent<MessageDeletedPayload>) => {
        const { deleteMessage } = useChatStore.getState();
        deleteMessage(event.payload.messageId);
      }
    );

    const unsubMessagesCleared = channel.on<MessagesClearedPayload>(
      'messages_cleared',
      () => {
        const { clearMessages } = useChatStore.getState();
        clearMessages();
      }
    );

    // Subscribe to local store changes and broadcast to other tabs
    const unsubStore = useChatStore.subscribe(
      (state) => state.messages,
      (messages, prevMessages) => {
        if (messages.length > prevMessages.length) {
          // Message added
          const newMessages = messages.slice(prevMessages.length);
          for (const msg of newMessages) {
            const textContent =
              typeof msg.content === 'string'
                ? msg.content
                : msg.parts
                    ?.filter((p): p is { type: 'text'; content: string } => p.type === 'text')
                    .map((p) => p.content)
                    .join('') || '';

            channel.broadcastMessageAdded({
              sessionId: '',
              messageId: msg.id,
              role: msg.role,
              content: textContent,
            });
          }
        } else if (messages.length < prevMessages.length) {
          // Message deleted - find which one
          const deletedIds = prevMessages
            .filter((pm) => !messages.find((m) => m.id === pm.id))
            .map((m) => m.id);

          for (const id of deletedIds) {
            channel.broadcastMessageDeleted({
              sessionId: '',
              messageId: id,
            });
          }
        }
      }
    );

    return () => {
      unsubMessageAdded();
      unsubMessageUpdated();
      unsubMessageDeleted();
      unsubMessagesCleared();
      unsubStore();
      closeChatBroadcastChannel();
    };
  }, []);

  return null;
}

export default ChatBroadcastInitializer;
