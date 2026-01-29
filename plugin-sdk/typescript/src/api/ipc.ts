/**
 * IPC Communication API
 *
 * @description Inter-plugin communication API for cross-plugin messaging.
 * Enables plugins to communicate with each other through messages and RPC calls.
 */

/**
 * IPC message structure
 */
export interface IPCMessage {
  /** Unique message ID */
  id: string;
  /** Source plugin ID */
  from: string;
  /** Target plugin ID */
  to: string;
  /** Communication channel */
  channel: string;
  /** Message payload */
  data: unknown;
  /** Timestamp */
  timestamp: number;
}

/**
 * IPC request for RPC calls
 */
export interface IPCRequest {
  /** Request ID */
  id: string;
  /** Method name to invoke */
  method: string;
  /** Method arguments */
  args: unknown[];
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * IPC response for RPC calls
 */
export interface IPCResponse<T = unknown> {
  /** Request ID this response is for */
  requestId: string;
  /** Whether the call was successful */
  success: boolean;
  /** Result data if successful */
  result?: T;
  /** Error message if failed */
  error?: string;
}

/**
 * RPC method handler
 */
export type RPCHandler<T = unknown, R = unknown> = (args: T) => R | Promise<R>;

/**
 * RPC method definition
 */
export interface RPCMethod {
  /** Method name */
  name: string;
  /** Method description */
  description?: string;
  /** Handler function */
  handler: RPCHandler;
}

/**
 * IPC connection state
 */
export type IPCConnectionState = 'connected' | 'disconnected' | 'connecting';

/**
 * IPC connection info
 */
export interface IPCConnection {
  /** Connected plugin ID */
  pluginId: string;
  /** Connection state */
  state: IPCConnectionState;
  /** Connection established time */
  connectedAt?: Date;
  /** Last message time */
  lastMessageAt?: Date;
}

/**
 * IPC API for inter-plugin communication
 *
 * @remarks
 * Provides methods for sending messages between plugins, making RPC calls,
 * and exposing methods for other plugins to call.
 *
 * @example
 * ```typescript
 * // Send a message to another plugin
 * context.ipc.send('other-plugin', 'data-update', { key: 'value' });
 *
 * // Listen for messages
 * const unsubscribe = context.ipc.on('data-update', (data, senderId) => {
 *   console.log(`Received from ${senderId}:`, data);
 * });
 *
 * // Make an RPC call
 * const result = await context.ipc.invoke('other-plugin', 'getData', { id: '123' });
 *
 * // Expose RPC methods
 * context.ipc.expose({
 *   getData: async ({ id }) => {
 *     return await fetchData(id);
 *   },
 *   processItem: async ({ item }) => {
 *     return await process(item);
 *   },
 * });
 * ```
 */
export interface PluginIPCAPI {
  /**
   * Send a message to another plugin
   *
   * @param targetPluginId - ID of the target plugin
   * @param channel - Communication channel name
   * @param data - Data to send
   */
  send(targetPluginId: string, channel: string, data: unknown): void;

  /**
   * Broadcast a message to all plugins
   *
   * @param channel - Communication channel name
   * @param data - Data to broadcast
   */
  broadcast(channel: string, data: unknown): void;

  /**
   * Listen for messages on a channel
   *
   * @param channel - Communication channel to listen on
   * @param handler - Handler function called when message is received
   * @returns Unsubscribe function
   */
  on(channel: string, handler: (data: unknown, senderId: string) => void): () => void;

  /**
   * Listen for a single message on a channel
   *
   * @param channel - Communication channel to listen on
   * @param handler - Handler function called once when message is received
   * @returns Unsubscribe function
   */
  once(channel: string, handler: (data: unknown, senderId: string) => void): () => void;

  /**
   * Make an RPC call to another plugin
   *
   * @param targetPluginId - ID of the target plugin
   * @param method - Method name to invoke
   * @param args - Arguments to pass to the method
   * @param timeout - Request timeout in ms (default: 30000)
   * @returns Promise resolving to the method result
   */
  invoke<T = unknown>(
    targetPluginId: string,
    method: string,
    args?: unknown,
    timeout?: number
  ): Promise<T>;

  /**
   * Expose RPC methods for other plugins to call
   *
   * @param methods - Object mapping method names to handler functions
   * @returns Unsubscribe function to remove all exposed methods
   */
  expose(methods: Record<string, RPCHandler>): () => void;

  /**
   * Remove an exposed RPC method
   *
   * @param methodName - Name of the method to remove
   */
  unexpose(methodName: string): void;

  /**
   * Get list of exposed methods by a plugin
   *
   * @param pluginId - Plugin ID to query (omit for own methods)
   * @returns Array of method names
   */
  getMethods(pluginId?: string): Promise<string[]>;

  /**
   * Check if a plugin is available for IPC
   *
   * @param pluginId - Plugin ID to check
   * @returns Whether the plugin is available
   */
  isAvailable(pluginId: string): boolean;

  /**
   * Get connection info for a plugin
   *
   * @param pluginId - Plugin ID to query
   * @returns Connection info or null if not connected
   */
  getConnection(pluginId: string): IPCConnection | null;

  /**
   * Get all active connections
   *
   * @returns Array of active connections
   */
  getConnections(): IPCConnection[];

  /**
   * Listen for connection state changes
   *
   * @param handler - Handler called when connection state changes
   * @returns Unsubscribe function
   */
  onConnectionChange(handler: (pluginId: string, state: IPCConnectionState) => void): () => void;
}
