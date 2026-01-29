/**
 * Message Bus API
 *
 * @description Pub/Sub message bus for event-driven communication.
 * Provides a centralized event system for decoupled plugin communication.
 */

/**
 * Message priority levels
 */
export type MessagePriority = 'high' | 'normal' | 'low';

/**
 * Message bus topic subscription options
 */
export interface SubscriptionOptions {
  /** Priority for message delivery order */
  priority?: MessagePriority;
  /** Filter function to selectively receive messages */
  filter?: (data: unknown) => boolean;
  /** Maximum number of messages to receive before auto-unsubscribing */
  maxMessages?: number;
  /** Automatically unsubscribe after timeout (ms) */
  timeout?: number;
}

/**
 * Published message metadata
 */
export interface MessageMetadata {
  /** Unique message ID */
  id: string;
  /** Topic the message was published to */
  topic: string;
  /** Publisher plugin ID */
  publisherId: string;
  /** Timestamp when message was published */
  timestamp: number;
  /** Message priority */
  priority: MessagePriority;
  /** Optional correlation ID for request-response patterns */
  correlationId?: string;
}

/**
 * Message envelope containing data and metadata
 */
export interface MessageEnvelope<T = unknown> {
  /** Message data */
  data: T;
  /** Message metadata */
  metadata: MessageMetadata;
}

/**
 * Topic statistics
 */
export interface TopicStats {
  /** Topic name */
  topic: string;
  /** Number of subscribers */
  subscriberCount: number;
  /** Total messages published */
  messageCount: number;
  /** Last message timestamp */
  lastMessageAt?: Date;
}

/**
 * Request-response handler
 */
export type RequestHandler<TRequest = unknown, TResponse = unknown> = (
  data: TRequest,
  metadata: MessageMetadata
) => TResponse | Promise<TResponse>;

/**
 * Message Bus API for pub/sub communication
 *
 * @remarks
 * Provides a centralized event bus for plugins to communicate through
 * topics. Supports pub/sub, request-response, and broadcast patterns.
 *
 * @example
 * ```typescript
 * // Publish an event
 * context.bus.publish('user:login', { userId: '123', timestamp: Date.now() });
 *
 * // Subscribe to events
 * const unsubscribe = context.bus.subscribe('user:login', (data, metadata) => {
 *   console.log('User logged in:', data.userId);
 * });
 *
 * // Request-response pattern
 * const response = await context.bus.request('data:fetch', { id: '123' });
 *
 * // Respond to requests
 * context.bus.respond('data:fetch', async (data) => {
 *   return await fetchData(data.id);
 * });
 * ```
 */
export interface PluginMessageBusAPI {
  /**
   * Publish a message to a topic
   *
   * @param topic - Topic name to publish to
   * @param data - Data to publish
   * @param options - Publishing options
   */
  publish<T = unknown>(
    topic: string,
    data: T,
    options?: { priority?: MessagePriority; correlationId?: string }
  ): void;

  /**
   * Subscribe to a topic
   *
   * @param topic - Topic name to subscribe to (supports wildcards: 'user:*')
   * @param handler - Handler function called when message is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(
    topic: string,
    handler: (data: T, metadata: MessageMetadata) => void,
    options?: SubscriptionOptions
  ): () => void;

  /**
   * Subscribe to a topic for a single message
   *
   * @param topic - Topic name to subscribe to
   * @param handler - Handler function called once when message is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  subscribeOnce<T = unknown>(
    topic: string,
    handler: (data: T, metadata: MessageMetadata) => void,
    options?: Omit<SubscriptionOptions, 'maxMessages'>
  ): () => void;

  /**
   * Make a request and wait for response
   *
   * @param topic - Topic to send request to
   * @param data - Request data
   * @param timeout - Timeout in ms (default: 30000)
   * @returns Promise resolving to response data
   */
  request<TRequest = unknown, TResponse = unknown>(
    topic: string,
    data: TRequest,
    timeout?: number
  ): Promise<TResponse>;

  /**
   * Register a handler to respond to requests
   *
   * @param topic - Topic to respond to
   * @param handler - Handler function that processes request and returns response
   * @returns Unsubscribe function
   */
  respond<TRequest = unknown, TResponse = unknown>(
    topic: string,
    handler: RequestHandler<TRequest, TResponse>
  ): () => void;

  /**
   * Check if a topic has any subscribers
   *
   * @param topic - Topic to check
   * @returns Whether the topic has subscribers
   */
  hasSubscribers(topic: string): boolean;

  /**
   * Get number of subscribers for a topic
   *
   * @param topic - Topic to query
   * @returns Number of subscribers
   */
  getSubscriberCount(topic: string): number;

  /**
   * Get statistics for a topic
   *
   * @param topic - Topic to query
   * @returns Topic statistics
   */
  getTopicStats(topic: string): TopicStats | null;

  /**
   * Get all active topics
   *
   * @returns Array of topic names
   */
  getTopics(): string[];

  /**
   * Clear all subscriptions for this plugin
   */
  clearSubscriptions(): void;

  /**
   * Create a scoped message bus with topic prefix
   *
   * @param prefix - Prefix to add to all topics
   * @returns Scoped message bus API
   *
   * @example
   * ```typescript
   * const userBus = context.bus.scope('user');
   * userBus.publish('login', data); // Publishes to 'user:login'
   * userBus.subscribe('logout', handler); // Subscribes to 'user:logout'
   * ```
   */
  scope(prefix: string): PluginMessageBusAPI;
}
