/**
 * Cross-Tab Chat Synchronization
 *
 * Uses BroadcastChannel API to synchronize chat state across browser tabs.
 * Enables real-time updates when multiple tabs are open.
 */

import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';

const log = loggers.chat;

/**
 * Types of sync events
 */
export type ChatSyncEventType =
  | 'message_added'
  | 'message_updated'
  | 'message_deleted'
  | 'session_created'
  | 'session_updated'
  | 'session_deleted'
  | 'session_switched'
  | 'messages_cleared';

/**
 * Chat sync event payload
 */
export interface ChatSyncEvent<T = unknown> {
  type: ChatSyncEventType;
  payload: T;
  timestamp: number;
  tabId: string;
  sessionId?: string;
}

/**
 * Event payloads for different event types
 */
export interface MessageAddedPayload {
  sessionId: string;
  messageId: string;
  role: string;
  content: string;
}

export interface MessageUpdatedPayload {
  sessionId: string;
  messageId: string;
  updates: Record<string, unknown>;
}

export interface MessageDeletedPayload {
  sessionId: string;
  messageId: string;
}

export interface SessionCreatedPayload {
  sessionId: string;
  title: string;
}

export interface SessionUpdatedPayload {
  sessionId: string;
  updates: Record<string, unknown>;
}

export interface SessionDeletedPayload {
  sessionId: string;
}

export interface SessionSwitchedPayload {
  fromSessionId: string | null;
  toSessionId: string;
}

export interface MessagesClearedPayload {
  sessionId: string;
}

/**
 * Chat Broadcast Channel for cross-tab synchronization
 */
export class ChatBroadcastChannel {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private listeners: Map<ChatSyncEventType, Set<(event: ChatSyncEvent) => void>> = new Map();
  private allListeners: Set<(event: ChatSyncEvent) => void> = new Set();
  private isSupported: boolean;

  constructor(channelName = 'cognia-chat-sync') {
    this.isSupported = typeof BroadcastChannel !== 'undefined';
    this.tabId = this.getOrCreateTabId();

    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel(channelName);
        this.channel.onmessage = this.handleMessage.bind(this);
        this.channel.onmessageerror = this.handleError.bind(this);
        log.info('ChatBroadcastChannel initialized', { tabId: this.tabId });
      } catch (error) {
        log.error('Failed to create BroadcastChannel', error as Error);
        this.isSupported = false;
      }
    }
  }

  /**
   * Get or create a unique tab identifier
   */
  private getOrCreateTabId(): string {
    if (typeof sessionStorage === 'undefined') {
      return nanoid();
    }

    let tabId = sessionStorage.getItem('cognia-tab-id');
    if (!tabId) {
      tabId = nanoid();
      sessionStorage.setItem('cognia-tab-id', tabId);
    }
    return tabId;
  }

  /**
   * Check if BroadcastChannel is supported
   */
  isChannelSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get this tab's unique ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Broadcast an event to all other tabs
   */
  broadcast<T>(type: ChatSyncEventType, payload: T, sessionId?: string): void {
    if (!this.channel) return;

    const event: ChatSyncEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: this.tabId,
      sessionId,
    };

    try {
      this.channel.postMessage(event);
    } catch (error) {
      log.error('Failed to broadcast event', error as Error);
    }
  }

  /**
   * Subscribe to a specific event type
   */
  on<T>(
    type: ChatSyncEventType,
    handler: (event: ChatSyncEvent<T>) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const handlers = this.listeners.get(type)!;
    handlers.add(handler as (event: ChatSyncEvent) => void);

    return () => {
      handlers.delete(handler as (event: ChatSyncEvent) => void);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: (event: ChatSyncEvent) => void): () => void {
    this.allListeners.add(handler);
    return () => {
      this.allListeners.delete(handler);
    };
  }

  /**
   * Convenience methods for common events
   */
  broadcastMessageAdded(payload: MessageAddedPayload): void {
    this.broadcast('message_added', payload, payload.sessionId);
  }

  broadcastMessageUpdated(payload: MessageUpdatedPayload): void {
    this.broadcast('message_updated', payload, payload.sessionId);
  }

  broadcastMessageDeleted(payload: MessageDeletedPayload): void {
    this.broadcast('message_deleted', payload, payload.sessionId);
  }

  broadcastSessionCreated(payload: SessionCreatedPayload): void {
    this.broadcast('session_created', payload, payload.sessionId);
  }

  broadcastSessionUpdated(payload: SessionUpdatedPayload): void {
    this.broadcast('session_updated', payload, payload.sessionId);
  }

  broadcastSessionDeleted(payload: SessionDeletedPayload): void {
    this.broadcast('session_deleted', payload, payload.sessionId);
  }

  broadcastSessionSwitched(payload: SessionSwitchedPayload): void {
    this.broadcast('session_switched', payload, payload.toSessionId);
  }

  broadcastMessagesCleared(payload: MessagesClearedPayload): void {
    this.broadcast('messages_cleared', payload, payload.sessionId);
  }

  /**
   * Handle incoming messages from other tabs
   */
  private handleMessage(event: MessageEvent<ChatSyncEvent>): void {
    const syncEvent = event.data;

    // Ignore messages from this tab
    if (syncEvent.tabId === this.tabId) {
      return;
    }

    // Notify type-specific listeners
    const handlers = this.listeners.get(syncEvent.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(syncEvent);
        } catch (error) {
          log.error('Event handler error', error as Error);
        }
      });
    }

    // Notify all-event listeners
    this.allListeners.forEach((handler) => {
      try {
        handler(syncEvent);
      } catch (error) {
        log.error('All-event handler error', error as Error);
      }
    });
  }

  /**
   * Handle message errors
   */
  private handleError(event: MessageEvent): void {
    log.error('BroadcastChannel message error', { event });
  }

  /**
   * Close the channel
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    this.allListeners.clear();
  }
}

/**
 * Global chat broadcast channel instance
 */
let globalChatBroadcast: ChatBroadcastChannel | null = null;

/**
 * Get or create the global chat broadcast channel
 */
export function getChatBroadcastChannel(): ChatBroadcastChannel {
  if (!globalChatBroadcast) {
    globalChatBroadcast = new ChatBroadcastChannel();
  }
  return globalChatBroadcast;
}

/**
 * Close and reset the global chat broadcast channel
 */
export function closeChatBroadcastChannel(): void {
  if (globalChatBroadcast) {
    globalChatBroadcast.close();
    globalChatBroadcast = null;
  }
}
